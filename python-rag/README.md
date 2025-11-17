# Python RAG System

This directory contains Python scripts for managing the RAG (Retrieval-Augmented Generation) system that powers the chatbot on the personal website.

## Setup

This project uses **[uv](https://docs.astral.sh/uv/)** for fast, reliable Python dependency management.

### 1. Install uv (if not already installed)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or with pip
pip install uv
```

### 2. Install Dependencies

```bash
cd python-rag

# Install all dependencies (creates .venv and uv.lock)
uv sync

# That's it! uv handles everything automatically.
```

**What `uv sync` does:**
- Creates a virtual environment in `.venv/`
- Installs all dependencies from `pyproject.toml`
- Creates/updates `uv.lock` for reproducible builds
- Much faster than pip (10-100x faster!)

### 2. Environment Variables

Create a `.env` file in the **root directory** (not in `python-rag/`) with:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
OPENAI_API_KEY=your_openai_api_key

# Optional: For GitHub integration (currently commented out)
GITHUB_USERNAME=your_github_username
GITHUB_TOKEN=your_github_token
```

## Scripts

### `create-pinecone.py`

Main script to load documents and upload to Pinecone vector database.

**Usage:**

```bash
# Run with uv (automatically uses .venv)
uv run python create-pinecone.py           # Update mode
uv run python create-pinecone.py --reset   # Reset mode

# Or activate the virtual environment first
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# Then run normally
python create-pinecone.py
python create-pinecone.py --reset
```

**What it does:**

1. Loads documents from:
   - `../rag-docs/` - YAML resume data and text files
   - `../personalsite/blog/posts/` - Markdown blog posts with frontmatter

2. Smart chunking based on content type:
   - Blog posts: 1200 chars, 200 overlap (preserves narrative)
   - YAML data: 600 chars, 50 overlap (structured data)
   - Text files: 500 chars, 50 overlap (default)

3. Embeds chunks using OpenAI `text-embedding-ada-002`

4. Uploads to Pinecone with rich metadata for filtering

**When to use `--reset`:**
- Updated/deleted blog posts
- Changed YAML resume data
- Modified chunking strategy
- Want to remove old content

### `testing.py`

Simple test script for Pinecone connection (minimal functionality).

## Data Sources

The script automatically loads from these locations:

```
python-rag/                            # You are here
├── rag-docs/                          # RAG data (same directory!)
│   ├── karthik_thyagarajan_truth.yaml # Resume data
│   └── *.txt                          # Additional content
├── create-pinecone.py
├── testing.py
├── requirements.txt
└── README.md

../personalsite/blog/posts/            # Blog posts (outside python-rag)
├── silicon-valley-trip.md
├── future-of-ai-work.md
└── *.md                               # Markdown with frontmatter
```

**Why this structure?**
- All RAG-related files in one place (`python-rag/`)
- Blog posts stay with the Next.js app (they're displayed on the site)
- Easy to backup/share just the RAG system

## Metadata Schema

### Blog Posts
```python
{
    "source_type": "blog",
    "content_type": "blog_post",
    "slug": "silicon-valley-trip",
    "title": "My Trip to Silicon Valley...",
    "date": "2025-03-25",
    "summary": "A week in Silicon Valley...",
    "url": "/blog/silicon-valley-trip",
    "text": "Blog Post: My Trip to Silicon Valley..."
}
```

### YAML Experience
```python
{
    "source_type": "yaml",
    "section": "experience",
    "content_type": "professional",
    "company": "Peraton Labs",
    "role": "Machine Learning Intern",
    "text": "Experience: Machine Learning Intern at..."
}
```

### YAML Projects
```python
{
    "source_type": "yaml",
    "section": "projects",
    "content_type": "project",
    "project_title": "Verbatim",
    "technologies": "React, Firebase, OpenAI",
    "text": "Project: Verbatim..."
}
```

## Troubleshooting

**"Blog posts directory not found"**
- Ensure you're running from `python-rag/` directory
- Check that `../personalsite/blog/posts/` exists

**"rag-docs directory not found"**
- The `rag-docs/` folder should be inside `python-rag/`
- Check that `python-rag/rag-docs/` exists

**"ModuleNotFoundError"**
- Install dependencies: `uv sync`
- Or use `uv run python ...` which auto-installs

**Pinecone connection errors**
- Verify `.env` file in root directory
- Check `PINECONE_API_KEY` and `PINECONE_INDEX_NAME`

**OpenAI API errors**
- Verify `OPENAI_API_KEY` in `.env`
- Check API quota/billing

## Development

To modify chunking strategy, edit `chunk_documents()` function in `create-pinecone.py`:

```python
if source_type == 'blog':
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,  # Adjust size
        chunk_overlap=200,  # Adjust overlap
        separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""]
    )
```

To add new data sources, create a loader function following the pattern of `load_blog_posts()` and `load_yaml_files()`.
