import { Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { SpeakingPracticeClient } from "./client";

export default async function IELTSSpeakingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.speakingTitle")}</h3>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.2)", fontSize: 11.5, fontWeight: 600, color: "#8b5cf6", fontFamily: "'JetBrains Mono',monospace" }}>
            <Sparkles style={{ width: 12, height: 12 }} />
            {t("ielts.aiPoweredFeedback")}
          </span>
          <div style={{ fontSize: 13, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 6 }}>
            <Mic style={{ width: 14, height: 14 }} />
            {t("ielts.speakingSubtitle")}
          </div>
        </div>
      </div>

      <SpeakingPracticeClient />
    </div>
  );
}
