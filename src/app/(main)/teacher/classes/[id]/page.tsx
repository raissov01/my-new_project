import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  assignClassSet,
  createClassChallenge,
  removeStudentFromClass,
} from "@/app/(main)/classes/challenges/actions";
import { getAvailableSetsForClassChallenges } from "@/lib/class-challenges";
import { getTeacherClassroomDetail } from "@/lib/classrooms";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { requireRole } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

interface TeacherClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherClassDetailPage({
  params,
}: TeacherClassDetailPageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const { id } = await params;
  const [detail, sets] = await Promise.all([
    getTeacherClassroomDetail(id, access.user?.id),
    getAvailableSetsForClassChallenges(access.user?.id),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/teacher/classes"
        className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {t("teacher.backToClasses")}
      </Link>

      <div className="mt-4 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {t("teacher.classroom")}
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">
              {detail.group.name}
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {t("teacher.classCodeLabel", { code: detail.group.joinCode })}
            </p>
          </div>
          <Link href="/teacher/challenges">
            <Button variant="outline">{t("teacher.manageChallenges")}</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {t("teacher.students")}
            </h2>
            <div className="mt-5 space-y-3">
              {detail.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--bg-surface)] p-4"
                >
                  <div>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {member.username}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {member.role === "owner"
                        ? t("teacher.ownerLabel")
                        : t("teacher.studentLabel")}
                    </p>
                  </div>

                  {member.role === "student" ? (
                    <form
                      action={async (formData) => {
                        "use server";
                        await removeStudentFromClass(formData);
                      }}
                    >
                      <input type="hidden" name="group_id" value={detail.group.id} />
                      <input type="hidden" name="user_id" value={member.userId} />
                      <Button type="submit" variant="outline">
                        {t("teacher.removeStudent")}
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                {t("teacher.classProgress")}
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {detail.progress.length > 0 ? (
                detail.progress.map((row) => (
                  <div
                    key={row.userId}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {row.username}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {t("teacher.assignedSetsStarted", { count: row.assignedSetsStarted })}
                        </p>
                      </div>
                      <div className="grid gap-2 text-right text-sm text-[var(--text-secondary)]">
                        <p>{t("teacher.progressAccuracy", { value: row.accuracy })}</p>
                        <p>{t("teacher.cardsStudiedCount", { count: row.studiedCards })}</p>
                        <p>{t("teacher.mistakesCount", { count: row.mistakes })}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-8">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("teacher.noProgressYet")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {t("teacher.assignSet")}
            </h2>
            <form
              action={async (formData) => {
                "use server";
                await assignClassSet(formData);
              }}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="group_id" value={detail.group.id} />
              <select
                name="set_id"
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">{t("teacher.selectSet")}</option>
                {sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title}
                  </option>
                ))}
              </select>
              <input
                name="deadline"
                type="datetime-local"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <Button type="submit">{t("teacher.assignSet")}</Button>
            </form>

            <div className="mt-6 space-y-3">
              {detail.assignments.length > 0 ? (
                detail.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-2xl bg-[var(--bg-surface)] p-4">
                    <p className="font-medium text-[var(--text-primary)]">{assignment.setTitle}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {assignment.deadline
                        ? t("teacher.deadlineLabel", {
                            value: new Date(assignment.deadline).toLocaleString(),
                          })
                        : t("teacher.noDeadline")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{t("teacher.noAssignments")}</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {t("teacher.createChallenge")}
            </h2>
            <form
              action={async (formData) => {
                "use server";
                await createClassChallenge(formData);
              }}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="group_id" value={detail.group.id} />
              <input
                name="title"
                required
                placeholder={t("teacher.challengeTitlePlaceholder")}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <select
                name="set_id"
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">{t("teacher.selectSet")}</option>
                {sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title}
                  </option>
                ))}
              </select>
              <input
                name="deadline"
                type="datetime-local"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <Button type="submit">{t("teacher.createChallenge")}</Button>
            </form>

            <div className="mt-6 space-y-3">
              {detail.challenges.length > 0 ? (
                detail.challenges.map((challenge) => (
                  <div key={challenge.id} className="rounded-2xl bg-[var(--bg-surface)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{challenge.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {challenge.setTitle}
                        </p>
                      </div>
                      <Link href={`/classes/challenges/${challenge.id}/ranking`}>
                        <Button variant="outline">{t("teacher.viewRanking")}</Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{t("teacher.noChallenges")}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
