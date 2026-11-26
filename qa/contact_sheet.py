"""PDF の各ページを PNG にし、一覧画像（contact sheet）を作る。

使い方: python qa/contact_sheet.py deck.pdf 出力フォルダ
必要なもの: pymupdf, Pillow（pip install pymupdf Pillow）
"""
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw


def main(pdf_path: str, out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    stem = Path(pdf_path).stem
    doc = pymupdf.open(pdf_path)
    pages = []
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=130)
        path = out / f"{stem}-{i:02d}.png"
        pix.save(path)
        pages.append(path)
        print(path)
    thumbs = []
    for p in pages:
        im = Image.open(p)
        im.thumbnail((640, 640))
        thumbs.append(im)
    if not thumbs:
        return
    w, h = thumbs[0].size
    cols = 3
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 12) + 12, rows * (h + 30) + 12), "white")
    draw = ImageDraw.Draw(sheet)
    for i, im in enumerate(thumbs):
        x = 12 + (i % cols) * (w + 12)
        y = 12 + (i // cols) * (h + 30)
        sheet.paste(im, (x, y + 18))
        draw.rectangle([x - 1, y + 17, x + w, y + 18 + h], outline="#999999")
        draw.text((x, y + 2), f"{i + 1:02d}", fill="#333333")
    sheet_path = out / f"{stem}-sheet.png"
    sheet.save(sheet_path)
    print(sheet_path)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
