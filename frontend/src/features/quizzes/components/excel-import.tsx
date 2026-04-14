"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import type { QuizQuestionInput } from "@/app/(main)/quizzes/actions";

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

      const dataRows = rows.slice(1);
      const parsedRows: ParsedRow[] = [];
      dataRows.forEach((raw, idx) => {
        if (!Array.isArray(raw)) return;
        const warnings: string[] = [];
        const questionText = cellToString(raw[0]);
        const optionA = cellToString(raw[2]);
        const optionB = cellToString(raw[3]);
        const optionC = cellToString(raw[4]);
        const optionD = cellToString(raw[5]);
        const correctRaw = cellToString(raw[6]);
        const correct = normalizeCorrect(correctRaw);

        if (
          !questionText &&
          !optionA &&
          !optionB &&
          !optionC &&
          !optionD
        ) {
          return;
        }

        if (!questionText) warnings.push(t("quiz.warnMissingText"));
        if (!optionA || !optionB || !optionC || !optionD) {
          warnings.push(t("quiz.warnMissingOptions"));
        }
        if (!correct) warnings.push(t("quiz.warnBadCorrect"));

        parsedRows.push({
          row: idx + 2,
          warnings,
          question: {
            questionText,
            optionA,
            optionB,
            optionC,
            optionD,
            correctOption: correct,
          },
        });
      });

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
                    A/B/C/D
                  </th>
                  <th className="px-2 py-2 text-left">{t("quiz.colCorrect")}</th>
                  <th className="px-2 py-2 text-left">{t("quiz.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((row) => {
                  const ok = row.warnings.length === 0;
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
                          {row.question.questionText || "—"}
                        </span>
                      </td>
                      <td className="hidden max-w-[260px] px-2 py-2 text-[var(--text-secondary)] sm:table-cell">
                        <span className="line-clamp-1">
                          {[
                            row.question.optionA,
                            row.question.optionB,
                            row.question.optionC,
                            row.question.optionD,
                          ]
                            .map((s) => s || "—")
                            .join(" · ")}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-semibold uppercase">
                        {row.question.correctOption || "—"}
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
