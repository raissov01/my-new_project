import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Sparkles } from "lucide-react";
import { createClassChallenge } from "@/app/(main)/classes/challenges/actions";
import {
  getAvailableSetsForClassChallenges,
  getMyClassChallenges,
  getOwnedGroups,
} from "@/server/services/class-challenges";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function TeacherChallengesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [groups, sets, challenges] = await Promise.all([
    getOwnedGroups(access.user?.id),
    getAvailableSetsForClassChallenges(access.user?.id),
    getMyClassChallenges(access.user?.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("teacher.challengesEyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            {t("teacher.challengesTitle")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {t("teacher.challengesSubtitle")}
          </p>

          <form
            action={async (formData) => {
              "use server";
              await createClassChallenge(formData);
            }}
            className="mt-6 space-y-4"
          >
            <Input
              name="title"
              required
              placeholder={t("teacher.challengeTitlePlaceholder")}
            />
            <select
              name="group_id"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] outline-none focus:border-[rgba(99,91,255,0.48)] focus:ring-4 focus:ring-[rgba(99,91,255,0.12)]"
            >
              <option value="">{t("teacher.selectClass")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              name="set_id"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] outline-none focus:border-[rgba(99,91,255,0.48)] focus:ring-4 focus:ring-[rgba(99,91,255,0.12)]"
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
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] outline-none focus:border-[rgba(99,91,255,0.48)] focus:ring-4 focus:ring-[rgba(99,91,255,0.12)]"
            />
            <Button type="submit">{t("teacher.createChallenge")}</Button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-400" />
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {t("teacher.activeChallenges")}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {t("teacher.activeChallengesBody")}
              </p>
            </div>
            <Link href="/teacher/classes">
              <Button variant="outline">{t("teacher.openClasses")}</Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {challenges.filter((challenge) => challenge.isOwner).length > 0 ? (
              challenges
                .filter((challenge) => challenge.isOwner)
                .map((challenge) => (
                  <div
                    key={challenge.id}
                    className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                          {challenge.title}
                        </h3>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {challenge.groupName} · {challenge.setTitle}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {challenge.deadline
                            ? t("teacher.deadlineLabel", {
                                value: new Date(challenge.deadline).toLocaleString(),
                              })
                            : t("teacher.noDeadline")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/classes/challenges/${challenge.id}`}>
                          <Button variant="outline">{t("teacher.openChallenge")}</Button>
                        </Link>
                        <Link href={`/classes/challenges/${challenge.id}/ranking`}>
                          <Button>{t("teacher.viewRanking")}</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10">
                <Sparkles className="h-5 w-5 text-[var(--text-muted)]" />
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {t("teacher.noChallengesTitle")}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("teacher.noChallengesBody")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
