import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getMyClassChallenges } from "@/server/services/class-challenges";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";
import { Button } from "@/components/ui/button";

export default async function StudentChallengesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const challenges = (await getMyClassChallenges(access.user?.id)).filter(
    (challenge) => !challenge.isOwner
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {t("student.challengesEyebrow")}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl">
          {t("student.challengesTitle")}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("student.challengesSubtitle")}
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {challenges.length > 0 ? (
          challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {challenge.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {challenge.groupName} · {challenge.setTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {challenge.deadline
                      ? t("student.deadlineLabel", {
                          value: new Date(challenge.deadline).toLocaleString(),
                        })
                      : t("student.noDeadline")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/classes/challenges/${challenge.id}`}>
                    <Button>{challenge.joined ? t("student.openChallenge") : t("student.joinChallenge")}</Button>
                  </Link>
                  <Link href={`/classes/challenges/${challenge.id}/ranking`}>
                    <Button variant="outline">{t("student.viewClassRanking")}</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-10 shadow-[var(--shadow-sm)]">
            <Sparkles className="h-5 w-5 text-[var(--text-muted)]" />
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {t("student.noChallengesTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t("student.noChallengesBody")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
