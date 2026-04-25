import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
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
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={profile?.role === "teacher" ? "/teacher/challenges" : "/student/challenges"} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>← {t("challenge.backToChallenges")}</Link>
          <h3 style={{ flex: 1 }}>{challenge.title}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>{t("challenge.privateCompetition")}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)] mb-4">
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

      <div className="flex flex-wrap gap-3 mb-6">
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

      {joined && play === "1" && flashcards.length > 0 && (
        <div className="mt-8">
          <ClassChallengeClient challengeId={id} flashcards={flashcards} />
        </div>
      )}
    </div>
  );
}
