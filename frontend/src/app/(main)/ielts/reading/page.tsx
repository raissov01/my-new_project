import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("ielts.reading.metaTitle"),
    description: t("ielts.reading.metaDesc"),
  };
}

const PASSAGE_TYPE_KEYS = [
  { key: "skimming", label: "Skimming & Scanning", descKey: "ielts.reading.skimmingDesc" },
  { key: "tfng", label: "True / False / Not Given", descKey: "ielts.reading.tfngDesc" },
  { key: "matching", label: "Matching Headings", descKey: "ielts.reading.matchingDesc" },
  { key: "fill", label: "Fill in the Blank", descKey: "ielts.reading.fillDesc" },
] as const;

const TIP_KEYS = [
  "ielts.reading.tip1",
  "ielts.reading.tip2",
  "ielts.reading.tip3",
  "ielts.reading.tip4",
] as const;

export default async function IELTSReadingPage() {
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
          <h3>{t("ielts.readingTitle")}</h3>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <Clock size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} aria-hidden />
            {t("ielts.reading.twentyMin")}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <BookOpen size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} aria-hidden />
            13 {t("ielts.questions")}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <CheckCircle2 size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} aria-hidden />
            {t("ielts.reading.autoBadge")}
          </span>
        </div>
      </div>

      {/* Practice type cards */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          {t("ielts.reading.practiceFormat")}
        </p>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
          {PASSAGE_TYPE_KEYS.map((pt) => (
            <Link
              key={pt.key}
              href={`/ielts/simulator?section=reading&focus=${pt.key}`}
              className="block rounded-[14px] border-[1.5px] border-[var(--line)] no-underline transition-colors hover:border-[var(--terra)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)] focus-visible:ring-offset-2"
            >
              <div
                style={{
                  background: "var(--paper)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{pt.label}</p>
                <p style={{ fontSize: 13, color: "var(--ink-mute)", flex: 1 }}>{t(pt.descKey)}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--terra)", fontWeight: 600, marginTop: 4 }}>
                  {t("ielts.reading.start")} <ArrowRight size={12} aria-hidden />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Full Reading section CTA */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>
              {t("ielts.reading.fullSectionTitle")}
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>
              {t("ielts.reading.fullSectionMeta")}
            </p>
          </div>
          <Link
            href="/ielts/simulator?section=reading"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--terra)",
              color: "#fff",
              borderRadius: 10,
              padding: "10px 20px",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <BookOpen size={15} aria-hidden />
            {t("ielts.reading.fullPractice")}
          </Link>
        </div>
      </div>

      {/* Tips */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          {t("ielts.reading.tipsTitle")}
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
                  background: "var(--terra-tint)",
                  color: "var(--terra)",
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
