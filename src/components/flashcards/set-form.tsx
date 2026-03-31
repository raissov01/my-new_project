"use client";

import Link from "next/link";
import { useState, useTransition, useRef } from "react";
import { Plus, Trash2, GripVertical, Globe2, Lock } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  FlashcardInput,
  SetVisibilityInput,
} from "@/app/(main)/sets/actions";

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
  const { t } = useLocale();
  const nextKey = useRef(
    initialCards && initialCards.length > 0 ? initialCards.length : 2
  );

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

  function removeCard(index: number) {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
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
      {/* Set details */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-sm sm:rounded-[1.75rem] sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)] sm:mb-4 sm:text-lg">
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
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              {t("form.description")}
            </label>
            <textarea
              id="description"
              rows={2}
              placeholder={t("form.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="block w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm transition-all placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
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
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isPublic
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)]"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Globe2 className="h-4 w-4 text-indigo-500" />
                  {t("form.publicRanking")}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("form.publicRankingDescription")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  !isPublic
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)]"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Lock className="h-4 w-4 text-indigo-500" />
                  {t("form.privateRanking")}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("form.privateRankingDescription")}
                </p>
              </button>
            </div>

            {!isPublic && (
              <div className="mt-4">
                <label
                  htmlFor="invited-users"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("form.invitedUsernames")}
                </label>
                <textarea
                  id="invited-users"
                  rows={4}
                  value={invitedUsers}
                  onChange={(event) => setInvitedUsers(event.target.value)}
                  placeholder={t("form.invitedUsersPlaceholder")}
                  disabled={isPending}
                  className="block w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm transition-all placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {t("form.invitedUsersHelper")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flashcards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
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
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-sm sm:rounded-[1.5rem]"
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
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-red-900/20 tap-target"
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] py-4 text-sm font-medium text-[var(--text-muted)] transition-all hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-500/5 tap-target sm:rounded-[1.5rem]"
        >
          <Plus className="h-4 w-4" />
          {t("form.addCard")}
        </button>
      </div>

      {/* Error + submit */}
      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
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
