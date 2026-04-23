#!/usr/bin/env python3
"""Parse OCR'd Cambridge IELTS answer keys → inject into passages.json.

Improved v2: handles IN EITHER ORDER, trailing-column answers, leading
bare-word answers, and spurious TEST headers before the answer key section.
"""
import re, json
from pathlib import Path

OCR_BASE         = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")
BOOK_TEST_OFFSET = {12: 4}   # C12 internal tests are 5-8

# ── OCR noise fixes applied to individual answer tokens ──────────────────────

OCR_FIX = [
    (r'\b8B\b|\bSB\b|\b8b\b',           'B'),
    (r'\bCc\b|\b©\b|\b¢\b|\bce\b',      'C'),
    (r'\bDd\b',                          'D'),
    (r'\b4H\b|\bAH\b',                   'H'),
    (r'(?<!\w)[£€](?!\w)',               'E'),
    (r'\bG6\b',                          'G'),
    (r'\b0D\b|\bOD\b',                   'D'),
    (r'\b0C\b|\bOC\b',                   'C'),
    (r'\b0H\b|\b0h\b',                   'H'),
    (r'^[=~°*#|@><\-]+\s*',             ''),  # leading garbage
    (r'\s*[|°~]+$',                      ''),  # trailing garbage
    (r'\s*\|\s*',                        ' '),  # pipe in middle
    (r'\s{2,}',                          ' '),
]


def fix_token(s: str) -> str:
    s = s.strip()
    for pat, repl in OCR_FIX:
        s = re.sub(pat, repl, s)
    return s.strip()


# Tokens that look like words but are actually OCR garbage
_BLOCKLIST = {
    'IN', 'SO', 'Ph', 'Ph', 'Se', 'Oi', 'iC', 'ij', 'iy', 'ji',
    'rs', 'va', 'ay', 'yl', 'sre', 'atc', 'wey', 'Cs', 'oH',
    'Ox', 'OC', 'OD',
}


def normalise(raw: str) -> str | None:
    s = fix_token(raw)
    if not s:
        return None
    su = s.upper()
    if re.match(r'NOT\s*GIVEN', su):
        return 'NOT GIVEN'
    if su in ('TRUE', 'FALSE', 'YES', 'NO'):
        return su
    if re.match(r'^[A-H]$', s):
        return s.upper()
    if re.match(r'^(?:i{1,3}|iv|vi{0,3}|ix|x[i-v]?|xi{0,3})$', s, re.I):
        return s.lower()
    if re.match(r'^\d[\d./]+$', s):
        return s
    # Reject blocklisted OCR garbage
    if s in _BLOCKLIST or s.upper() in {b.upper() for b in _BLOCKLIST}:
        return None
    # Reject mixed case 2-char tokens that aren't known abbreviations (OCR noise)
    if len(s) == 2 and s[0].isupper() and s[1].islower():
        return None  # e.g., 'Ph', 'Se', 'Cs', 'oH' etc.
    # Word / short phrase up to 4 words, sensible characters
    if re.match(r'^[a-zA-Z][a-zA-Z0-9()\'/\- ]{0,40}$', s) and len(s.split()) <= 4:
        return s
    return None


# ── Regex patterns ────────────────────────────────────────────────────────────

# Q number + optional garbage + answer (covers "27 =F", "3° NOT GIVEN", "4 ~~ films")
PAIR_RE = re.compile(
    r'(?<!\d)(\d{1,2})[°\s]*[.):]?\s+'
    r'[=~°*#|@><\-]*\s*'
    r'(NOT\s+GIVEN|TRUE\b|FALSE\b|YES\b|NO\b'
    r'|[A-H](?!\w)'
    r'|(?:i{1,3}|iv|vi{0,3}|ix|x[i-v]?|xi{0,3})(?!\w)'
    r'|[a-zA-Z][a-zA-Z0-9()\'/\-]{0,35})',
    re.IGNORECASE,
)

# "11&12 IN EITHER ORDER" or "4&5&6 IN EITHER ORDER"
EITHER_ORDER_RE = re.compile(
    r'(\d{1,2}(?:[&,]\s*\d{1,2})+)\s+IN\s+EITHER\s+ORDER', re.IGNORECASE
)

# A line (or token) that IS entirely a single valid answer
SINGLE_ANS_RE = re.compile(
    r'^[=~°*#|@><\-]*\s*'
    r'(NOT\s+GIVEN|TRUE\b|FALSE\b|YES\b|NO\b'
    r'|[A-H](?!\w)'
    r'|(?:i{1,3}|iv|vi{0,3}|ix|x[i-v]?|xi{0,3})(?!\w)'
    r'|[a-zA-Z][a-zA-Z0-9()\'/\-]{0,35})$',
    re.IGNORECASE,
)

TEST_HDR     = re.compile(r'\bTEST\s+(\d+)\b', re.I)
ANSWER_START = re.compile(r'reading\s+answer\s+key', re.I)
IS_READ      = re.compile(r'\bREADING\b|Listening\s+and\s+Reading\s+Answer', re.I)
NOT_READ     = re.compile(r'Passage|Questions|task|sample|score|if you score', re.I)
IS_LISTEN    = re.compile(r'\bLISTENING\b', re.I)


# ── Parser ───────────────────────────────────────────────────────────────────

def parse_answers(text: str, book: int) -> dict[int, dict[int, str]]:
    """Return {test_number: {question_number: answer}} for reading Q 1-40."""
    offset = BOOK_TEST_OFFSET.get(book, 0)

    # Skip any content that appears before the actual answer key section.
    m_start = ANSWER_START.search(text)
    if m_start:
        text = text[m_start.start():]

    # C12: raw starts directly with reading answers (no LISTENING/TEST header before reading)
    if book == 12 and not TEST_HDR.search(text[:500]):
        text = "TEST 5\n" + text

    results:      dict[int, dict[int, str]] = {}
    current_test: int | None = None
    in_reading   = False
    last_section: str | None = None
    test_via_hdr = False

    # IN EITHER ORDER state
    eo_pending: list[int] = []   # Q numbers still awaiting answers

    def assign_eo(raw_ans: str):
        """Assign answer to next pending EITHER ORDER Q number."""
        if eo_pending:
            ans = normalise(raw_ans)
            if ans:
                qn = eo_pending.pop(0)
                results.setdefault(current_test, {})[qn] = ans

    for raw in text.split('\n'):
        line = raw.strip()
        if not line or line.startswith('---'):
            continue

        # ── Test header ───────────────────────────────────────────────────────
        tm = TEST_HDR.search(line)
        if tm:
            # Extra validation: line should look like a header (short, few words)
            words = [w for w in re.sub(r'[^a-zA-Z0-9 ]', ' ', line).split() if w]
            non_test = [w for w in words if not re.match(r'^(TEST|[0-9]+)$', w, re.I)]
            if len(non_test) > 3:
                # Too many extra words — not a real TEST header (e.g., "Test 4 SPEAKING")
                pass
            else:
                t = int(tm.group(1)) - offset
                if 1 <= t <= 10:
                    current_test = t
                    in_reading   = False
                    test_via_hdr = True
                    eo_pending   = []
            continue

        # ── Section headers ───────────────────────────────────────────────────
        # "Listening and Reading Answer Keys" is a PAGE HEADER, not a section
        # marker — treat as reading trigger (for C12 the actual LISTENING line
        # comes right after and triggers the test-number increment).
        is_lr_header   = re.search(r'Listening\s+and\s+Reading\s+Answer', line, re.I)
        is_read_line   = IS_READ.search(line)   and not NOT_READ.search(line)
        is_listen_line = (IS_LISTEN.search(line) and not NOT_READ.search(line)
                          and not is_lr_header)

        if is_read_line:
            in_reading   = True
            last_section = 'read'
            test_via_hdr = False
            eo_pending   = []
            continue

        if is_listen_line:
            if book == 12 and last_section == 'read' and not test_via_hdr:
                current_test = (current_test or 0) + 1
                eo_pending   = []
            in_reading   = False
            last_section = 'listen'
            continue

        if not in_reading or current_test is None or current_test < 1:
            continue

        bucket = results.setdefault(current_test, {})

        # ── IN EITHER ORDER declaration ───────────────────────────────────────
        em = EITHER_ORDER_RE.search(line)
        if em:
            nums = [int(x) for x in re.findall(r'\d{1,2}', em.group(1))
                    if 1 <= int(x) <= 40]
            eo_pending.extend(nums)
            # Collect normal Q pairs from the same line (right-column pairs)
            for m in PAIR_RE.finditer(line):
                qn = int(m.group(1))
                if qn not in nums and 1 <= qn <= 40:
                    ans = normalise(m.group(2))
                    if ans:
                        bucket[qn] = ans
            continue

        # ── Collect into line: extract pairs + handle EITHER ORDER context ────
        all_m = list(PAIR_RE.finditer(line))

        if not all_m:
            # No Q numbers on this line.
            # Could be a bare-answer line for EITHER ORDER (e.g., "traffic")
            if eo_pending:
                sm = SINGLE_ANS_RE.match(line)
                if sm:
                    assign_eo(sm.group(1))
            continue

        first_start = all_m[0].start()

        # Content BEFORE the first Q pair (bare answer from left column in EITHER ORDER)
        if first_start > 0 and eo_pending:
            prefix = line[:first_start].strip()
            sm = SINGLE_ANS_RE.match(prefix)
            if sm and sm.group(0).strip() == prefix:
                assign_eo(sm.group(1))

        # Extract all Q pairs
        for m in all_m:
            qn = int(m.group(1))
            if 1 <= qn <= 40:
                ans = normalise(m.group(2))
                if ans:
                    bucket[qn] = ans

        # Content AFTER the last Q pair (bare answer from right column in EITHER ORDER)
        if eo_pending:
            last_end = all_m[-1].end()
            suffix = line[last_end:].strip()
            if suffix:
                # Could be multiple tokens (rare but possible)
                for tok in suffix.split():
                    if eo_pending:
                        assign_eo(tok)

    return results


# ── Inject into passages.json ─────────────────────────────────────────────────

PASSAGE_Q_OFFSETS = {1: 0, 2: 13, 3: 26}
PASSAGE_Q_COUNTS  = {1: 13, 2: 13, 3: 14}


def inject(book: int, answers: dict[int, dict[int, str]]):
    """Update answer_keys in passages.json; only touch tests present in answers."""
    pj   = OCR_BASE / f"cambridge-{book}" / "passages.json"
    data = json.loads(pj.read_text())
    for tkey, tdata in data.items():
        tnum = int(tkey.replace('test', ''))
        if tnum not in answers:
            continue   # don't wipe tests not in this parse run
        qa = answers[tnum]
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

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--book', type=int, default=None)
    args = ap.parse_args()

    books = [args.book] if args.book else [12, 13, 14, 15, 16]
    grand_f = grand_t = 0

    for b in books:
        raw_path = OCR_BASE / f"cambridge-{b}" / "answer_keys_raw.txt"
        if not raw_path.exists():
            print(f"C{b}: answer_keys_raw.txt not found — run ocr_answer_keys.py first")
            continue
        text = raw_path.read_text(encoding='utf-8')
        answers = parse_answers(text, b)
        inject(b, answers)

        filled = sum(len(v) for v in answers.values())
        total  = len(answers) * 40
        pct    = 100 * filled // total if total else 0
        print(f"C{b}: tests={sorted(answers.keys())}  {filled}/{total} ({pct}%)")
        for t, qa in sorted(answers.items()):
            qs = sorted(qa.keys())
            miss = [q for q in range(1, 41) if q not in qa]
            print(f"  T{t}: {len(qa)}/40  missing={miss}")
            if qs:
                sample = {k: qa[k] for k in qs[:6]}
                print(f"        sample={sample}")

        pj = json.loads((OCR_BASE / f"cambridge-{b}" / "passages.json").read_text())
        for t in pj.values():
            for p in t.get('passages', []):
                cnt = PASSAGE_Q_COUNTS[p['number']]
                grand_t += cnt
                grand_f += len(p.get('answer_keys', {}))

    pct = 100 * grand_f // grand_t if grand_t else 0
    print(f"\nTotal reading Qs answered: {grand_f}/{grand_t} ({pct}%)")
