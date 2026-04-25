import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Play } from "lucide-react";
import {
  getStudentDashboardSummary,
  getStudentQuizAssignments,
} from "@/server/services/classrooms";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { JoinClassForm } from "@/features/student/components/join-class-form";

export default async function StudentClassesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, quizAssignments] = await Promise.all([
    getStudentDashboardSummary(access.user?.id),
    getStudentQuizAssignments(),
  ]);

  if (!summary) {
    redirect("/login");
  }

  const assignmentCountByGroup = new Map<string, number>();
  for (const assignment of summary.assignments) {
    assignmentCountByGroup.set(
      assignment.groupId,
      (assignmentCountByGroup.get(assignment.groupId) ?? 0) + 1
    );
  }

  const challengeCountByGroup = new Map<string, number>();
  for (const challenge of summary.challenges) {
    challengeCountByGroup.set(
      challenge.groupId,
      (challengeCountByGroup.get(challenge.groupId) ?? 0) + 1
    );
  }

  const quizCountByGroup = new Map<string, number>();
  for (const q of quizAssignments) {
    quizCountByGroup.set(q.groupId, (quizCountByGroup.get(q.groupId) ?? 0) + 1);
  }

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case "completed":
        return {
          background: "rgba(34,197,94,0.13)",
          color: "var(--green)",
          border: "1px solid rgba(34,197,94,0.3)",
        };
      case "late":
        return {
          background: "rgba(234,179,8,0.13)",
          color: "#ca8a04",
          border: "1px solid rgba(234,179,8,0.3)",
        };
      case "overdue":
        return {
          background: "rgba(239,68,68,0.13)",
          color: "var(--terra)",
          border: "1px solid rgba(239,68,68,0.3)",
        };
      default:
        return {
          background: "var(--paper-2)",
          color: "var(--ink-mute)",
          border: "1px solid var(--line)",
        };
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("classroom.statusCompleted");
      case "late":
        return t("classroom.statusLate");
      case "overdue":
        return t("classroom.statusOverdue");
      default:
        return t("classroom.statusNotStarted");
    }
  };

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3 style={{ margin: 0 }}>{t("student.classesTitle")}</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--ink-mute)",
            }}
          >
            {summary.classes.length} {t("student.myClasses")}
          </span>
          <Link href="/student/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            {t("student.backToStudentDashboard")}
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        className="xl:grid-cols-2"
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "1fr",
          alignItems: "start",
        }}
      >
        {/* Left: Join Class */}
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: "20px 24px",
            marginBottom: 0,
          }}
        >
          <h3 style={{ margin: "0 0 4px", color: "var(--ink)", fontSize: 18, fontWeight: 600 }}>
            {t("student.classesTitle")}
          </h3>
          <p style={{ margin: "0 0 20px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
            {t("student.classesSubtitle")}
          </p>
          <JoinClassForm />
        </div>

        {/* Right: My Classes list */}
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: "20px 24px",
            marginBottom: 0,
          }}
        >
          <h3 style={{ margin: "0 0 4px", color: "var(--ink)", fontSize: 18, fontWeight: 600 }}>
            {t("student.myClasses")}
          </h3>
          <p style={{ margin: "0 0 16px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
            {t("student.myClassesBody")}
          </p>

          {summary.classes.length > 0 ? (
            summary.classes.map((group) => (
              <div
                key={group.id}
                style={{
                  background: "var(--paper-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "14px 18px",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>{group.name}</div>
                    <div style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 3 }}>
                      {t("student.joinedAtLabel", {
                        value: new Date(group.joinedAt).toLocaleDateString(locale),
                      })}
                    </div>
                  </div>
                  <Link href="/student/challenges">
                    <Button variant="outline" size="sm">{t("student.viewClassChallenges")}</Button>
                  </Link>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <span
                    style={{
                      background: "var(--paper-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 13,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {t("student.assignmentsCount", {
                      count: assignmentCountByGroup.get(group.id) ?? 0,
                    })}
                  </span>
                  <span
                    style={{
                      background: "var(--paper-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 13,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {t("student.challengesCount", {
                      count: challengeCountByGroup.get(group.id) ?? 0,
                    })}
                  </span>
                  <span
                    style={{
                      background: "var(--paper-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 13,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {t("classroom.quizCountLabel", {
                      count: quizCountByGroup.get(group.id) ?? 0,
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                border: "1px dashed var(--line)",
                borderRadius: 14,
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, margin: "0 0 6px" }}>
                {t("student.noClassesTitle")}
              </p>
              <p style={{ color: "var(--ink-mute)", fontSize: 13, margin: 0 }}>
                {t("student.noClassesBody")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Assignments section */}
      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          padding: "20px 24px",
          marginBottom: 0,
          marginTop: 20,
        }}
      >
        <h3 style={{ margin: "0 0 4px", color: "var(--ink)", fontSize: 18, fontWeight: 600 }}>
          {t("classroom.assignedQuizzes")}
        </h3>
        <p style={{ margin: "0 0 16px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
          {t("classroom.assignedQuizzesBody")}
        </p>

        {quizAssignments.length > 0 ? (
          quizAssignments.map((assignment) => (
            <article
              key={assignment.id}
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: "14px 18px",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {assignment.quizTitle}
                  </div>
                  <div style={{ color: "var(--ink-mute)", fontSize: 12, marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>
                    {assignment.groupName} &middot;{" "}
                    {t("classroom.questionCount", { count: assignment.questionCount })}
                  </div>
                </div>
                <span
                  style={{
                    ...statusBadgeStyle(assignment.status),
                    borderRadius: 99,
                    padding: "3px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono',monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel(assignment.status)}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: "var(--ink-mute)" }}>
                {assignment.deadline ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Clock style={{ width: 13, height: 13 }} />
                    {t("classroom.deadlineValue", {
                      value: new Date(assignment.deadline).toLocaleString(locale),
                    })}
                  </span>
                ) : null}
                {assignment.bestPercentage !== null ? (
                  <span style={{ fontWeight: 600, color: "var(--green)" }}>
                    {t("classroom.bestScore", { value: assignment.bestPercentage })}
                  </span>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <Link href={`/quizzes/${assignment.quizId}/play`}>
                  <Button size="sm">
                    <Play style={{ width: 14, height: 14 }} />
                    {assignment.bestPercentage !== null
                      ? t("classroom.retakeQuiz")
                      : t("classroom.startQuiz")}
                  </Button>
                </Link>
                <Link href={`/quizzes/${assignment.quizId}`}>
                  <Button variant="outline" size="sm">
                    {t("classroom.quizDetails")}
                  </Button>
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div
            style={{
              border: "1px dashed var(--line)",
              borderRadius: 14,
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, margin: "0 0 6px" }}>
              {t("classroom.noQuizAssignmentsStudentTitle")}
            </p>
            <p style={{ color: "var(--ink-mute)", fontSize: 13, margin: 0 }}>
              {t("classroom.noQuizAssignmentsStudentBody")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
