#!/usr/bin/env python3
"""Parse OCR'd Cambridge IELTS answer keys → inject into passages.json."""
import re, json
from pathlib import Path

OCR_BASE = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")
BOOK_TEST_OFFSET = {12: 4}

OCR_FIXES = [
    (r'\b8B\b|\bSB\b', 'B'), (r'\bCc\b', 'C'), (r'\bDd\b', 'D'),
    (r'\b4H\b', 'H'), (r'(?<!\w)£(?!\w)', 'E'),
    (r"^[~\-–—=*'`&<>]+\s*", ''), (r'\s*[|]+\s*', ' '),
    (r'^~~\s*', ''), (r'\s{2,}', ' '),
]

def normalise(s: str):
    s = s.strip()
    for pat, repl in OCR_FIXES:
        s = re.sub(pat, repl, s)
    s = s.strip('.,;: ')
    if not s: return None
    su = s.upper()
    if re.match(r'NOT\s*GIVEN', su): return 'NOT GIVEN'
    if su in ('TRUE','FALSE','YES','NO'): return su
    if re.match(r'^[A-H]$', s): return s.upper()
    if re.match(r'^(?:i{1,3}|iv|vi{0,3}|ix|x)$', s, re.I): return s.lower()
    if re.match(r'^\d[\d./]+$', s): return s
    if re.match(r'^[a-zA-Z][a-zA-Z()\'/\- ]{0,40}$', s) and len(s.split()) <= 4:
        return s
    return None

PAIR_RE = re.compile(
    r'(?<!\d)(\d{1,2})(?:&\d{1,2})?\s*[.):]?\s+'
    r'(NOT\s+GIVEN|TRUE|FALSE|YES\b|NO\b|[A-H](?!\w)|[ivxlIVXL]{1,5}(?!\w)'
    r'|[a-zA-Z][a-zA-Z()\'/\-]{0,35})'
)

def extract_pairs(line: str):
    return [(int(m.group(1)), normalise(m.group(2)))
            for m in PAIR_RE.finditer(line)
            if 1 <= int(m.group(1)) <= 40 and normalise(m.group(2))]

TEST_HDR  = re.compile(r'TEST\s+(\d+)', re.I)
IS_READ   = re.compile(r'\bREADING\b', re.I)
NOT_READ  = re.compile(r'Passage|Questions|answer key|task|sample|score', re.I)
IS_LISTEN = re.compile(r'\bLISTENING\b', re.I)

def parse_book_answers(book: int):
    ak = OCR_BASE / f"cambridge-{book}" / "answer_keys_raw.txt"
    if not ak.exists(): return {}
    text = ak.read_text(encoding='utf-8')
    offset = BOOK_TEST_OFFSET.get(book, 0)

    if book == 12 and not TEST_HDR.search(text[:300]):
        text = "TEST 5\n" + text

    results: dict[int, dict[int, str]] = {}
    current_test   = None
    in_reading     = False
    last_section   = None
    test_via_hdr   = False   # was current_test set by explicit TEST N header?

    for raw in text.split('\n'):
        line = raw.strip()
        if not line or line.startswith('---'): continue

        tm = TEST_HDR.search(line)
        if tm:
            t = int(tm.group(1)) - offset
            if 1 <= t <= 10:
                # Only update if it's a new test or same test (reading section of same test)
                if t >= (current_test or 0):
                    current_test = t
                    in_reading   = False
                    test_via_hdr = True
            continue

        if IS_LISTEN.search(line) and not NOT_READ.search(line):
            # Auto-increment ONLY for C12 implicit test detection:
            # only if last section was READING and test was set via auto-increment (not explicit header)
            if book == 12 and last_section == 'read' and not test_via_hdr:
                current_test = (current_test or 0) + 1
                test_via_hdr = False
            in_reading  = False
            last_section = 'listen'
            continue

        if IS_READ.search(line) and not NOT_READ.search(line):
            in_reading   = True
            last_section = 'read'
            test_via_hdr = False   # reading section resets the flag (next LISTEN can auto-increment)
            continue

        if not in_reading or current_test is None or current_test < 1:
            continue

        for n, ans in extract_pairs(line):
            results.setdefault(current_test, {})[n] = ans

    return results


def inject(book: int, answers: dict[int, dict[int, str]]):
    OFFSETS = {1: 0, 2: 13, 3: 26}
    pj   = OCR_BASE / f"cambridge-{book}" / "passages.json"
    data = json.loads(pj.read_text())
    for tkey, tdata in data.items():
        tnum = int(tkey.replace('test', ''))
        qa   = answers.get(tnum, {})
        for p in tdata.get('passages', []):
            pnum, off = p['number'], OFFSETS[p['number']]
            q_end = off + (14 if pnum == 3 else 13)
            ak = {str(q): qa[q] for q in range(off+1, q_end+1) if q in qa}
            if ak: p['answer_keys'] = ak
            elif 'answer_keys' in p: del p['answer_keys']
    pj.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    grand_q = grand_f = 0
    for b in [12, 13, 14, 15, 16]:
        ans = parse_book_answers(b)
        inject(b, ans)
        filled = sum(len(v) for v in ans.values())
        total  = len(ans) * 40
        grand_q += total; grand_f += filled
        pct = 100*filled//total if total else 0
        print(f"C{b}: tests={sorted(ans.keys())}  {filled}/{total} ({pct}%)")
        for t, qa in sorted(ans.items()):
            qs = sorted(qa.keys())
            print(f"  T{t}: {len(qa)} Q  [{qs[0]}…{qs[-1]}]  sample: "
                  + str({k:qa[k] for k in list(qs)[:4]}))
    pct = 100*grand_f//grand_q if grand_q else 0
    print(f"\nTotal: {grand_f}/{grand_q} ({pct}%)")
