import Link from "next/link";
import { Layers, Clock3, Target, GraduationCap, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { type Locale, createTranslator } from "@/lib/i18n/shared";
import { DeleteSetButton } from "./delete-set-button";
import { StudyRoutePrefetch } from "./study-route-prefetch";

interface SetCardProps {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  createdAt: string;
  lastStudiedAt?: string | null;
  accuracy?: number;
  locale: Locale;
  showManageActions?: boolean;
  compact?: boolean;
}

export function SetCard({
  id,
  title,
  description,
  cardCount,
  createdAt,
  lastStudiedAt,
  accuracy = 0,
  locale,
  showManageActions = true,
  compact = false,
}: SetCardProps) {
  const t = createTranslator(locale);
  return (
    <article className="ui-panel ui-interactive flex h-full flex-col p-4 sm:p-6">
      <StudyRoutePrefetch setId={id} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/sets/${id}`} className="group block">
            <h3 className="line-clamp-1 text-lg font-semibold text-[var(--text-primary)] transition-colors group-hover:text-indigo-600">
              {title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[var(--text-secondary)]">
            {description || t("sets.noDescription")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <Layers className="h-3.5 w-3.5" />
          {cardCount} {cardCount === 1 ? t("set.card") : t("set.cards")}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="ui-subtle px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Clock3 className="h-3.5 w-3.5" />
            {t("sets.lastStudied")}
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
            {lastStudiedAt ? formatDate(lastStudiedAt, locale) : t("sets.neverStudied")}
          </p>
        </div>
        <div className="ui-subtle px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Target className="h-3.5 w-3.5" />
            {t("profile.accuracy")}
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
            {accuracy}%
          </p>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 text-xs text-[var(--text-muted)]">
          {t("set.created")} {formatDate(createdAt, locale)}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/sets/${id}/study`} className="inline-flex">
          <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
            <GraduationCap className="h-4 w-4" />
            {t("nav.startStudy")}
          </span>
        </Link>
        <Link href={`/sets/${id}`} className="inline-flex">
          <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]">
            {t("recommend.openSet")}
          </span>
        </Link>
      </div>

      {showManageActions && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-5">
          <Link href={`/sets/${id}/edit`} className="inline-flex">
            <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <Pencil className="h-4 w-4" />
              {t("set.edit")}
            </span>
          </Link>
          <DeleteSetButton setId={id} />
        </div>
      )}
    </article>
  );
}
