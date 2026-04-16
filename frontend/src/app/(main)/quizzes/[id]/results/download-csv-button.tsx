"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttemptResult, AttemptAnswerResult } from "@/server/services/quizzes";

function csvEscape(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

function answerText(answer: AttemptAnswerResult, side: "yours" | "correct"): string {
  const qType = answer.questionType ?? "mcq";

  if (qType === "fill_blank") {
    return side === "yours" ? (answer.textAnswer?.trim() ?? "") : (answer.blankAnswer ?? "");
  }

  if (qType === "reorder") {
    const items = side === "yours" ? answer.orderAnswer : answer.reorderItems;
    return items?.join(" → ") ?? "";
  }

  if (qType === "matching") {
    if (side === "correct") {
      return (answer.matchPairs ?? []).map((p) => `${p.left} → ${p.right}`).join(" | ");
    }
    try {
      const map = JSON.parse(answer.textAnswer ?? "{}") as Record<string, string>;
      return Object.entries(map).map(([l, r]) => `${l} → ${r}`).join(" | ");
    } catch {
      return answer.textAnswer ?? "";
    }
  }

  const letterToText: Record<string, string> = {
    a: answer.optionA ?? "", b: answer.optionB ?? "",
    c: answer.optionC ?? "", d: answer.optionD ?? "",
  };

  if (qType === "mcq_multi") {
    const raw = side === "yours" ? answer.selectedOption : answer.correctOption;
    const letters = (raw ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
    return letters.map((l) => `${l.toUpperCase()}. ${letterToText[l]}`).join("; ");
  }

  if (qType === "true_false") {
    const opt = side === "yours" ? answer.selectedOption : answer.correctOption;
    return opt === "t" ? "True" : opt === "f" ? "False" : "";
  }

  // mcq (default)
  const opt = side === "yours" ? answer.selectedOption : answer.correctOption;
  if (!opt) return "";
  return `${opt.toUpperCase()}. ${letterToText[opt] ?? ""}`;
}

export function DownloadCsvButton({
  attempt,
  label,
}: {
  attempt: AttemptResult;
  label: string;
}) {
  function handleDownload() {
    const rows: string[][] = [];

    // Metadata block
    rows.push(["Quiz ID", attempt.quizId]);
    rows.push(["Attempt ID", attempt.id]);
    rows.push(["Score", `${attempt.score}/${attempt.totalQuestions}`]);
    rows.push(["Percentage", `${attempt.percentage}%`]);
    rows.push(["Time Spent (s)", String(attempt.timeSpent)]);
    rows.push(["Completed At", attempt.completedAt]);
    rows.push([]); // blank separator

    // Column header
    rows.push(["#", "Question", "Type", "Your Answer", "Correct Answer", "Correct?", "Time (s)"]);

    // One row per answer
    for (let i = 0; i < attempt.answers.length; i++) {
      const a = attempt.answers[i];
      rows.push([
        String(i + 1),
        a.questionText,
        a.questionType ?? "mcq",
        answerText(a, "yours"),
        answerText(a, "correct"),
        a.isCorrect ? "Yes" : "No",
        String(a.timeSpent),
      ]);
    }

    // BOM + CSV so Excel opens with correct encoding
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-${attempt.quizId}-${attempt.id.slice(0, 8)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="lg" onClick={handleDownload}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
