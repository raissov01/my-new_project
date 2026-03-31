import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/supabase/server";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { getTeacherDashboardSummary } from "@/lib/classrooms";
import { Button } from "@/components/ui/button";
import { CreateClassForm } from "./create-class-form";

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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("teacher.classesEyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            {t("teacher.classesTitle")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {t("teacher.classesSubtitle")}
          </p>

          <CreateClassForm />
        </section>

        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {t("teacher.yourClasses")}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {t("teacher.yourClassesBody")}
              </p>
            </div>
            <Link href="/teacher/dashboard">
              <Button variant="outline">{t("teacher.backToTeacherDashboard")}</Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {summary.groups.length > 0 ? (
              summary.groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {group.name}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {t("teacher.classCodeLabel", { code: group.joinCode })}
                      </p>
                    </div>
                    <Link href={`/teacher/classes/${group.id}`}>
                      <Button variant="outline">{t("teacher.openClass")}</Button>
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("teacher.studentsCount", { count: group.membersCount })}
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("teacher.assignmentsCount", { count: group.assignmentsCount })}
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("teacher.challengesCount", { count: group.challengesCount })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10">
                <Sparkles className="h-5 w-5 text-[var(--text-muted)]" />
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {t("teacher.noClassesTitle")}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("teacher.noClassesBody")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
