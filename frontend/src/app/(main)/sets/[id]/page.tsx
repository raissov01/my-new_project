import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  GraduationCap,
  ArrowLeft,
  Layers,
  Zap,
  Flag,
  Clock3,
  ListChecks,
  PenLine,
  BarChart3,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import {
  FlashcardList,
  DeleteSetButton,
  SaveSetButton,
  StudyRoutePrefetch,
  ShareSetPanel,
} from "@/features/sets/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { formatDate } from "@/lib/shared/utils";
import { getSetProgress } from "@/app/(main)/sets/progress-actions";
import {
  buildSmartStudyDeck,
  isCardWeak,
  isCardDueToday,
  filterReviewCards,
  type CardWithProgress,
} from "@/lib/shared/study/spaced-repetition";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getSetDetail } from "@/server/services/sets";

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ share?: string }>;
}

export default async function SetDetailPage({
  params,
  searchParams,
}: SetDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const backHref = user ? "/dashboard" : "/sets";
  const setDetail = await getSetDetail(id, user?.id);
  if (!setDetail) notFound();

  const set = {
    title: setDetail.title,
    description: setDetail.description,
    created_at: setDetail.createdAt,
    is_public: setDetail.isPublic,
    user_id: setDetail.userId,
  };
  const isOwner = user?.id === setDetail.userId;
  const cards = setDetail.flashcards;

  // Pass pre-fetched IDs so getSetProgress skips its flashcard query
  const progressMap = await getSetProgress(id, cards.map((c) => c.id));
  const cardsWithProgress: CardWithProgress[] = cards.map((card) => ({
    flashcard: card,
    progress: progressMap.get(card.id) ?? null,
  }));

  // Compute smart stats for this set
  const smartDeck = buildSmartStudyDeck(cardsWithProgress);
  const progressValues = Array.from(progressMap.values());
  const weakCount = progressValues.filter(isCardWeak).length;
  const dueCount = progressValues.filter(isCardDueToday).length;
  const reviewCount = filterReviewCards(cardsWithProgress).length;
  const primaryLabel =
    reviewCount > 0 ? t("set.reviewSession") : t("set.study");
  const shouldHighlightShare = resolvedSearchParams?.share === "1";

  // Accuracy: mastered / total with progress
  const withProgress = progressValues.filter((p) => p !== null);
  const masteredCount = withProgress.filter(
    (p) => p && (p as { correct_streak?: number }).correct_streak != null && (p as { correct_streak?: number }).correct_streak! >= 3
  ).length;
  const accuracyPct =
    withProgress.length > 0
      ? Math.round((masteredCount / withProgress.length) * 100)
      : 0;

  return (
    <div className="page-shell py-4 sm:py-6">
      {user && cards.length > 0 && <StudyRoutePrefetch setId={id} />}

      {/* nd-mock-shell header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={backHref} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            <ArrowLeft className="h-4 w-4" style={{ display: "inline", marginRight: 6 }} />
            {t("set.backToDashboard")}
          </Link>
          <h3>{set.title}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 12 }}>
            {cards.length} {cards.length === 1 ? t("set.card") : t("set.cards")}
            {" · "}
            {formatDate(set.created_at, locale)}
          </span>
        </div>
      </div>

      {/* KPI stats */}
      <div className="nd-kpi-grid">
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("set.cards").toUpperCase()}</span>
          <strong className="nd-kpi-val">{cards.length}</strong>
          <span className="nd-kpi-sub">{t("set.card")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("set.weakCardsLabel").toUpperCase()}</span>
          <strong className="nd-kpi-val">{weakCount}</strong>
          <span className="nd-kpi-sub">{t("set.difficult")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("set.dueToday").toUpperCase()}</span>
          <strong className="nd-kpi-val">{dueCount}</strong>
          <span className="nd-kpi-sub">{t("set.cardsToReview")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">ACCURACY</span>
          <strong className="nd-kpi-val">{accuracyPct}%</strong>
          <span className="nd-kpi-sub">mastered</span>
        </div>
      </div>

      {/* Header info card */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        {set.description && (
          <p style={{ color: "var(--ink-mute)", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            {set.description}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {dueCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "4px 12px", borderRadius: 999, background: "color-mix(in srgb, var(--terra) 12%, transparent)", color: "var(--terra)", border: "1px solid color-mix(in srgb, var(--terra) 20%, transparent)" }}>
              <Zap className="h-3.5 w-3.5" />
              {dueCount} {t("set.dueToday")}
            </span>
          )}
          {weakCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "4px 12px", borderRadius: 999, background: "color-mix(in srgb, orange 10%, transparent)", color: "orange", border: "1px solid color-mix(in srgb, orange 20%, transparent)" }}>
              <Flag className="h-3.5 w-3.5" />
              {weakCount} {t("set.difficult")}
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "4px 12px", borderRadius: 999, background: "var(--paper-2)", color: "var(--ink-mute)", border: "1px solid var(--line)" }}>
            <Clock3 className="h-3.5 w-3.5" />
            {t("set.created")} {formatDate(set.created_at, locale)}
          </span>
        </div>

        {cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
            <StudyModeButton
              href={buildStudyHref(id, reviewCount > 0 ? "review" : undefined, "flashcard")}
              icon={GraduationCap}
              label={primaryLabel}
              tone="primary"
              requireAuth={!user}
              authTitle={t("guest.authRequiredTitle")}
              authDescription={t("guest.studyPrompt")}
              authSignupLabel={t("guest.signUpToContinue")}
              authLoginLabel={t("guest.logInToUnlock")}
              authCancelLabel={t("set.cancel")}
            />
            <StudyModeButton
              href={buildStudyHref(id, reviewCount > 0 ? "review" : undefined, "quiz")}
              icon={ListChecks}
              label={t("study.quiz")}
              requireAuth={!user}
              authTitle={t("guest.authRequiredTitle")}
              authDescription={t("guest.studyPrompt")}
              authSignupLabel={t("guest.signUpToContinue")}
              authLoginLabel={t("guest.logInToUnlock")}
              authCancelLabel={t("set.cancel")}
            />
            <StudyModeButton
              href={buildStudyHref(id, reviewCount > 0 ? "review" : undefined, "write")}
              icon={PenLine}
              label={t("study.write")}
              requireAuth={!user}
              authTitle={t("guest.authRequiredTitle")}
              authDescription={t("guest.studyPrompt")}
              authSignupLabel={t("guest.signUpToContinue")}
              authLoginLabel={t("guest.logInToUnlock")}
              authCancelLabel={t("set.cancel")}
            />
            {smartDeck.summary.totalCount > 0 ? (
              <StudyModeButton
                href={`/sets/${id}/study?mode=smart`}
                icon={Zap}
                label={t("set.smartStudy")}
                requireAuth={!user}
                authTitle={t("guest.authRequiredTitle")}
                authDescription={t("guest.studyPrompt")}
                authSignupLabel={t("guest.signUpToContinue")}
                authLoginLabel={t("guest.logInToUnlock")}
                authCancelLabel={t("set.cancel")}
              />
            ) : (
              <StudyModeButton
                href={`/sets/${id}/study`}
                icon={Layers}
                label={t("study.flashcards")}
                requireAuth={!user}
                authTitle={t("guest.authRequiredTitle")}
                authDescription={t("guest.studyPrompt")}
                authSignupLabel={t("guest.signUpToContinue")}
                authLoginLabel={t("guest.logInToUnlock")}
                authCancelLabel={t("set.cancel")}
              />
            )}
          </div>
        )}

        {cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
            <StudyModeButton
              href={`/sets/${id}/challenge`}
              icon={Zap}
              label={t("challenge.startChallenge")}
              tone="secondary"
              requireAuth={!user}
              authTitle={t("guest.authRequiredTitle")}
              authDescription={t("guest.challengePrompt")}
              authSignupLabel={t("guest.signUpToContinue")}
              authLoginLabel={t("guest.logInToUnlock")}
              authCancelLabel={t("set.cancel")}
            />
            <StudyModeButton
              href={`/sets/${id}/ranking`}
              icon={Trophy}
              label={t("challenge.viewRanking")}
              tone="secondary"
            />
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px", marginTop: 12 }}>
          {isOwner && (
            <Link
              href={`/sets/${id}/edit`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-mute)" }}
            >
              <Pencil className="h-4 w-4" />
              {t("set.edit")}
            </Link>
          )}
          {isOwner && (
            <Link
              href={`/classes/challenges?setId=${id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-mute)" }}
            >
              <Trophy className="h-4 w-4" />
              {t("challenge.createClassChallenge")}
            </Link>
          )}
          {isOwner && <DeleteSetButton setId={id} />}
          {user && !isOwner && set.is_public && (
            <SaveSetButton setId={id} variant="outline" size="md" />
          )}
        </div>
      </div>

      {/* Content */}
      <ShareSetPanel
        setId={id}
        title={set.title}
        description={set.description}
        isPublic={set.is_public}
        highlight={shouldHighlightShare}
        labels={{
          badge: t("share.badge"),
          title: t("share.title"),
          subtitle: t("share.subtitle"),
          copyLink: t("share.copyLink"),
          copied: t("share.copied"),
          nativeShare: t("share.native"),
          nativeUnavailable: t("share.nativeUnavailable"),
          whatsapp: t("share.whatsapp"),
          telegram: t("share.telegram"),
          openSet: t("share.openSet"),
          privateHint: t("share.privateHint"),
          copyFailed: t("share.copyFailed"),
        }}
      />

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr", marginTop: 18 }}>
        {/* Stats section */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <BarChart3 className="h-5 w-5" style={{ color: "var(--terra)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{t("sets.stats")}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <StatItem label={t("set.cards")} value={String(cards.length)} />
            <StatItem label={t("set.dueToday")} value={String(dueCount)} />
            <StatItem label={t("set.weakCardsLabel")} value={String(weakCount)} />
            <StatItem label={t("set.cardsToReview")} value={String(reviewCount)} />
          </div>

          {reviewCount > 0 && (
            <div style={{ marginTop: 16, padding: "14px 18px", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 6 }}>
                <Zap className="h-4 w-4" />
                {t("set.reviewToday")}
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 10 }}>
                {t("set.reviewTodaySubtitle")}
              </p>
              {user ? (
                <Link
                  href={`/sets/${id}/study?mode=review`}
                  prefetch
                  style={{ fontSize: 13, fontWeight: 500, color: "var(--terra)" }}
                >
                  {t("set.reviewSession")}
                </Link>
              ) : (
                <AuthRequiredPrompt
                  triggerLabel={t("set.reviewSession")}
                  title={t("guest.authRequiredTitle")}
                  description={t("guest.studyPrompt")}
                  signupLabel={t("guest.signUpToContinue")}
                  loginLabel={t("guest.logInToUnlock")}
                  cancelLabel={t("set.cancel")}
                  variant="ghost"
                  icon={<Zap className="h-4 w-4" />}
                />
              )}
            </div>
          )}
        </div>

        {/* Flashcards section */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0, marginBottom: 6 }}>
            {t("set.flashcardsPreview")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 20 }}>
            {t("set.flashcardsPreviewSubtitle")}
          </p>
          <FlashcardList
            flashcards={cards}
            progressMap={progressMap}
            labels={{
              empty: t("set.noFlashcards"),
              term: t("study.term"),
              definition: t("study.definition"),
              difficult: t("study.difficultMarked"),
              dueToday: t("set.dueToday"),
              mastered: t("stats.mastered"),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StudyModeButton({
  href,
  icon: Icon,
  label,
  tone = "secondary",
  requireAuth = false,
  authTitle,
  authDescription,
  authSignupLabel,
  authLoginLabel,
  authCancelLabel,
}: {
  href: string;
  icon: typeof GraduationCap;
  label: string;
  tone?: "primary" | "secondary";
  requireAuth?: boolean;
  authTitle?: string;
  authDescription?: string;
  authSignupLabel?: string;
  authLoginLabel?: string;
  authCancelLabel?: string;
}) {
  if (requireAuth && authTitle && authDescription && authSignupLabel && authLoginLabel && authCancelLabel) {
    return (
      <AuthRequiredPrompt
        triggerLabel={label}
        title={authTitle}
        description={authDescription}
        signupLabel={authSignupLabel}
        loginLabel={authLoginLabel}
        cancelLabel={authCancelLabel}
        variant={tone === "primary" ? "primary" : "secondary"}
        icon={<Icon className="h-4 w-4" />}
        className="w-full"
      />
    );
  }

  return (
    <Link
      href={href}
      prefetch
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 12,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
        background: tone === "primary" ? "var(--terra)" : "var(--paper-2)",
        color: tone === "primary" ? "#fff" : "var(--ink)",
        border: tone === "primary" ? "none" : "1px solid var(--line)",
      }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px" }}>
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{value}</p>
    </div>
  );
}

function buildStudyHref(
  id: string,
  mode?: "review",
  view?: "flashcard" | "quiz" | "write"
) {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (view && view !== "flashcard") params.set("view", view);
  const query = params.toString();
  return query ? `/sets/${id}/study?${query}` : `/sets/${id}/study`;
}
