import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { SimulatorClient } from "./client";
import Link from "next/link";

export default async function IELTSSimulatorPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* MockExam header bar */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.simulatorTitle")}</h3>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "var(--paper-2)", border: "1px solid var(--line)", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", fontFamily: "'JetBrains Mono',monospace" }}>
            L · R · W · S
          </span>
          <div className="nd-mock-timer">
            <span className="nd-mock-pulse" />
            {t("ielts.simulatorSubtitle")}
          </div>
        </div>
      </div>

      <SimulatorClient />
    </div>
  );
}
