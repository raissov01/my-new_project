import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getTeacherDashboardSummary } from "@/server/services/classrooms";
import { Button } from "@/components/ui/button";
import { CreateClassForm } from "@/features/classes/components/create-class-form";

export default async function TeacherClassesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const summary = await getTeacherDashboardSummary(access.user?.id);

  if (!summary) {
    redirect("/login");
  }

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3 style={{ margin: 0 }}>{t("teacher.classesTitle")}</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--ink-mute)",
            }}
          >
            {summary.groups.length} {t("teacher.yourClasses")}
          </span>
          <Link href="/teacher/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            {t("teacher.backToTeacherDashboard")}
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
        {/* Left: Create Class Form */}
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
            {t("teacher.classesTitle")}
          </h3>
          <p style={{ margin: "0 0 20px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
            {t("teacher.classesSubtitle")}
          </p>
          <CreateClassForm />
        </div>

        {/* Right: Classes list */}
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
            {t("teacher.yourClasses")}
          </h3>
          <p style={{ margin: "0 0 16px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
            {t("teacher.yourClassesBody")}
          </p>

          {summary.groups.length > 0 ? (
            summary.groups.map((group) => (
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
                    <div style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>
                      {t("teacher.classCodeLabel", { code: group.joinCode })}
                    </div>
                  </div>
                  <Link href={`/teacher/classes/${group.id}`}>
                    <Button variant="outline" size="sm">{t("teacher.openClass")}</Button>
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
                    {t("teacher.studentsCount", { count: group.membersCount })}
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
                    {t("teacher.assignmentsCount", { count: group.assignmentsCount })}
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
                    {t("teacher.challengesCount", { count: group.challengesCount })}
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
                {t("teacher.noClassesTitle")}
              </p>
              <p style={{ color: "var(--ink-mute)", fontSize: 13, margin: 0 }}>
                {t("teacher.noClassesBody")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
