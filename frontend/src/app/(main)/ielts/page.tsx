import type { Metadata } from "next";
import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getIELTSScoreHistory } from "@/server/services/ielts-score-history";
import { AIFeedbackSignal } from "@/components/ielts/AIFeedbackInfoModal";
import { IELTSOnboardingModal } from "@/components/ielts/IELTSOnboardingModal";
import { SkillScoreBar } from "@/components/ielts/SkillScoreBar";

// BUG-014: descriptive SEO metadata
export const metadata: Metadata = {
  title: "IELTS дайындық | StudyWithRaissov",
  description:
    "IELTS-ке толықтай дайындалыңыз: Cambridge mock тесттер, AI writing/speaking бағалау, Band 5-9 дайындық, жеке study plan.",
  alternates: { canonical: "/ielts" },
  openGraph: {
    title: "IELTS дайындық — StudyWithRaissov",
    description:
      "IELTS-ке толықтай дайындалыңыз: Cambridge mock тесттер, AI writing/speaking бағалау, Band 5-9 дайындық.",
    url: "/ielts",
    locale: "kk_KZ",
  },
  robots: { index: true, follow: true },
};

type TestModule = {
  name: string;
  target: string;
  dur: string;
  q: number;
  parts: string;
  href: string;
  tag: string;
};

const IELTS_MODULES: TestModule[] = [
  { name: "Full Mock Test — Reading", target: "7.5", dur: "60 мин", q: 40, parts: "READING", href: "/ielts/reading", tag: "READING" },
  { name: "Full Mock Test — Listening", target: "7.5", dur: "30 мин", q: 40, parts: "LISTENING", href: "/ielts/listening", tag: "LISTENING" },
  { name: "Writing Task 1 & 2", target: "7.0", dur: "60 мин", q: 2, parts: "WRITING", href: "/ielts/writing", tag: "WRITING" },
  { name: "Speaking Simulation", target: "7.5", dur: "14 мин", q: 12, parts: "SPEAKING", href: "/ielts/speaking", tag: "SPEAKING" },
  { name: "IELTS Simulator — Full", target: "8.0", dur: "2 сағ 45 мин", q: 200, parts: "L · R · W · S", href: "/ielts/simulator", tag: "FULL" },
  { name: "AI Writing тексеруші", target: "7.0", dur: "5 мин", q: 1, parts: "AI БАҒАЛАУ", href: "/ielts/writing", tag: "AI" },
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
            <p className="nd-eyebrow">IELTS ДАЙЫНДЫҚ</p>
            <h2>Тестілер кітапханасы</h2>
            <p>Шынайы IELTS форматы · Cambridge нұсқалары · AI бағалау</p>
            <div className="nd-row" style={{ flexWrap: "wrap", gap: "10px" }}>
              <Link href="/ielts/simulator" className="nd-btn-primary">
                Simulator бастау →
              </Link>
              <Link href="/ielts/study-plan" className="nd-btn-ghost">
                Study Plan
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
          <h1 className="nd-page-title">Тест модульдері</h1>
          <p className="nd-page-sub">
            {IELTS_MODULES.length} модуль · Band 7–8+ дайындық
          </p>
        </div>
        <div className="nd-row">
          <Link href="/ielts/study-plan" className="nd-btn-soft">
            Оқу жоспары
          </Link>
        </div>
      </div>

      {/* ── Test card grid ────────────────────────────────────────────────── */}
      <div className="nd-test-grid nd-reveal nd-d3">
        {IELTS_MODULES.map((mod) => (
          <article key={mod.href + mod.name} className="nd-test-card">
            <div className="nd-test-band">
              <span className="nd-test-target">{mod.target}</span>
              <span className={tagClass(mod.tag)}>{mod.tag}</span>
            </div>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>
              {mod.name}
            </h4>
            <div className="nd-test-meta">
              <span>{mod.dur}</span>
              <span>·</span>
              <span>{mod.q} сұрақ</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--ink-mute)", fontFamily: "var(--font-mono,monospace)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              {mod.parts}
            </p>
            <div style={{ marginTop: "auto", paddingTop: "6px" }}>
              <Link href={mod.href} className="nd-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Бастау →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* BUG-010: first-visit onboarding modal (client, checks localStorage) */}
      <IELTSOnboardingModal />
    </div>
  );
}
