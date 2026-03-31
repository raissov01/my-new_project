import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Users } from "lucide-react";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { getClassChallengeById, getClassChallengeParticipant } from "@/lib/class-challenges";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { Database } from "@/types/database";
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
  const supabase = await createClient();
  const { data: participantRows } = await supabase
    .from("class_challenge_participants")
    .select("id")
    .eq("challenge_id", id);
  const participantCount = ((participantRows as { id: string }[] | null) ?? []).length;

  const { data: cardsData } =
    joined && play === "1"
      ? await supabase
          .from("flashcards")
          .select("*")
          .eq("set_id", challenge.set_id)
          .order("position", { ascending: true })
      : { data: [] as const };
  const flashcards =
    (cardsData as Database["public"]["Tables"]["flashcards"]["Row"][] | null) ?? [];

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
