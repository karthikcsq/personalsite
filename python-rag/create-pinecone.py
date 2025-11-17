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
import sys
import argparse

from pinecone import Pinecone, ServerlessSpec
from git import Repo
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as PineconeStore
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

# === CONFIGURATION ===
# Paths are relative to python-rag/ directory
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

    # Load blog posts
    blog_docs = load_blog_posts()

    return text_docs + yaml_docs + blog_docs

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

# === BLOG POST LOADING ===
def load_blog_posts():
    """Load and process blog posts from personalsite/blog/posts directory"""
    blog_docs = []

    # Try multiple potential paths for the blog posts (from python-rag/ directory)
    potential_paths = [
        "../personalsite/blog/posts",  # From python-rag/ to personalsite/blog/posts
        "personalsite/blog/posts",      # If running from root
        "../blog/posts",                # Alternative path
        "blog/posts"                    # If blog is in current dir
    ]

    blog_dir = None
    for path in potential_paths:
        if os.path.exists(path):
            blog_dir = path
            break

    if not blog_dir:
        print("⚠️  Blog posts directory not found. Skipping blog loading.")
        return []

    # Find all markdown files in blog directory
    blog_files = []
    for root, dirs, files in os.walk(blog_dir):
        for file in files:
            if file.endswith('.md'):
                blog_files.append(os.path.join(root, file))

    print(f"📝 Found {len(blog_files)} blog post(s)")

    for blog_file in blog_files:
        try:
            with open(blog_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Parse frontmatter and content
            doc = parse_blog_markdown(content, blog_file)
            if doc:
                blog_docs.append(doc)
                print(f"  ✓ Loaded: {doc.metadata.get('title', 'Untitled')}")

        except Exception as e:
            print(f"❌ Error processing blog file {blog_file}: {e}")

    return blog_docs

def parse_blog_markdown(content, file_path):
    """Parse markdown blog post with frontmatter"""
    # Split frontmatter and content
    if not content.startswith('---'):
        print(f"⚠️  No frontmatter found in {file_path}")
        return None

    parts = content.split('---', 2)
    if len(parts) < 3:
        print(f"⚠️  Invalid frontmatter format in {file_path}")
        return None

    frontmatter_text = parts[1].strip()
    markdown_content = parts[2].strip()

    # Parse frontmatter YAML
    try:
        frontmatter = yaml.safe_load(frontmatter_text)
    except Exception as e:
        print(f"❌ Failed to parse frontmatter in {file_path}: {e}")
        return None

    # Extract slug from filename
    slug = os.path.basename(file_path).replace('.md', '')

    # Create searchable text combining title, summary, and content
    title = frontmatter.get('title', 'Untitled')
    date = frontmatter.get('date', 'Unknown date')
    summary = frontmatter.get('summary', '')

    # Clean markdown content (remove image tags and HTML for better embedding)
    import re
    clean_content = re.sub(r'<img[^>]+>', '', markdown_content)
    clean_content = re.sub(r'!\[.*?\]\(.*?\)', '', clean_content)

    searchable_text = f"""Blog Post: {title}
Date: {date}
Summary: {summary}

{clean_content}"""

    return Document(
        page_content=searchable_text,
        metadata={
            "source_type": "blog",
            "content_type": "blog_post",
            "file_path": file_path,
            "slug": slug,
            "title": title,
            "date": date,
            "summary": summary,
            "url": f"/blog/{slug}"
        }
    )

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
    """Smart chunking based on document type"""
    chunks = []

    for doc in documents:
        source_type = doc.metadata.get('source_type', 'unknown')

        if source_type == 'blog':
            # Larger chunks for blog posts to maintain narrative flow
            # Use section breaks and paragraphs as boundaries
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1200,
                chunk_overlap=200,
                separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""]
            )
        elif source_type == 'yaml':
            # Keep structured data intact (experience, projects, etc.)
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=600,
                chunk_overlap=50,
                separators=["\n\n", "\n", " ", ""]
            )
        elif source_type == 'github':
            # Code-aware chunking
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,
                chunk_overlap=100,
                separators=["\n\nclass ", "\n\ndef ", "\n\n", "\n", " ", ""]
            )
        else:
            # Default chunking for text files
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50
            )

        doc_chunks = splitter.split_documents([doc])
        chunks.extend(doc_chunks)

    return chunks

# === PINECONE MANAGEMENT ===
def delete_all_vectors():
    """Delete all vectors from the Pinecone index"""
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(INDEX_NAME)

    print("🗑️  Deleting all existing vectors from Pinecone index...")

    try:
        # Get index stats to see what we're deleting
        stats = index.describe_index_stats()
        total_vectors = stats.total_vector_count

        if total_vectors == 0:
            print("  ℹ️  Index is already empty")
            return

        print(f"  📊 Found {total_vectors} vectors to delete")

        # Delete all vectors by deleting from all namespaces
        # For default namespace (empty string), use delete_all
        index.delete(delete_all=True)

        print(f"  ✅ Successfully deleted all vectors from index '{INDEX_NAME}'")

    except Exception as e:
        print(f"  ❌ Error deleting vectors: {e}")
        raise

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
def main(reset=False):
    """
    Main function to load documents and upload to Pinecone

    Args:
        reset (bool): If True, delete all existing vectors before uploading
    """
    # Parse command-line arguments if called from command line
    parser = argparse.ArgumentParser(
        description='Upload documents to Pinecone for RAG system',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python create-pinecone.py              # Normal update mode (incremental)
  python create-pinecone.py --reset      # Delete all vectors and re-upload everything
  python create-pinecone.py -r           # Same as --reset (shorthand)
        """
    )
    parser.add_argument(
        '--reset', '-r',
        action='store_true',
        help='Delete all existing vectors before uploading (fresh start)'
    )

    # Only parse args if running as main script
    if __name__ == "__main__":
        args = parser.parse_args()
        reset = args.reset

    print("=" * 60)
    print("🚀 Pinecone RAG Document Upload")
    print("=" * 60)

    if reset:
        print("\n⚠️  RESET MODE: All existing vectors will be deleted!")
        print("   This will clear your entire Pinecone index.")

        # Ask for confirmation
        response = input("\n   Are you sure you want to continue? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            print("\n❌ Operation cancelled by user.")
            return

        print()
        delete_all_vectors()
        print()
    else:
        print("\n📝 Running in UPDATE mode (incremental)")
        print("   Use --reset flag to delete all vectors first\n")

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

        print("\n" + "=" * 60)
        print("✅ Upload complete!")
        print("=" * 60)
    else:
        print("✅ No new content to upload.")

if __name__ == "__main__":
    main()
