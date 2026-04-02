import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Users } from "lucide-react";
import { getCurrentProfile, getCurrentUser } from "@/server/auth";
import { getClassChallengeById, getClassChallengeParticipant } from "@/server/services/class-challenges";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { JoinChallengeButton } from "./join-button";
import { ClassChallengeClient } from "./client";

interface ClassChallengePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ play?: string }>;
}

export default async function ClassChallengePage({
  params,
  searchParams,
}: ClassChallengePageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const profile = await getCurrentProfile(user);

  const { id } = await params;
  const { play } = await searchParams;
  const challenge = await getClassChallengeById(id);

  if (!challenge) {
    notFound();
  }

  const participant = await getClassChallengeParticipant(id, user.id);
  const joined = Boolean(participant);
  const participantCount = challenge.participantCount;
  const flashcards = joined && play === "1" ? challenge.cards : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={profile?.role === "teacher" ? "/teacher/challenges" : "/student/challenges"}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("challenge.backToChallenges")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t("challenge.privateCompetition")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          {challenge.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface)] px-3 py-1.5">
            <Users className="h-4 w-4" />
            {t("challenge.participantsJoined", { count: participantCount })}
          </span>
          {challenge.deadline && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface)] px-3 py-1.5">
              <CalendarClock className="h-4 w-4" />
              {t("challenge.deadlineValue", {
                value: new Date(challenge.deadline).toLocaleString(),
              })}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!joined && profile?.role === "student" ? (
            <JoinChallengeButton challengeId={id} />
          ) : (
            profile?.role === "student" && (
              <Link
                href={`/classes/challenges/${id}?play=1`}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {t("challenge.startChallenge")}
              </Link>
            )
          )}
          <Link
            href={`/classes/challenges/${id}/ranking`}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
          >
            {t("challenge.privateRanking")}
          </Link>
        </div>
      </div>

      {joined && play === "1" && flashcards.length > 0 && (
        <div className="mt-8">
          <ClassChallengeClient challengeId={id} flashcards={flashcards} />
        </div>
      )}
    </div>
  );
}
