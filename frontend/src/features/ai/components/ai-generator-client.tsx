"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Check,
  FileText,
  Languages,
  Loader2,
  PenLine,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSet, type FlashcardInput } from "@/app/(main)/sets/actions";
import {
  AIClientRequestError,
  estimateAIRequestTimeoutMs,
  requestAIGeneration,
} from "@/lib/client/ai";
import type { GeneratedCard, GenerationMode, GenerationLanguage } from "@/lib/shared/ai/types";

type Step = "upload" | "generating" | "preview";

const MODES: { key: GenerationMode; labelKey: string; icon: typeof Brain }[] = [
  { key: "generation", labelKey: "ai.modeGeneration", icon: Sparkles },
  { key: "definition", labelKey: "ai.modeDefinition", icon: FileText },
  { key: "vocabulary", labelKey: "ai.modeVocabulary", icon: PenLine },
  { key: "translation", labelKey: "ai.modeTranslation", icon: Languages },
];

const LANGUAGES: { key: GenerationLanguage; label: string }[] = [
  { key: "kk", label: "Қазақша" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

// Map API error codes to i18n keys
const ERROR_MAP: Record<string, string> = {
  NO_FILE: "ai.errorNoFile",
  UNSUPPORTED_FILE_TYPE: "ai.errorUnsupported",
  FILE_TOO_LARGE: "ai.errorTooLarge",
  INSUFFICIENT_TEXT: "ai.errorNoText",
  EXTRACTION_FAILED: "ai.errorExtraction",
  GEMINI_API_HTTP_ERROR: "ai.errorAI",
  GEMINI_EMPTY_RESPONSE: "ai.errorAI",
  GEMINI_NO_CARDS_GENERATED: "ai.errorNoCards",
  GEMINI_INVALID_JSON: "ai.errorAI",
  GEMINI_INVALID_FORMAT: "ai.errorAI",
  GEMINI_PROMPT_BLOCKED: "ai.errorAI",
  GEMINI_RATE_LIMITED: "ai.errorAI",
  GEMINI_TIMEOUT: "ai.errorAI",
  OPENAI_API_HTTP_ERROR: "ai.errorAI",
  OPENAI_EMPTY_RESPONSE: "ai.errorAI",
  OPENAI_NO_CARDS_GENERATED: "ai.errorNoCards",
  OPENAI_INVALID_JSON: "ai.errorAI",
  OPENAI_INVALID_FORMAT: "ai.errorAI",
  OPENAI_RATE_LIMITED: "ai.errorAI",
  OPENAI_TIMEOUT: "ai.errorAI",
  NO_EXPLICIT_VOCAB_PAIRS: "ai.errorNoExplicitPairs",
  GENERATION_NO_CARDS: "ai.errorNoCards",
  NOT_AUTHENTICATED: "action.notAuthenticated",
  NON_JSON_ERROR: "ai.errorGeneric",
  UPSTREAM_TIMEOUT: "ai.errorAI",
  UPSTREAM_ERROR: "ai.errorAI",
  INVALID_MODE: "ai.errorGeneric",
  INVALID_LANGUAGE: "ai.errorGeneric",
  INVALID_CARD_COUNT: "ai.errorGeneric",
  AI_CONFIG_MISSING_API_KEY: "ai.errorAI",
  GENERATION_FAILED: "ai.errorGeneric",
  PDF_PARSER_UNAVAILABLE: "ai.errorExtraction",
  DOCX_PARSER_UNAVAILABLE: "ai.errorExtraction",
  PDF_EXTRACTION_FAILED: "ai.errorExtraction",
  DOCX_EXTRACTION_FAILED: "ai.errorExtraction",
};

function buildUiError(
  t: (key: string, vars?: Record<string, string | number>) => string,
  code?: string,
  detail?: string
) {
  const messageKey = code ? ERROR_MAP[code] ?? "ai.errorGeneric" : "ai.errorGeneric";
  const baseMessage = t(messageKey);
  return detail ? `${baseMessage} ${detail}` : baseMessage;
}

export function AIGeneratorClient() {
  const { t, locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<GenerationMode>("generation");
  const [language, setLanguage] = useState<GenerationLanguage>(
    (locale as GenerationLanguage) ?? "kk"
  );
  // Card count is determined by document content — no user override
  const [generating, setGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [meta, setMeta] = useState<{
    fileName: string;
    pageCount: number | null;
    chunkCount: number;
  } | null>(null);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback(
    (f: File) => {
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const validExt = /\.(pdf|docx)$/i;

      if (!validTypes.includes(f.type) && !validExt.test(f.name)) {
        setError(t("ai.errorUnsupported"));
        return;
      }

      if (f.size > 20 * 1024 * 1024) {
        setError(t("ai.errorTooLarge"));
        return;
      }

      setFile(f);
      setError(null);
      // Auto-set deck title from filename
      if (!deckTitle) {
        setDeckTitle(f.name.replace(/\.(pdf|docx)$/i, ""));
      }
    },
    [deckTitle, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // ── Generate ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!file) return;

    setError(null);
    setGenerating(true);
    setStep("generating");
    setGeneratingMessage(t("ai.extracting"));
    let messageTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("language", language);
      formData.append("cardCount", "600");

      // After a delay, update the message to show AI is working
      messageTimer = setTimeout(() => {
        setGeneratingMessage(t("ai.analyzing"));
      }, 3000);

      const { response, data } = await requestAIGeneration(formData, {
        timeoutMs: estimateAIRequestTimeoutMs(file.size),
      });

      if (!response.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[AIGeneratorClient] API error:", data);
        }
        setError(
          buildUiError(
            t,
            typeof data?.error === "string" ? data.error : undefined,
            typeof data?.detail === "string" ? data.detail : undefined
          )
        );
        setStep("upload");
        return;
      }

      if (!data || !Array.isArray(data.cards) || data.cards.length === 0) {
        setError(t("ai.errorNoCards"));
        setStep("upload");
        return;
      }

      setCards(
        data.cards.map((card) => ({
          front: String(card.front ?? "").trim(),
          back: String(card.back ?? "").trim(),
          category: String(card.category ?? "General"),
          difficulty:
            card.difficulty === "easy" || card.difficulty === "hard"
              ? card.difficulty
              : "medium",
          source: String(card.source ?? "Document"),
        }))
      );
      setMeta(
        data.meta && typeof data.meta.fileName === "string"
          ? {
              fileName: data.meta.fileName,
              pageCount:
                typeof data.meta.pageCount === "number" || data.meta.pageCount === null
                  ? data.meta.pageCount
                  : null,
              chunkCount:
                typeof data.meta.chunkCount === "number" ? data.meta.chunkCount : 0,
            }
          : null
      );
      setStep("preview");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[AIGeneratorClient] Request failed:", error);
      }
      setError(
        error instanceof AIClientRequestError
          ? `${t("ai.errorAI")} ${error.message}`
          : error instanceof Error
            ? `${t("ai.errorGeneric")} ${error.message}`
            : t("ai.errorGeneric")
      );
      setStep("upload");
    } finally {
      if (messageTimer) {
        clearTimeout(messageTimer);
      }
      setGenerating(false);
    }
  }

  // ── Card editing ─────────────────────────────────────────────────────────

  function updateCard(index: number, field: "front" | "back", value: string) {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  function addCard() {
    setCards((prev) => [
      ...prev,
      { front: "", back: "", category: "Custom", difficulty: "medium", source: "Manual" },
    ]);
  }

  // ── Save to deck ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!deckTitle.trim()) {
      setError(t("ai.errorNoTitle"));
      return;
    }

    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      setError(t("ai.errorNoCards"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const flashcardInputs: FlashcardInput[] = validCards.map((card) => ({
        term: card.front,
        definition: card.back,
      }));

      const result = await createSet(deckTitle.trim(), `AI generated from ${meta?.fileName ?? "document"}`, flashcardInputs, {
        isPublic: false,
        invitedUsers: "",
      });

      if (result?.error) {
        setError(result.error);
      } else {
        toast("success", t("ai.saveSuccess"));
        router.push("/sets");
      }
    } catch {
      setError(t("ai.errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  // ── Regenerate ───────────────────────────────────────────────────────────

  function handleRegenerate() {
    setCards([]);
    setMeta(null);
    handleGenerate();
  }

  function handleReset() {
    setStep("upload");
    setCards([]);
    setMeta(null);
    setFile(null);
    setError(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/sets"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("set.backToDashboard")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {t("ai.title")}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {t("ai.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Step: Upload ─────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="mt-8 space-y-6 animate-fade-in-up">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all sm:p-14 ${
              dragOver
                ? "border-indigo-500 bg-indigo-500/5"
                : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-[var(--border)] hover:border-indigo-400 hover:bg-indigo-500/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Check className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {file.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setDeckTitle(""); }}
                  className="mt-1 text-sm text-red-500 transition-colors hover:text-red-600"
                >
                  {t("ai.removeFile")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {t("ai.dropHere")}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t("ai.supportedFormats")}
                </p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Mode selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                {t("ai.generationMode")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map(({ key, labelKey, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      mode === key
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language + hint */}
            <div className="space-y-4">
              {mode === "vocabulary" ? (
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <Languages className="h-4 w-4" />
                    {t("ai.translationLanguage")}
                  </label>
                  <div className="flex gap-2">
                    {LANGUAGES.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLanguage(key)}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          language === key
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {mode === "vocabulary"
                    ? t("ai.vocabularyModeHint")
                    : mode === "definition"
                      ? t("ai.definitionModeHint")
                      : t("ai.modeAutoFormatHint")}
                </p>
              </div>
            </div>
          </div>

          {/* Deck title */}
          <Input
            id="deckTitle"
            label={t("ai.deckTitle")}
            placeholder={t("ai.deckTitlePlaceholder")}
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
          />

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!file || generating}
            isLoading={generating}
          >
            <Sparkles className="h-4 w-4" />
            {t("ai.generateBtn")}
          </Button>
        </div>
      )}

      {/* ── Step: Generating ─────────────────────────────────────────────── */}
      {step === "generating" && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-20 text-center animate-fade-in-up">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-elevated)] shadow">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            </div>
          </div>
          <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
            {generatingMessage}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("ai.generatingHint")}
          </p>
          <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--border)]">
            <div className="progress-shimmer h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" style={{ width: "100%" }} />
          </div>
        </div>
      )}

      {/* ── Step: Preview ────────────────────────────────────────────────── */}
      {step === "preview" && (
        <div className="mt-8 space-y-6 animate-fade-in-up">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("ai.generatedCount", { count: cards.length })}
                </p>
                {meta && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {meta.fileName} • {meta.chunkCount} {t("ai.sections")}
                    {meta.pageCount ? ` • ${meta.pageCount} ${t("ai.pages")}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={generating}>
                <RefreshCcw className="h-4 w-4" />
                {t("ai.regenerate")}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4" />
                {t("ai.startOver")}
              </Button>
            </div>
          </div>

          {/* Deck title */}
          <Input
            id="deckTitlePreview"
            label={t("ai.deckTitle")}
            placeholder={t("ai.deckTitlePlaceholder")}
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
          />

          {/* Cards list */}
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={index}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      #{index + 1}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      card.difficulty === "easy"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : card.difficulty === "hard"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {card.difficulty}
                    </span>
                    {card.category && (
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                        {card.category}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {t("ai.front")}
                    </label>
                    <textarea
                      value={card.front}
                      onChange={(e) => updateCard(index, "front", e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {t("ai.back")}
                    </label>
                    <textarea
                      value={card.back}
                      onChange={(e) => updateCard(index, "back", e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
                {card.source && (
                  <div className="px-4 pb-3 sm:px-5">
                    <p className="text-[10px] text-[var(--text-muted)]">{card.source}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add card */}
          <button
            type="button"
            onClick={addCard}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] py-4 text-sm font-medium text-[var(--text-muted)] transition-all hover:border-indigo-400 hover:bg-indigo-500/5 hover:text-indigo-600 tap-target"
          >
            <Plus className="h-4 w-4" />
            {t("ai.addCard")}
          </button>

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Save */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={saving || cards.length === 0}
            isLoading={saving}
          >
            <Save className="h-4 w-4" />
            {t("ai.saveDeck")} ({cards.filter((c) => c.front.trim() && c.back.trim()).length} {t("ai.cards")})
          </Button>
        </div>
      )}
    </div>
  );
}
