"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
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
  CheckSquare,
  ToggleLeft,
  Type as TypeIcon,
  ListOrdered,
  Shuffle,
  MapPin,
  ImagePlus,
  Loader2,
  X,
  BarChart2,
  ChevronDown,
  Layers,
  Tag,
  BookOpen,
  Music,
  Video,
  Paintbrush,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";
import type {
  ComprehensionData,
  ComprehensionSubQuestion,
  CreateQuizInput,
  HotspotZone,
  MatchPair,
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
  initialPowerUpsEnabled?: boolean;
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
  matchPairs: [],
  hotspotZones: [],
  imageUrl: "",
  explanation: "",
  hint: "",
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
        optionE: q.optionE ?? "",
        correctOption: q.correctOption === "a" || q.correctOption === "b" || q.correctOption === "c" || q.correctOption === "d" || q.correctOption === "e"
          ? q.correctOption
          : "a",
        blankAnswer: "",
        reorderItems: [],
      };
    case "mcq_multi":
      return {
        ...base,
        optionA: q.optionA ?? "",
        optionB: q.optionB ?? "",
        optionC: q.optionC ?? "",
        optionD: q.optionD ?? "",
        // Carry over if already a comma-list, else default to first two
        correctOption: (q.correctOption ?? "").includes(",") ? q.correctOption : "a,b",
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
        matchPairs: [],
      };
    case "matching":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: q.matchPairs && q.matchPairs.length > 0 ? q.matchPairs : [{ left: "", right: "" }, { left: "", right: "" }],
      };
    case "hotspot":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: [],
        hotspotZones: q.hotspotZones && q.hotspotZones.length > 0 ? q.hotspotZones : [],
      };
    case "poll":
      return {
        ...base,
        optionA: q.optionA ?? "",
        optionB: q.optionB ?? "",
        optionC: q.optionC ?? "",
        optionD: q.optionD ?? "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: [],
      };
    case "dropdown":
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
        matchPairs: [],
      };
    case "categorization":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: q.matchPairs && q.matchPairs.length > 0 ? q.matchPairs : [{ left: "", right: "" }, { left: "", right: "" }],
      };
    case "labeling":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: [],
        hotspotZones: q.hotspotZones && q.hotspotZones.length > 0 ? q.hotspotZones : [],
        comprehensionData: undefined,
      };
    case "comprehension":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: [],
        hotspotZones: [],
        comprehensionData: q.comprehensionData ?? { passage: "", subQuestions: [] },
      };
    case "audio":
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
        matchPairs: [],
      };
    case "video":
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
        matchPairs: [],
      };
    case "drawing":
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: [],
      };
    case "voice_response":
      // Speaking practice: prompt-only, no options or canonical answer.
      return {
        ...base,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        blankAnswer: "",
        reorderItems: [],
        matchPairs: [],
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
  initialPowerUpsEnabled = true,
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
  const formRef = useRef<HTMLFormElement>(null);
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
  const [powerUpsEnabled, setPowerUpsEnabled] = useState(initialPowerUpsEnabled);
  const [tags, setTags] = useState<string[]>(() => initialTags ?? []);

  const [show5, setShow5] = useState(() =>
    (initialQuestions ?? []).some((q) => Boolean(q.optionE))
  );

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

  const toggleShow5 = (next: boolean) => {
    setShow5(next);
    if (!next) {
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          optionE: "",
          correctOption: q.correctOption === "e" ? "" : q.correctOption,
        }))
      );
    }
  };

  const handleImported = (imported: QuizQuestionInput[]) => {
    const base = keyCounter + questions.length;
    const entries = imported.map((q, i) => ({ ...q, _key: base + i + 1 }));
    if (imported.some((q) => Boolean(q.optionE))) {
      setShow5(true);
    }
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
        (q.reorderItems?.length ?? 0) > 0 ||
        (q.matchPairs?.length ?? 0) > 0 ||
        (q.hotspotZones?.length ?? 0) > 0
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
          powerUpsEnabled,
          tags,
          questions: filled.map(({ _key: _ignored, ...rest }) => {
            void _ignored;
            return rest;
          }),
        });
        if (result?.error) {
          toast("error", result.error);
        }
      } catch (error) {
        // redirect() in server actions throws NEXT_REDIRECT — re-throw it so
        // Next.js can perform the navigation instead of swallowing it here.
        if (isRedirectError(error)) throw error;
        toast("error", t("quiz.errCreateFailed"));
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Sticky publish button — always visible at top-right */}
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-5">
        <Button
          type="button"
          isLoading={isPending}
          onClick={() => formRef.current?.requestSubmit()}
          className="shadow-lg"
        >
          {submitLabel}
        </Button>
      </div>
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
                checked={powerUpsEnabled}
                onChange={(e) => setPowerUpsEnabled(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {t("quiz.powerUpsEnabled")}
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
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {t("quiz.questionsSection")}
            </h2>
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={show5}
                onChange={(e) => toggleShow5(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {t("quiz.show5thOption")}
              </span>
            </label>
          </div>
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
                show5={show5}
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
  { key: "mcq_multi", labelKey: "quiz.typeMcqMulti", icon: CheckSquare },
  { key: "true_false", labelKey: "quiz.typeTrueFalse", icon: ToggleLeft },
  { key: "fill_blank", labelKey: "quiz.typeFillBlank", icon: TypeIcon },
  { key: "reorder", labelKey: "quiz.typeReorder", icon: ListOrdered },
  { key: "matching", labelKey: "quiz.typeMatching", icon: Shuffle },
  { key: "hotspot", labelKey: "quiz.typeHotspot", icon: MapPin },
  { key: "poll", labelKey: "quiz.typePoll", icon: BarChart2 },
  { key: "dropdown", labelKey: "quiz.typeDropdown", icon: ChevronDown },
  { key: "categorization", labelKey: "quiz.typeCategorization", icon: Layers },
  { key: "labeling", labelKey: "quiz.typeLabeling", icon: Tag },
  { key: "comprehension", labelKey: "quiz.typeComprehension", icon: BookOpen },
  { key: "audio", labelKey: "quiz.typeAudio", icon: Music },
  { key: "video", labelKey: "quiz.typeVideo", icon: Video },
  { key: "drawing", labelKey: "quiz.typeDrawing", icon: Paintbrush },
  { key: "voice_response", labelKey: "quiz.typeVoiceResponse", icon: Mic },
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
  show5,
}: {
  index: number;
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
  onTypeChange: (type: QuizQuestionType) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
  show5: boolean;
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
        <McqBody question={question} onChange={onChange} show5={show5} />
      ) : questionType === "mcq_multi" ? (
        <McqMultiBody question={question} onChange={onChange} show5={show5} />
      ) : questionType === "true_false" ? (
        <TrueFalseBody question={question} onChange={onChange} />
      ) : questionType === "fill_blank" ? (
        <FillBlankBody question={question} onChange={onChange} />
      ) : questionType === "hotspot" ? (
        <HotspotBody question={question} onChange={onChange} />
      ) : questionType === "labeling" ? (
        <LabelingBody question={question} onChange={onChange} />
      ) : questionType === "matching" ? (
        <MatchingBody question={question} onChange={onChange} />
      ) : questionType === "poll" ? (
        <PollBody question={question} onChange={onChange} />
      ) : questionType === "dropdown" ? (
        <DropdownBody question={question} onChange={onChange} />
      ) : questionType === "categorization" ? (
        <CategorizationBody question={question} onChange={onChange} />
      ) : questionType === "comprehension" ? (
        <ComprehensionBody question={question} onChange={onChange} />
      ) : questionType === "audio" ? (
        <AudioBody question={question} onChange={onChange} />
      ) : questionType === "video" ? (
        <VideoBody question={question} onChange={onChange} />
      ) : questionType === "drawing" ? (
        <DrawingBody question={question} onChange={onChange} />
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

      <textarea
        value={question.hint ?? ""}
        onChange={(e) => onChange({ hint: e.target.value })}
        placeholder={t("quiz.hintPlaceholder")}
        rows={2}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-xs text-[var(--text-secondary)] outline-none transition-colors focus:border-[var(--primary)]"
      />
    </div>
  );
}

function AudioBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const audioUrl = question.audioUrl ?? "";

  const handleAudioFile = async (file: File) => {
    if (!file) return;
    if (!/^audio\/(mpeg|mp3|wav|ogg|webm|x-wav|wave|vorbis)$/i.test(file.type) && !/^video\/webm$/i.test(file.type)) {
      toast("error", t("quiz.audio.badType"));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast("error", t("quiz.audio.tooLarge"));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/quizzes/audio", { method: "POST", body: formData });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        toast("error", data?.error ?? t("quiz.audio.uploadFailed"));
        return;
      }
      onChange({ audioUrl: data.url });
    } catch {
      toast("error", t("quiz.audio.uploadFailed"));
    } finally {
      setUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const options: Array<{ key: "a" | "b" | "c" | "d"; field: keyof QuizQuestionInput }> = [
    { key: "a", field: "optionA" },
    { key: "b", field: "optionB" },
    { key: "c", field: "optionC" },
    { key: "d", field: "optionD" },
  ];

  return (
    <div className="mt-3 space-y-3">
      {/* Audio URL input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">{t("quiz.audio.urlLabel")}</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={audioUrl}
            onChange={(e) => onChange({ audioUrl: e.target.value })}
            placeholder={t("quiz.audio.urlPlaceholder")}
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
          />
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Music className="h-3.5 w-3.5" />}
            {t("quiz.audio.upload")}
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAudioFile(file);
            }}
          />
        </div>
        {audioUrl && (
          <audio
            src={audioUrl}
            controls
            className="mt-1 h-9 w-full"
          />
        )}
      </div>

      {/* MCQ answer options */}
      {options.map(({ key, field }) => (
        <div key={key} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ correctOption: key })}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
              question.correctOption === key
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            }`}
          >
            {key.toUpperCase()}
          </button>
          <input
            type="text"
            value={(question[field] as string) ?? ""}
            onChange={(e) => onChange({ [field]: e.target.value })}
            placeholder={`${t("quiz.optionPlaceholder")} ${key.toUpperCase()}`}
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
          />
        </div>
      ))}
    </div>
  );
}

function DrawingBody({ question, onChange }: { question: QuestionEntry; onChange: (patch: Partial<QuizQuestionInput>) => void }) {
  const { t } = useLocale();
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4 text-center">
        <Paintbrush className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
        <p className="text-sm font-medium text-[var(--text-primary)]">{t("quiz.drawing.editorHint")}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t("quiz.drawing.nonGraded")}</p>
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

function toYouTubeEmbedURL(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v"))
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/"))
      return url;
  } catch {
    // not a valid URL
  }
  return null;
}

function VideoBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const videoUrl = question.videoUrl ?? "";
  const embedURL = toYouTubeEmbedURL(videoUrl);
  const isDirectVideo = videoUrl && !embedURL && /\.(mp4|webm|ogg)(\?|$)/i.test(videoUrl);

  const options: Array<{ key: "a" | "b" | "c" | "d"; field: keyof QuizQuestionInput }> = [
    { key: "a", field: "optionA" },
    { key: "b", field: "optionB" },
    { key: "c", field: "optionC" },
    { key: "d", field: "optionD" },
  ];

  return (
    <div className="mt-3 space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">{t("quiz.video.urlLabel")}</label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          placeholder={t("quiz.video.urlPlaceholder")}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
        />
        {embedURL ? (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-black">
            <iframe
              src={embedURL}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isDirectVideo ? (
          <video src={videoUrl} controls className="mt-1 w-full rounded-[var(--radius-md)]" />
        ) : videoUrl ? (
          <p className="text-xs text-[var(--text-muted)]">{t("quiz.video.previewUnavailable")}</p>
        ) : null}
      </div>

      {options.map(({ key, field }) => (
        <div key={key} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ correctOption: key })}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
              question.correctOption === key
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            }`}
          >
            {key.toUpperCase()}
          </button>
          <input
            type="text"
            value={(question[field] as string) ?? ""}
            onChange={(e) => onChange({ [field]: e.target.value })}
            placeholder={`${t("quiz.optionPlaceholder")} ${key.toUpperCase()}`}
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
          />
        </div>
      ))}
    </div>
  );
}

function McqBody({
  question,
  onChange,
  show5,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
  show5: boolean;
}) {
  const { t } = useLocale();
  const options: Array<{ key: "a" | "b" | "c" | "d" | "e"; field: keyof QuizQuestionInput }> = [
    { key: "a", field: "optionA" },
    { key: "b", field: "optionB" },
    { key: "c", field: "optionC" },
    { key: "d", field: "optionD" },
    ...(show5 ? [{ key: "e" as const, field: "optionE" as keyof QuizQuestionInput }] : []),
  ];
  return (
    <div className="mt-3 space-y-2">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = question.correctOption === opt.key;
          const isE = opt.key === "e";
          return (
            <div
              key={opt.key}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2 transition-colors ${isE ? "sm:col-span-2" : ""} ${
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
    </div>
  );
}

function McqMultiBody({
  question,
  onChange,
  show5,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
  show5: boolean;
}) {
  const { t } = useLocale();
  const options: Array<{ key: "a" | "b" | "c" | "d" | "e"; field: keyof QuizQuestionInput }> = [
    { key: "a", field: "optionA" },
    { key: "b", field: "optionB" },
    { key: "c", field: "optionC" },
    { key: "d", field: "optionD" },
    ...(show5 ? [{ key: "e" as const, field: "optionE" as keyof QuizQuestionInput }] : []),
  ];

  // Parse comma-separated correctOption into a Set for easy toggling
  const correctSet = new Set(
    (question.correctOption ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );

  const toggleCorrect = (key: string) => {
    const next = new Set(correctSet);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    const sorted = ["a", "b", "c", "d", "e"].filter((k) => next.has(k));
    onChange({ correctOption: sorted.join(",") });
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {t("quiz.markCorrectMulti")}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = correctSet.has(opt.key);
          const isE = opt.key === "e";
          return (
            <div
              key={opt.key}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2 transition-colors ${isE ? "sm:col-span-2" : ""} ${
                selected
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCorrect(opt.key)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border text-xs font-semibold uppercase transition-colors ${
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

function HotspotBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const zones: HotspotZone[] = question.hotspotZones ?? [];
  const correctId = question.correctOption ?? "";

  if (!question.imageUrl) {
    return (
      <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
        {t("quiz.hotspot.noImage")}
      </div>
    );
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));
    const newId = zones.length > 0 ? Math.max(...zones.map((z) => z.id)) + 1 : 1;
    onChange({ hotspotZones: [...zones, { id: newId, x, y, r: 12 }] });
  };

  const updateZone = (id: number, patch: Partial<HotspotZone>) => {
    onChange({ hotspotZones: zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
  };

  const removeZone = (id: number) => {
    onChange({
      hotspotZones: zones.filter((z) => z.id !== id),
      correctOption: correctId === String(id) ? "" : correctId,
    });
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.hotspot.addZoneHint")}</p>
      {/* Image with zone overlay */}
      <div
        className="relative cursor-crosshair select-none overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]"
        onClick={handleImageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={question.imageUrl} alt="" className="pointer-events-none w-full" draggable={false} />
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
              correctId === String(zone.id)
                ? "border-emerald-400 bg-emerald-500 text-white"
                : "border-white bg-[var(--primary)] text-white"
            }`}
          >
            {zone.label || String(zone.id)}
          </div>
        ))}
      </div>
      {zones.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.hotspot.minZones")}</p>
      ) : (
        <div className="space-y-2">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 ${
                correctId === String(zone.id)
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  correctId === String(zone.id) ? "bg-emerald-500" : "bg-[var(--primary)]"
                }`}
              >
                {zone.id}
              </span>
              <input
                value={zone.label ?? ""}
                onChange={(e) => updateZone(zone.id, { label: e.target.value })}
                placeholder={t("quiz.hotspot.zoneLabel")}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
              />
              <button
                type="button"
                onClick={() => onChange({ correctOption: String(zone.id) })}
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                  correctId === String(zone.id)
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-500 hover:text-emerald-400"
                }`}
              >
                {correctId === String(zone.id) ? t("quiz.hotspot.correct") : t("quiz.hotspot.markCorrect")}
              </button>
              <button
                type="button"
                onClick={() => removeZone(zone.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                aria-label={t("quiz.removeQuestion")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LabelingBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const zones: HotspotZone[] = question.hotspotZones ?? [];

  if (!question.imageUrl) {
    return (
      <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
        {t("quiz.labeling.noImage")}
      </div>
    );
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));
    const newId = zones.length > 0 ? Math.max(...zones.map((z) => z.id)) + 1 : 1;
    onChange({ hotspotZones: [...zones, { id: newId, x, y, r: 10, correctLabel: "" }] });
  };

  const updateZone = (id: number, patch: Partial<HotspotZone>) => {
    onChange({ hotspotZones: zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
  };

  const removeZone = (id: number) => {
    onChange({ hotspotZones: zones.filter((z) => z.id !== id) });
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.labeling.addZoneHint")}</p>
      <div
        className="relative cursor-crosshair select-none overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]"
        onClick={handleImageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={question.imageUrl} alt="" className="pointer-events-none w-full" draggable={false} />
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--primary)] text-xs font-bold text-white"
          >
            {zone.id}
          </div>
        ))}
      </div>
      {zones.length < 2 ? (
        <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.labeling.minZones")}</p>
      ) : null}
      {zones.length > 0 && (
        <div className="space-y-2">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                {zone.id}
              </span>
              <input
                value={zone.correctLabel ?? ""}
                onChange={(e) => updateZone(zone.id, { correctLabel: e.target.value })}
                placeholder={t("quiz.labeling.correctLabelPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
              />
              <button
                type="button"
                onClick={() => removeZone(zone.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                aria-label={t("quiz.removeQuestion")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchingBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const pairs: MatchPair[] = question.matchPairs && question.matchPairs.length > 0
    ? question.matchPairs
    : [{ left: "", right: "" }, { left: "", right: "" }];

  const setPair = (idx: number, field: "left" | "right", value: string) => {
    const next = [...pairs];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ matchPairs: next });
  };
  const addPair = () => {
    if (pairs.length >= 8) return;
    onChange({ matchPairs: [...pairs, { left: "", right: "" }] });
  };
  const removePair = (idx: number) => {
    if (pairs.length <= 2) return;
    onChange({ matchPairs: pairs.filter((_, i) => i !== idx) });
  };

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] text-[var(--text-muted)]">
        {t("quiz.matching.pairHint")}
      </p>
      <div className="space-y-2">
        {pairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
              {idx + 1}
            </span>
            <input
              value={pair.left}
              onChange={(e) => setPair(idx, "left", e.target.value)}
              placeholder={t("quiz.matching.leftPlaceholder")}
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />
            <span className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">→</span>
            <input
              value={pair.right}
              onChange={(e) => setPair(idx, "right", e.target.value)}
              placeholder={t("quiz.matching.rightPlaceholder")}
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />
            <button
              type="button"
              onClick={() => removePair(idx)}
              disabled={pairs.length <= 2}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-30"
              aria-label={t("quiz.removeQuestion")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPair}
        disabled={pairs.length >= 8}
        className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("quiz.matching.addPair")}
      </button>
    </div>
  );
}

function PollBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: "a" | "b" | "c" | "d"; field: keyof QuizQuestionInput; required: boolean }> = [
    { key: "a", field: "optionA", required: true },
    { key: "b", field: "optionB", required: true },
    { key: "c", field: "optionC", required: false },
    { key: "d", field: "optionD", required: false },
  ];
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.poll.hint")}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((opt) => (
          <div
            key={opt.key}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold uppercase text-[var(--text-secondary)]">
              {opt.key}
            </span>
            <input
              value={(question[opt.field] as string | undefined) ?? ""}
              onChange={(e) => onChange({ [opt.field]: e.target.value })}
              placeholder={opt.required ? t("quiz.optionPlaceholder") : t("quiz.optionPlaceholderOptional")}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DropdownBody({
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
    <div className="mt-3 space-y-2">
      <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.dropdown.hint")}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
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
    </div>
  );
}

function CategorizationBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const pairs: MatchPair[] = question.matchPairs && question.matchPairs.length > 0
    ? question.matchPairs
    : [{ left: "", right: "" }, { left: "", right: "" }];

  const setPair = (idx: number, field: "left" | "right", value: string) => {
    const next = [...pairs];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ matchPairs: next });
  };
  const addPair = () => {
    if (pairs.length >= 8) return;
    onChange({ matchPairs: [...pairs, { left: "", right: "" }] });
  };
  const removePair = (idx: number) => {
    if (pairs.length <= 2) return;
    onChange({ matchPairs: pairs.filter((_, i) => i !== idx) });
  };

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] text-[var(--text-muted)]">{t("quiz.categorization.hint")}</p>
      <div className="mb-2 grid grid-cols-2 gap-2 px-8">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">{t("quiz.categorization.colItem")}</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">{t("quiz.categorization.colCategory")}</span>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
              {idx + 1}
            </span>
            <input
              value={pair.left}
              onChange={(e) => setPair(idx, "left", e.target.value)}
              placeholder={t("quiz.categorization.itemPlaceholder")}
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />
            <span className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">→</span>
            <input
              value={pair.right}
              onChange={(e) => setPair(idx, "right", e.target.value)}
              placeholder={t("quiz.categorization.categoryPlaceholder")}
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />
            <button
              type="button"
              onClick={() => removePair(idx)}
              disabled={pairs.length <= 2}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-30"
              aria-label={t("quiz.removeQuestion")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPair}
        disabled={pairs.length >= 8}
        className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("quiz.categorization.addItem")}
      </button>
    </div>
  );
}

const SUB_Q_TYPES: Array<{ value: ComprehensionSubQuestion["type"]; label: string }> = [
  { value: "mcq", label: "MCQ" },
  { value: "true_false", label: "True/False" },
  { value: "fill_blank", label: "Fill blank" },
];

function ComprehensionBody({
  question,
  onChange,
}: {
  question: QuestionEntry;
  onChange: (patch: Partial<QuizQuestionInput>) => void;
}) {
  const { t } = useLocale();
  const cd: ComprehensionData = question.comprehensionData ?? { passage: "", subQuestions: [] };

  const setPassage = (passage: string) => {
    onChange({ comprehensionData: { ...cd, passage } });
  };

  const addSubQ = () => {
    if (cd.subQuestions.length >= 10) return;
    const newSq: ComprehensionSubQuestion = {
      id: `sq${cd.subQuestions.length}`,
      type: "mcq",
      prompt: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct: "a",
    };
    onChange({ comprehensionData: { ...cd, subQuestions: [...cd.subQuestions, newSq] } });
  };

  const updateSubQ = (idx: number, patch: Partial<ComprehensionSubQuestion>) => {
    const next = cd.subQuestions.map((sq, i) => (i === idx ? { ...sq, ...patch } : sq));
    onChange({ comprehensionData: { ...cd, subQuestions: next } });
  };

  const removeSubQ = (idx: number) => {
    onChange({ comprehensionData: { ...cd, subQuestions: cd.subQuestions.filter((_, i) => i !== idx) } });
  };

  return (
    <div className="mt-3 space-y-4">
      <p className="text-[11px] text-[var(--text-muted)]">{t("quiz.comprehension.hint")}</p>
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("quiz.comprehension.passageLabel")}
        </label>
        <textarea
          value={cd.passage}
          onChange={(e) => setPassage(e.target.value)}
          placeholder={t("quiz.comprehension.passagePlaceholder")}
          rows={5}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t("quiz.comprehension.subQuestions")}
          </span>
          <button
            type="button"
            onClick={addSubQ}
            disabled={cd.subQuestions.length >= 10}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            {t("quiz.comprehension.addSubQuestion")}
          </button>
        </div>

        {cd.subQuestions.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
            {t("quiz.comprehension.addSubQuestion")}
          </div>
        ) : (
          <div className="space-y-3">
            {cd.subQuestions.map((sq, idx) => (
              <div
                key={sq.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary)]">
                    {idx + 1}
                  </span>
                  <select
                    value={sq.type}
                    onChange={(e) => updateSubQ(idx, { type: e.target.value as ComprehensionSubQuestion["type"], correct: e.target.value === "true_false" ? "t" : "a" })}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                  >
                    {SUB_Q_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSubQ(idx)}
                    className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                    aria-label={t("quiz.removeQuestion")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={sq.prompt}
                  onChange={(e) => updateSubQ(idx, { prompt: e.target.value })}
                  placeholder={t("quiz.comprehension.subQPrompt")}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                />
                {sq.type === "mcq" ? (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {(["a", "b", "c", "d"] as const).map((letter, li) => {
                      const field = (["optionA", "optionB", "optionC", "optionD"] as const)[li];
                      const selected = sq.correct === letter;
                      return (
                        <div
                          key={letter}
                          className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-1.5 transition-colors ${
                            selected ? "border-[var(--success)] bg-[var(--success)]/10" : "border-[var(--border)]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => updateSubQ(idx, { correct: letter })}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase transition-colors ${
                              selected
                                ? "border-[var(--success)] bg-[var(--success)] text-white"
                                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]"
                            }`}
                          >
                            {letter}
                          </button>
                          <input
                            value={sq[field] ?? ""}
                            onChange={(e) => updateSubQ(idx, { [field]: e.target.value })}
                            placeholder={t("quiz.optionPlaceholder")}
                            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : sq.type === "true_false" ? (
                  <div className="flex gap-2">
                    {(["t", "f"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateSubQ(idx, { correct: val })}
                        className={`flex-1 rounded-[var(--radius-sm)] border py-1.5 text-xs font-medium transition-colors ${
                          sq.correct === val
                            ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                        }`}
                      >
                        {val === "t" ? "True" : "False"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    value={sq.correct}
                    onChange={(e) => updateSubQ(idx, { correct: e.target.value })}
                    placeholder={t("quiz.comprehension.subQCorrect")}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
