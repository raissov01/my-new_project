import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Headphones, Lightbulb, Mic, PenLine } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSTipsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const sections = [
    { icon: Headphones, title: t("ielts.tipsListening"), tips: [t("ielts.tipsL1"), t("ielts.tipsL2"), t("ielts.tipsL3")] },
    { icon: BookOpen, title: t("ielts.tipsReading"), tips: [t("ielts.tipsR1"), t("ielts.tipsR2"), t("ielts.tipsR3")] },
    { icon: PenLine, title: t("ielts.tipsWriting"), tips: [t("ielts.tipsW1"), t("ielts.tipsW2"), t("ielts.tipsW3")] },
    { icon: Mic, title: t("ielts.tipsSpeaking"), tips: [t("ielts.tipsS1"), t("ielts.tipsS2"), t("ielts.tipsS3")] },
  ];

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            {t("ielts.backToHub")}
          </Link>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Lightbulb style={{ width: 16, height: 16 }} />
            {t("ielts.tipsTitle")}
          </h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("ielts.tipsSubtitle")}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--paper-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink)",
                  flexShrink: 0,
                }}>
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{section.title}</h3>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {section.tips.map((tip) => (
                  <li key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.6, color: "var(--ink-mute)" }}>
                    <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2, color: "var(--green)" }} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
