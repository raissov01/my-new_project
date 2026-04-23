#!/usr/bin/env python3
"""
Batch OCR extractor for Cambridge IELTS PDFs → passages.json per book.

Usage:
  python3 scripts/batch_ocr_cambridge.py           # process all books
  python3 scripts/batch_ocr_cambridge.py --book 13 # one book only
"""

import sys, os, re, json, io, argparse, time
from pathlib import Path

import fitz
from PIL import Image
import pytesseract

# ── Config ──────────────────────────────────────────────────────────────────

MEDIA_DIR = Path("/home/midoriya/my-new_project/backend/telegram-media")
OUT_BASE  = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")

BOOKS = {
    12: ("79_Cambridge IELTS 12 PDF.pdf",  [10, 30, 53, 74]),   # test start pages (1-indexed)
    13: ("77_IELTS Cambridge 13.pdf",       [10, 32, 54, 76]),
    14: ("81_IELTS Cambridge IELTS 14.pdf", [ 1, 23, 45, 67]),
    15: ("78_s cambridge_ielts_15.pdf",     [10, 31, 52, 74]),
    16: ("83_x Cambridge IELTS 16 Academic.pdf", [10, 32, 55, 76]),
    20: ("3110_CAMBRIDGE IELTS 20 (@REALEXAMIELTS).pdf", None),  # auto-detect
}

# ── OCR helpers ──────────────────────────────────────────────────────────────

PASSAGE_HDR  = re.compile(r'(?:READING\s+PASSAGE|Reading\s+Passage)\s+([123])', re.IGNORECASE)
QUESTION_BLK = re.compile(r'Questions?\s+(\d+)\s*[-–—]\s*(\d+)', re.IGNORECASE)
TEST_BLK     = re.compile(r'\bTEST\s+[1-4]\b', re.IGNORECASE)

def ocr_page(page, zoom=2.2):
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(img, config="--psm 6 --oem 3 -l eng")

def clean(t):
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', t)
    t = re.sub(r' {3,}', '  ', t)
    t = re.sub(r'\n{4,}', '\n\n\n', t)
    return t.strip()

# ── Page range detection ─────────────────────────────────────────────────────

def find_reading_pages(doc, test_start_0idx: int, test_end_0idx: int) -> tuple[int, int]:
    """
    Scan pages in a test block to find start/end of reading section.
    Returns (start_0idx, end_0idx).
    """
    read_start = None
    read_end   = None
    for i in range(test_start_0idx, min(test_end_0idx + 1, len(doc))):
        mat = fitz.Matrix(1.2, 1.2)
        pix = doc[i].get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        t = pytesseract.image_to_string(img, config="--psm 6 --oem 3 -l eng")
        if PASSAGE_HDR.search(t) and read_start is None:
            read_start = i
        if read_start is not None and re.search(r'\bWriting\b', t, re.IGNORECASE):
            read_end = i - 1
            break
    if read_start is None:
        read_start = test_start_0idx + 5  # fallback
    if read_end is None:
        read_end = min(test_start_0idx + 20, test_end_0idx)
    return read_start, read_end

# ── Passage parsing ──────────────────────────────────────────────────────────

def parse_passages(text: str) -> list[dict]:
    """
    Parse reading section text into passages.
    Strategy: find standalone READING PASSAGE N headers (all-caps or at line start),
    skip instruction text ('You should spend…'), extract title + body.
    """
    # Find only STANDALONE headers: followed (within 120 chars) by "You should spend"
    all_matches = list(re.finditer(
        r'(?:READING\s+PASSAGE|Reading\s+Passage)\s+([123])',
        text, re.IGNORECASE
    ))
    header_matches = []
    for m in all_matches:
        after = text[m.end():m.end()+120].lower()
        if re.search(r'you\s+should\s+spend', after):
            header_matches.append(m)

    passages = []
    for idx, m in enumerate(header_matches):
        try:
            num = int(m.group(1))
        except ValueError:
            continue

        start = m.end()
        end   = header_matches[idx+1].start() if idx+1 < len(header_matches) else len(text)
        section = text[start:end].strip()

        # Skip instruction text "You should spend about 20 minutes … below."
        instr = re.search(r'below\.?\s*\n', section, re.IGNORECASE)
        if instr:
            section = section[instr.end():].strip()

        # Split body from questions at first "Questions N–M" block
        qm = QUESTION_BLK.search(section)
        if qm:
            body          = section[:qm.start()].strip()
            questions_raw = section[qm.start():].strip()
        else:
            body          = section.strip()
            questions_raw = ""

        # First non-empty line is the title
        lines = [l.strip() for l in body.split('\n') if l.strip()]
        title = lines[0] if lines else f"Passage {num}"
        if body.startswith(title):
            body = body[len(title):].strip()

        # Skip if body is too short (likely an artifact)
        if len(body.split()) < 100:
            continue

        passages.append({
            "number":        num,
            "title":         title,
            "body":          body,
            "word_count":    len(body.split()),
            "questions_raw": questions_raw,
        })
    return passages

# ── Per-book extraction ──────────────────────────────────────────────────────

def process_book(book_num: int) -> dict:
    fname, test_starts = BOOKS[book_num]
    pdf_path = MEDIA_DIR / fname
    if not pdf_path.exists():
        print(f"  ⚠  NOT FOUND: {pdf_path}")
        return {}

    out_dir = OUT_BASE / f"cambridge-{book_num}"
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)
    print(f"\n📖  C{book_num}: {fname}  ({total_pages} pages)")

    # Determine test boundaries
    if test_starts is None:
        # Auto-detect from TOC scan of first 10 pages
        test_starts = []
        for i in range(min(10, total_pages)):
            mat = fitz.Matrix(1.2, 1.2)
            pix = doc[i].get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            t = pytesseract.image_to_string(img, config="--psm 6 --oem 3 -l eng")
            m = re.search(r'Test\s+([1-4])\s+(\d+)', t)
            if m:
                test_starts.append(int(m.group(2)))
        if not test_starts:
            test_starts = [1, 33, 65, 97]  # fallback estimate
        print(f"  Auto-detected test starts: {test_starts}")

    # Convert to 0-indexed
    starts_0 = [p - 1 for p in test_starts]
    ends_0   = [starts_0[j+1] - 1 if j+1 < len(starts_0) else total_pages - 11
                for j in range(len(starts_0))]

    results = {}

    for tidx, (ts, te) in enumerate(zip(starts_0, ends_0)):
        tnum = tidx + 1
        print(f"\n  Test {tnum} (pages {ts+1}–{te+1}):")
        print(f"    Finding reading section …", end="", flush=True)

        rs, re_ = find_reading_pages(doc, ts, te)
        print(f" pages {rs+1}–{re_+1}")

        # OCR reading pages at full resolution
        pages_text = []
        for i in range(rs, re_ + 1):
            print(f"\r    OCR page {i+1}/{total_pages} …", end="", flush=True)
            t = clean(ocr_page(doc[i]))
            pages_text.append(t)
            # Save individual page for debugging
            (out_dir / f"t{tnum}_p{i+1:03d}.txt").write_text(t, encoding="utf-8")
        print()

        full_text = '\n\n'.join(pages_text)
        (out_dir / f"test{tnum}_reading_raw.txt").write_text(full_text, encoding="utf-8")

        passages = parse_passages(full_text)
        print(f"    Passages found: {len(passages)}")
        for p in passages:
            print(f"      P{p['number']} — {p['title'][:55]}  ({p['word_count']} words)")

        results[f"test{tnum}"] = {
            "pages": [rs+1, re_+1],
            "passages": passages
        }

    doc.close()

    json_path = out_dir / "passages.json"
    json_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  ✅  Saved → {json_path}")
    return results

# ── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, default=None)
    args = ap.parse_args()

    t0 = time.time()
    if args.book:
        books_to_run = [args.book]
    else:
        books_to_run = sorted(BOOKS.keys())

    all_results = {}
    for bnum in books_to_run:
        all_results[bnum] = process_book(bnum)

    elapsed = time.time() - t0
    print(f"\n\n✅  All done in {elapsed/60:.1f} min")
    print(f"Results in: {OUT_BASE}/")
    print("\nNext: run  python3 scripts/generate_go_from_ocr.py")

if __name__ == "__main__":
    main()
