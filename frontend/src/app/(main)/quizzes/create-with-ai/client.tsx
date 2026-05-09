"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

// ── Types ─────────────────────────────────────────────────────────────────────

type AIQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type GenerateMeta = {
  model: string;
  generatedCount: number;
  remainingToday: number;
};

// ── Step 1 — Generation form ──────────────────────────────────────────────────

function GenerateForm({
  onGenerated,
}: {
  onGenerated: (questions: AIQuestion[], meta: GenerateMeta) => void;
}) {
  const { t } = useLocale();
  const [text, setText] = useState("");
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if ([...trimmed].length < 50) {
      setError(t("quiz.ai.errorShort"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quizzes/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, count, subject: subject.trim() }),
      });

      const data = (await res.json().catch(() => null)) as {
        questions?: AIQuestion[];
        meta?: GenerateMeta;
        error?: string;
      } | null;

      if (!res.ok) {
        if (res.status === 429 || data?.error === "DAILY_LIMIT_REACHED") {
          setError(t("quiz.ai.errorDailyLimit"));
        } else {
          setError(t("quiz.ai.errorFailed"));
        }
        return;
      }

      if (!data?.questions?.length) {
        setError(t("quiz.ai.errorFailed"));
        return;
      }

      onGenerated(data.questions, data.meta ?? { model: "", generatedCount: data.questions.length, remainingToday: 0 });
    } catch {
      setError(t("quiz.ai.errorFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Text input */}
      <div>
        <label
          htmlFor="ai-text"
          className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
        >
          {t("quiz.ai.inputLabel")}
        </label>
        <textarea
          id="ai-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={t("quiz.ai.inputPlaceholder")}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          disabled={loading}
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">{t("quiz.ai.inputHint")}</p>
      </div>

      {/* Row: count + subject */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Question count */}
        <div>
          <label
            htmlFor="ai-count"
            className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
          >
            {t("quiz.ai.questionCount")}
          </label>
          <select
            id="ai-count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={loading}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label
            htmlFor="ai-subject"
            className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
          >
            {t("quiz.ai.subject")}
          </label>
          <input
            id="ai-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("quiz.ai.subjectPlaceholder")}
            disabled={loading}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t("quiz.ai.generating") : t("quiz.ai.generateBtn")}
      </button>
    </form>
  );
}

// ── Step 2 — Preview & edit ───────────────────────────────────────────────────

const OPTION_LETTERS = ["A", "B", "C", "D"];
const CORRECT_OPTION_MAP: Record<number, string> = { 0: "a", 1: "b", 2: "c", 3: "d", 4: "e" };

function QuestionCard({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: AIQuestion;
  index: number;
  onChange: (updated: AIQuestion) => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();

  function updateOption(i: number, value: string) {
    const next = [...question.options];
    next[i] = value;
    onChange({ ...question, options: next });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {t("quiz.ai.questionLabel").replace("{n}", String(index + 1))}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("quiz.ai.deleteQuestion")}
          className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Question text */}
      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          {t("quiz.ai.questionTextLabel")}
        </label>
        <textarea
          rows={2}
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* Options */}
      <div className="mt-3 space-y-2">
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                question.correctIndex === i
                  ? "bg-emerald-500 text-white"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
              }`}
            >
              {OPTION_LETTERS[i]}
            </span>
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={t("quiz.ai.optionLabel").replace("{n}", OPTION_LETTERS[i])}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <button
              type="button"
              onClick={() => onChange({ ...question, correctIndex: i })}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                question.correctIndex === i
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("quiz.ai.correctAnswerLabel")}
            </button>
          </div>
        ))}
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            {t("quiz.ai.explanationLabel")}
          </label>
          <textarea
            rows={2}
            value={question.explanation}
            onChange={(e) => onChange({ ...question, explanation: e.target.value })}
            className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      )}
    </div>
  );
}

// ── Save modal ────────────────────────────────────────────────────────────────

function SaveModal({
  onConfirm,
  onCancel,
  saving,
}: {
  onConfirm: (title: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => {
        if (!saving) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-save-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl"
      >
        <h2 id="ai-save-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
          {t("quiz.ai.saveModalTitle")}
        </h2>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("quiz.ai.saveModalPlaceholder")}
          disabled={saving}
          className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) onConfirm(title.trim());
          }}
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {t("quiz.ai.saveModalCancel")}
          </button>
          <button
            type="button"
            onClick={() => { if (title.trim()) onConfirm(title.trim()); }}
            disabled={saving || !title.trim()}
            className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("quiz.ai.saving") : t("quiz.ai.saveModalConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview page ───────────────────────────────────────────────────────────────

function PreviewStep({
  initialQuestions,
  meta,
  onRegenerate,
}: {
  initialQuestions: AIQuestion[];
  meta: GenerateMeta;
  onRegenerate: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [questions, setQuestions] = useState<AIQuestion[]>(initialQuestions);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateQuestion(index: number, updated: AIQuestion) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  }

  function deleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(title: string) {
    setSaving(true);
    setSaveError(null);

    const quizQuestions = questions.map((q) => ({
      questionText: q.text,
      questionType: "mcq" as const,
      optionA: q.options[0] ?? "",
      optionB: q.options[1] ?? "",
      optionC: q.options[2] ?? "",
      optionD: q.options[3] ?? "",
      ...(q.options[4] ? { optionE: q.options[4] } : {}),
      correctOption: CORRECT_OPTION_MAP[q.correctIndex] ?? "a",
      explanation: q.explanation,
    }));

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: "",
          subject: "",
          isPublic: false,
          timePerQuestion: 30,
          shuffleOptions: false,
          showAnswerAnimations: true,
          powerUpsEnabled: false,
          tags: [],
          questions: quizQuestions,
        }),
      });

      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;

      if (!res.ok || !data?.id) {
        setSaveError(t("quiz.ai.errorSave"));
        return;
      }

      router.push(`/quizzes/${data.id}`);
    } catch {
      setSaveError(t("quiz.ai.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">{t("quiz.ai.noQuestionsLeft")}</p>
        <button
          type="button"
          onClick={onRegenerate}
          className="mt-4 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {t("quiz.ai.regenerateBtn")}
        </button>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <SaveModal
          saving={saving}
          onConfirm={(title) => { void handleSave(title); }}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
              {t("quiz.ai.previewEyebrow")}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {t("quiz.ai.previewTitle").replace("{n}", String(questions.length))}
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {t("quiz.ai.remainingToday").replace("{n}", String(meta.remainingToday))}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={i}
            question={q}
            index={i}
            onChange={(updated) => updateQuestion(i, updated)}
            onDelete={() => deleteQuestion(i)}
          />
        ))}
      </div>

      {saveError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
        >
          {saveError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          {t("quiz.ai.regenerateBtn")}
        </button>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("quiz.ai.saveBtn")}
        </button>
      </div>
    </>
  );
}

// ── Root orchestrator ─────────────────────────────────────────────────────────

type Step =
  | { type: "form" }
  | { type: "preview"; questions: AIQuestion[]; meta: GenerateMeta };

export function CreateWithAIClient() {
  const [step, setStep] = useState<Step>({ type: "form" });

  if (step.type === "preview") {
    return (
      <PreviewStep
        initialQuestions={step.questions}
        meta={step.meta}
        onRegenerate={() => setStep({ type: "form" })}
      />
    );
  }

  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
      <GenerateForm
        onGenerated={(questions, meta) => setStep({ type: "preview", questions, meta })}
      />
    </div>
  );
}
