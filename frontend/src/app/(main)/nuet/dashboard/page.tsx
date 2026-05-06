import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, Library, ScrollText, Target, TrendingDown, Trophy } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETDashboard } from "@/server/integrations/go-backend/nuet";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.dashMetaTitle"),
    description: t("nuet.dashMetaDesc"),
    alternates: { canonical: "/nuet/dashboard" },
  };
}

export default async function NUETDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="page-shell py-10">
        <p>{t("nuet.signInRequired")}</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--primary)] hover:underline">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  const dashboard = await getNUETDashboard(user.id).catch(() => null);

  if (!dashboard) {
    return (
      <div className="page-shell py-10">
        <p>{t("nuet.dashLoadError")}</p>
      </div>
    );
  }

  const grantThreshold = 120;
  const meetsGrant = dashboard.bestScoreTotal >= grantThreshold;
  const progressPct = Math.min(100, Math.round((dashboard.bestScoreTotal / 240) * 100));

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToHub")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {t("nuet.dashTitle")}
      </h1>

      {/* Best score panel */}
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary-soft)] to-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.bestScore")}
            </p>
            <p className="mt-1 text-5xl font-bold text-[var(--text-primary)]">
              {dashboard.bestScoreTotal}
              <span className="text-xl font-normal text-[var(--text-muted)]"> / 240</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">{t("nuet.sectionMath")}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {dashboard.bestScoreMath}
                  <span className="text-sm font-normal text-[var(--text-muted)]"> / 120</span>
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">{t("nuet.sectionCT")}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {dashboard.bestScoreCT}
                  <span className="text-sm font-normal text-[var(--text-muted)]"> / 120</span>
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <Target className={`h-12 w-12 ${meetsGrant ? "text-emerald-500" : "text-[var(--text-muted)]"}`} />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.grantThreshold")}
            </p>
            <p className={`text-sm font-semibold ${meetsGrant ? "text-emerald-600" : "text-[var(--text-muted)]"}`}>
              {meetsGrant ? t("nuet.grantEligible") : `${grantThreshold - dashboard.bestScoreTotal} ${t("nuet.pointsAway")}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
          <div
            className="h-full bg-[var(--primary)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Stats row */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label={t("nuet.totalAttempts")}
          value={dashboard.totalAttempts}
        />
        <StatCard
          icon={Trophy}
          label={t("nuet.completedAttempts")}
          value={dashboard.completedAttempts}
        />
        <StatCard
          icon={BookOpen}
          label={t("nuet.topicCount")}
          value={dashboard.topicCount}
        />
        <StatCard
          icon={Library}
          label={t("nuet.materialCount")}
          value={dashboard.materialCount}
        />
      </section>

      {/* Weak topics */}
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-start gap-3">
          <TrendingDown className="mt-1 h-5 w-5 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("nuet.weakTopicsTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("nuet.weakTopicsDesc")}
            </p>
          </div>
        </div>
        {!dashboard.weakTopics || dashboard.weakTopics.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-4 text-sm text-[var(--text-muted)]">
            {t("nuet.weakTopicsEmpty")}
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {dashboard.weakTopics.map((wt) => {
              const pct = Math.round(wt.accuracy * 100);
              const tone = pct < 40 ? "rose" : pct < 70 ? "amber" : "emerald";
              const barColor =
                tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-500" : "bg-emerald-500";
              const textColor =
                tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-emerald-600";
              return (
                <li key={wt.slug}>
                  <Link
                    href={`/nuet/topics/${wt.slug}`}
                    className="group block rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-3 transition hover:border-[var(--primary)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                          {wt.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {wt.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")} ·{" "}
                          {t("nuet.weakTopicsAttempted").replace("{n}", String(wt.total))}
                        </p>
                      </div>
                      <span className={`font-mono text-sm font-semibold ${textColor}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                      <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* CTAs */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/nuet/simulator"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--primary)]"
        >
          <GraduationCap className="h-6 w-6 text-[var(--primary)]" />
          <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
            {t("nuet.startMock")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("nuet.mod.mockExamDesc")}
          </p>
        </Link>
        <Link
          href="/nuet/topics"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--primary)]"
        >
          <BookOpen className="h-6 w-6 text-[var(--primary)]" />
          <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
            {t("nuet.studyTopics")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("nuet.mod.topicsDesc")}
          </p>
        </Link>
        <Link
          href="/nuet/pdf-tests"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--primary)]"
        >
          <ScrollText className="h-6 w-6 text-[var(--primary)]" />
          <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
            {t("nuet.pdfTest.title")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("nuet.pdfTest.subtitleShort")}
          </p>
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
