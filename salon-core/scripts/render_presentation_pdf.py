import os
import textwrap

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "docs", "PRESENTATION.md")
OUT = os.path.join(ROOT, "docs", "PRESENTATION.pdf")


def split_lines(text: str):
    lines = []
    for raw in text.splitlines():
        if raw.strip() == "---":
            lines.append("<<PAGE_BREAK>>")
            continue
        if raw.startswith("#"):
            header = raw.lstrip("#").strip().upper()
            lines.append("")
            lines.append(header)
            lines.append("")
            continue
        lines.append(raw)
    return lines


def render():
    with open(SRC, "r", encoding="utf-8") as f:
        content = f.read()

    lines = split_lines(content)
    c = canvas.Canvas(OUT, pagesize=letter)
    width, height = letter
    x = 54
    y = height - 72
    line_height = 14

    for line in lines:
        if line == "<<PAGE_BREAK>>":
            c.showPage()
            y = height - 72
            continue

        if not line.strip():
            y -= line_height
            continue

        wrapped = textwrap.wrap(line, width=90)
        for w in wrapped:
            c.drawString(x, y, w)
            y -= line_height
            if y < 72:
                c.showPage()
                y = height - 72

    c.save()
    return OUT


if __name__ == "__main__":
    path = render()
    print(path)
