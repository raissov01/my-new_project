#!/usr/bin/env python3
"""
Cambridge IELTS PDF → Go seed extractor.

Usage:
  python3 extract_cambridge_pdf.py <pdf_path> <book_number> [--test <1|2|3|4>]

Examples:
  python3 extract_cambridge_pdf.py ~/books/cambridge-12.pdf 12
  python3 extract_cambridge_pdf.py ~/books/cambridge-17.pdf 17 --test 1

Output:
  scripts/cambridge_extracted/cambridge-<N>/
    raw_text.txt          — full extracted text (for manual review)
    passages.json         — structured passages + questions
    seed_reading.go       — ready-to-paste Go reading seed code
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Install pdfplumber first:  pip3 install pdfplumber --break-system-packages")

# ─── helpers ────────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    """Normalize whitespace and remove common PDF artefacts."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text.strip()

def extract_full_text(pdf_path: str) -> list[str]:
    """Return a list of page texts from the PDF."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            pages.append(clean(t))
    return pages


# ─── passage / question detection ───────────────────────────────────────────

# Cambridge IELTS uses "READING PASSAGE 1", "Reading Passage 2", etc.
PASSAGE_HEADER = re.compile(
    r'(?:READING\s+PASSAGE|Reading\s+Passage|PASSAGE)\s+([123])',
    re.IGNORECASE,
)

QUESTION_BLOCK = re.compile(
    r'Questions\s+(\d+)\s*[-–]\s*(\d+)',
    re.IGNORECASE,
)

QUESTION_LINE = re.compile(r'^(\d{1,2})\s+(.+)$')

TFN_PATTERN  = re.compile(r'\b(TRUE|FALSE|NOT GIVEN)\b', re.IGNORECASE)
YNNG_PATTERN = re.compile(r'\b(YES|NO|NOT GIVEN)\b',    re.IGNORECASE)
MC_PATTERN   = re.compile(r'^[A-D]\s+.+')

QUESTION_TYPE_HINTS = {
    'true_false_not_given':  ['TRUE', 'FALSE', 'NOT GIVEN'],
    'yes_no_not_given':      ['YES',  'NO',    'NOT GIVEN'],
    'sentence_completion':   ['complete', 'sentences', 'NO MORE THAN'],
    'summary_completion':    ['summary', 'Complete the summary'],
    'matching_headings':     ['heading', 'paragraph', 'List of Headings'],
    'multiple_choice':       ['Choose', 'Which', 'circle the letter'],
    'short_answer':          ['NO MORE THAN', 'Write', 'short answer'],
}


def detect_question_type(block_text: str) -> str:
    t = block_text.upper()
    if 'TRUE' in t and 'FALSE' in t and 'NOT GIVEN' in t:
        return 'tfn'
    if 'YES' in t and 'NO' in t and 'NOT GIVEN' in t:
        return 'ynng'
    if 'HEADING' in t or 'LIST OF HEADINGS' in t:
        return 'mh'
    if 'SUMMARY' in t or 'COMPLETE THE FOLLOWING SUMMARY' in t:
        return 'summ'
    if re.search(r'NO MORE THAN (ONE|TWO|THREE|\d+) WORD', t):
        return 'sc' if 'COMPLETE' in t else 'sa'
    if re.search(r'^[A-D]\s', block_text, re.MULTILINE):
        return 'mc'
    return 'sc'  # default


def split_into_tests(pages: list[str]) -> list[list[str]]:
    """
    Roughly split pages into test blocks.
    Cambridge books have 4 tests; each Academic Reading section starts
    with 'TEST' or 'ACADEMIC READING' markers.
    """
    TEST_START = re.compile(r'\bTEST\s+[1-4]\b', re.IGNORECASE)
    READING_START = re.compile(r'ACADEMIC\s+READING|IELTS\s+READING', re.IGNORECASE)

    test_pages: list[list[str]] = []
    current: list[str] = []
    for page in pages:
        if (TEST_START.search(page) or READING_START.search(page)) and current:
            test_pages.append(current)
            current = [page]
        else:
            current.append(page)
    if current:
        test_pages.append(current)

    # If we couldn't split, treat the whole doc as one test
    if len(test_pages) <= 1:
        return [pages]
    return test_pages


def parse_passages_from_text(full_text: str) -> list[dict]:
    """
    Given the combined text of a reading test, try to identify the 3 passages
    and their associated questions.  Returns a list of dicts:
        { number, title, content, questions: [{number, prompt, qtype}] }
    """
    # Split on passage headers
    parts = PASSAGE_HEADER.split(full_text)
    # parts: [pre, "1", body1, "2", body2, "3", body3]

    passages = []
    i = 1  # skip pre-text
    while i < len(parts) - 1:
        p_num_str = parts[i]
        p_body    = parts[i + 1] if i + 1 < len(parts) else ""
        i += 2

        try:
            p_num = int(p_num_str)
        except ValueError:
            continue

        # Try to find a title: first non-empty line after the passage header
        lines = [l.strip() for l in p_body.split('\n') if l.strip()]
        title = lines[0] if lines else f"Passage {p_num}"

        # Split body from questions at 'Questions N–M'
        q_match = QUESTION_BLOCK.search(p_body)
        if q_match:
            passage_text = p_body[:q_match.start()].strip()
            questions_text = p_body[q_match.start():].strip()
        else:
            passage_text = p_body
            questions_text = ""

        # Remove the title from passage_text if it appears at the start
        if passage_text.startswith(title):
            passage_text = passage_text[len(title):].strip()

        qtype = detect_question_type(questions_text)
        questions = extract_questions(questions_text, qtype)

        passages.append({
            "number":    p_num,
            "title":     title,
            "content":   passage_text,
            "qtype":     qtype,
            "questions": questions,
        })

    return passages


def extract_questions(q_text: str, default_type: str) -> list[dict]:
    """Extract individual numbered questions from a question-block text."""
    questions = []
    lines = q_text.split('\n')
    current_q: dict | None = None
    options: list[str] = []

    for line in lines:
        line = line.strip()
        m = QUESTION_LINE.match(line)
        if m:
            if current_q:
                current_q['options'] = options
                questions.append(current_q)
                options = []
            current_q = {
                'number': int(m.group(1)),
                'prompt': m.group(2).strip(),
                'qtype':  default_type,
                'answer': '',
                'options': [],
            }
        elif current_q and re.match(r'^[A-D]\s+.+', line):
            options.append(line)
        elif current_q and line:
            current_q['prompt'] += ' ' + line

    if current_q:
        current_q['options'] = options
        questions.append(current_q)

    return questions


# ─── Go code generator ──────────────────────────────────────────────────────

GO_HEADER = '''package database

// AUTO-GENERATED by scripts/extract_cambridge_pdf.py
// Review and edit answers/explanations before running migrate.

'''

def escape_go(s: str) -> str:
    return s.replace('\\', '\\\\').replace('`', '` + "`" + `')

def qtype_short(qt: str) -> str:
    return {
        'true_false_not_given': 'tfn',
        'yes_no_not_given':     'ynng',
        'sentence_completion':  'sc',
        'summary_completion':   'summ',
        'matching_headings':    'mh',
        'multiple_choice':      'mc',
        'short_answer':         'sa',
    }.get(qt, 'sc')

def passage_difficulty(pnum: int) -> str:
    return ['easy', 'medium', 'hard'][pnum - 1]

def band_for_book(book: int) -> str:
    if book <= 13:
        return "6.5"
    if book <= 16:
        return "7.0"
    return "7.5"

def generate_go_reading(book: int, test: int, passages: list[dict]) -> str:
    exam_set  = f"cambridge-{book}-test-{test}"
    sort_base = (book + (test - 1) * 100) * 1000  # unique per book+test
    func_name = f"buildC{book}T{test}Reading"
    band      = band_for_book(book)

    lines = [GO_HEADER]
    lines.append(f"// Cambridge {book} Test {test} — Reading (auto-extracted, answers need review)")
    lines.append(f"func {func_name}() []models.IELTSQuestion {{")
    lines.append(f'\tconst (')
    lines.append(f'\t\texamSet  = "{exam_set}"')
    lines.append(f'\t\tsortBase = {sort_base}')
    lines.append(f'\t)')
    lines.append(f'\tbt := stringPtr("{band}")')
    lines.append('\tvar all []models.IELTSQuestion')
    lines.append('')

    for p in passages:
        pnum  = p['number']
        diff  = passage_difficulty(pnum)
        title = p['title'].replace('"', '\\"')
        content_escaped = escape_go(p['content'])

        qt_short = qtype_short(p['qtype'])

        lines.append(f'\t// ── Passage {pnum}: {title} ({diff}) ─────')
        lines.append(f'\tall = append(all, expandReading(examSet, "{title}", "General", "{diff}", {pnum},')
        lines.append(f'\t\t`{content_escaped}`,')
        lines.append(f'\t\tbt, sortBase, []cq{{')

        for q in p['questions']:
            prompt  = q['prompt'].replace('"', '\\"')
            opts    = q['options']
            qt      = qtype_short(q.get('qtype', p['qtype']))
            # Build opts string
            if opts:
                opts_go = ', '.join(f'"{o}"' for o in opts)
                opts_go = f'[]string{{{opts_go}}}'
            else:
                opts_go = 'nil'
            lines.append(f'\t\t\t{{"{qt}", "{prompt}", "TODO", "TODO", {opts_go}}},')

        lines.append('\t\t},')
        lines.append('\t)...)')
        lines.append('')

    lines.append('\treturn all')
    lines.append('}')
    return '\n'.join(lines)


# ─── main ───────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='Extract Cambridge IELTS reading from PDF')
    ap.add_argument('pdf',  help='Path to Cambridge IELTS PDF book')
    ap.add_argument('book', type=int, help='Book number (12-20)')
    ap.add_argument('--test', type=int, default=None,
                    help='Which test to extract (1-4). Omit to extract all.')
    ap.add_argument('--out', default=None,
                    help='Output directory (default: scripts/cambridge_extracted/cambridge-N/)')
    args = ap.parse_args()

    pdf_path = Path(args.pdf).expanduser()
    if not pdf_path.exists():
        sys.exit(f"PDF not found: {pdf_path}")

    out_dir = Path(args.out) if args.out else \
        Path(__file__).parent / 'cambridge_extracted' / f'cambridge-{args.book}'
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"📖  Extracting text from {pdf_path.name} …")
    pages = extract_full_text(str(pdf_path))
    full_text = '\n'.join(pages)

    # Save raw text
    raw_path = out_dir / 'raw_text.txt'
    raw_path.write_text(full_text, encoding='utf-8')
    print(f"✅  Raw text saved → {raw_path}  ({len(full_text):,} chars, {len(pages)} pages)")

    # Split into tests
    test_blocks = split_into_tests(pages)
    print(f"🔍  Detected {len(test_blocks)} test block(s)")

    # Which tests to process
    if args.test:
        test_indices = [args.test - 1]
    else:
        test_indices = list(range(len(test_blocks)))

    all_passages_json = {}
    all_go_code       = []

    for idx in test_indices:
        if idx >= len(test_blocks):
            print(f"⚠️   Test {idx+1} not found in PDF, skipping")
            continue
        test_num  = idx + 1
        block_text = '\n'.join(test_blocks[idx])

        passages = parse_passages_from_text(block_text)
        if not passages:
            print(f"⚠️   Test {test_num}: could not detect passages — check raw_text.txt")
            # Still write raw block so user can edit manually
            (out_dir / f'test{test_num}_raw.txt').write_text(block_text, encoding='utf-8')
            continue

        print(f"📝  Test {test_num}: found {len(passages)} passage(s)")
        for p in passages:
            print(f"     P{p['number']} — {p['title'][:60]}  "
                  f"({len(p['content'])} chars, {len(p['questions'])} questions, type={p['qtype']})")

        all_passages_json[f'test{test_num}'] = passages

        go_code = generate_go_reading(args.book, test_num, passages)
        go_path = out_dir / f'seed_reading_test{test_num}.go'
        go_path.write_text(go_code, encoding='utf-8')
        print(f"🟢  Go seed → {go_path}")
        all_go_code.append(go_code)

    # Save combined JSON
    json_path = out_dir / 'passages.json'
    json_path.write_text(json.dumps(all_passages_json, ensure_ascii=False, indent=2),
                         encoding='utf-8')
    print(f"\n📦  Done!  Files in:  {out_dir}/")
    print("""
Next steps:
  1. Open raw_text.txt — verify the text extracted correctly.
  2. Open passages.json — check passage boundaries and question detection.
  3. Open seed_reading_testN.go — fill in "TODO" answers and explanations.
  4. Copy the functions into ielts_cambridge_reading_bank.go.
  5. Run:  cd backend && GOTOOLCHAIN=auto go run ./cmd/migrate
""")


if __name__ == '__main__':
    main()
