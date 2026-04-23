#!/usr/bin/env python3
"""
Cambridge IELTS PDF → OCR text extractor (for scanned image PDFs).

Usage:
  python3 scripts/ocr_cambridge_pdf.py <pdf_path> <book_number> [--pages START-END]

Examples:
  python3 scripts/ocr_cambridge_pdf.py ~/books/cambridge-12.pdf 12
  python3 scripts/ocr_cambridge_pdf.py ~/books/cambridge-12.pdf 12 --pages 20-80

Output:
  scripts/cambridge_ocr/cambridge-<N>/
    raw_ocr.txt          — full OCR text
    test<N>_reading.txt  — per-test reading section text
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    sys.exit("pip3 install pymupdf --break-system-packages")

try:
    from PIL import Image
except ImportError:
    sys.exit("pip3 install Pillow --break-system-packages")

try:
    import pytesseract
except ImportError:
    sys.exit("pip3 install pytesseract --break-system-packages")

import io

# ── OCR helpers ──────────────────────────────────────────────────────────────

def ocr_page(page, zoom: float = 2.5) -> str:
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    config = "--psm 6 --oem 3 -l eng"
    text = pytesseract.image_to_string(img, config=config)
    return text

def clean(text: str) -> str:
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r' {3,}', '  ', text)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text.strip()


# ── Test / passage boundary detection ────────────────────────────────────────

TEST_START  = re.compile(r'\bTEST\s+[1-4]\b', re.IGNORECASE)
READING_HDR = re.compile(r'ACADEMIC\s+READING|IELTS\s+READING', re.IGNORECASE)
PASSAGE_HDR = re.compile(r'(?:READING\s+PASSAGE|Reading\s+Passage)\s+([123])', re.IGNORECASE)
QUESTION_BLK= re.compile(r'Questions\s+\d+\s*[-–]\s*\d+', re.IGNORECASE)

def find_page_ranges_for_reading(pages_text: list[str]) -> list[tuple[int,int]]:
    """Return (start, end) page indices for each of 4 reading tests."""
    reading_starts = []
    for i, t in enumerate(pages_text):
        if READING_HDR.search(t) or (TEST_START.search(t) and PASSAGE_HDR.search(t)):
            reading_starts.append(i)
    if not reading_starts:
        # fallback: treat whole doc as one reading block
        return [(0, len(pages_text)-1)]
    ranges = []
    for j, start in enumerate(reading_starts):
        end = reading_starts[j+1] - 1 if j+1 < len(reading_starts) else len(pages_text)-1
        ranges.append((start, end))
    return ranges


def parse_reading_text(text: str) -> list[dict]:
    """
    Split reading section text into passages.
    Returns list of {number, title, body, questions_raw}.
    """
    parts = PASSAGE_HDR.split(text)
    # parts: [pre, "1", body1, "2", body2, "3", body3]
    passages = []
    i = 1
    while i < len(parts) - 1:
        num_str = parts[i]
        body    = parts[i+1] if i+1 < len(parts) else ""
        i += 2
        try:
            num = int(num_str)
        except ValueError:
            continue

        lines = [l.strip() for l in body.split('\n') if l.strip()]
        title = lines[0] if lines else f"Passage {num}"

        # Split at question block
        qm = QUESTION_BLK.search(body)
        if qm:
            passage_text = body[:qm.start()].strip()
            questions_raw = body[qm.start():].strip()
        else:
            passage_text = body.strip()
            questions_raw = ""

        if passage_text.startswith(title):
            passage_text = passage_text[len(title):].strip()

        passages.append({
            "number":        num,
            "title":         title,
            "body":          passage_text,
            "questions_raw": questions_raw,
        })
    return passages


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf",  help="Path to Cambridge IELTS PDF")
    ap.add_argument("book", type=int, help="Book number")
    ap.add_argument("--pages", default=None, help="Page range to OCR, e.g. 20-120")
    ap.add_argument("--dpi",   type=float, default=2.5, help="Zoom factor (default 2.5)")
    ap.add_argument("--out",   default=None)
    args = ap.parse_args()

    pdf_path = Path(args.pdf).expanduser()
    if not pdf_path.exists():
        sys.exit(f"Not found: {pdf_path}")

    out_dir = Path(args.out) if args.out else \
        Path(__file__).parent / "cambridge_ocr" / f"cambridge-{args.book}"
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(pdf_path))
    total = len(doc)
    print(f"📖  {pdf_path.name}  ({total} pages)")

    if args.pages:
        a, b = args.pages.split("-")
        page_range = range(int(a)-1, min(int(b), total))
    else:
        page_range = range(total)

    pages_text: list[str] = []
    for i in page_range:
        print(f"\r   OCR page {i+1}/{total} …", end="", flush=True)
        try:
            t = ocr_page(doc[i], zoom=args.dpi)
        except Exception as e:
            t = f"[OCR ERROR page {i+1}: {e}]"
        pages_text.append(clean(t))
    print()

    raw = '\n\n--- PAGE BREAK ---\n\n'.join(pages_text)
    raw_path = out_dir / "raw_ocr.txt"
    raw_path.write_text(raw, encoding="utf-8")
    print(f"✅  Raw OCR saved → {raw_path}  ({len(raw):,} chars)")

    # Detect reading test blocks
    ranges = find_page_ranges_for_reading(pages_text)
    print(f"🔍  Detected {len(ranges)} reading block(s)")

    results = {}
    for tidx, (start, end) in enumerate(ranges):
        tnum = tidx + 1
        block = '\n\n'.join(pages_text[start:end+1])
        passages = parse_reading_text(block)

        block_path = out_dir / f"test{tnum}_reading.txt"
        block_path.write_text(block, encoding="utf-8")

        if passages:
            print(f"\nTest {tnum} (pages {start+1}–{end+1}):")
            for p in passages:
                wc = len(p['body'].split())
                print(f"  P{p['number']} — {p['title'][:60]}  ({wc} words)")
        else:
            print(f"\nTest {tnum}: no passages detected — check {block_path.name}")

        results[f"test{tnum}"] = {
            "pages": [start+1, end+1],
            "passages": passages
        }

    json_path = out_dir / "passages.json"
    json_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n📦  Done!  Files in: {out_dir}/")
    print("""
Next:
  1. Check raw_ocr.txt and test*_reading.txt for OCR quality
  2. Edit passages.json to fix OCR mistakes
  3. Run generate_go_from_ocr.py to produce Go seed code
""")
    doc.close()

if __name__ == "__main__":
    main()
