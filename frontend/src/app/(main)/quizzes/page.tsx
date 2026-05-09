import Link from "next/link";
import { Plus, Search, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { QuizCard } from "@/features/quizzes/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getQuizzesOverview, type QuizListFilters } from "@/server/services/quizzes";

export async function generateMetadata() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("quiz.libraryTitle"),
    description: t("quiz.librarySubtitleAuth"),
  };
}

type QuizzesSearchParams = {
  q?: string;
  subject?: string;
  tag?: string;
  sort?: "newest" | "played" | "rated";
};

interface QuizzesPageProps {
  searchParams: Promise<QuizzesSearchParams>;
}

function buildQuizzesHref(
  current: QuizzesSearchParams,
  overrides: Partial<QuizzesSearchParams> & { sort?: QuizzesSearchParams["sort"] | "" } = {}
) {
  const merged: QuizzesSearchParams = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (merged.q?.trim()) params.set("q", merged.q.trim());
  if (merged.subject?.trim()) params.set("subject", merged.subject.trim());
  if (merged.tag?.trim()) params.set("tag", merged.tag.trim());
  // Default sort is "newest" — leave it out of the URL to keep links clean.
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  const qs = params.toString();
  return qs ? `/quizzes?${qs}` : "/quizzes";
}

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const sp = await searchParams;
  const { q = "", subject = "", tag = "", sort = "newest" } = sp;

  const filters: QuizListFilters = {
    q: q.trim() || undefined,
    subject: subject.trim() || undefined,
    tag: tag.trim() || undefined,
    sort,
  };

  const quizzes = await getQuizzesOverview(filters);

  const ownedCount = user
    ? quizzes.filter((quiz) => quiz.userId === user.id).length
    : 0;
  const publicCount = quizzes.filter((quiz) => quiz.isPublic).length;

  const hrefForSort = (target: NonNullable<QuizzesSearchParams["sort"]>) =>
    buildQuizzesHref(sp, { sort: target });
  const hrefWithoutTag = buildQuizzesHref(sp, { tag: "" });

  return (
    <div className="page-shell py-6 sm:py-10 lg:py-14">

      {/* Page head */}
      <div className="nd-page-head nd-reveal nd-d1">
        <div>
          <p className="nd-eyebrow">{t("quiz.navLabel")}</p>
          <h1 className="nd-page-title" style={{ marginTop: 10 }}>
            {t("quiz.libraryTitle")}
          </h1>
          <p className="nd-page-sub">
            {quizzes.length} {quizzes.length === 1 ? t("quiz.quiz") : t("quiz.quizzes")}
            {" · "}
            {publicCount} {t("quiz.signalPublicBody")}
          </p>
        </div>
        {user ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
            <Link href="/quizzes/create" className="nd-btn-primary">
              <Plus style={{ width: 16, height: 16 }} />
              {t("quiz.createNew")}
            </Link>
            <Link href="/quizzes/create-with-ai" className="nd-btn-soft">
              <Sparkles style={{ width: 15, height: 15 }} />
              {t("quiz.ai.navLabel")}
            </Link>
          </div>
        ) : (
          <AuthRequiredPrompt
            triggerLabel={t("quiz.createNew")}
            title={t("guest.authRequiredTitle")}
            description={t("quiz.guestCreatePrompt")}
            signupLabel={t("guest.signUpToContinue")}
            loginLabel={t("guest.logInToUnlock")}
            cancelLabel={t("set.cancel")}
            icon={<Plus style={{ width: 16, height: 16 }} />}
          />
        )}
      </div>

      {/* KPI grid */}
      <div className="nd-kpi-grid nd-reveal nd-d2">
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.signalTotal")}</span>
          <strong className="nd-kpi-num">{quizzes.length}</strong>
          <span className="nd-kpi-sub">{t("quiz.signalTotalBody")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.signalMine")}</span>
          <strong className="nd-kpi-num">{ownedCount}</strong>
          <span className="nd-kpi-sub">{t("quiz.signalMineBody")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.signalPublic")}</span>
          <strong className="nd-kpi-num">{publicCount}</strong>
          <span className="nd-kpi-sub">{t("quiz.signalPublicBody")}</span>
        </div>
      </div>

      {/* Filters + search */}
      <div
        className="nd-reveal nd-d3"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {/* Sort pills */}
        <div className="nd-lib-filters" style={{ marginBottom: 0 }}>
          <Link
            href={hrefForSort("newest")}
            aria-current={sort === "newest" ? "page" : undefined}
            className={`nd-lib-pill${sort === "newest" ? " on" : ""}`}
          >
            {t("quiz.sortNewest")}
          </Link>
          <Link
            href={hrefForSort("played")}
            aria-current={sort === "played" ? "page" : undefined}
            className={`nd-lib-pill${sort === "played" ? " on" : ""}`}
          >
            {t("quiz.sortPlayed")}
          </Link>
          <Link
            href={hrefForSort("rated")}
            aria-current={sort === "rated" ? "page" : undefined}
            className={`nd-lib-pill${sort === "rated" ? " on" : ""}`}
          >
            {t("quiz.sortRated")}
          </Link>
        </div>

        {/* Search */}
        <form
          action="/quizzes"
          method="get"
          role="search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            border: "1.5px solid var(--line)",
            borderRadius: 99,
            padding: "7px 16px",
            flex: "1 1 200px",
            maxWidth: 360,
            minWidth: 0,
          }}
        >
          <label htmlFor="quizzes-search" className="sr-only">
            {t("quiz.searchLabel")}
          </label>
          <button
            type="submit"
            aria-label={t("quiz.searchLabel")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              color: "var(--ink-mute)",
              flexShrink: 0,
            }}
          >
            <Search style={{ width: 15, height: 15 }} />
          </button>
          {subject ? <input type="hidden" name="subject" value={subject} /> : null}
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          {sort && sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
          <input
            id="quizzes-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("quiz.searchPlaceholder")}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "var(--ink)",
              flex: 1,
              minWidth: 0,
            }}
          />
        </form>
      </div>

      {/* Active tag filter badge */}
      {tag ? (
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 20,
              border: "1px solid var(--line)",
              padding: "3px 10px",
              fontSize: 12,
              color: "var(--ink-mute)",
              background: "var(--paper-2)",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            #{tag}
            <Link
              href={hrefWithoutTag}
              style={{ marginLeft: 4, color: "var(--ink-mute)", textDecoration: "none", fontWeight: 700 }}
              aria-label={t("quiz.tagClear")}
            >
              ×
            </Link>
          </span>
        </div>
      ) : null}

      {/* Quiz grid / empty states */}
      {!user ? (
        <div
          className="nd-reveal nd-d4"
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 18,
            padding: "64px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 20px",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              border: "1.5px solid var(--line)",
              background: "var(--paper-2)",
              color: "var(--ink-mute)",
            }}
            aria-hidden
          >
            <Target style={{ width: 20, height: 20 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginBottom: 10, letterSpacing: "-.02em" }}>
            {t("quiz.guestEmptyTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            {t("quiz.guestEmptyBody")}
          </p>
        </div>
      ) : quizzes.length > 0 ? (
        <div className="nd-lib-grid nd-reveal nd-d4">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              locale={locale}
              isOwner={quiz.userId === user.id}
            />
          ))}
        </div>
      ) : (
        <div
          className="nd-reveal nd-d4"
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 18,
            padding: "64px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 20px",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              border: "1.5px solid var(--line)",
              background: "var(--paper-2)",
              color: "var(--ink-mute)",
            }}
            aria-hidden
          >
            <Target style={{ width: 20, height: 20 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginBottom: 10, letterSpacing: "-.02em" }}>
            {t("quiz.emptyTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.7 }}>
            {t("quiz.emptyBody")}
          </p>
          <Link href="/quizzes/create" className="nd-btn-primary" style={{ display: "inline-flex" }}>
            <Plus style={{ width: 16, height: 16 }} />
            {t("quiz.createNew")}
          </Link>
        </div>
      )}
    </div>
  );
}
