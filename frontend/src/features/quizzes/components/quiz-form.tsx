"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
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
  ListChecks,
  ToggleLeft,
  Type as TypeIcon,
  ListOrdered,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";
import type {
  CreateQuizInput,
  QuizFormState,
  QuizQuestionInput,
  QuizQuestionType,
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
  initialShowAnswerAnimations?: boolean;
  initialTags?: string[];
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
  questionType: "mcq",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
  blankAnswer: "",
  reorderItems: [],
  imageUrl: "",
  explanation: "",
});

// Resets type-specific fields when switching types so stale data from the
// previous type doesn't sneak into the submit payload.
function applyTypeChange(
  q: QuestionEntry,
  nextType: QuizQuestionType
): QuestionEntry {
  const base: QuestionEntry = { ...q, questionType: nextType };
  switch (nextType) {
    case "mcq":
      return {
        ...base,
        optionA: q.optionA ?? "",
        optionB: q.optionB ?? "",
        optionC: q.optionC ?? "",
        optionD: q.optionD ?? "",
        correctOption: q.correctOption === "a" || q.correctOption === "b" || q.correctOption === "c" || q.correctOption === "d"
          ? q.correctOption
          : "a",
        blankAnswer: "",
        reorderItems: [],
      };
    case "true_false":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: q.correctOption === "t" || q.correctOption === "f" ? q.correctOption : "t",
        blankAnswer: "",
        reorderItems: [],
      };
    case "fill_blank":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: q.blankAnswer ?? "",
        reorderItems: [],
      };
    case "reorder":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: q.reorderItems && q.reorderItems.length > 0 ? q.reorderItems : ["", ""],
      };
  }
}

export function QuizForm({
  initialTitle = "",
  initialDescription = "",
  initialSubject = "",
  initialIsPublic = false,
  initialTimePerQuestion = 30,
  initialShuffleOptions = true,
  initialShowAnswerAnimations = true,
  initialTags,
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
  const [showAnswerAnimations, setShowAnswerAnimations] = useState(
    initialShowAnswerAnimations
  );
  const [tags, setTags] = useState<string[]>(() => initialTags ?? []);

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

  const setQuestionType = (key: number, nextType: QuizQuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => (q._key === key ? applyTypeChange(q, nextType) : q))
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
          showAnswerAnimations,
          tags,
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
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {t("quiz.fieldTags")}
            </label>
            <TagsInput value={tags} onChange={setTags} />
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
                checked={showAnswerAnimations}
                onChange={(e) => setShowAnswerAnimations(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {t("quiz.showAnswerAnimations")}
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
                onTypeChange={(nextType) => setQuestionType(q._key, nextType)}
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

function TagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const v = draft.trim().toLowerCase();
    if (!v) return;
    if (value.includes(v)) {
      setDraft("");
      return;
    }
    if (value.length >= 10) {
      setDraft("");
      return;
    }
    onChange([...value, v.slice(0, 40)]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            aria-label={t("quiz.tagRemove")}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Enter and comma both commit the draft tag so users can type
          // comma-separated lists or chain with Enter — matching the
          // familiar chip-input pattern across most modern tag pickers.
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addDraft();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={addDraft}
        placeholder={value.length === 0 ? t("quiz.tagPlaceholder") : ""}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
        maxLength={40}
      />
    </div>
  );
}

type TypeOption = {
  key: QuizQuestionType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TYPE_OPTIONS: TypeOption[] = [
  { key: "mcq", labelKey: "quiz.typeMcq", icon: ListChecks },
  { key: "true_false", labelKey: "quiz.typeTrueFalse", icon: ToggleLeft },
  { key: "fill_blank", labelKey: "quiz.typeFillBlank", icon: TypeIcon },
  { key: "reorder", labelKey: "quiz.typeReorder", icon: ListOrdered },
];

function QuestionEditor({
  index,
  question,
  onChange,
  onTypeChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canRemove,
}: {
  index: number;
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
  onTypeChange: (type: QuizQuestionType) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
}) {
  const { t } = useLocale();
  const questionType: QuizQuestionType = question.questionType ?? "mcq";

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

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TYPE_OPTIONS.map((opt) => {
          const active = questionType === opt.key;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onTypeChange(opt.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(opt.labelKey)}
            </button>
          );
        })}
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

      <QuestionExtras question={question} onChange={onChange} />

      {questionType === "mcq" ? (
        <McqBody question={question} onChange={onChange} />
      ) : questionType === "true_false" ? (
        <TrueFalseBody question={question} onChange={onChange} />
      ) : questionType === "fill_blank" ? (
        <FillBlankBody question={question} onChange={onChange} />
      ) : (
        <ReorderBody question={question} onChange={onChange} />
      )}
    </div>
  );
}

function QuestionExtras({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const imageUrl = question.imageUrl ?? "";

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      toast("error", t("quiz.imageBadType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("error", t("quiz.imageTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/quizzes/images", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        toast("error", data?.error ?? t("quiz.imageUploadFailed"));
        return;
      }
      onChange({ imageUrl: data.url });
    } catch {
      toast("error", t("quiz.imageUploadFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        {imageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-20 w-20 rounded-[var(--radius-md)] border border-[var(--border)] object-cover"
            />
            <button
              type="button"
              onClick={() => onChange({ imageUrl: "" })}
              className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
              aria-label={t("quiz.imageRemove")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {imageUrl ? t("quiz.imageReplace") : t("quiz.imageAdd")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      <textarea
        value={question.explanation ?? ""}
        onChange={(e) => onChange({ explanation: e.target.value })}
        placeholder={t("quiz.explanationPlaceholder")}
        rows={2}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-xs text-[var(--text-secondary)] outline-none transition-colors focus:border-[var(--primary)]"
      />
    </div>
  );
}

function McqBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: "a" | "b" | "c" | "d"; field: keyof QuizQuestionInput }> = [
    { key: "a", field: "optionA" },
    { key: "b", field: "optionB" },
    { key: "c", field: "optionC" },
    { key: "d", field: "optionD" },
  ];
  return (
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
              value={(question[opt.field] as string | undefined) ?? ""}
              onChange={(e) => onChange({ [opt.field]: e.target.value })}
              placeholder={t("quiz.optionPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
        );
      })}
    </div>
  );
}

function TrueFalseBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const choices: Array<{ key: "t" | "f"; labelKey: string }> = [
    { key: "t", labelKey: "quiz.true" },
    { key: "f", labelKey: "quiz.false" },
  ];
  return (
    <div className="mt-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {t("quiz.markCorrect")}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {choices.map((c) => {
          const active = question.correctOption === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange({ correctOption: c.key })}
              className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-[var(--success)] bg-[var(--success)]/15 text-[var(--success)]"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              {t(c.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FillBlankBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="mt-3">
      <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {t("quiz.fieldBlankAnswer")}
      </label>
      <Input
        value={question.blankAnswer ?? ""}
        onChange={(e) => onChange({ blankAnswer: e.target.value })}
        placeholder={t("quiz.blankAnswerPlaceholder")}
        maxLength={300}
      />
      <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
        {t("quiz.blankAnswerHint")}
      </p>
    </div>
  );
}

function ReorderBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const items = question.reorderItems ?? [];

  const setItem = (idx: number, value: string) => {
    const next = [...items];
    next[idx] = value;
    onChange({ reorderItems: next });
  };
  const addItem = () => {
    if (items.length >= 10) return;
    onChange({ reorderItems: [...items, ""] });
  };
  const removeItem = (idx: number) => {
    if (items.length <= 2) return;
    onChange({ reorderItems: items.filter((_, i) => i !== idx) });
  };
  const moveItem = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ reorderItems: next });
  };

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] text-[var(--text-muted)]">
        {t("quiz.reorderHint")}
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
              {idx + 1}
            </span>
            <input
              value={item}
              onChange={(e) => setItem(idx, e.target.value)}
              placeholder={t("quiz.reorderItemPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
            />
            <button
              type="button"
              onClick={() => moveItem(idx, -1)}
              disabled={idx === 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] disabled:opacity-30"
              aria-label={t("quiz.moveUp")}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(idx, 1)}
              disabled={idx === items.length - 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] disabled:opacity-30"
              aria-label={t("quiz.moveDown")}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              disabled={items.length <= 2}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-30"
              aria-label={t("quiz.removeQuestion")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= 10}
        className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("quiz.reorderAddItem")}
      </button>
    </div>
  );
}
