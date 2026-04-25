import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getStreakCalendar } from "@/features/gamification/api";
import { getProgress } from "@/features/learn/api";
import { StreakCalendar } from "@/components/gamification/StreakCalendar";
import { StreakBadge } from "@/components/gamification/StreakBadge";

export const metadata = { title: "My Streak — StudyWithRaissov" };

export default async function StreakPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [calendar, progress] = await Promise.all([
    getStreakCalendar(30),
    getProgress(),
  ]);

  const streak = progress?.currentStreak ?? 0;
  const longest = progress?.longestStreak ?? 0;

  // Align calendar so it starts on Monday
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const calWithPad = dayOfWeek > 0
    ? [...Array(dayOfWeek).fill({ date: "", status: "future" as const, xp: 0 }), ...calendar].slice(0, 35)
    : calendar;

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>My Streak</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {streak}-day current · {longest}-day best
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Badge */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <StreakBadge streak={streak} />
          </div>
          <p style={{ color: "var(--ink)", fontWeight: 700, fontSize: 22, margin: 0 }}>
            {streak}-Day Streak
          </p>
        </div>

        {/* KPI stats */}
        <div className="nd-kpi-grid">
          <div className="nd-kpi">
            <span className="nd-kpi-lbl">Current Streak</span>
            <strong className="nd-kpi-val" style={{ color: "var(--terra)" }}>{streak}</strong>
            <span className="nd-kpi-sub">days</span>
          </div>
          <div className="nd-kpi">
            <span className="nd-kpi-lbl">Best Streak</span>
            <strong className="nd-kpi-val">{longest}</strong>
            <span className="nd-kpi-sub">days</span>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px" }}>
          <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 16, marginTop: 0 }}>Last 30 days</p>
          <StreakCalendar
            calendar={calWithPad}
            freezesAvailable={2}
          />
        </div>

        {/* CTA */}
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
              Start today&apos;s lesson →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
