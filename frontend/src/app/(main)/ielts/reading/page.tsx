import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export const metadata: Metadata = {
  title: "IELTS Оқу жаттығуы | StudyWithRaissov",
  description: "Cambridge мәтіндері мен сұрақтары бойынша IELTS Reading бөлімін жаттықтырыңыз.",
};

const PASSAGE_TYPES = [
  { key: "skimming", label: "Skimming & Scanning", desc: "Мәтінді жылдам шолу дағдысы" },
  { key: "tfng", label: "True / False / Not Given", desc: "Фактілерді анықтау дағдысы" },
  { key: "matching", label: "Matching Headings", desc: "Абзац тақырыптарын сәйкестендіру" },
  { key: "fill", label: "Fill in the Blank", desc: "Мәтіндегі бос орындарды толтыру" },
];

const TIPS = [
  "Сұрақтарды алдымен оқып, мәтінде не іздейтініңізді біліңіз.",
  "Жауапты word limit ескере отырып жазыңыз (NOT MORE THAN TWO WORDS).",
  "True/False/Not Given бойынша: мәтінде жоқ ақпарат = Not Given.",
  "60 минутқа 3 passage + 40 сұрақ — уақытты тең бөліңіз.",
];

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
            <Clock size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            20 мин
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <BookOpen size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            13 сұрақ
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            <CheckCircle2 size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Автобағалау
          </span>
        </div>
      </div>

      {/* Practice type cards */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Жаттығу форматы
        </p>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
          {PASSAGE_TYPES.map((pt) => (
            <Link
              key={pt.key}
              href={`/ielts/simulator?section=reading&focus=${pt.key}`}
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
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--terra)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{pt.label}</p>
                <p style={{ fontSize: 13, color: "var(--ink-mute)", flex: 1 }}>{pt.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--terra)", fontWeight: 600, marginTop: 4 }}>
                  Бастау <ArrowRight size={12} />
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
              Толық Reading бөлімі
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>
              3 passage · 40 сұрақ · 60 минут · нақты IELTS форматы
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
            <BookOpen size={15} />
            Толық жаттығу
          </Link>
        </div>
      </div>

      {/* Tips */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Reading кеңестері
        </p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
          {TIPS.map((tip, i) => (
            <div
              key={i}
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
              <p style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
