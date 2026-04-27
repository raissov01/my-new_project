import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getStreakCalendar } from "@/features/gamification/api";
import { getProgress } from "@/features/learn/api";
import { StreakCalendar } from "@/components/gamification/StreakCalendar";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return { title: `${t("streak.title")} — StudyWithRaissov` };
}

export default async function StreakPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [calendar, progress] = await Promise.all([
    getStreakCalendar(30),
    getProgress(),
  ]);

  const streak = progress?.currentStreak ?? 0;
  const longest = progress?.longestStreak ?? 0;

  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const calWithPad = dayOfWeek > 0
    ? [...Array(dayOfWeek).fill({ date: "", status: "future" as const, xp: 0 }), ...calendar].slice(0, 35)
    : calendar;

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("streak.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {streak} · {longest}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <StreakBadge streak={streak} />
          </div>
          <p style={{ color: "var(--ink)", fontWeight: 700, fontSize: 22, margin: 0 }}>
            {streak} {t("streak.dayStreak")}
          </p>
        </div>

        <div className="nd-kpi-grid">
          <div className="nd-kpi">
            <span className="nd-kpi-lbl">{t("streak.currentStreak")}</span>
            <strong className="nd-kpi-val" style={{ color: "var(--terra)" }}>{streak}</strong>
            <span className="nd-kpi-sub">{t("streak.days")}</span>
          </div>
          <div className="nd-kpi">
            <span className="nd-kpi-lbl">{t("streak.bestStreak")}</span>
            <strong className="nd-kpi-val">{longest}</strong>
            <span className="nd-kpi-sub">{t("streak.days")}</span>
          </div>
        </div>

        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px" }}>
          <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 16, marginTop: 0 }}>{t("streak.last30")}</p>
          <StreakCalendar
            calendar={calWithPad}
            freezesAvailable={2}
          />
        </div>

        {streak === 0 && (
          <div style={{ textAlign: "center" }}>
            <a
              href="/learn/map"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: 12,
                background: "var(--terra)",
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t("streak.startLesson")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
