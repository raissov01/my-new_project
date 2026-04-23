#!/usr/bin/env python3
"""
Re-OCR Cambridge IELTS answer key pages at zoom=3.5, then parse into passages.json.
Usage: python3 scripts/ocr_answer_keys.py [--book 13]
"""
import sys, re, json, io, argparse
from pathlib import Path
import fitz
from PIL import Image
import pytesseract

OCR_BASE = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")

BOOK_TEST_OFFSET = {12: 4}   # C12 tests are internally numbered 5-8

# PDF files and their answer-key page ranges (1-indexed, inclusive)
BOOKS = {
    12: {
        "file": "/home/midoriya/my-new_project/backend/telegram-media/79_Cambridge IELTS 12 PDF.pdf",
        "ak_pages": (117, 124),   # p113-116 = speaking/writing; p117 = first answer key page
        "zoom": 2.5,              # zoom=3.5 introduces OCR noise for this PDF
    },
    13: {
        "file": "/home/midoriya/my-new_project/backend/telegram-media/77_IELTS Cambridge 13.pdf",
        "ak_pages": (115, 125),
        "zoom": 3.5,
    },
    14: {
        "file": "/home/midoriya/my-new_project/backend/telegram-media/81_IELTS Cambridge IELTS 14.pdf",
        "ak_pages": (86, 95),
        "zoom": 3.5,
    },
    15: {
        "file": "/home/midoriya/my-new_project/backend/telegram-media/78_s cambridge_ielts_15.pdf",
        "ak_pages": (119, 130),
        "zoom": 3.5,
    },
    16: {
        "file": "/home/midoriya/my-new_project/backend/telegram-media/83_x Cambridge IELTS 16 Academic.pdf",
        "ak_pages": (120, 131),
        "zoom": 3.5,
    },
}

# ── OCR ───────────────────────────────────────────────────────────────────────

def ocr_page(page, zoom=3.5):
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    # PSM 6 = single uniform block; OEM 3 = LSTM engine
    return pytesseract.image_to_string(img, config="--psm 6 --oem 3 -l eng")

def ocr_book(book: int) -> str:
    info = BOOKS[book]
    zoom = info.get("zoom", 3.5)
    doc  = fitz.open(info["file"])
    p0, p1 = info["ak_pages"]
    p0 = max(1, p0); p1 = min(len(doc), p1)
    print(f"  OCR pages {p0}–{p1} zoom={zoom} …", end="", flush=True)
    parts = []
    mat = fitz.Matrix(zoom, zoom)
    for i in range(p0 - 1, p1):
        pix = doc[i].get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        t = pytesseract.image_to_string(
            Image.open(io.BytesIO(pix.tobytes("png"))),
            config="--psm 6 --oem 3 -l eng"
        )
        parts.append(t)
        print(".", end="", flush=True)
    doc.close()
    print()
    return "\n\n--- PAGE ---\n\n".join(parts)


# ── Parser ───────────────────────────────────────────────────────────────────

# OCR noise map applied to answer tokens
OCR_FIX_RE = [
    # common single-char misreads
    (r'\b8B\b|\bSB\b|\b8b\b',          'B'),
    (r'\bCc\b|\b©\b|\b¢\b|\bce\b',     'C'),
    (r'\bDd\b',                         'D'),
    (r'\b4H\b|\bAH\b',                  'H'),
    (r'(?<!\w)[£€](?!\w)',              'E'),
    (r'\bG6\b',                         'G'),
    # leading garbage on a token
    (r'^[=~°*#|@><\-]+\s*',            ''),
    # trailing garbage
    (r'\s*[|°~]+$',                     ''),
    # pipe inside answer
    (r'\s*\|\s*',                       ' '),
    # collapsed spaces
    (r'\s{2,}',                         ' '),
]

def fix_token(s: str) -> str:
    s = s.strip()
    for pat, repl in OCR_FIX_RE:
        s = re.sub(pat, repl, s)
    return s.strip()

def normalise(s: str):
    s = fix_token(s)
    if not s:
        return None
    su = s.upper()
    # Canonical multi-word answers
    if re.match(r'NOT\s*GIVEN', su):   return 'NOT GIVEN'
    if su in ('TRUE', 'FALSE', 'YES', 'NO'):  return su.upper()
    # Single uppercase letter A-H
    if re.match(r'^[A-H]$', s):        return s.upper()
    # Roman numerals i–xiv
    if re.match(r'^(?:i{1,3}|iv|vi{0,3}|ix|x[i-v]?|xi{0,3})$', s, re.I):
        return s.lower()
    # Pure numbers / decimals
    if re.match(r'^\d[\d./]+$', s):    return s
    # Word / short phrase (up to 4 words, reasonable chars)
    if re.match(r'^[a-zA-Z][a-zA-Z0-9()\'/\-]{0,40}$', s) and len(s.split()) <= 4:
        return s
    return None


# Q-number + optional garbage + answer  (e.g. "27 =F", "3° NOT GIVEN", "4 ~~ films")
PAIR_RE = re.compile(
    r'(?<!\d)(\d{1,2})[°\s]*[.):]?\s+'   # question number (optionally followed by °)
    r'[=~°*#|@><\-]*\s*'                  # optional leading garbage before answer
    r'(NOT\s+GIVEN|TRUE\b|FALSE\b|YES\b|NO\b'
    r'|[A-H](?!\w)'
    r'|(?:i{1,3}|iv|vi{0,3}|ix|x[i-v]?|xi{0,3})(?!\w)'
    r'|[a-zA-Z][a-zA-Z0-9()\'/\-]{0,35})',
    re.IGNORECASE
)

# "N&M IN EITHER ORDER" or "N&M&P IN EITHER ORDER"
EITHER_ORDER_RE = re.compile(
    r'(\d{1,2})(?:[&,]\d{1,2})+\s+IN\s+EITHER\s+ORDER', re.IGNORECASE
)
SINGLE_ANSWER_RE = re.compile(
    r'^[=~°*#|@><\-]*\s*'
    r'(NOT\s+GIVEN|TRUE\b|FALSE\b|YES\b|NO\b'
    r'|[A-H](?!\w)'
    r'|(?:i{1,3}|iv|vi{0,3}|ix|x[i-v]?|xi{0,3})(?!\w)'
    r'|[a-zA-Z][a-zA-Z0-9()\'/\-]{0,35})$',
    re.IGNORECASE
)

TEST_HDR  = re.compile(r'\bTEST\s+(\d+)\b', re.I)
IS_READ   = re.compile(r'\bREADING\b', re.I)
NOT_READ  = re.compile(r'Passage|Questions|answer key|task|sample|score|if you score', re.I)
IS_LISTEN = re.compile(r'\bLISTENING\b', re.I)


def extract_pairs(line: str) -> list[tuple[int, str]]:
    results = []
    for m in PAIR_RE.finditer(line):
        qn  = int(m.group(1))
        ans = normalise(m.group(2))
        if 1 <= qn <= 40 and ans:
            results.append((qn, ans))
    return results


def parse_answers(text: str, book: int) -> dict[int, dict[int, str]]:
    """Return {test_number: {question_number: answer}}"""
    offset   = BOOK_TEST_OFFSET.get(book, 0)
    results: dict[int, dict[int, str]] = {}

    # C12: answer key has no explicit TEST headers; first test starts implicitly
    if book == 12 and not TEST_HDR.search(text[:500]):
        text = "TEST 5\n" + text

    current_test  = None
    in_reading    = False
    test_via_hdr  = False  # True = test set by explicit TEST N header
    last_section  = None

    # pending "IN EITHER ORDER" state: list of Q numbers awaiting answers
    either_order_pending: list[int] = []
    either_order_collected: list[str] = []
    either_order_need = 0

    def flush_either_order():
        nonlocal either_order_pending, either_order_collected, either_order_need
        if either_order_pending and current_test:
            bucket = results.setdefault(current_test, {})
            for i, qn in enumerate(either_order_pending):
                if i < len(either_order_collected):
                    bucket[qn] = either_order_collected[i]
        either_order_pending = []
        either_order_collected = []
        either_order_need = 0

    for raw in text.split('\n'):
        line = raw.strip()
        if not line or line.startswith('---'):
            continue

        # ── Section / test headers ────────────────────────────────────────────
        tm = TEST_HDR.search(line)
        if tm:
            flush_either_order()
            t = int(tm.group(1)) - offset
            if 1 <= t <= 10 and t >= (current_test or 0):
                current_test = t
                in_reading   = False
                test_via_hdr = True
            continue

        if IS_LISTEN.search(line) and not NOT_READ.search(line):
            flush_either_order()
            # C12 implicit test increment: LISTENING after READING with no explicit TEST header
            if book == 12 and last_section == 'read' and not test_via_hdr:
                current_test = (current_test or 0) + 1
                test_via_hdr = False
            in_reading   = False
            last_section = 'listen'
            continue

        if IS_READ.search(line) and not NOT_READ.search(line):
            flush_either_order()
            in_reading   = True
            last_section = 'read'
            test_via_hdr = False
            continue

        if not in_reading or current_test is None or current_test < 1:
            continue

        # ── IN EITHER ORDER pending collection ───────────────────────────────
        if either_order_need > 0:
            sm = SINGLE_ANSWER_RE.match(line)
            if sm:
                ans = normalise(sm.group(1))
                if ans:
                    either_order_collected.append(ans)
                    either_order_need -= 1
                    if either_order_need == 0:
                        flush_either_order()
                    continue
            # If not a single answer, flush with what we have and fall through
            flush_either_order()

        # ── IN EITHER ORDER declaration ───────────────────────────────────────
        em = EITHER_ORDER_RE.search(line)
        if em:
            flush_either_order()
            nums = [int(x) for x in re.findall(r'\d{1,2}', em.group(0))]
            nums = [n for n in nums if 1 <= n <= 40]
            either_order_pending = nums
            either_order_need    = len(nums)
            # also parse any normal pairs on the same line (handles "11&12 ... 31 industry")
            for qn, ans in extract_pairs(line):
                if qn not in nums:
                    results.setdefault(current_test, {})[qn] = ans
            continue

        # ── Normal pairs ──────────────────────────────────────────────────────
        for qn, ans in extract_pairs(line):
            results.setdefault(current_test, {})[qn] = ans

    flush_either_order()
    return results


# ── Inject into passages.json ─────────────────────────────────────────────────

PASSAGE_Q_OFFSETS = {1: 0, 2: 13, 3: 26}
PASSAGE_Q_COUNTS  = {1: 13, 2: 13, 3: 14}

def inject(book: int, answers: dict[int, dict[int, str]]):
    pj   = OCR_BASE / f"cambridge-{book}" / "passages.json"
    data = json.loads(pj.read_text())
    for tkey, tdata in data.items():
        tnum = int(tkey.replace('test', ''))
        qa   = answers.get(tnum, {})
        for p in tdata.get('passages', []):
            pnum = p['number']
            off  = PASSAGE_Q_OFFSETS[pnum]
            cnt  = PASSAGE_Q_COUNTS[pnum]
            ak   = {str(q): qa[q] for q in range(off + 1, off + cnt + 1) if q in qa}
            if ak:
                p['answer_keys'] = ak
            elif 'answer_keys' in p:
                del p['answer_keys']
    pj.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


# ── Main ──────────────────────────────────────────────────────────────────────

def run(book: int, skip_ocr: bool = False):
    raw_path = OCR_BASE / f"cambridge-{book}" / "answer_keys_raw.txt"
    if skip_ocr and raw_path.exists():
        print(f"C{book}: using cached {raw_path}")
        text = raw_path.read_text(encoding='utf-8')
    else:
        print(f"C{book}: OCR …")
        text = ocr_book(book)
        raw_path.write_text(text, encoding='utf-8')
        print(f"  → saved {raw_path}")

    answers = parse_answers(text, book)
    inject(book, answers)

    filled = sum(len(v) for v in answers.values())
    total  = len(answers) * 40
    pct    = 100 * filled // total if total else 0
    print(f"  tests={sorted(answers.keys())}  {filled}/{total} ({pct}%) reading answers")
    for t, qa in sorted(answers.items()):
        reading_qs = {k: v for k, v in qa.items() if 1 <= k <= 40}
        qs = sorted(reading_qs.keys())
        if qs:
            missing = [q for q in range(1, 41) if q not in reading_qs]
            print(f"    T{t}: {len(reading_qs)}/40  missing={missing[:8]}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--book', type=int, default=None)
    ap.add_argument('--skip-ocr', action='store_true',
                    help='Re-use existing answer_keys_raw.txt instead of re-OCRing')
    args = ap.parse_args()

    books = [args.book] if args.book else list(BOOKS.keys())
    grand_f = grand_t = 0
    for b in books:
        run(b, skip_ocr=args.skip_ocr)
        pj = json.loads((OCR_BASE / f"cambridge-{b}" / "passages.json").read_text())
        for t in pj.values():
            for p in t.get('passages', []):
                cnt = PASSAGE_Q_COUNTS[p['number']]
                grand_t += cnt
                grand_f += len(p.get('answer_keys', {}))

    pct = 100 * grand_f // grand_t if grand_t else 0
    print(f"\nTotal: {grand_f}/{grand_t} reading-Q answers ({pct}%)")
