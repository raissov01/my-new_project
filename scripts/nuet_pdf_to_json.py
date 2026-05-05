#!/usr/bin/env python3
"""
Convert NUET PDF sources (Trial Tests + NUET_MOCK_*) into structured JSON.

Outputs:
  backend/nuet-materials/json/index.json
  backend/nuet-materials/json/<slug>.json

Notes:
- This is a best-effort parser around `pdftotext -layout`.
- Trial tests parse much more cleanly than the Kiseki mock PDFs.
- When the parser sees ambiguous answer keys (e.g. F/H/G) or broken option
  layout, it preserves raw fields and emits warnings instead of inventing data.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

ROOT = Path("/home/midoriya/my-new_project")
PDF_DIR = ROOT / "backend" / "nuet-materials" / "files"
OUT_DIR = ROOT / "backend" / "nuet-materials" / "json"

QUESTION_START_RE = re.compile(r"^\s*(\d{1,2})[\).]\s*(.+?)\s*$")
OPTION_RE = re.compile(r"^\s*([A-Ea-e])[\).]\s*(.*)\s*$")
ANSWER_RE = re.compile(r"Ans:\s*([A-Z])")
QUESTION_INLINE_SPLIT_RE = re.compile(r"(?=(?:^|\s)(\d{1,2})\.\s)")


@dataclass
class Question:
    number: int
    prompt: str
    options: list[dict]
    answer: str | None = None
    raw_answer: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class ParsedPDF:
    source_file: str
    name: str
    test_type: str
    parser: str
    question_count: int
    answer_count: int
    warnings: list[str]
    questions: list[Question]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def read_pdf_text(path: Path) -> str:
    proc = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f"pdftotext failed for {path.name}")
    return proc.stdout


def normalize_lines(text: str) -> list[str]:
    raw_lines = text.replace("\x0c", "\n").splitlines()
    out: list[str] = []
    for line in raw_lines:
        stripped = line.strip()
        if not stripped:
            out.append("")
            continue
        if stripped.startswith("tg:@"):
            continue
        if "t.me/" in stripped:
            continue
        if "Kiseki" in stripped or "M ock" in stripped or "Mo ck" in stripped:
            continue
        out.append(line.rstrip())
    return out


def compact_text_lines(lines: Iterable[str]) -> str:
    chunks = []
    for line in lines:
        s = line.strip()
        if not s:
            chunks.append("\n")
        else:
            chunks.append(s)
    return "\n".join(chunks)


def parse_trial_pdf(path: Path) -> ParsedPDF:
    lines = normalize_lines(read_pdf_text(path))
    questions: list[Question] = []
    current: Question | None = None
    current_option: dict | None = None
    warnings: list[str] = []

    def flush_option() -> None:
        nonlocal current_option
        if current and current_option:
            current_option["text"] = " ".join(current_option["parts"]).strip()
            del current_option["parts"]
            current.options.append(current_option)
            current_option = None

    def flush_question() -> None:
        nonlocal current
        flush_option()
        if current:
            current.prompt = re.sub(r"\s+", " ", current.prompt).strip()
            if len(current.options) < 4:
                current.warnings.append(f"only {len(current.options)} option(s) detected")
            questions.append(current)
            current = None

    in_body = False
    for line in lines:
        stripped = line.strip()
        if not in_body:
            if QUESTION_START_RE.match(stripped):
                in_body = True
            else:
                continue

        q_match = QUESTION_START_RE.match(stripped)
        if q_match:
            flush_question()
            current = Question(
                number=int(q_match.group(1)),
                prompt=q_match.group(2).strip(),
                options=[],
            )
            continue

        if current is None:
            continue

        opt_match = OPTION_RE.match(stripped)
        if opt_match:
            flush_option()
            current_option = {
                "label": opt_match.group(1).upper(),
                "parts": [opt_match.group(2).strip()] if opt_match.group(2).strip() else [],
            }
            continue

        if current_option is not None:
            if stripped and not QUESTION_START_RE.match(stripped):
                current_option["parts"].append(stripped)
            continue

        if stripped:
            current.prompt += " " + stripped

    flush_question()

    return ParsedPDF(
        source_file=path.name,
        name=path.stem,
        test_type="trial_test",
        parser="trial_layout_parser",
        question_count=len(questions),
        answer_count=0,
        warnings=warnings,
        questions=questions,
    )


def parse_mock_pdf(path: Path) -> ParsedPDF:
    lines = normalize_lines(read_pdf_text(path))
    text = compact_text_lines(lines)
    starts = list(re.finditer(r"(?m)^\s*(\d{1,2})\.\s+", text))
    questions: list[Question] = []
    warnings: list[str] = []

    if not starts:
        return ParsedPDF(
            source_file=path.name,
            name=path.stem,
            test_type="mock_test",
            parser="mock_layout_parser",
            question_count=0,
            answer_count=0,
            warnings=["no numbered question starts found"],
            questions=[],
        )

    for i, match in enumerate(starts):
        qnum = int(match.group(1))
        start = match.start()
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        chunk = text[start:end].strip()

        lines_in_chunk = [ln.strip() for ln in chunk.splitlines() if ln.strip()]
        if not lines_in_chunk:
            continue

        first = lines_in_chunk[0]
        first = re.sub(r"^\d{1,2}\.\s*", "", first).strip()
        prompt_parts = [first] if first else []
        options: list[dict] = []
        current_option: dict | None = None
        raw_answers: list[str] = []
        local_warnings: list[str] = []

        def flush_option() -> None:
            nonlocal current_option
            if current_option:
                current_option["text"] = " ".join(current_option["parts"]).strip()
                del current_option["parts"]
                options.append(current_option)
                current_option = None

        for raw_line in lines_in_chunk[1:]:
            for ans in ANSWER_RE.findall(raw_line):
                raw_answers.append(ans.upper())

            cleaned = re.sub(r"Ans:\s*[A-Z]", "", raw_line).strip()
            if not cleaned:
                continue

            inline_options = list(re.finditer(r"\b([A-E])\.\s*", cleaned))
            if len(inline_options) >= 2 and not OPTION_RE.match(cleaned):
                flush_option()
                for idx, opt in enumerate(inline_options):
                    label = opt.group(1)
                    s = opt.end()
                    e = inline_options[idx + 1].start() if idx + 1 < len(inline_options) else len(cleaned)
                    value = cleaned[s:e].strip()
                    options.append({"label": label, "text": value})
                continue

            opt_match = OPTION_RE.match(cleaned)
            if opt_match:
                flush_option()
                current_option = {
                    "label": opt_match.group(1).upper(),
                    "parts": [opt_match.group(2).strip()] if opt_match.group(2).strip() else [],
                }
                continue

            if current_option is not None:
                current_option["parts"].append(cleaned)
            else:
                prompt_parts.append(cleaned)

        flush_option()

        answer = None
        raw_answer = raw_answers[0] if raw_answers else None
        if raw_answer in {"A", "B", "C", "D", "E"}:
            answer = raw_answer
        elif raw_answer is not None:
            local_warnings.append(f"non-MCQ raw answer detected: {raw_answer}")

        if len(options) < 4:
            local_warnings.append(f"only {len(options)} option(s) detected")

        questions.append(
            Question(
                number=qnum,
                prompt=re.sub(r"\s+", " ", " ".join(prompt_parts)).strip(),
                options=options,
                answer=answer,
                raw_answer=raw_answer,
                warnings=local_warnings,
            )
        )

    answer_count = sum(1 for q in questions if q.answer)
    weird_count = sum(1 for q in questions if q.raw_answer and not q.answer)
    if weird_count:
        warnings.append(f"{weird_count} question(s) had non A-E raw answers")

    return ParsedPDF(
        source_file=path.name,
        name=path.stem,
        test_type="mock_test",
        parser="mock_layout_parser",
        question_count=len(questions),
        answer_count=answer_count,
        warnings=warnings,
        questions=questions,
    )


def parse_pdf(path: Path) -> ParsedPDF:
    if path.name.startswith("Trial Test "):
        return parse_trial_pdf(path)
    if path.name.startswith("NUET_MOCK_"):
        return parse_mock_pdf(path)
    raise ValueError(f"unsupported NUET PDF: {path.name}")


def write_output(parsed: ParsedPDF) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{slugify(parsed.name)}.json"
    payload = asdict(parsed)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    return out_path


def main() -> int:
    pdfs = sorted(
        [
            *PDF_DIR.glob("Trial Test *.pdf"),
            *PDF_DIR.glob("NUET_MOCK_*.pdf"),
        ],
        key=lambda p: p.name,
    )
    if not pdfs:
        print("No NUET PDFs found", file=sys.stderr)
        return 1

    summary = []
    for pdf in pdfs:
        parsed = parse_pdf(pdf)
        out_path = write_output(parsed)
        summary.append(
            {
                "source_file": pdf.name,
                "json_file": out_path.name,
                "test_type": parsed.test_type,
                "question_count": parsed.question_count,
                "answer_count": parsed.answer_count,
                "warnings": parsed.warnings,
            }
        )
        print(
            f"[ok] {pdf.name:<42} -> {out_path.name:<40} "
            f"questions={parsed.question_count:<3} answers={parsed.answer_count:<3}"
        )

    index_path = OUT_DIR / "index.json"
    index_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(f"[ok] wrote {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
