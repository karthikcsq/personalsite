# Final version: Pulls from GitHub and a directory of local .txt files, deduplicates based on hashing,
# and uploads new content to Pinecone. Tracks previous uploads in tracking.json.

import os
import json
import hashlib
import tempfile
import shutil
import requests
import stat
import yaml

from pinecone import Pinecone
from pinecone import ServerlessSpec
from git import Repo
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as PineconeStore
from langchain.schema import Document
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
    # Load regular text files
    loader = DirectoryLoader(TEXT_DIRECTORY, glob="**/*.txt", loader_cls=TextLoader)
    text_docs = loader.load()
    for doc in text_docs:
        doc.metadata.update({"source_type": "text", "file_path": doc.metadata["source"]})
    
    # Load YAML files
    yaml_docs = load_yaml_files()
    
    return text_docs + yaml_docs

def load_yaml_files():
    """Load and process YAML files from the rag-docs directory"""
    yaml_docs = []
    yaml_files = []
    
    # Find all YAML files
    for root, dirs, files in os.walk(TEXT_DIRECTORY):
        for file in files:
            if file.endswith(('.yaml', '.yml')):
                yaml_files.append(os.path.join(root, file))
    
    for yaml_file in yaml_files:
        try:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                yaml_content = yaml.safe_load(f)
            
            # Convert YAML to searchable text chunks
            docs = yaml_to_documents(yaml_content, yaml_file)
            yaml_docs.extend(docs)
            
        except Exception as e:
            print(f"❌ Error processing YAML file {yaml_file}: {e}")
    
    return yaml_docs

def yaml_to_documents(yaml_data, file_path):
    """Convert YAML data structure to searchable document chunks"""
    documents = []
    
    if isinstance(yaml_data, dict):
        # Process personal information
        if 'name' in yaml_data:
            name_text = f"Name: {yaml_data['name']}"
            if 'contact' in yaml_data:
                contact_info = ", ".join(yaml_data['contact'])
                name_text += f"\nContact: {contact_info}"
            if 'links' in yaml_data:
                links_text = "\nLinks: " + ", ".join([f"{link['label']}: {link['url']}" for link in yaml_data['links']])
                name_text += links_text
            
            documents.append(Document(
                page_content=name_text,
                metadata={"source_type": "yaml", "file_path": file_path, "section": "personal_info", "content_type": "contact"}
            ))
        
        # Process education
        if 'education' in yaml_data:
            for edu in yaml_data['education']:
                edu_text = f"Education: {edu.get('degree', '')} at {edu.get('institution', '')} ({edu.get('location', '')})"
                if 'gpa' in edu:
                    edu_text += f"\nGPA: {edu['gpa']}"
                if 'dates' in edu:
                    edu_text += f"\nDates: {edu['dates']}"
                
                documents.append(Document(
                    page_content=edu_text,
                    metadata={"source_type": "yaml", "file_path": file_path, "section": "education", "content_type": "academic"}
                ))
        
        # Process skills
        if 'skills' in yaml_data:
            for skill_category in yaml_data['skills']:
                category_name = skill_category.get('category', 'Unknown')
                skills_list = skill_category.get('bullets', [])
                skills_text = f"Skills - {category_name}: " + ", ".join(skills_list)
                
                documents.append(Document(
                    page_content=skills_text,
                    metadata={"source_type": "yaml", "file_path": file_path, "section": "skills", "content_type": "technical", "category": category_name}
                ))
        
        # Process experience
        if 'experience' in yaml_data:
            for exp in yaml_data['experience']:
                exp_text = f"Experience: {exp.get('role', '')} at {exp.get('company', '')} ({exp.get('location', '')})"
                if 'start_date' in exp and 'end_date' in exp:
                    exp_text += f"\nDuration: {exp['start_date']} - {exp['end_date']}"
                if 'work_type' in exp:
                    exp_text += f"\nType: {exp['work_type']}"
                if 'bullets' in exp:
                    exp_text += "\nResponsibilities:\n" + "\n".join([f"• {bullet}" for bullet in exp['bullets']])
                
                documents.append(Document(
                    page_content=exp_text,
                    metadata={
                        "source_type": "yaml", 
                        "file_path": file_path, 
                        "section": "experience", 
                        "content_type": "professional",
                        "company": exp.get('company', ''),
                        "role": exp.get('role', '')
                    }
                ))
        
        # Process projects
        if 'projects' in yaml_data:
            for project in yaml_data['projects']:
                project_text = f"Project: {project.get('title', '')}"
                if 'tools' in project:
                    project_text += f"\nTechnologies: {project['tools']}"
                if 'date' in project:
                    project_text += f"\nDate: {project['date']}"
                if 'link' in project:
                    project_text += f"\nLink: {project['link']}"
                if 'bullets' in project:
                    project_text += "\nDescription:\n" + "\n".join([f"• {bullet}" for bullet in project['bullets']])
                
                documents.append(Document(
                    page_content=project_text,
                    metadata={
                        "source_type": "yaml", 
                        "file_path": file_path, 
                        "section": "projects", 
                        "content_type": "project",
                        "project_title": project.get('title', ''),
                        "technologies": project.get('tools', '')
                    }
                ))
    
    return documents

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
