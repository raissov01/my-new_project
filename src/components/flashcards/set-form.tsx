"use client";

import Link from "next/link";
import { useState, useTransition, useRef } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Globe2,
  Lock,
  Brain,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  FlashcardInput,
  SetVisibilityInput,
} from "@/app/(main)/sets/actions";
import { AIClientRequestError, requestAIGeneration } from "@/lib/ai/client";
import type { GenerationLanguage, GenerationMode } from "@/lib/ai/gemini";

interface SetFormProps {
  initialTitle?: string;
  initialDescription?: string;
  initialCards?: FlashcardInput[];
  initialIsPublic?: boolean;
  initialInvitedUsers?: string;
  onSubmit: (
    title: string,
    description: string,
    cards: FlashcardInput[],
    visibility: SetVisibilityInput
  ) => Promise<{ error: string | null }>;
  submitLabel: string;
  cancelHref: string;
  cancelLabel: string;
}

// Each card in the form gets a stable key for React rendering,
// separate from the database ID.
type CardEntry = FlashcardInput & { _key: number };

const AI_MODES: { value: GenerationMode; labelKey: string }[] = [
  { value: "mixed", labelKey: "ai.modeMixed" },
  { value: "definition", labelKey: "ai.modeDefinition" },
  { value: "qa", labelKey: "ai.modeQA" },
  { value: "vocabulary", labelKey: "ai.modeVocabulary" },
];

const AI_LANGUAGES: { value: GenerationLanguage; label: string }[] = [
  { value: "kk", label: "Қазақша" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

const AI_ERROR_MAP: Record<string, string> = {
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
  NO_EXPLICIT_VOCAB_PAIRS: "ai.errorNoCards",
  NOT_AUTHENTICATED: "action.notAuthenticated",
  NON_JSON_ERROR: "ai.errorExtraction",
  GENERATION_FAILED: "ai.errorGeneric",
  AI_CONFIG_MISSING_API_KEY: "ai.errorAI",
  PDF_PARSER_UNAVAILABLE: "ai.errorExtraction",
  DOCX_PARSER_UNAVAILABLE: "ai.errorExtraction",
  PDF_EXTRACTION_FAILED: "ai.errorExtraction",
  DOCX_EXTRACTION_FAILED: "ai.errorExtraction",
};

function createInitialEntries(initialCards?: FlashcardInput[]) {
  if (initialCards && initialCards.length > 0) {
    return initialCards.map((card, index) => ({
      term: card.term,
      definition: card.definition,
      id: card.id,
      _key: index,
    }));
  }

  return [
    { term: "", definition: "", _key: 0 },
    { term: "", definition: "", _key: 1 },
  ];
}

export function SetForm({
  initialTitle = "",
  initialDescription = "",
  initialCards,
  initialIsPublic = false,
  initialInvitedUsers = "",
  onSubmit,
  submitLabel,
  cancelHref,
  cancelLabel,
}: SetFormProps) {
  const { t, locale } = useLocale();
  const nextKey = useRef(
    initialCards && initialCards.length > 0 ? initialCards.length : 2
  );
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  function makeEntry(card?: FlashcardInput): CardEntry {
    return {
      term: card?.term ?? "",
      definition: card?.definition ?? "",
      id: card?.id,
      _key: nextKey.current++,
    };
  }

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [cards, setCards] = useState<CardEntry[]>(() =>
    createInitialEntries(initialCards)
  );
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [invitedUsers, setInvitedUsers] = useState(initialInvitedUsers);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<GenerationMode>("mixed");
  const [aiLanguage, setAiLanguage] = useState<GenerationLanguage>(
    locale === "kk" || locale === "ru" || locale === "en" ? locale : "kk"
  );
  const [isGeneratingImport, setIsGeneratingImport] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateCard(
    index: number,
    field: "term" | "definition",
    value: string
  ) {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addCard() {
    setCards((prev) => [...prev, makeEntry()]);
  }

  function replaceCards(nextCards: FlashcardInput[]) {
    setCards(nextCards.map((card) => makeEntry(card)));
  }

  function removeCard(index: number) {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  function mergeImportedCards(nextCards: FlashcardInput[]) {
    if (nextCards.length === 0) return;

    const hasFilledCards = cards.some(
      (card) => card.term.trim() !== "" || card.definition.trim() !== ""
    );

    if (!hasFilledCards) {
      replaceCards(nextCards);
      return;
    }

    setCards((prev) => [...prev, ...nextCards.map((card) => makeEntry(card))]);
  }

  function inferTitleFromFile(fileName: string) {
    if (!title.trim()) {
      setTitle(fileName.replace(/\.(pdf|docx|csv)$/i, ""));
    }
  }

  async function handleAIDocument(file: File) {
    setImportError(null);
    setImportFileName(file.name);
    inferTitleFromFile(file.name);
    setIsGeneratingImport(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", aiMode);
      formData.append("language", aiLanguage);
      formData.append("cardCount", "999");

      const { response, data } = await requestAIGeneration(formData);
      if (!response.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[SetForm] AI import API error:", data);
        }
        const errorCode =
          typeof data?.error === "string" ? data.error : "GENERATION_FAILED";
        const errorKey = AI_ERROR_MAP[errorCode] ?? "ai.errorGeneric";
        const detail = typeof data?.detail === "string" ? ` ${data.detail}` : "";
        setImportError(`${t(errorKey)}${detail}`);
        return;
      }

      const importedCards = ((data?.cards ?? []) as { front?: string; back?: string }[])
        .map((card: { front?: string; back?: string }) => ({
          term: String(card.front ?? "").trim(),
          definition: String(card.back ?? "").trim(),
        }))
        .filter(
          (card: FlashcardInput) => card.term.length > 0 && card.definition.length > 0
        );

      if (importedCards.length === 0) {
        setImportError(t("ai.errorNoCards"));
        return;
      }

      mergeImportedCards(importedCards);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[SetForm] AI import request failed:", error);
      }

      setImportError(
        error instanceof AIClientRequestError
          ? `${t("ai.errorAI")} ${error.message}`
          : error instanceof Error
            ? `${t("ai.errorGeneric")} ${error.message}`
            : t("ai.errorGeneric")
      );
    } finally {
      setIsGeneratingImport(false);
    }
  }

  function detectDelimiter(sample: string) {
    const candidates = [",", ";", "\t", "|"];
    const lines = sample
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    let best = ",";
    let bestScore = -1;

    for (const delimiter of candidates) {
      const score = lines.reduce(
        (total, line) => total + Math.max(0, line.split(delimiter).length - 1),
        0
      );
      if (score > bestScore) {
        best = delimiter;
        bestScore = score;
      }
    }

    return best;
  }

  function parseCsvLine(line: string, delimiter: string) {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  function parseCsvContent(content: string): FlashcardInput[] {
    const delimiter = detectDelimiter(content);
    const rows = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parseCsvLine(line, delimiter));

    if (rows.length === 0) return [];

    const header = rows[0].map((cell) => cell.toLowerCase());
    const termIndex = header.findIndex((cell) =>
      ["term", "front", "question", "word", "термин"].includes(cell)
    );
    const definitionIndex = header.findIndex((cell) =>
      ["definition", "back", "answer", "meaning", "анықтама"].includes(cell)
    );
    const hasHeader = termIndex !== -1 && definitionIndex !== -1;

    const dataRows = hasHeader ? rows.slice(1) : rows;
    const resolvedTermIndex = hasHeader ? termIndex : 0;
    const resolvedDefinitionIndex = hasHeader ? definitionIndex : 1;

    return dataRows
      .map((row) => ({
        term: String(row[resolvedTermIndex] ?? "").trim(),
        definition: String(row[resolvedDefinitionIndex] ?? "").trim(),
      }))
      .filter((card) => card.term && card.definition);
  }

  async function handleCsvFile(file: File) {
    setImportError(null);
    setImportFileName(file.name);
    inferTitleFromFile(file.name);
    setIsImportingCsv(true);

    try {
      const text = await file.text();
      const parsedCards = parseCsvContent(text);

      if (parsedCards.length === 0) {
        setImportError(t("form.csvImportError"));
        return;
      }

      mergeImportedCards(parsedCards);
    } catch {
      setImportError(t("form.csvImportError"));
    } finally {
      setIsImportingCsv(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation: require at least one card with both term and definition
    const filledCards = cards.filter(
      (c) => c.term.trim() !== "" && c.definition.trim() !== ""
    );
    if (filledCards.length === 0) {
      setError(t("form.atLeastOneCard"));
      return;
    }

    // Strip the internal _key before sending to the server
    const payload: FlashcardInput[] = cards.map(({ term, definition, id }) => ({
      term,
      definition,
      ...(id ? { id } : {}),
    }));

    startTransition(async () => {
      const result = await onSubmit(title, description, payload, {
        isPublic,
        invitedUsers,
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
        <h2 className="mb-3 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mb-4 sm:text-xl">
          {t("form.setDetails")}
        </h2>
        <div className="space-y-4">
          <Input
            id="title"
            label={t("form.title")}
            placeholder={t("form.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isPending}
          />
          <div className="w-full">
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              {t("form.description")}
            </label>
            <textarea
              id="description"
              rows={2}
              placeholder={t("form.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] transition-all placeholder:text-[var(--text-muted)] focus:border-[rgba(99,91,255,0.48)] focus:bg-[var(--bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[rgba(99,91,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("form.challengeAccess")}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("form.challengeAccessDescription")}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  isPublic
                    ? "border-[rgba(99,91,255,0.28)] bg-[rgba(99,91,255,0.08)] shadow-[var(--surface-shadow)]"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Globe2 className="h-4 w-4 text-indigo-400" />
                  {t("form.publicRanking")}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("form.publicRankingDescription")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  !isPublic
                    ? "border-[rgba(99,91,255,0.28)] bg-[rgba(99,91,255,0.08)] shadow-[var(--surface-shadow)]"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Lock className="h-4 w-4 text-indigo-400" />
                  {t("form.privateRanking")}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("form.privateRankingDescription")}
                </p>
              </button>
            </div>

            {!isPublic && (
              <div className="mt-4">
                <label htmlFor="invited-users" className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {t("form.invitedUsernames")}
                </label>
                <textarea
                  id="invited-users"
                  rows={4}
                  value={invitedUsers}
                  onChange={(event) => setInvitedUsers(event.target.value)}
                  placeholder={t("form.invitedUsersPlaceholder")}
                  disabled={isPending}
                  className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] transition-all placeholder:text-[var(--text-muted)] focus:border-[rgba(99,91,255,0.48)] focus:outline-none focus:ring-4 focus:ring-[rgba(99,91,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {t("form.invitedUsersHelper")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
              {t("form.smartImportTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {t("form.smartImportSubtitle")}
            </p>
          </div>
          <Link href="/sets/new/ai">
            <Button type="button" variant="outline" size="sm">
              <Brain className="h-4 w-4" />
              {t("form.openFullAIAssistant")}
            </Button>
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Brain className="h-4 w-4 text-indigo-400" />
              {t("form.aiImportTitle")}
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t("form.aiImportDescription")}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1.5 block text-[var(--text-secondary)]">
                  {t("ai.generationMode")}
                </span>
                <select
                  value={aiMode}
                  onChange={(event) =>
                    setAiMode(event.target.value as GenerationMode)
                  }
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none"
                  disabled={isGeneratingImport || isImportingCsv || isPending}
                >
                  {AI_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {t(mode.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-[var(--text-secondary)]">
                  {t("ai.cardLanguage")}
                </span>
                <select
                  value={aiLanguage}
                  onChange={(event) =>
                    setAiLanguage(event.target.value as GenerationLanguage)
                  }
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none"
                  disabled={isGeneratingImport || isImportingCsv || isPending}
                >
                  {AI_LANGUAGES.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <input
              ref={aiFileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  await handleAIDocument(file);
                }
                event.currentTarget.value = "";
              }}
            />

            <Button
              type="button"
              className="mt-4 w-full"
              variant="outline"
              onClick={() => aiFileInputRef.current?.click()}
              disabled={isGeneratingImport || isImportingCsv || isPending}
            >
              {isGeneratingImport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t("form.importPdfDocx")}
            </Button>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              {t("form.csvImportTitle")}
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t("form.csvImportDescription")}
            </p>
            <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-muted)]">
              {t("form.csvImportHint")}
            </p>

            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  await handleCsvFile(file);
                }
                event.currentTarget.value = "";
              }}
            />

            <Button
              type="button"
              className="mt-4 w-full"
              variant="outline"
              onClick={() => csvFileInputRef.current?.click()}
              disabled={isGeneratingImport || isImportingCsv || isPending}
            >
              {isImportingCsv ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {t("form.importCsv")}
            </Button>
          </div>
        </div>

        {importFileName ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("form.lastImportedFile")}: {importFileName}
          </p>
        ) : null}

        {importError ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            {importError}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {t("form.flashcards")} ({cards.length})
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCard}
            disabled={isPending}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t("form.addCard")}
          </Button>
        </div>

        {cards.map((card, index) => (
          <div
            key={card._key}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--surface-shadow)] sm:rounded-[1.5rem]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 sm:px-6 sm:py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                <GripVertical className="h-4 w-4" />
                {index + 1}
              </div>
              <button
                type="button"
                onClick={() => removeCard(index)}
                disabled={cards.length <= 1 || isPending}
                aria-label={`${t("form.removeCard")} ${index + 1}`}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-500/8 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30 tap-target"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
              <Input
                label={t("form.term")}
                placeholder={t("form.termPlaceholder")}
                value={card.term}
                onChange={(e) => updateCard(index, "term", e.target.value)}
                disabled={isPending}
              />
              <Input
                label={t("form.definition")}
                placeholder={t("form.definitionPlaceholder")}
                value={card.definition}
                onChange={(e) =>
                  updateCard(index, "definition", e.target.value)
                }
                disabled={isPending}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addCard}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] py-4 text-sm font-medium text-[var(--text-muted)] transition-all hover:border-indigo-400 hover:bg-[rgba(99,91,255,0.05)] hover:text-indigo-300 tap-target sm:rounded-[1.5rem]"
        >
          <Plus className="h-4 w-4" />
          {t("form.addCard")}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link href={cancelHref}>
          <Button type="button" size="lg" variant="outline">
            {cancelLabel}
          </Button>
        </Link>
        <Button type="submit" size="lg" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
