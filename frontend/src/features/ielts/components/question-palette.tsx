"use client";

type QuestionPaletteProps = {
  questions: { id: string; index: number }[];
  answers: Record<string, string>;
  flagged: Set<string>;
  activeQuestionId?: string;
  onNavigate: (questionId: string) => void;
  onFlag: (questionId: string) => void;
};

export function QuestionPalette({
  questions,
  answers,
  flagged,
  activeQuestionId,
  onNavigate,
  onFlag,
}: QuestionPaletteProps) {
  const answeredCount = questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length;
  const flaggedCount = questions.filter((q) => flagged.has(q.id)).length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Questions
        </h3>
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span>{answeredCount}/{questions.length} answered</span>
          {flaggedCount > 0 && (
            <span className="text-amber-500">{flaggedCount} flagged</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {questions.map((q) => {
          const isAnswered = (answers[q.id] ?? "").trim() !== "";
          const isFlagged = flagged.has(q.id);
          const isActive = activeQuestionId === q.id;

          return (
            <button
              key={q.id}
              onClick={() => onNavigate(q.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onFlag(q.id);
              }}
              title={`Question ${q.index}${isFlagged ? " (flagged)" : ""}. Right-click to flag.`}
              className={`relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border text-xs font-semibold transition-all ${
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] ring-2 ring-[var(--primary-soft)]"
                  : isAnswered
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-soft)]"
              }`}
            >
              {q.index}
              {isFlagged && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[var(--bg-surface)] bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-[var(--border)]" />
          Unanswered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-blue-500/30 bg-blue-500/10" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative h-3 w-3 rounded-sm border border-[var(--border)]">
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Flagged
        </span>
      </div>
    </div>
  );
}
