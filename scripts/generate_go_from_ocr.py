#!/usr/bin/env python3
"""
Convert cambridge_ocr/cambridge-N/passages.json → Go reading seed functions.

Usage:
  python3 scripts/generate_go_from_ocr.py           # all books
  python3 scripts/generate_go_from_ocr.py --book 13 # one book
  python3 scripts/generate_go_from_ocr.py --merge   # write merged .go file

Output:
  scripts/cambridge_ocr/cambridge-N/seed_reading.go   — per-book
  backend/internal/database/ielts_cambridge_reading_bank.go — if --merge
"""

import sys, re, json, argparse
from pathlib import Path

OCR_BASE  = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")
GO_OUT    = Path("/home/midoriya/my-new_project/backend/internal/database/ielts_cambridge_reading_bank.go")

# ── Question parsing ──────────────────────────────────────────────────────────

Q_LINE    = re.compile(r'^(\d{1,2})\s+(.+)$')
TFN_PAT   = re.compile(r'\b(TRUE|FALSE|NOT GIVEN)\b', re.IGNORECASE)
YNNG_PAT  = re.compile(r'\b(YES|NO|NOT GIVEN)\b', re.IGNORECASE)
Q_RANGE   = re.compile(r'Questions?\s+(\d+)\s*[-–—]\s*(\d+)', re.IGNORECASE)
COMPLETE  = re.compile(r'NO MORE THAN (ONE|TWO|THREE|\d+) WORD', re.IGNORECASE)
HEADING   = re.compile(r'\bheading|\bparagraph.*list of heading', re.IGNORECASE)
SUMMARY   = re.compile(r'\bsummary\b|\bcomplete the following\b', re.IGNORECASE)
MC_OPT    = re.compile(r'^[A-D]\s+.+')


def detect_qtype(block: str) -> str:
    t = block.upper()
    if 'TRUE' in t and 'NOT GIVEN' in t:       return 'tfn'
    if 'YES'  in t and 'NOT GIVEN' in t:       return 'ynng'
    if HEADING.search(block):                   return 'mh'
    if SUMMARY.search(block):                   return 'summ'
    if COMPLETE.search(block):
        return 'summ' if SUMMARY.search(block) else 'sc'
    if re.search(r'^[A-D]\s', block, re.MULTILINE): return 'mc'
    return 'sc'


def parse_questions(q_text: str) -> list[dict]:
    qs = []
    current: dict | None = None
    opts: list[str] = []

    for raw_line in q_text.split('\n'):
        line = raw_line.strip()
        m = Q_LINE.match(line)
        if m:
            if current:
                current['options'] = opts
                qs.append(current)
                opts = []
            current = {
                'number': int(m.group(1)),
                'prompt': m.group(2).strip(),
                'answer': 'TODO',
                'options': [],
            }
        elif current and MC_OPT.match(line):
            opts.append(line)
        elif current and line and not Q_RANGE.match(line):
            current['prompt'] += ' ' + line

    if current:
        current['options'] = opts
        qs.append(current)

    return qs


# ── Go code generation ────────────────────────────────────────────────────────

def escape_go(s: str) -> str:
    s = s.replace('\\', '\\\\')
    s = s.replace('`', '` + "`" + `')
    return s

def band_for_book(book: int) -> str:
    if book <= 13:  return "6.5"
    if book <= 16:  return "7.0"
    return "7.5"

def sort_base_for_book(book: int) -> int:
    bases = {12:13000, 13:14000, 14:15000, 15:16000, 16:17000, 18:18000, 19:19000, 20:20000}
    return bases.get(book, book * 1000)

def difficulty(p_num: int) -> str:
    return ['easy', 'medium', 'hard'][p_num - 1]


FALLBACK_QUESTIONS = {
    1: [  # Passage 1 — easy: TFN×5, SC×4, SUMM×4 = 13
        ('tfn', 'The author argues that …', 'TODO'),
        ('tfn', 'Studies show that …', 'TODO'),
        ('tfn', 'According to the passage, …', 'TODO'),
        ('tfn', 'The research indicates that …', 'TODO'),
        ('tfn', 'The text states that …', 'TODO'),
        ('sc',  'The ________ was the main factor.',  'TODO'),
        ('sc',  'Scientists discovered a new ________.', 'TODO'),
        ('sc',  'The process relies on ________.', 'TODO'),
        ('sc',  'Results showed a significant ________.', 'TODO'),
        ('summ','The study aimed to ________.', 'TODO'),
        ('summ','The method involved ________.', 'TODO'),
        ('summ','The conclusion was that ________.', 'TODO'),
        ('summ','Future work should focus on ________.', 'TODO'),
    ],
    2: [  # Passage 2 — medium: MH×5, MC×5, SA×3 = 13
        ('mh', 'Section A',  'TODO'),
        ('mh', 'Section B',  'TODO'),
        ('mh', 'Section C',  'TODO'),
        ('mh', 'Section D',  'TODO'),
        ('mh', 'Section E',  'TODO'),
        ('mc', 'What is the main purpose of the passage?', 'TODO'),
        ('mc', 'According to the author, what is the key factor?', 'TODO'),
        ('mc', 'What does the word "significant" mean in context?', 'TODO'),
        ('mc', 'Which of the following best describes the writer\'s view?', 'TODO'),
        ('mc', 'What does the author suggest about the future?', 'TODO'),
        ('sa', 'What was the main finding of the study?', 'TODO'),
        ('sa', 'How did researchers address the problem?', 'TODO'),
        ('sa', 'What evidence supports the main argument?', 'TODO'),
    ],
    3: [  # Passage 3 — hard: YNNG×5, MC×5, SC×4 = 14
        ('ynng', 'The author believes that …', 'TODO'),
        ('ynng', 'Experts agree that …', 'TODO'),
        ('ynng', 'The study confirms that …', 'TODO'),
        ('ynng', 'The writer implies that …', 'TODO'),
        ('ynng', 'Research shows that …', 'TODO'),
        ('mc', 'What is the writer\'s main argument?', 'TODO'),
        ('mc', 'Which finding is described as surprising?', 'TODO'),
        ('mc', 'What does "paradox" suggest in context?', 'TODO'),
        ('mc', 'How does the author view traditional methods?', 'TODO'),
        ('mc', 'What is implied about future developments?', 'TODO'),
        ('sc', 'The process requires ________.', 'TODO'),
        ('sc', 'Researchers identified ________.', 'TODO'),
        ('sc', 'The main obstacle was ________.', 'TODO'),
        ('sc', 'Evidence points to ________.', 'TODO'),
    ],
}


def generate_func(book: int, test: int, passages: list[dict]) -> str:
    exam_set  = f"cambridge-{book}-test-{test}"
    sb        = sort_base_for_book(book) + (test - 1) * 100
    func_name = f"buildC{book}T{test}Reading"
    band      = band_for_book(book)

    lines = []
    lines.append(f"// Cambridge {book} Test {test} — Reading (OCR-extracted; fill TODO answers)")
    lines.append(f"func {func_name}() []models.IELTSQuestion {{")
    lines.append(f'\tconst (')
    lines.append(f'\t\texamSet  = "{exam_set}"')
    lines.append(f'\t\tsortBase = {sb}')
    lines.append(f'\t)')
    lines.append(f'\tbt := stringPtr("{band}")')
    lines.append('\tvar all []models.IELTSQuestion')
    lines.append('')

    for p in passages:
        pnum   = p['number']
        diff   = difficulty(pnum)
        title  = p['title'].replace('"', '\\"').replace('\n', ' ').strip()
        body   = escape_go(p.get('body', '').replace('\n', ' '))

        # Parse questions from OCR, fall back to template if too few
        q_text = p.get('questions_raw', '')
        qtype  = detect_qtype(q_text)
        qs     = parse_questions(q_text)

        if len(qs) < 5:
            # Use fallback template questions
            fallback = FALLBACK_QUESTIONS.get(pnum, FALLBACK_QUESTIONS[1])
            qs = [{'number': i+1, 'prompt': fb[1], 'answer': fb[2], 'options': [], '_qt': fb[0]}
                  for i, fb in enumerate(fallback)]
            qtype = 'mixed'

        lines.append(f'\t// ── Passage {pnum}: {title[:60]} ({diff}) ──')
        lines.append(f'\tall = append(all, expandReading(examSet, "{title}", "General", "{diff}", {pnum},')
        lines.append(f'\t\t`{body}`,')
        lines.append(f'\t\tbt, sortBase, []cq{{')

        for q in qs:
            qt     = q.get('_qt', qtype)
            prompt = q['prompt'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').strip()
            ans    = q.get('answer', 'TODO')
            if not ans or ans == '':
                ans = 'TODO'
            ans    = ans.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').strip()
            opts   = q.get('options', [])
            if opts:
                opts_go = ', '.join(f'"{o.replace(chr(92), chr(92)*2).replace(chr(34), chr(92)+chr(34))}"' for o in opts[:4])
                opts_go = f'[]string{{{opts_go}}}'
            else:
                opts_go = 'nil'
            lines.append(f'\t\t\t{{"{qt}", "{prompt}", "{ans}", "TODO", {opts_go}}},')

        lines.append('\t\t},')
        lines.append('\t)...)')
        lines.append('')

    lines.append('\treturn all')
    lines.append('}')
    return '\n'.join(lines)


# ── main ─────────────────────────────────────────────────────────────────────

BOOKS = [12, 13, 14, 15, 16, 20]

GO_HEADER = '''package database

// AUTO-GENERATED by scripts/generate_go_from_ocr.py
// Passages extracted via OCR from Cambridge IELTS PDFs.
// ⚠  Fill in all "TODO" answer/explanation fields before running migrate.

import (
\t"fmt"

\t"github.com/midoriya/flashlearn-backend/internal/models"
)

// cq is a compact question definition used only within this file.
type cq struct {
\tT    string   // type: tfn ynng sc summ mh mc sa
\tP    string   // prompt
\tA    string   // answer
\tE    string   // explanation
\tOpts []string // options for mc/mh (nil otherwise)
}

func expandQType(t string) string {
\tswitch t {
\tcase "tfn":  return "true_false_not_given"
\tcase "ynng": return "yes_no_not_given"
\tcase "sc":   return "sentence_completion"
\tcase "summ": return "summary_completion"
\tcase "mh":   return "matching_headings"
\tcase "mc":   return "multiple_choice"
\tcase "sa":   return "short_answer"
\t}
\treturn t
}

func cqOptsList(t string, opts []string) *string {
\tswitch t {
\tcase "tfn":
\t\treturn readingOpts([]string{"True", "False", "Not Given"})
\tcase "ynng":
\t\treturn readingOpts([]string{"Yes", "No", "Not Given"})
\tdefault:
\t\tif len(opts) == 0 {
\t\t\treturn nil
\t\t}
\t\treturn readingOpts(opts)
\t}
}

// expandReading converts a []cq into full IELTSQuestion records for one passage.
func expandReading(examSet, title, topic, difficulty string, passage int,
\tcontent string, bt *string, sortBase int, qs []cq) []models.IELTSQuestion {
\toffsets := [3]int{1, 14, 27}
\tbase  := sortBase + offsets[passage-1]
\tgroup := fmt.Sprintf("%s-reading-passage-%d", examSet, passage)
\tc     := stringPtr(content)
\tout   := make([]models.IELTSQuestion, 0, len(qs))
\tfor i, q := range qs {
\t\tout = append(out, models.IELTSQuestion{
\t\t\tSection:       "reading",
\t\t\tMockType:      "cambridge_style",
\t\t\tExamSet:       examSet,
\t\t\tQuestionGroup: group,
\t\t\tQuestionType:  expandQType(q.T),
\t\t\tTitle:         title,
\t\t\tTopic:         topic,
\t\t\tContent:       c,
\t\t\tBandTarget:    bt,
\t\t\tPrompt:        q.P,
\t\t\tAnswer:        stringPtr(q.A),
\t\t\tExplanation:   stringPtr(q.E),
\t\t\tOptions:       cqOptsList(q.T, q.Opts),
\t\t\tSortOrder:     base + i,
\t\t\tDifficulty:    difficulty,
\t\t\tPassageNumber: passage,
\t\t})
\t}
\treturn out
}

func buildCambridgeExtendedReadingBank() []models.IELTSQuestion {
\tvar all []models.IELTSQuestion
'''

GO_FOOTER = '''\treturn all
}
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--book',  type=int, default=None)
    ap.add_argument('--merge', action='store_true', help='Write merged Go file to backend/')
    args = ap.parse_args()

    books_to_run = [args.book] if args.book else BOOKS

    all_funcs = []
    func_names = []

    for bnum in books_to_run:
        p_dir = OCR_BASE / f"cambridge-{bnum}"
        json_path = p_dir / "passages.json"
        if not json_path.exists():
            print(f"⚠  C{bnum}: passages.json not found — run batch_ocr_cambridge.py first")
            continue

        data = json.loads(json_path.read_text(encoding='utf-8'))
        print(f"\nC{bnum}:")

        book_funcs = []
        for tkey in sorted(data.keys()):
            tnum = int(tkey.replace('test', ''))
            passages = data[tkey].get('passages', [])
            if not passages:
                print(f"  T{tnum}: no passages — skipping")
                continue
            print(f"  T{tnum}: {len(passages)} passages")
            code = generate_func(bnum, tnum, passages)
            book_funcs.append(code)
            func_names.append(f"buildC{bnum}T{tnum}Reading")

        # Write per-book file
        go_path = p_dir / "seed_reading.go"
        go_path.write_text('\n\n'.join(book_funcs), encoding='utf-8')
        print(f"  → {go_path}")
        all_funcs.extend(book_funcs)

    if args.merge and all_funcs:
        # Build the dispatch function
        dispatch_lines = []
        for fn in func_names:
            dispatch_lines.append(f'\tall = append(all, {fn}()...)')
        dispatch = '\n'.join(dispatch_lines) + '\n'

        go_content = GO_HEADER + dispatch + GO_FOOTER + '\n\n' + '\n\n'.join(all_funcs)
        GO_OUT.write_text(go_content, encoding='utf-8')
        print(f"\n✅  Merged Go file → {GO_OUT}")

    print("\nDone! Remember to fill in TODO answers in the generated files.")

if __name__ == '__main__':
    main()
