import Link from "next/link";
import { Layers, Clock3, Target, GraduationCap, Pencil } from "lucide-react";
import { formatDate } from "@/lib/shared/utils";
import { type Locale, createTranslator } from "@/lib/shared/i18n";
import { DeleteSetButton } from "./delete-set-button";
import { SaveSetButton } from "./save-set-button";
import { StudyRoutePrefetch } from "./study-route-prefetch";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";

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
  showSaveAction?: boolean;
  compact?: boolean;
  requireAuthForStudy?: boolean;
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
  showSaveAction = false,
  compact = false,
  requireAuthForStudy = false,
}: SetCardProps) {
  const t = createTranslator(locale);
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] hover:border-[var(--border-strong)] sm:p-6">
      <StudyRoutePrefetch setId={id} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/sets/${id}`} className="group block">
            <h3 className="line-clamp-1 text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
              {title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[var(--text-secondary)]">
            {description || t("sets.noDescription")}
          </p>
        </div>
        <span className="badge-primary text-[11px]">
          <Layers className="h-3 w-3" />
          {cardCount} {cardCount === 1 ? t("set.card") : t("set.cards")}
        </span>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Clock3 className="h-3.5 w-3.5" />
            {t("sets.lastStudied")}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
            {lastStudiedAt ? formatDate(lastStudiedAt, locale) : t("sets.neverStudied")}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Target className="h-3.5 w-3.5" />
            {t("profile.accuracy")}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
            {accuracy}%
          </p>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 text-xs text-[var(--text-muted)]">
          {t("set.created")} {formatDate(createdAt, locale)}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        {requireAuthForStudy ? (
          <AuthRequiredPrompt
            triggerLabel={t("nav.startStudy")}
            title={t("guest.authRequiredTitle")}
            description={t("guest.studyPrompt")}
            signupLabel={t("guest.signUpToContinue")}
            loginLabel={t("guest.logInToUnlock")}
            cancelLabel={t("set.cancel")}
            icon={<GraduationCap className="h-4 w-4" />}
            className="h-10 px-4"
          />
        ) : (
          <Link href={`/sets/${id}/study`} className="inline-flex">
            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(37,99,235,0.4)] transition-all hover:bg-[var(--primary-hover)]">
              <GraduationCap className="h-4 w-4" />
              {t("nav.startStudy")}
            </span>
          </Link>
        )}
        <Link href={`/sets/${id}`} className="inline-flex">
          <span className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-soft)] hover:border-[var(--border-strong)]">
            {t("recommend.openSet")}
          </span>
        </Link>
      </div>

      {showManageActions && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <Link href={`/sets/${id}/edit`} className="inline-flex">
            <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]">
              <Pencil className="h-3.5 w-3.5" />
              {t("set.edit")}
            </span>
          </Link>
          <DeleteSetButton setId={id} />
        </div>
      )}
      {showSaveAction && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <SaveSetButton setId={id} />
        </div>
      )}
    </article>
  );
}
