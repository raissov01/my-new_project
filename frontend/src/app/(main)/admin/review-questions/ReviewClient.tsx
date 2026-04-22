"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Trash2, Loader2 } from "lucide-react";

interface PendingQuestion {
  level: string;
  category: string;
  format: string;
  prompt: string;
  correctAnswer: string;
  distractors?: string[];
  explanation?: string;
}

interface Props {
  questions: PendingQuestion[];
  userId: string;
}

export function ReviewClient({ questions: initial, userId }: Props) {
  const [questions, setQuestions] = useState<PendingQuestion[]>(initial);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const toggle = (idx: number, set: "approve" | "reject") => {
    if (set === "approve") {
      setApproved((prev) => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
      setRejected((prev) => { const n = new Set(prev); n.delete(idx); return n; });
    } else {
      setRejected((prev) => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
      setApproved((prev) => { const n = new Set(prev); n.delete(idx); return n; });
    }
  };

  const handleSubmit = () => {
    const toApprove = questions.filter((_, i) => approved.has(i));
    if (toApprove.length === 0) return;

    startTransition(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/admin/review-questions/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_BACKEND_TOKEN ?? ""}`,
          "X-User-ID": userId,
        },
        body: JSON.stringify({ questions: toApprove }),
      });
      if (res.ok) {
        setSubmitted(true);
        setQuestions((prev) => prev.filter((_, i) => !approved.has(i) && !rejected.has(i)));
      }
    });
  };

  if (submitted && questions.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <p className="font-semibold">Review complete!</p>
        <p className="text-sm text-[var(--text-secondary)]">{approved.size} questions approved and inserted.</p>
      </div>
    );
  }

  const LEVEL_COLORS: Record<string, string> = {
    A1: "bg-green-100 text-green-700", A2: "bg-emerald-100 text-emerald-700",
    B1: "bg-blue-100 text-blue-700", B2: "bg-indigo-100 text-indigo-700",
    C1: "bg-purple-100 text-purple-700", C2: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setApproved(new Set(questions.map((_, i) => i)))}
          className="rounded-[var(--radius-md)] border border-green-500 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
        >
          Approve all
        </button>
        <button
          onClick={() => setRejected(new Set(questions.map((_, i) => i)))}
          className="rounded-[var(--radius-md)] border border-red-400 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          Reject all
        </button>
        <span className="ml-auto text-sm text-[var(--text-secondary)]">
          {approved.size} approved · {rejected.size} rejected
        </span>
        <button
          onClick={handleSubmit}
          disabled={approved.size === 0 || isPending}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Submit approved
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((q, i) => {
          const isApproved = approved.has(i);
          const isRejected = rejected.has(i);
          return (
            <div
              key={i}
              className={`rounded-[var(--radius-lg)] border p-4 transition-colors ${
                isApproved ? "border-green-400 bg-green-50" : isRejected ? "border-red-300 bg-red-50 opacity-50" : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Badges */}
                <div className="flex flex-wrap gap-1 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLORS[q.level] ?? "bg-gray-100 text-gray-600"}`}>
                    {q.level}
                  </span>
                  <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-xs capitalize">{q.format}</span>
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  {/* Prompt */}
                  <p className="font-medium text-sm">{q.prompt}</p>

                  {/* Answer */}
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-xs">✓ {q.correctAnswer}</span>
                    {q.distractors?.map((d, di) => (
                      <span key={di} className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">{d}</span>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-xs italic text-[var(--text-secondary)]">{q.explanation}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => toggle(i, "approve")}
                    className={`rounded p-1.5 transition-colors ${isApproved ? "bg-green-500 text-white" : "hover:bg-green-100 text-[var(--text-secondary)]"}`}
                    aria-label="Approve"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggle(i, "reject")}
                    className={`rounded p-1.5 transition-colors ${isRejected ? "bg-red-400 text-white" : "hover:bg-red-100 text-[var(--text-secondary)]"}`}
                    aria-label="Reject"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
