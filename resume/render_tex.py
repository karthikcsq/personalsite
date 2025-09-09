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
def filter_for_target(obj, target="cv"):
    """Recursively filter a loaded YAML structure.

    If an object is a dict and contains a `show_on` key, the object is
    dropped unless the `target` is present in that list. Lists are
    filtered item-by-item.
    """
    if isinstance(obj, dict):
        if "show_on" in obj:
            show = obj.get("show_on") or []
            # allow single-string show_on values
            if isinstance(show, str):
                show = [show]
            if target not in show:
                return None
        result = {}
        for k, v in obj.items():
            if k == "show_on":
                continue
            filtered = filter_for_target(v, target)
            if filtered is not None:
                result[k] = filtered
        return result
    elif isinstance(obj, list):
        out = []
        for item in obj:
            f = filter_for_target(item, target)
            if f is not None:
                out.append(f)
        return out
    else:
        return obj


def render_target(template_name: str, out_tex: str, out_pdf_name: str, target: str = None):
    """Render a template and optionally build PDF and copy to public folder.

    If `target` is provided, the YAML data is filtered with `filter_for_target`
    before escaping and rendering.
    """
    tmpl = env.get_template(template_name)

    data_to_render = data
    if target:
        data_to_render = filter_for_target(data, target)

    data_escaped = escape_all(data_to_render or {})
    output = tmpl.render(**data_escaped)

    with open(out_tex, "w", encoding="utf-8") as f:
        f.write(output)

    # Run pdflatex if available
    if shutil.which("pdflatex"):
        try:
            subprocess.run(["pdflatex", out_tex], check=True)
        except subprocess.CalledProcessError as e:
            print(f"pdflatex failed with exit code {e.returncode} for {out_tex}")
    else:
        print("pdflatex not found in PATH — skipping PDF generation step")

    # Copy generated PDF to site public folder with the requested name
    src_pdf = Path(out_tex).with_suffix(".pdf")
    copy_to_public(src_pdf, out_pdf_name)

    # Additionally copy to user Documents folders (Windows) with timestamped filename
    try:
        kind = "CV" if "cv" in out_pdf_name.lower() else "Resume"
        copy_to_documents(src_pdf, kind)
    except Exception as e:
        print(f"Failed to copy to Documents: {e}")


def copy_to_public(src_pdf: Path, out_pdf_name: str):
    """Copy generated PDF to the website public folder."""
    # Use home-based pathing so this works per-user (home -> CodingFiles/PersonalWebsite/...)
    dest_dir = Path.home() / "CodingFiles" / "PersonalWebsite" / "personalsite" / "personalsite" / "public"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_pdf = dest_dir / out_pdf_name
    try:
        shutil.copyfile(src_pdf, dest_pdf)
        print(f"Copied {src_pdf} -> {dest_pdf}")
    except FileNotFoundError:
        print(f"Source PDF not found: {src_pdf}. Did pdflatex run successfully?")
    except Exception as e:
        print(f"Failed to copy PDF to public folder: {e}")


def copy_to_documents(src_pdf: Path, kind: str):
    """Copy generated PDF to OneDrive/Documents/<CVs|Resumes> with timestamped name."""
    from datetime import datetime

    # build timestamped filename: YY_MM_Karthik_Thyagarajan_<CV|Resume>.pdf
    now = datetime.now()
    yy = now.strftime("%y")
    mm = now.strftime("%m")
    filename = f"{yy}_{mm}_Karthik_Thyagarajan_{kind}.pdf"

    docs_base = Path.home() / "OneDrive/Documents"
    # target dirs
    cvs_dir = docs_base / "CVs"
    resumes_dir = docs_base / "Resumes"
    cvs_dir.mkdir(parents=True, exist_ok=True)
    resumes_dir.mkdir(parents=True, exist_ok=True)

    if kind == "CV":
        target_path = cvs_dir / filename
    else:
        target_path = resumes_dir / filename

    shutil.copyfile(src_pdf, target_path)
    print(f"Also copied {src_pdf} -> {target_path}")


# Render CV (existing behavior)
render_target("cv.tex.j2", "cv_output.tex", "cv.pdf", target="cv")

# Render resume (new template) — filter items to those that include 'resume'
render_target("resume.tex.j2", "resume_output.tex", "resume.pdf", target="resume")