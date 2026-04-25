import { PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { WritingPracticeClient } from "./client";

export default async function IELTSWritingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.writingTitle")}</h3>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.2)", fontSize: 11.5, fontWeight: 600, color: "#10b981", fontFamily: "'JetBrains Mono',monospace" }}>
            <Sparkles style={{ width: 12, height: 12 }} />
            {t("ielts.aiPoweredFeedback")}
          </span>
          <div style={{ fontSize: 13, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 6 }}>
            <PenLine style={{ width: 14, height: 14 }} />
            {t("ielts.writingSubtitle")}
          </div>
        </div>
      </div>

      <WritingPracticeClient />
    </div>
  );
}
