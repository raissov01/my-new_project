import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Sparkles } from "lucide-react";
import { joinClassByCode } from "@/app/(main)/classes/challenges/actions";
import { getStudentDashboardSummary } from "@/server/services/classrooms";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function StudentClassesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const summary = await getStudentDashboardSummary(access.user?.id);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("student.classesEyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            {t("student.classesTitle")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {t("student.classesSubtitle")}
          </p>

          <form
            action={async (formData) => {
              "use server";
              await joinClassByCode(formData);
            }}
            className="mt-6 space-y-4"
          >
            <Input
              name="join_code"
              required
              label={t("student.classCode")}
              placeholder={t("student.classCodePlaceholder")}
              className="uppercase tracking-[0.18em]"
            />
            <Button type="submit">{t("student.joinClass")}</Button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {t("student.myClasses")}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {t("student.myClassesBody")}
              </p>
            </div>
            <Link href="/student/dashboard">
              <Button variant="outline">{t("student.backToStudentDashboard")}</Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {summary.classes.length > 0 ? (
              summary.classes.map((group) => (
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
                        {t("student.joinedAtLabel", {
                          value: new Date(group.joinedAt).toLocaleDateString(locale),
                        })}
                      </p>
                    </div>
                    <Link href="/student/challenges">
                      <Button variant="outline">{t("student.viewClassChallenges")}</Button>
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("student.assignmentsCount", {
                        count: assignmentCountByGroup.get(group.id) ?? 0,
                      })}
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("student.challengesCount", {
                        count: challengeCountByGroup.get(group.id) ?? 0,
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10">
                <Sparkles className="h-5 w-5 text-[var(--text-muted)]" />
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {t("student.noClassesTitle")}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("student.noClassesBody")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
