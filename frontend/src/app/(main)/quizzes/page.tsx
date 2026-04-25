import Link from "next/link";
import { Plus, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { QuizCard } from "@/features/quizzes/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getQuizzesOverview, type QuizListFilters } from "@/server/services/quizzes";

export const metadata = {
  title: "Квиз кітапханасы",
  description:
    "Ашық квиздерді қараңыз, ойнаңыз және өзіңіздікін жасаңыз. IELTS дайындығы, флешкарталар және басқалары.",
};

interface QuizzesPageProps {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    tag?: string;
    sort?: "newest" | "played" | "rated";
  }>;
}

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { q = "", subject = "", tag = "", sort = "newest" } = await searchParams;

  const filters: QuizListFilters = {
    q: q.trim() || undefined,
    subject: subject.trim() || undefined,
    tag: tag.trim() || undefined,
    sort,
  };

  const quizzes = user ? await getQuizzesOverview(filters) : [];

  const ownedCount = user
    ? quizzes.filter((quiz) => quiz.userId === user.id).length
    : 0;

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("quiz.libraryTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {quizzes.length} {quizzes.length === 1 ? t("quiz.quiz") : t("quiz.quizzes")}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("quiz.navLabel")}
          </span>
        </div>
      </div>

      <div className="nd-kpi-grid" style={{ marginBottom: 24 }}>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.signalTotal")}</span>
          <strong className="nd-kpi-val">{quizzes.length}</strong>
          <span className="nd-kpi-sub">{t("quiz.signalTotalBody")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.signalMine")}</span>
          <strong className="nd-kpi-val">{ownedCount}</strong>
          <span className="nd-kpi-sub">{t("quiz.signalMineBody")}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.signalPublic")}</span>
          <strong className="nd-kpi-val">{quizzes.filter((quiz) => quiz.isPublic).length}</strong>
          <span className="nd-kpi-sub">{t("quiz.signalPublicBody")}</span>
        </div>
      </div>

      <div style={{ marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {user ? (
          <>
            <Link href="/quizzes/create">
              <Button size="lg">
                <Plus className="h-4 w-4" />
                {t("quiz.createNew")}
              </Button>
            </Link>
            <Link href="/quizzes/create-with-ai">
              <Button size="lg" variant="outline">
                <Sparkles className="h-4 w-4" />
                {t("quiz.ai.navLabel")}
              </Button>
            </Link>
          </>
        ) : (
          <AuthRequiredPrompt
            triggerLabel={t("quiz.createNew")}
            title={t("guest.authRequiredTitle")}
            description={t("quiz.guestCreatePrompt")}
            signupLabel={t("guest.signUpToContinue")}
            loginLabel={t("guest.logInToUnlock")}
            cancelLabel={t("set.cancel")}
            icon={<Plus className="h-4 w-4" />}
          />
        )}
      </div>

      <form>
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 18,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--paper-2)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              padding: "0 12px",
              minWidth: 200,
            }}
          >
            <Search style={{ width: 16, height: 16, color: "var(--ink-mute)", flexShrink: 0 }} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("quiz.searchPlaceholder")}
              style={{
                height: 44,
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "var(--paper-2)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".1em",
                color: "var(--ink-mute)",
              }}
            >
              {t("quiz.filterSubject")}
            </span>
            <input
              type="text"
              name="subject"
              defaultValue={subject}
              placeholder={t("quiz.filterSubjectPlaceholder")}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
                width: 140,
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "var(--paper-2)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".1em",
                color: "var(--ink-mute)",
              }}
            >
              {t("quiz.sort")}
            </span>
            <select
              name="sort"
              defaultValue={sort}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              <option value="newest">{t("quiz.sortNewest")}</option>
              <option value="played">{t("quiz.sortPlayed")}</option>
              <option value="rated">{t("quiz.sortRated")}</option>
            </select>
          </label>

          <Button type="submit" variant="outline" style={{ height: 44 }}>
            <SlidersHorizontal className="h-4 w-4" />
            {t("quiz.apply")}
          </Button>
        </div>
      </form>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ fontSize: 13, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace" }}>
            {quizzes.length} {quizzes.length === 1 ? t("quiz.quiz") : t("quiz.quizzes")}
            {q ? ` — ${t("quiz.searchMatched").replace("{q}", q)}` : ""}
          </p>
          {tag ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 20,
                border: "1px solid var(--line)",
                padding: "2px 10px",
                fontSize: 12,
                color: "var(--ink-mute)",
                background: "var(--paper-2)",
              }}
            >
              #{tag}
              <Link
                href="/quizzes"
                style={{ marginLeft: 4, color: "var(--ink-mute)", textDecoration: "none" }}
                aria-label={t("quiz.tagClear")}
              >
                ×
              </Link>
            </div>
          ) : null}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-mute)" }}>
          {user ? t("quiz.liveMode") : t("quiz.previewMode")}
        </span>
      </div>

      {!user ? (
        <div
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
              border: "1px solid var(--line)",
              background: "var(--paper-2)",
              color: "var(--ink-mute)",
            }}
          >
            <Target style={{ width: 20, height: 20 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
            {t("quiz.guestEmptyTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            {t("quiz.guestEmptyBody")}
          </p>
        </div>
      ) : quizzes.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
              border: "1px solid var(--line)",
              background: "var(--paper-2)",
              color: "var(--ink-mute)",
            }}
          >
            <Target style={{ width: 20, height: 20 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
            {t("quiz.emptyTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            {t("quiz.emptyBody")}
          </p>
        </div>
      )}
    </div>
  );
}
