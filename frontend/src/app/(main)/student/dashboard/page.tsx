import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import { getStudentDashboardSummary } from "@/server/services/classrooms";
import { getIELTSScoreHistory } from "@/server/services/ielts-score-history";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Басты бет | StudyWithRaissov" };

const WORDS = ["IELTS", "Speaking", "Writing", "Band 9", "Listening", "Reading"];
const WEEK_DAYS = ["ДС", "СС", "СР", "БС", "ЖМ", "СБ", "ЖС"];

const IELTS_SKILLS = [
  { label: "Listening", key: "listening" },
  { label: "Reading",   key: "reading"   },
  { label: "Writing",   key: "writing"   },
  { label: "Speaking",  key: "speaking"  },
] as const;

export default async function StudentDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");
  if (access.redirectTo) redirect(access.redirectTo);

  const [summary, stats, scoreHistory] = await Promise.all([
    getStudentDashboardSummary(access.user?.id),
    getUserStats(),
    getIELTSScoreHistory(),
  ]);
  if (!summary) redirect("/login");

  const firstName =
    access.profile?.full_name?.split(" ")[0] ??
    access.profile?.username ??
    "Студент";

  const latestScore = scoreHistory[scoreHistory.length - 1] ?? null;

  const ieltsScores = {
    listening: latestScore?.listening ?? 0,
    reading:   latestScore?.reading   ?? 0,
    writing:   latestScore?.writing   ?? 0,
    speaking:  latestScore?.speaking  ?? 0,
  };
  const overallBand = latestScore
    ? ((ieltsScores.listening + ieltsScores.reading + ieltsScores.writing + ieltsScores.speaking) / 4).toFixed(1)
    : "—";

  // Weekly chart from real recentActivity (Mon–Sun)
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const activityMap = new Map(
    (stats.recentActivity ?? []).map(({ date, count }: { date: string; count: number }) => [date.slice(0, 10), count])
  );
  const weekCounts = weekDates.map(date => activityMap.get(date) ?? 0);
  const maxCount = Math.max(...weekCounts, 1);
  const chartHeights = weekCounts.map(c => c === 0 ? 4 : Math.max(10, Math.round((c / maxCount) * 95)));
  const todayIndex = dow === 0 ? 6 : dow - 1;

  // Today's plan from assignments (up to 4)
  const todayItems = summary.assignments.slice(0, 4);

  return (
    <div className="page-shell py-6 sm:py-8">

      {/* ── HERO ── */}
      <div className="nd-dash-hero nd-reveal">
        <div className="nd-dash-hero-grid">
          <div>
            <span className="nd-eyebrow" style={{ color: "#FBA968", marginBottom: 14, display: "inline-flex" }}>
              <span style={{ background: "#FBA968", width: 20, height: 1 }}></span>
              Бүгінгі мақсат
            </span>
            <h2 style={{ marginTop: 12 }}>
              Сәлем, <span style={{ fontFamily: "'Caveat',cursive", color: "#FBA968" }}>{firstName}</span> — оқуды бастайық!
            </h2>
            <p>AI-ден кері байланыс, флэшкарталар, IELTS дайындығы — бәрі бір жерде.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/learn/map" className="nd-btn-primary" style={{ background: "#fff", color: "var(--terra-deep)" }}>
                Сабақты бастау →
              </Link>
              <Link href="/ielts" className="nd-btn-ghost">
                IELTS тесті
              </Link>
            </div>
          </div>

          {/* 3D rotating cube */}
          <div className="nd-dash-3d">
            <div className="nd-dash-3d-card">
              {WORDS.map((w, i) => (
                <div key={w} className={`nd-dash-3d-face nd-f${i + 1}`}>{w}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="nd-kpi-grid nd-reveal nd-d1">
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">Streak</span>
          <span className="nd-kpi-num">{stats.streakDays} <small style={{ fontSize: 13, fontWeight: 500 }}>күн</small></span>
          <span className="nd-kpi-trend">🔥 жалғасуда</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">Карта</span>
          <span className="nd-kpi-num">{stats.totalStudied.toLocaleString()}</span>
          <span className="nd-kpi-sub">осы аптада +{stats.totalCorrect}</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">Мақсат</span>
          <span className="nd-kpi-num">7.5</span>
          <span className="nd-kpi-sub">IELTS band score</span>
        </div>
        <div className="nd-kpi dark">
          <span className="nd-kpi-lbl">Mock тест</span>
          <span className="nd-kpi-num">{overallBand}</span>
          <span className="nd-kpi-sub">соңғы нәтиже</span>
        </div>
      </div>

      {/* ── TODAY'S PLAN ── */}
      <div className="nd-sect-h nd-reveal nd-d2">
        <h3>Бүгінгі жоспар</h3>
        <Link href="/learn/map" className="nd-sect-link">Барлығы →</Link>
      </div>

      <div className="nd-today-card nd-reveal nd-d2">
        {todayItems.length > 0 ? (
          todayItems.map((a, i) => (
            <Link
              key={a.id}
              href={`/sets/${a.setId}/study`}
              style={{ textDecoration: "none" }}
            >
              <div className="nd-today-row">
                <div
                  className="nd-today-ico"
                  style={{
                    background: i === 0
                      ? "var(--green)" : i === 1
                      ? "var(--terra)" : i === 2
                      ? "var(--blue)" : "var(--yellow)",
                    color: i === 3 ? "var(--ink)" : "#fff",
                  }}
                >
                  {i === 0 ? "FC" : i === 1 ? "AI" : i === 2 ? "RD" : "SP"}
                </div>
                <div className="nd-today-info">
                  <h4>{a.setTitle}</h4>
                  <p>{a.groupName}</p>
                </div>
                <span className={`nd-today-status ${i === 0 ? "now" : "next"}`}>
                  {i === 0 ? "Now" : "Next"}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <>
            <div className="nd-today-row">
              <div className="nd-today-ico" style={{ background: "var(--terra)" }}>FC</div>
              <div className="nd-today-info"><h4>Флэшкарталар</h4><p>20 МИНУТ · Academic Vocabulary</p></div>
              <span className="nd-today-status now">Now</span>
            </div>
            <div className="nd-today-row">
              <Link href="/ielts" style={{ display: "contents", textDecoration: "none" }}>
                <div className="nd-today-ico" style={{ background: "var(--blue)" }}>IT</div>
                <div className="nd-today-info"><h4>IELTS Reading тест</h4><p>30 МИНУТ · 3 сұрақ</p></div>
                <span className="nd-today-status next">Next</span>
              </Link>
            </div>
            <div className="nd-today-row">
              <Link href="/tutor" style={{ display: "contents", textDecoration: "none" }}>
                <div className="nd-today-ico" style={{ background: "var(--green)" }}>AI</div>
                <div className="nd-today-info"><h4>AI Tutor — Writing</h4><p>15 МИНУТ · Эссе тексеру</p></div>
                <span className="nd-today-status next">Next</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── PROGRESS SECTION ── */}
      <div className="nd-grid-2 nd-reveal nd-d3">
        {/* Weekly chart */}
        <div className="nd-card-hand">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>Апталық прогресс</h3>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "var(--terra-tint)", border: "1px solid var(--terra-soft)", fontSize: 11, fontWeight: 700, color: "var(--terra-deep)", fontFamily: "'JetBrains Mono',monospace" }}>
              {stats.xpProgress}% XP
            </span>
          </div>
          <div className="nd-mini-chart">
            {chartHeights.map((h, i) => (
              <div key={i} className={`bar ${i === todayIndex ? "hi" : ""}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--ink-mute)", letterSpacing: ".08em" }}>
            {WEEK_DAYS.map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>

        {/* IELTS skill bars */}
        <div className="nd-card-hand">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>IELTS прогрессім</h3>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "var(--green-soft)", border: "1px solid var(--green-soft)", fontSize: 11, fontWeight: 700, color: "var(--green)", fontFamily: "'JetBrains Mono',monospace" }}>
              7.5 мақсат
            </span>
          </div>
          {IELTS_SKILLS.map(({ label, key }) => {
            const score = ieltsScores[key];
            const pct = score > 0 ? Math.min(100, (score / 9) * 100) : 45;
            const display = score > 0 ? score.toFixed(1) : "—";
            return (
              <div key={key} className="nd-skill-row">
                <span className="nd-skill-lbl">{label}</span>
                <div className="nd-skill-bar">
                  <div className="nd-skill-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="nd-skill-score">{display}</span>
              </div>
            );
          })}
          {scoreHistory.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 10, fontFamily: "'JetBrains Mono',monospace" }}>
              Mock тест тапсырсаң нәтиже шығады
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
