import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  Layers3,
  ListChecks,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import {
  getRecentTeacherQuizActivity,
  getTeacherDashboardSummary,
} from "@/server/services/classrooms";

export default async function TeacherDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, recentQuizActivity] = await Promise.all([
    getTeacherDashboardSummary(access.user?.id),
    getRecentTeacherQuizActivity(),
  ]);

  if (!summary) {
    redirect("/login");
  }

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("teacher.dashboardTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("teacher.dashboardEyebrow")}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link href="/teacher/classes">
              <Button className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
                <GraduationCap className="h-4 w-4" />
                {t("teacher.manageClasses")}
              </Button>
            </Link>
            <Link href="/teacher/challenges">
              <Button className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
                <Trophy className="h-4 w-4" />
                {t("teacher.manageChallenges")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="nd-kpi-grid" style={{ marginBottom: 24 }}>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("teacher.totalClasses")}</span>
          <strong className="nd-kpi-val">{summary.groups.length}</strong>
          <span className="nd-kpi-sub">
            <Layers3 style={{ display: "inline", width: 13, height: 13, marginRight: 4 }} />
            classes
          </span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("teacher.totalStudents")}</span>
          <strong className="nd-kpi-val">{summary.totalStudents}</strong>
          <span className="nd-kpi-sub">
            <Users style={{ display: "inline", width: 13, height: 13, marginRight: 4 }} />
            {t("teacher.studentsDetail")}
          </span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("teacher.totalAssignments")}</span>
          <strong className="nd-kpi-val">{summary.totalAssignments}</strong>
          <span className="nd-kpi-sub">
            <BookOpen style={{ display: "inline", width: 13, height: 13, marginRight: 4 }} />
            assignments
          </span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("teacher.totalChallenges")}</span>
          <strong className="nd-kpi-val">{summary.totalChallenges}</strong>
          <span className="nd-kpi-sub">
            <Trophy style={{ display: "inline", width: 13, height: 13, marginRight: 4 }} />
            {t("teacher.challengesDetail")}
          </span>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr" }}>
        {/* Classes */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
            <div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t("teacher.classroomSystem")}
              </span>
              <h2 style={{ margin: "6px 0 6px", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
                {t("teacher.classesOverview")}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>
                {t("teacher.classesOverviewBody")}
              </p>
            </div>
            <Link href="/teacher/classes">
              <Button variant="outline" size="sm">{t("teacher.openClasses")}</Button>
            </Link>
          </div>

          {summary.groups.length > 0 ? (
            summary.groups.map((group) => (
              <div
                key={group.id}
                style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px", marginBottom: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                      {group.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>
                      {t("teacher.classCodeLabel", { code: group.joinCode })}
                    </p>
                  </div>
                  <Link href={`/teacher/classes/${group.id}`}>
                    <Button variant="secondary" size="sm">{t("teacher.openClass")}</Button>
                  </Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
                  <SmallStat label={t("teacher.students")} value={group.membersCount} />
                  <SmallStat label={t("teacher.assignments")} value={group.assignmentsCount} />
                  <SmallStat label={t("teacher.challenges")} value={group.challengesCount} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState title={t("teacher.noClassesTitle")} body={t("teacher.noClassesBody")} />
          )}
        </div>

        {/* Top Students */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {t("teacher.studentSignal")}
          </span>
          <h2 style={{ margin: "6px 0 6px", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
            {t("teacher.topStudents")}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>
            {t("teacher.topStudentsBody")}
          </p>

          {summary.topStudents.length > 0 ? (
            summary.topStudents.map((student, index) => (
              <div
                key={student.userId}
                style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}
              >
                <div className="band-indicator" style={{ height: 32, width: 32, fontSize: 14, flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {student.username}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-mute)" }}>
                    {student.accuracy}% • {t("teacher.secondsLabel", { value: student.completionTime })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title={t("teacher.noRankingTitle")} body={t("teacher.noRankingBody")} />
          )}
        </div>

        {/* Recent quiz activity */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t("classroom.teacherRecentQuizzesEyebrow")}
              </span>
              <h2 style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
                {t("classroom.teacherRecentQuizzes")}
              </h2>
            </div>
            <Link href="/quizzes">
              <Button variant="outline" size="sm">
                <ListChecks className="h-4 w-4" />
                {t("quiz.navLabel")}
              </Button>
            </Link>
          </div>

          {recentQuizActivity.length > 0 ? (
            recentQuizActivity.slice(0, 6).map((activity) => (
              <div
                key={activity.attemptId}
                style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    height: 36,
                    width: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    fontSize: 12,
                    fontWeight: 700,
                    background: activity.percentage >= 80
                      ? "rgba(34,197,94,0.15)"
                      : activity.percentage >= 50
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(239,68,68,0.15)",
                    color: activity.percentage >= 80
                      ? "var(--green)"
                      : activity.percentage >= 50
                        ? "var(--terra)"
                        : "#f87171",
                  }}
                >
                  {activity.percentage}%
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activity.studentName}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activity.quizTitle} · {new Date(activity.completedAt).toLocaleDateString(locale)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title={t("classroom.teacherRecentQuizzesEmptyTitle")}
              body={t("classroom.teacherRecentQuizzesEmptyBody")}
            />
          )}
        </div>

        {/* Teacher control panel */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {t("teacher.teacherControl")}
          </span>
          <h3 style={{ margin: "6px 0 6px", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
            {t("teacher.teacherControlTitle")}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>
            {t("teacher.teacherControlBody")}
          </p>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-mute)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
      <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}
