"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Globe2,
  Lock,
  FileSpreadsheet,
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";
import type {
  CreateQuizInput,
  QuizFormState,
  QuizQuestionInput,
} from "@/app/(main)/quizzes/actions";
import { ExcelImport } from "./excel-import";

type QuestionEntry = QuizQuestionInput & { _key: number };

interface QuizFormProps {
  initialTitle?: string;
  initialDescription?: string;
  initialSubject?: string;
  initialIsPublic?: boolean;
  initialTimePerQuestion?: number;
  initialShuffleOptions?: boolean;
  initialQuestions?: QuizQuestionInput[];
  submitLabel: string;
  cancelHref: string;
  cancelLabel: string;
  onSubmit: (input: CreateQuizInput) => Promise<QuizFormState>;
}

const TIME_OPTIONS = [15, 30, 45, 60];

const emptyQuestion = (key: number): QuestionEntry => ({
  _key: key,
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
});

export function QuizForm({
  initialTitle = "",
  initialDescription = "",
  initialSubject = "",
  initialIsPublic = false,
  initialTimePerQuestion = 30,
  initialShuffleOptions = true,
  initialQuestions,
  submitLabel,
  cancelHref,
  cancelLabel,
  onSubmit,
}: QuizFormProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"manual" | "import">("manual");

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [subject, setSubject] = useState(initialSubject);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [timePerQuestion, setTimePerQuestion] = useState(initialTimePerQuestion);
  const [shuffleOptions, setShuffleOptions] = useState(initialShuffleOptions);

  const [keyCounter, setKeyCounter] = useState(0);
  const [questions, setQuestions] = useState<QuestionEntry[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return initialQuestions.map((q, i) => ({ ...q, _key: i }));
    }
    return [emptyQuestion(0), emptyQuestion(1)];
  });

  const nextKey = () => {
    const k = keyCounter + (questions.length > 0 ? questions.length : 0) + 1;
    setKeyCounter(k);
    return k;
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(nextKey())]);
  };

  const removeQuestion = (key: number) => {
    setQuestions((prev) => prev.filter((q) => q._key !== key));
  };

  const moveQuestion = (key: number, direction: -1 | 1) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q._key === key);
      if (idx === -1) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateQuestion = (
    key: number,
    patch: Partial<QuizQuestionInput>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q._key === key ? { ...q, ...patch } : q))
    );
  };

  const handleImported = (imported: QuizQuestionInput[]) => {
    const base = keyCounter + questions.length;
    const entries = imported.map((q, i) => ({ ...q, _key: base + i + 1 }));
    setKeyCounter(base + imported.length + 1);
    setQuestions((prev) => {
      const hasAnyContent = prev.some(
        (q) => q.questionText || q.optionA || q.optionB || q.optionC || q.optionD
      );
      return hasAnyContent ? [...prev, ...entries] : entries;
    });
    setMode("manual");
    toast("success", t("quiz.importSuccess").replace("{n}", String(entries.length)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filled = questions.filter(
      (q) =>
        q.questionText.trim() ||
        (q.optionA ?? "").trim() ||
        (q.optionB ?? "").trim() ||
        (q.optionC ?? "").trim() ||
        (q.optionD ?? "").trim() ||
        (q.blankAnswer ?? "").trim() ||
        (q.reorderItems?.length ?? 0) > 0
    );

    if (!title.trim()) {
      toast("error", t("quiz.errTitleRequired"));
      return;
    }
    if (filled.length === 0) {
      toast("error", t("quiz.errAtLeastOneQuestion"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await onSubmit({
          title,
          description,
          subject,
          isPublic,
          timePerQuestion,
          shuffleOptions,
          questions: filled.map(({ _key: _ignored, ...rest }) => {
            void _ignored;
            return rest;
          }),
        });
        if (result?.error) {
          toast("error", result.error);
        }
      } catch {
        toast("error", t("quiz.errCreateFailed"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {t("quiz.metaSection")}
        </h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {t("quiz.fieldTitle")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("quiz.fieldTitlePlaceholder")}
              maxLength={200}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {t("quiz.fieldDescription")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("quiz.fieldDescriptionPlaceholder")}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {t("quiz.fieldSubject")}
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("quiz.fieldSubjectPlaceholder")}
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {t("quiz.fieldTimePerQuestion")}
              </label>
              <select
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
              >
                {TIME_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s} {t("quiz.seconds")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {t("quiz.shuffleOptions")}
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {isPublic ? (
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4" />
                  {t("quiz.isPublic")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-4 w-4" />
                  {t("quiz.isPrivate")}
                </span>
              )}
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {t("quiz.questionsSection")}
          </h2>
          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-1">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`inline-flex items-center gap-1.5 rounded-[calc(var(--radius-md)-4px)] px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "manual"
                  ? "bg-[var(--bg-base)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("quiz.tabManual")}
            </button>
            <button
              type="button"
              onClick={() => setMode("import")}
              className={`inline-flex items-center gap-1.5 rounded-[calc(var(--radius-md)-4px)] px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "import"
                  ? "bg-[var(--bg-base)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t("quiz.tabImport")}
            </button>
          </div>
        </div>

        {mode === "import" ? (
          <div className="mt-4">
            <ExcelImport onImport={handleImported} />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {questions.map((q, idx) => (
              <QuestionEditor
                key={q._key}
                index={idx}
                question={q}
                onChange={(patch) => updateQuestion(q._key, patch)}
                onRemove={() => removeQuestion(q._key)}
                onMoveUp={() => moveQuestion(q._key, -1)}
                onMoveDown={() => moveQuestion(q._key, 1)}
                canRemove={questions.length > 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="h-4 w-4" />
              {t("quiz.addQuestion")}
            </Button>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link href={cancelHref}>
          <Button type="button" variant="outline">
            {cancelLabel}
          </Button>
        </Link>
        <Button type="submit" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function QuestionEditor({
  index,
  question,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canRemove,
}: {
  index: number;
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
}) {
  const { t } = useLocale();
  const options: Array<{ key: "a" | "b" | "c" | "d"; field: keyof QuizQuestionInput }> = [
    { key: "a", field: "optionA" },
    { key: "b", field: "optionB" },
    { key: "c", field: "optionC" },
    { key: "d", field: "optionD" },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-base)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <GripVertical className="h-4 w-4" />
          {t("quiz.question")} {index + 1}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
            aria-label={t("quiz.moveUp")}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
            aria-label={t("quiz.moveDown")}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              aria-label={t("quiz.removeQuestion")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <textarea
          value={question.questionText}
          onChange={(e) => onChange({ questionText: e.target.value })}
          placeholder={t("quiz.questionPlaceholder")}
          rows={2}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
        />
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = question.correctOption === opt.key;
          return (
            <div
              key={opt.key}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2 transition-colors ${
                selected
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <button
                type="button"
                onClick={() => onChange({ correctOption: opt.key })}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase transition-colors ${
                  selected
                    ? "border-[var(--success)] bg-[var(--success)] text-white"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
                aria-label={t("quiz.markCorrect")}
              >
                {opt.key}
              </button>
              <input
                value={question[opt.field] as string}
                onChange={(e) => onChange({ [opt.field]: e.target.value })}
                placeholder={t("quiz.optionPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
