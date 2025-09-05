import yaml
from jinja2 import Environment, FileSystemLoader
import subprocess
import os
import shutil
from pathlib import Path


def latex_escape(text: str) -> str:
    # Replace backslash first to avoid re-escaping backslashes introduced by
    # later replacements (e.g. replacing '&' with '\&' shouldn't then turn
    # the leading backslash into '\textbackslash{}'). Use an ordered list.
    replacements = [
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
    ]
    for char, replacement in replacements:
        text = text.replace(char, replacement)
    return text

def escape_all(data):
    if isinstance(data, dict):
        return {k: escape_all(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [escape_all(v) for v in data]
    elif isinstance(data, str):
        return latex_escape(data)
    else:
        return data



# Load YAML
with open("resume_truth.yaml", "r") as f:
    data = yaml.safe_load(f)

# Jinja2 environment (looks for templates in ./templates)
env = Environment(
    loader=FileSystemLoader("templates"),
    # Use low-conflict delimiters to avoid clashes with LaTeX content
    block_start_string = '<%',
    block_end_string = '%>',
    variable_start_string = '<<<',
    variable_end_string = '>>>',
    comment_start_string = '<#',
    comment_end_string = '#>',
)
template = env.get_template("resume.tex.j2")

# Render
data = escape_all(data)  # Escape all strings in the data
output = template.render(**data)

with open("resume_output.tex", "w") as f:
    f.write(output)

# Run pdflatex if available
if shutil.which("pdflatex"):
    try:
        subprocess.run(["pdflatex", "resume_output.tex"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"pdflatex failed with exit code {e.returncode}")
else:
    print("pdflatex not found in PATH — skipping PDF generation step")

# Copy PDF to ../personalsite/public/resume.pdf using a cross-platform API
dest_dir = Path("../personalsite/public")
dest_dir.mkdir(parents=True, exist_ok=True)
src_pdf = Path("resume_output.pdf")
dest_pdf = dest_dir / "cv.pdf"
try:
    shutil.copyfile(src_pdf, dest_pdf)
    print(f"Copied {src_pdf} -> {dest_pdf}")
except FileNotFoundError:
    print(f"Source PDF not found: {src_pdf}. Did pdflatex run successfully?")
except Exception as e:
    print(f"Failed to copy PDF: {e}")