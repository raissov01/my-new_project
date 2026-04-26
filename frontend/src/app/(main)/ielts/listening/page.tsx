import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export const metadata: Metadata = {
  title: "IELTS Аудирование жаттығуы | StudyWithRaissov",
  description: "Cambridge аудио бөлімдері бойынша IELTS Listening бөлімін жаттықтырыңыз.",
};

const SECTION_TYPE_KEYS = [
  { key: "s1", label: "Section 1", descKey: "ielts.listening.s1Desc" },
  { key: "s2", label: "Section 2", descKey: "ielts.listening.s2Desc" },
  { key: "s3", label: "Section 3", descKey: "ielts.listening.s3Desc" },
  { key: "s4", label: "Section 4", descKey: "ielts.listening.s4Desc" },
] as const;

const TIP_KEYS = [
  "ielts.listening.tip1",
  "ielts.listening.tip2",
  "ielts.listening.tip3",
  "ielts.listening.tip4",
] as const;

// Indigo accent (kept as inline hex per design instructions)
const INDIGO = "#6366f1";
const INDIGO_TINT = "rgba(99,102,241,0.10)";

export default async function IELTSListeningPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header bar */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft">
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.listeningTitle")}</h3>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <Clock size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            10 мин
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <Headphones size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            10 {t("ielts.questions")}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <CheckCircle2 size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            {t("ielts.listening.autoBadge")}
          </span>
        </div>
      </div>

      {/* Section cards */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          {t("ielts.listening.pickSection")}
        </p>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
          {SECTION_TYPE_KEYS.map((sec) => (
            <Link
              key={sec.key}
              href={`/ielts/simulator?section=listening&focus=${sec.key}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--paper)",
                  border: "1.5px solid var(--line)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                  transition: "border-color .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = INDIGO)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{sec.label}</p>
                <p style={{ fontSize: 13, color: "var(--ink-mute)", flex: 1 }}>{t(sec.descKey)}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: INDIGO, fontWeight: 600, marginTop: 4 }}>
                  {t("ielts.listening.start")} <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Full Listening section CTA */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>
              {t("ielts.listening.fullSectionTitle")}
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>
              {t("ielts.listening.fullSectionMeta")}
            </p>
          </div>
          <Link
            href="/ielts/simulator?section=listening"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: INDIGO,
              color: "#fff",
              borderRadius: 10,
              padding: "10px 20px",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Headphones size={15} />
            {t("ielts.listening.fullPractice")}
          </Link>
        </div>
      </div>

      {/* Tips */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          {t("ielts.listening.tipsTitle")}
        </p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
          {TIP_KEYS.map((tipKey, i) => (
            <div
              key={tipKey}
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: INDIGO_TINT,
                  color: INDIGO,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>{t(tipKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
