import type { Metadata } from "next";
import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getIELTSScoreHistory } from "@/server/services/ielts-score-history";
import { AIFeedbackSignal } from "@/components/ielts/AIFeedbackInfoModal";
import { IELTSOnboardingModal } from "@/components/ielts/IELTSOnboardingModal";
import { SkillScoreBar } from "@/components/ielts/SkillScoreBar";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("ielts.metaTitle"),
    description: t("ielts.metaDesc"),
    alternates: { canonical: "/ielts" },
    openGraph: {
      title: t("ielts.metaTitle"),
      description: t("ielts.metaDesc"),
      url: "/ielts",
    },
    robots: { index: true, follow: true },
  };
}

type TestModule = {
  nameKey: string;
  target: string;
  durKey: string;
  q: number;
  parts: string;
  href: string;
  tag: string;
};

const IELTS_MODULES: TestModule[] = [
  { nameKey: "ielts.mod.reading",   target: "7.5", durKey: "ielts.dur.60min", q: 40,  parts: "READING",        href: "/ielts/reading",   tag: "READING"   },
  { nameKey: "ielts.mod.listening", target: "7.5", durKey: "ielts.dur.30min", q: 40,  parts: "LISTENING",      href: "/ielts/listening", tag: "LISTENING" },
  { nameKey: "ielts.mod.writing",   target: "7.0", durKey: "ielts.dur.60min", q: 2,   parts: "WRITING",        href: "/ielts/writing",   tag: "WRITING"   },
  { nameKey: "ielts.mod.speaking",  target: "7.5", durKey: "ielts.dur.14min", q: 12,  parts: "SPEAKING",       href: "/ielts/speaking",  tag: "SPEAKING"  },
  { nameKey: "ielts.mod.full",      target: "8.0", durKey: "ielts.dur.full",  q: 200, parts: "L · R · W · S", href: "/ielts/simulator", tag: "FULL"      },
  { nameKey: "ielts.mod.aiWriter",  target: "7.0", durKey: "ielts.dur.5min",  q: 1,   parts: "ielts.partsAI", href: "/ielts/writing",   tag: "AI"        },
];

function tagClass(tag: string): string {
  if (tag === "FULL") return "nd-tag nd-tag-terra";
  if (tag === "AI") return "nd-tag nd-tag-green";
  if (tag === "WRITING" || tag === "SPEAKING") return "nd-tag nd-tag-yellow";
  return "nd-tag";
}

export default async function IELTSHubPage() {
  const [locale, scoreHistory] = await Promise.all([
    getServerLocale(),
    getIELTSScoreHistory(),
  ]);
  const t = createTranslator(locale);

  // BUG-004: smart CTA — guide new users to study plan first
  const hasActivity = scoreHistory.length > 0;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">

      {/* ── Hero (dark gradient, nd-dash-hero style) ─────────────────────── */}
      <section className="nd-dash-hero nd-reveal">
        <div className="nd-dash-hero-grid">
          <div>
            <p className="nd-eyebrow">{t("ielts.hubEyebrow")}</p>
            <h2>{t("ielts.libraryTitle")}</h2>
            <p>{t("ielts.librarySubtitle")}</p>
            <div className="nd-row" style={{ flexWrap: "wrap", gap: "10px" }}>
              <Link href="/ielts/simulator" className="nd-btn-primary">
                {t("ielts.simulatorStart")}
              </Link>
              <Link href="/ielts/study-plan" className="nd-btn-ghost">
                {t("ielts.studyPlanLabel")}
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* BUG-009: clickable AI signal opens rubric modal */}
            <AIFeedbackSignal
              label={t("ielts.signalAI")}
              value="AI"
              body={t("ielts.signalAIBody")}
              accent="border-l-violet-500"
            />
            <div
              style={{
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: "14px",
                padding: "14px 18px",
              }}
            >
              <p style={{ fontSize: "10px", color: "#FCE3CC", fontFamily: "var(--font-mono,monospace)", letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 6px", fontWeight: 600 }}>
                {t("ielts.signalBand")}
              </p>
              <p style={{ fontSize: "24px", fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-.025em" }}>
                5–9
              </p>
              <p style={{ fontSize: "12px", color: "#FCE3CC", margin: 0 }}>
                {t("ielts.signalBandBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Score history bar chart (shown only when user has activity) ──── */}
      {hasActivity && (
        <section className="nd-reveal nd-d1" style={{ marginTop: "28px" }}>
          <SkillScoreBar scoreHistory={scoreHistory} />
        </section>
      )}

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="nd-page-head nd-reveal nd-d2" style={{ marginTop: "32px" }}>
        <div>
          <h1 className="nd-page-title">{t("ielts.testModulesTitle")}</h1>
          <p className="nd-page-sub">
            {t("ielts.testModulesSub", { n: IELTS_MODULES.length })}
          </p>
        </div>
        <div className="nd-row">
          <Link href="/ielts/study-plan" className="nd-btn-soft">
            {t("ielts.studyPlanLabel")}
          </Link>
        </div>
      </div>

      {/* ── Test card grid ────────────────────────────────────────────────── */}
      <div className="nd-test-grid nd-reveal nd-d3">
        {IELTS_MODULES.map((mod) => (
          <Link
            key={mod.href + mod.nameKey}
            href={mod.href}
            className="nd-test-card group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}
            aria-label={`${t(mod.nameKey)} — ${t("ielts.cardStart")}`}
          >
            <article style={{ display: "contents" }}>
              <div className="nd-test-band">
                <span className="nd-test-target">{mod.target}</span>
                <span className={tagClass(mod.tag)}>{mod.tag}</span>
              </div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>
                {t(mod.nameKey)}
              </h4>
              <div className="nd-test-meta">
                <span>{t(mod.durKey)}</span>
                <span aria-hidden>·</span>
                <span>{mod.q} {t("ielts.questions")}</span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--ink-mute)", fontFamily: "var(--font-mono,monospace)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                {mod.parts.startsWith("ielts.") ? t(mod.parts) : mod.parts}
              </p>
              <div style={{ marginTop: "auto", paddingTop: "6px" }}>
                <span className="nd-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  {t("ielts.cardStart")}
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* BUG-010: first-visit onboarding modal (client, checks localStorage) */}
      <IELTSOnboardingModal />
    </div>
  );
}
