# Final version: Pulls from GitHub and a directory of local .txt files, deduplicates based on hashing,
# and uploads new content to Pinecone. Tracks previous uploads in tracking.json.

import os
import json
import hashlib
import tempfile
import shutil
import requests
import stat

from pinecone import Pinecone
from pinecone import ServerlessSpec
from git import Repo
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as PineconeStore
from dotenv import load_dotenv

load_dotenv()

# === CONFIGURATION ===
TEXT_DIRECTORY = "rag-docs"
TRACKING_FILE = "tracking.json"
GITHUB_USERNAME = os.environ.get("GITHUB_USERNAME")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME")
EMBED_DIM = 1536  # For OpenAI embeddings

# === HELPERS ===
def compute_hash(content):
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def load_tracking():
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE, "r") as f:
            return json.load(f)
    return {}

def save_tracking(data):
    with open(TRACKING_FILE, "w") as f:
        json.dump(data, f, indent=2)

# === GITHUB REPO FETCHING ===
def get_user_repos(username, token):
    print("🔍 Fetching GitHub repositories...")
    headers = {"Authorization": f"token {token}"}
    repos = []
    page = 1
    while True:
        url = f"https://api.github.com/users/{username}/repos?sort=pushed&per_page=100&page={page}"
        response = requests.get(url, headers=headers)
        data = response.json()
        if not data or "message" in data:
            break
        repos.extend(repo["clone_url"] for repo in data if not repo["fork"])
        page += 1
    return repos

# === TEXT FILE LOADING ===
def load_text_files():
    loader = DirectoryLoader(TEXT_DIRECTORY, glob="**/*.txt", loader_cls=TextLoader)
    docs = loader.load()
    for doc in docs:
        doc.metadata.update({"source_type": "text", "file_path": doc.metadata["source"]})
    return docs

# === HANDLE REMOVE PERMISSIONS ===
def handle_remove_readonly(func, path, exc_info):
    os.chmod(path, stat.S_IWRITE)
    func(path)

# === GITHUB LOADING WITH HASH DEDUPLICATION ===
def load_github_repos(repo_urls, tracking_data):
    temp_dir = tempfile.mkdtemp()
    new_docs = []
    new_tracking = {}

    for repo_url in repo_urls:
        repo_name = repo_url.rstrip("/").split("/")[-1]
        repo_path = os.path.join(temp_dir, repo_name)
        try:
            Repo.clone_from(repo_url, repo_path)
        except Exception as e:
            print(f"❌ Failed to clone {repo_url}: {e}")
            continue

        loader = DirectoryLoader(
            repo_path,
            glob="**/*.{md,py,js,ts,txt}",
            loader_cls=TextLoader,
            silent_errors=True
        )
        docs = loader.load()

        new_tracking[repo_name] = {}
        for doc in docs:
            content = doc.page_content
            file_path = doc.metadata["source"]
            hash_val = compute_hash(content)

            if repo_name not in tracking_data or tracking_data[repo_name].get(file_path) != hash_val:
                doc.metadata.update({
                    "source_type": "github",
                    "repo_name": repo_name,
                    "file_path": file_path
                })
                new_docs.append(doc)
                new_tracking[repo_name][file_path] = hash_val

    shutil.rmtree(temp_dir, onerror=handle_remove_readonly)
    return new_docs, new_tracking

# === CHUNKING ===
def chunk_documents(documents):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    return splitter.split_documents(documents)

# === VECTORSTORE UPLOAD ===
# === VECTORSTORE UPLOAD ===
def upload_to_pinecone(chunks):
    pc = Pinecone(api_key=PINECONE_API_KEY)
    # if INDEX_NAME not in pc.list_indexes():
    #     pc.create_index(INDEX_NAME, dimension=EMBED_DIM, metric="cosine",
    #                     spec=ServerlessSpec(cloud="aws", region=PINECONE_ENV))
    
    embeddings = OpenAIEmbeddings()
    
    # Create embeddings for all chunks
    texts = [doc.page_content for doc in chunks]
    metadatas = [doc.metadata for doc in chunks]
    
    # Get embeddings
    embeds = embeddings.embed_documents(texts)
    
    # Prepare data for Pinecone
    index = pc.Index(INDEX_NAME)
    batch_size = 100  # Adjust based on your needs
    
    print(f"Uploading {len(chunks)} chunks to Pinecone in batches of {batch_size}...")
    
    for i in range(0, len(chunks), batch_size):
        batch_texts = texts[i:i + batch_size]
        batch_embeds = embeds[i:i + batch_size]
        batch_metadatas = metadatas[i:i + batch_size]
        
        # Create vector records
        vectors_to_upsert = []
        for j, (text, vector, metadata) in enumerate(zip(batch_texts, batch_embeds, batch_metadatas)):
            vector_id = f"vec_{i + j}"
            # Include the text in metadata for retrieval
            metadata_with_text = metadata.copy()
            metadata_with_text["text"] = text
            vectors_to_upsert.append((vector_id, vector, metadata_with_text))
        
        # Upsert to Pinecone
        index.upsert(vectors=vectors_to_upsert)
        
        print(f"✓ Uploaded batch {i // batch_size + 1}/{(len(chunks) - 1) // batch_size + 1}")
    
    print(f"✅ Successfully uploaded {len(chunks)} chunks to Pinecone.")

# === MAIN ===
def main():
    print("📦 Loading tracking data...")
    tracking_data = load_tracking()

    print("📄 Loading local text files...")
    text_docs = load_text_files()

    # print("🐙 Fetching and loading GitHub repositories...")
    # repo_urls = get_user_repos(GITHUB_USERNAME, GITHUB_TOKEN)
    # github_docs, new_tracking = load_github_repos(repo_urls, tracking_data)

    # all_docs = text_docs + github_docs
    all_docs = text_docs
    print(f"📚 Total new/updated documents: {len(all_docs)}")

    print("✂️ Splitting documents into chunks...")
    chunks = chunk_documents(all_docs)

    if chunks:
        print("📤 Uploading to Pinecone...")
        upload_to_pinecone(chunks)

        # print("💾 Updating tracking file...")
        # tracking_data.update(new_tracking)
        # save_tracking(tracking_data)
    else:
        print("✅ No new content to upload.")

if __name__ == "__main__":
    main()
