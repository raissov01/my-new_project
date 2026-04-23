#!/usr/bin/env python3
"""
Fast OCR for Cambridge IELTS PDFs using known page ranges.
Usage: python3 scripts/fast_ocr.py [--book 12]
"""
import sys, re, json, io
from pathlib import Path
import fitz
from PIL import Image
import pytesseract

MEDIA = Path("/home/midoriya/my-new_project/backend/telegram-media")
OUT   = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")

# Known reading page ranges (1-indexed, inclusive) per book per test
# Derived from TOC + confirmed structure: Listening takes ~5 pages, Reading ~13-14 pages
READING_PAGES = {
    12: {  # Tests 5-8 in book, but we call them 1-4; TOC: 10,30,53,74
        1: (15, 29),
        2: (35, 48),
        3: (58, 71),
        4: (79, 93),
    },
    14: {  # Starts at page 1; no intro; TOC: 1,23,45,67
        1: (7, 19),
        2: (29, 41),
        3: (51, 63),
        4: (73, 85),
    },
    15: {  # TOC: 10,31,52,74
        1: (15, 28),
        2: (36, 49),
        3: (57, 70),
        4: (79, 92),
    },
    16: {  # TOC: 10,32,55,76
        1: (15, 29),
        2: (37, 51),
        3: (60, 74),
        4: (81, 95),
    },
    20: {  # Starts at page 1; reading section ~pages 6-26 per test
        1: (6, 26),
        2: (35, 56),
        3: (64, 84),
        4: (93, 113),
    },
}

FILES = {
    12: "79_Cambridge IELTS 12 PDF.pdf",
    14: "81_IELTS Cambridge IELTS 14.pdf",
    15: "78_s cambridge_ielts_15.pdf",
    16: "83_x Cambridge IELTS 16 Academic.pdf",
    20: "3110_CAMBRIDGE IELTS 20 (@REALEXAMIELTS).pdf",
}

PASSAGE_HDR  = re.compile(r'(?:READING\s+PASSAGE|Reading\s+Passage)\s+([123])', re.IGNORECASE)
QUESTION_BLK = re.compile(r'Questions?\s+(\d+)\s*[-–—]\s*(\d+)', re.IGNORECASE)


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

PASSAGE_HDR_V2 = re.compile(r'Test\d+[-_—]reading[-_—]passage([123])', re.IGNORECASE)

def parse_passages(text, book_num=0):
    # C20 uses "Test1-reading-passage1" format without "You should spend" instruction
    if PASSAGE_HDR_V2.search(text):
        return parse_passages_v2(text)

    all_m = list(PASSAGE_HDR.finditer(text))
    headers = []
    for m in all_m:
        after = text[m.end():m.end()+120].lower()
        if re.search(r'you\s+should\s+spend', after):
            headers.append(m)

    passages = []
    for idx, m in enumerate(headers):
        try: num = int(m.group(1))
        except ValueError: continue
        start = m.end()
        end   = headers[idx+1].start() if idx+1 < len(headers) else len(text)
        sec   = text[start:end].strip()

        # Skip instruction text ("You should spend…Passage N…") — only look in first 500 chars
        instr_m = re.search(r'Passage\s+[123][^\n]*\n+', sec[:500], re.IGNORECASE)
        if instr_m:
            sec = sec[instr_m.end():].strip()

        # Strip "List of Headings" block if present near start (matching headings Q type)
        loh = re.search(r'\bList of Headings\b', sec, re.IGNORECASE)
        if loh and loh.start() < 600:
            after_loh = sec[loh.start():]
            # Headings list ends when Roman numeral sequence stops; passage body follows
            body_start = re.search(r'\n([A-Z][^ivxlIVXL\n]{5,})', after_loh)
            if body_start:
                sec = after_loh[body_start.start():].strip()

        qm = QUESTION_BLK.search(sec)
        if qm:
            body = sec[:qm.start()].strip()
            q_raw = sec[qm.start():].strip()
        else:
            body = sec.strip()
            q_raw = ""

        lines = [l.strip() for l in body.split('\n') if l.strip()]
        title = lines[0] if lines else f"Passage {num}"
        if body.startswith(title):
            body = body[len(title):].strip()

        if len(body.split()) < 100:
            continue

        passages.append({"number": num, "title": title,
                         "body": body, "word_count": len(body.split()),
                         "questions_raw": q_raw})
    return passages


def parse_passages_v2(text):
    """Parser for C20-style format: Test1-reading-passage1 headers, no instruction text."""
    headers = list(PASSAGE_HDR_V2.finditer(text))
    passages = []
    for idx, m in enumerate(headers):
        try: num = int(m.group(1))
        except ValueError: continue
        start = m.end()
        end   = headers[idx+1].start() if idx+1 < len(headers) else len(text)
        sec   = text[start:end].strip()

        qm = QUESTION_BLK.search(sec)
        if qm:
            body  = sec[:qm.start()].strip()
            q_raw = sec[qm.start():].strip()
        else:
            body  = sec.strip()
            q_raw = ""

        lines = [l.strip() for l in body.split('\n') if l.strip()]
        title = lines[0] if lines else f"Passage {num}"
        if body.startswith(title):
            body = body[len(title):].strip()

        if len(body.split()) < 100:
            continue

        passages.append({"number": num, "title": title,
                         "body": body, "word_count": len(body.split()),
                         "questions_raw": q_raw})
    return passages


def process(book_num):
    fname = FILES.get(book_num)
    if not fname:
        print(f"C{book_num}: not in FILES dict"); return
    pdf_path = MEDIA / fname
    if not pdf_path.exists():
        print(f"C{book_num}: PDF not found {pdf_path}"); return

    out_dir = OUT / f"cambridge-{book_num}"
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf_path))
    total = len(doc)
    print(f"\n📖  C{book_num}: {total} pages")

    results = {}
    ranges  = READING_PAGES[book_num]

    for tnum, (p_start, p_end) in ranges.items():
        # Clamp to actual pages
        p_start = max(1, p_start)
        p_end   = min(total, p_end)
        print(f"  Test {tnum}: OCR pages {p_start}–{p_end} …", end="", flush=True)

        pages_text = []
        for i in range(p_start-1, p_end):
            t = clean(ocr_page(doc[i]))
            pages_text.append(t)
            print(".", end="", flush=True)
        print()

        full = '\n\n'.join(pages_text)
        (out_dir / f"test{tnum}_reading_raw.txt").write_text(full, encoding='utf-8')

        passages = parse_passages(full)
        print(f"  → {len(passages)} passages: " +
              ", ".join(f"P{p['number']}({p['word_count']}w)" for p in passages))

        results[f"test{tnum}"] = {"pages": [p_start, p_end], "passages": passages}

    doc.close()
    (out_dir / "passages.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"  ✅  {out_dir}/passages.json")
    return results


import argparse
ap = argparse.ArgumentParser()
ap.add_argument("--book", type=int)
args = ap.parse_args()

if args.book:
    process(args.book)
else:
    for b in sorted(FILES.keys()):
        process(b)
