import { ChallengeDirectory } from "@/features/sets/components/challenge-directory";

export default async function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          Challenge rankings
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          Challenge hub
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          Browse public and private challenge boards tied to real flashcard sets.
        </p>
      </div>

      <div className="mt-8">
        <ChallengeDirectory variant="full" />
      </div>
    </div>
  );
}
