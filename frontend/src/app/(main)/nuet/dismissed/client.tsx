"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { MathText } from "@/components/nuet/math-text";
import { undismissNUETQuestion } from "../simulator/actions";
import type { NUETDismissedQuestion } from "@/server/integrations/go-backend/nuet";

export function DismissedListClient({
  initialItems,
}: {
  initialItems: NUETDismissedQuestion[];
}) {
  const { t, locale } = useLocale();
  // Local state so undismissals show up instantly. We don't refetch — the
  // list shrinks until the user navigates away. Failed undo rolls the row
  // back into the list so they can try again.
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<Set<string>>(new Set());

  function handleUndismiss(questionId: string) {
    if (pending.has(questionId)) return;
    setPending((current) => {
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
    const removed = items.find((i) => i.questionId === questionId);
    setItems((current) => current.filter((i) => i.questionId !== questionId));
    void undismissNUETQuestion(questionId)
      .catch(() => {
        if (removed) setItems((current) => [removed, ...current]);
      })
      .finally(() => {
        setPending((current) => {
          const next = new Set(current);
          next.delete(questionId);
          return next;
        });
      });
  }

  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
        {t("nuet.dismissed.empty")}
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li
          key={item.questionId}
          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {item.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")}
              {item.topicTitle ? ` · ${item.topicTitle}` : ""}
              {" · "}
              {new Date(item.dismissedAt).toLocaleDateString(locale)}
            </p>
            <div className="mt-1 text-sm text-[var(--text-primary)] line-clamp-2">
              <MathText text={item.prompt} />
            </div>
            {item.reviewAt ? (
              <p className="mt-1 text-[11px] text-[var(--primary)]">
                {t("nuet.dismissed.reviewAt").replace(
                  "{date}",
                  new Date(item.reviewAt).toLocaleDateString(locale)
                )}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {item.topicSlug ? (
              <Link
                href={`/nuet/topics/${item.topicSlug}`}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {t("nuet.dismissed.openTopic")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => handleUndismiss(item.questionId)}
              disabled={pending.has(item.questionId)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("nuet.dismissed.restore")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
