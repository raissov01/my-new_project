import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { IELTSStudyPlanClient } from "./client";

export default async function IELTSStudyPlanPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  let initialPlan: Record<string, unknown> | null = null;
  const initialTaskStatuses: Record<string, string> = {};

  try {
    const user = await getCurrentUser();
    if (user) {
      const planResp = await fetchBackendJson<{ plan: Record<string, unknown> | null }>({
        path: "/api/v1/ielts/study-plan",
        userId: user.id,
        timeoutMs: 10_000,
      });
      initialPlan = planResp.plan ?? null;

      if (initialPlan && typeof initialPlan.id === "string") {
        try {
          const completionsResp = await fetchBackendJson<{
            completions: Array<{ week: number; day: string; skill: string; status: string }>;
          }>({
            path: `/api/v1/ielts/study-plan/tasks?planId=${initialPlan.id}`,
            userId: user.id,
            timeoutMs: 8_000,
          });
          for (const c of completionsResp.completions ?? []) {
            initialTaskStatuses[`${c.week}-${c.day}-${c.skill}`] = c.status;
          }
        } catch {
          // task completions are optional
        }
      }
    }
  } catch {
    // unauthenticated or backend unavailable → client shows wizard
  }

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.studyPlanTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("ielts.studyPlanSubtitle")}
          </span>
        </div>
      </div>

      <IELTSStudyPlanClient
        initialPlan={initialPlan}
        initialTaskStatuses={initialTaskStatuses}
      />
    </div>
  );
}
