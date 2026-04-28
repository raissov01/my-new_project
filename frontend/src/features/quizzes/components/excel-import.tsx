"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import type {
  QuizQuestionInput,
  QuizQuestionType,
} from "@/app/(main)/quizzes/actions";

interface ParsedRow {
  row: number;
  question: QuizQuestionInput;
  warnings: string[];
}

interface ExcelImportProps {
  onImport: (questions: QuizQuestionInput[]) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "number") return String(cell);
  if (typeof cell === "boolean") return cell ? "true" : "false";
  return "";
}

function normalizeCorrect(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "a") return "a";
  if (v === "2" || v === "b") return "b";
  if (v === "3" || v === "c") return "c";
  if (v === "4" || v === "d") return "d";
  return "";
}

// Quizizz-style export: A=#, B=Question, C=Type, D-H=Options 1-5, I=Correct(1-4), J=Time, K=Image
function isQuizizzFormat(row: unknown[]): boolean {
  const a = cellToString(row[0]).trim().toLowerCase();
  const b = cellToString(row[1]).trim().toLowerCase();
  const i = cellToString(row[8]).trim().toLowerCase();
  // A = # indicator OR column I = "correct answer" (Quizizz places answer in column I)
  const aIsHash = a === "#" || a === "no" || a === "no." || a === "№" || a === "s.no" || a === "s.no.";
  const bIsQuestion = b.includes("question") || b === "сұрақ мәтіні" || b === "сұрақ" || b === "вопрос";
  const iIsCorrect = i.includes("correct") || i === "дұрыс жауап" || i === "ответ";
  return (aIsHash && bIsQuestion) || (bIsQuestion && iIsCorrect);
}

// Find which row is the actual Quizizz header (handles 1 or 2 header rows)
function findQuizizzHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    if (Array.isArray(rows[i]) && isQuizizzFormat(rows[i] as unknown[])) return i;
  }
  return -1;
}

function parseQuizizzRow(raw: unknown[]): { question: QuizQuestionInput; warnings: string[] } | null {
  const questionText = cellToString(raw[1]);
  const typeRaw = cellToString(raw[2]).toLowerCase();
  const opt1 = cellToString(raw[3]);
  const opt2 = cellToString(raw[4]);
  const opt3 = cellToString(raw[5]);
  const opt4 = cellToString(raw[6]);
  const correctRaw = cellToString(raw[8]); // column I
  const warnings: string[] = [];

  if (!questionText) return null;

  let questionType: QuizQuestionType = "mcq";
  if (typeRaw.includes("true") || typeRaw.includes("false") || typeRaw === "true/false") {
    questionType = "true_false";
  } else if (typeRaw.includes("fill") || typeRaw.includes("blank")) {
    questionType = "fill_blank";
  }

  if (questionType === "true_false") {
    const tf = normalizeTrueFalse(correctRaw);
    if (!tf) warnings.push("Invalid true/false answer");
    return { question: { questionText, questionType: "true_false", correctOption: tf }, warnings };
  }

  if (questionType === "fill_blank") {
    if (!correctRaw) warnings.push("Missing blank answer");
    return { question: { questionText, questionType: "fill_blank", blankAnswer: correctRaw }, warnings };
  }

  // MCQ
  const correct = normalizeCorrect(correctRaw);
  if (!opt1 || !opt2) warnings.push("Missing options");
  if (!correct) warnings.push("Invalid correct answer (expected 1–4)");
  return {
    question: {
      questionText,
      questionType: "mcq",
      optionA: opt1,
      optionB: opt2,
      optionC: opt3,
      optionD: opt4,
      correctOption: correct,
    },
    warnings,
  };
}

function normalizeTrueFalse(value: string): "t" | "f" | "" {
  const v = value.trim().toLowerCase();
  if (v === "t" || v === "true" || v === "1" || v === "yes" || v === "y") return "t";
  if (v === "f" || v === "false" || v === "0" || v === "no" || v === "n") return "f";
  return "";
}

// Excel "type" column accepts synonyms so non-English templates still work.
// Empty → 'mcq' for backwards-compatibility with existing quiz templates that
// never populated column B.
function normalizeQuestionType(value: string): QuizQuestionType {
  const v = value.trim().toLowerCase();
  if (!v) return "mcq";
  if (v === "mcq" || v === "multiple" || v === "multiple_choice" || v === "multiple choice" || v === "choice") {
    return "mcq";
  }
  if (v === "tf" || v === "true_false" || v === "truefalse" || v === "true/false" || v === "boolean") {
    return "true_false";
  }
  if (v === "fill" || v === "fill_blank" || v === "blank" || v === "text" || v === "fillblank") {
    return "fill_blank";
  }
  return "mcq";
}

async function downloadTemplate() {
  const XLSX = await import("xlsx");

  const headerRow = ["Question", "Type", "Option A", "Option B", "Option C", "Option D", "Correct (a/b/c/d)", "Explanation"];
  const rows = [
    headerRow,
    ["What is the capital of France?", "mcq", "London", "Berlin", "Paris", "Madrid", "c", "Paris is the capital of France."],
    ["The Earth is flat.", "true_false", "", "", "", "", "f", "The Earth is an oblate spheroid."],
    ["Water boils at ___ degrees Celsius at sea level.", "fill_blank", "", "", "", "", "100", ""],
    ["Which planet is closest to the Sun?", "mcq", "Venus", "Mercury", "Mars", "Earth", "b", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 42 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  XLSX.writeFile(wb, "quiz_template.xlsx");
}

export function ExcelImport({ onImport }: ExcelImportProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setParsed(null);
    setFileName(null);
    setError(null);
  };

  const handleFile = async (file: File) => {
    resetState();
    setLoading(true);

    try {
      if (file.size > MAX_BYTES) {
        setError(t("quiz.importFileTooLarge"));
        return;
      }
      const lowerName = file.name.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
        setError(t("quiz.importBadFormat"));
        return;
      }

      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellFormula: false });
      const firstName = workbook.SheetNames[0];
      if (!firstName) {
        setError(t("quiz.importEmpty"));
        return;
      }
      const sheet = workbook.Sheets[firstName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      if (rows.length < 2) {
        setError(t("quiz.importEmpty"));
        return;
      }

      const headerIdx = findQuizizzHeaderRow(rows as unknown[][]);
      const quizizz = headerIdx >= 0;
      const dataRows = rows.slice(quizizz ? headerIdx + 1 : 1);
      const parsedRows: ParsedRow[] = [];

      if (quizizz) {
        // Quizizz / our platform export format:
        //   A=#  B=Question Text  C=Type  D-H=Options 1-5  I=Correct(1-4)  J=Time  K=Image
        dataRows.forEach((raw, idx) => {
          if (!Array.isArray(raw)) return;
          const result = parseQuizizzRow(raw);
          if (!result) return; // empty / sub-header row
          parsedRows.push({ row: idx + 2, ...result });
        });
      } else {
        // Native format:
        //   A=question  B=type  C-F=options A-D  G=correct  H=explanation
        dataRows.forEach((raw, idx) => {
          if (!Array.isArray(raw)) return;
          const warnings: string[] = [];
          const questionText = cellToString(raw[0]);
          const typeCell = cellToString(raw[1]);
          const optionA = cellToString(raw[2]);
          const optionB = cellToString(raw[3]);
          const optionC = cellToString(raw[4]);
          const optionD = cellToString(raw[5]);
          const answerCell = cellToString(raw[6]);
          const explanation = cellToString(raw[7]);

          if (!questionText && !optionA && !optionB && !optionC && !optionD && !answerCell) return;

          const questionType = normalizeQuestionType(typeCell);
          if (!questionText) warnings.push(t("quiz.warnMissingText"));

          let question: QuizQuestionInput;
          switch (questionType) {
            case "true_false": {
              const tf = normalizeTrueFalse(answerCell);
              if (!tf) warnings.push(t("quiz.warnBadTrueFalse"));
              question = { questionText, questionType: "true_false", correctOption: tf, explanation };
              break;
            }
            case "fill_blank": {
              if (!answerCell) warnings.push(t("quiz.warnMissingBlankAnswer"));
              question = { questionText, questionType: "fill_blank", blankAnswer: answerCell, explanation };
              break;
            }
            default: {
              const correct = normalizeCorrect(answerCell);
              if (!optionA || !optionB || !optionC || !optionD) warnings.push(t("quiz.warnMissingOptions"));
              if (!correct) warnings.push(t("quiz.warnBadCorrect"));
              question = { questionText, questionType: "mcq", optionA, optionB, optionC, optionD, correctOption: correct, explanation };
              break;
            }
          }
          parsedRows.push({ row: idx + 2, warnings, question });
        });
      }

      if (parsedRows.length === 0) {
        setError(t("quiz.importNoRows"));
        return;
      }

      setParsed(parsedRows);
      setFileName(file.name);
    } catch {
      setError(t("quiz.importParseFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = () => {
    if (!parsed) return;
    const valid = parsed
      .filter((row) => row.warnings.length === 0)
      .map((row) => row.question);
    if (valid.length === 0) {
      setError(t("quiz.importNoValid"));
      return;
    }
    onImport(valid);
    resetState();
    if (inputRef.current) inputRef.current.value = "";
  };

  const validCount = parsed?.filter((r) => r.warnings.length === 0).length ?? 0;
  const invalidCount = parsed ? parsed.length - validCount : 0;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary-soft)]"
            : "border-[var(--border)] bg-[var(--bg-soft)]"
        }`}
      >
        <FileSpreadsheet className="h-10 w-10 text-[var(--text-muted)]" />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {t("quiz.importDropZone")}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {t("quiz.importFormats")}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            isLoading={loading}
          >
            <Upload className="h-4 w-4" />
            {t("quiz.importChooseFile")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void downloadTemplate()}
          >
            <Download className="h-4 w-4" />
            {t("quiz.downloadTemplate")}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {parsed ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {fileName}
              </span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                {t("quiz.importRowsParsed").replace(
                  "{n}",
                  String(parsed.length)
                )}
              </span>
            </div>
            <Button type="button" size="sm" onClick={handleImportAll}>
              <CheckCircle2 className="h-4 w-4" />
              {t("quiz.importAll").replace("{n}", String(validCount))}
            </Button>
          </div>

          {invalidCount > 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              {t("quiz.importInvalidRows").replace("{n}", String(invalidCount))}
            </p>
          ) : null}

          <div className="max-h-64 overflow-auto rounded-[var(--radius-md)] border border-[var(--border)]">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="bg-[var(--bg-soft)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">{t("quiz.colQuestion")}</th>
                  <th className="hidden px-2 py-2 text-left sm:table-cell">
                    {t("quiz.colType")}
                  </th>
                  <th className="px-2 py-2 text-left">{t("quiz.colCorrect")}</th>
                  <th className="px-2 py-2 text-left">{t("quiz.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((row) => {
                  const ok = row.warnings.length === 0;
                  const q = row.question;
                  let correctDisplay = "—";
                  if (q.questionType === "fill_blank") {
                    correctDisplay = q.blankAnswer || "—";
                  } else if (q.questionType === "true_false") {
                    correctDisplay = q.correctOption
                      ? q.correctOption === "t"
                        ? t("quiz.true")
                        : t("quiz.false")
                      : "—";
                  } else {
                    correctDisplay = (q.correctOption || "—").toUpperCase();
                  }
                  return (
                    <tr
                      key={row.row}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-2 py-2 text-[var(--text-muted)]">
                        {row.row}
                      </td>
                      <td className="max-w-[160px] px-2 py-2 sm:max-w-[260px]">
                        <span className="line-clamp-1 text-[var(--text-primary)]">
                          {q.questionText || "—"}
                        </span>
                      </td>
                      <td className="hidden px-2 py-2 text-[var(--text-secondary)] sm:table-cell">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          {q.questionType ?? "mcq"}
                        </span>
                      </td>
                      <td className="max-w-[140px] px-2 py-2 font-semibold">
                        <span className="line-clamp-1">{correctDisplay}</span>
                      </td>
                      <td className="px-2 py-2">
                        {ok ? (
                          <span className="inline-flex items-center gap-1 text-[var(--success)]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("quiz.ok")}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[var(--danger)]"
                            title={row.warnings.join(", ")}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.warnings.length}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
