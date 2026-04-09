import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { IELTSStudyPlanClient } from "./client";

export default async function IELTSStudyPlanPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  // Load data server-side to avoid calling Server Actions from useEffect,
  // which can trigger "An error occurred in the Server Components render"
  // in React 19 / Next.js 16 when the action throws (e.g. unauthenticated).
  let initialPlan: Record<string, unknown> | null = null;
  let initialTaskStatuses: Record<string, string> = {};

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
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {t("ielts.hubTitle")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          Generate a structured weekly IELTS study plan based on your target band, exam date, and weakest skills.
        </p>
      </div>
      <div className="mt-8">
        <IELTSStudyPlanClient
          initialPlan={initialPlan}
          initialTaskStatuses={initialTaskStatuses}
        />
      </div>
    </div>
  );
}
