import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { getPlacement, getIELTSMap, getProgress } from "@/features/learn/api";
import { Lock, Star, Trophy, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "IELTS Roadmap | StudyWithRaissov",
  description: "IELTS Reading Strategies, Writing Tasks, Listening Sections and Speaking Parts.",
};

export default async function IELTSRoadmapPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [mapData, progress, placement] = await Promise.all([
    getIELTSMap(),
    getProgress(),
    getPlacement(),
  ]);

  const units = mapData.units;
  const userLevel = placement?.level ?? "A1";

  return (
    <div className="mx-auto max-w-lg px-3 py-6 sm:px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/ielts" className="hover:text-[var(--text-primary)]">IELTS</Link>
          <ChevronRight className="h-3 w-3" />
          <span>Roadmap</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">IELTS Roadmap</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Targeted IELTS skill units — Reading, Writing, Listening, Speaking.
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>Your level: <strong className="text-[var(--text-primary)]">{userLevel}</strong></span>
          <span>·</span>
          <span>{progress?.lessonsCompleted ?? 0} lessons done</span>
          <span>·</span>
          <Link href="/learn/map" className="font-semibold text-[var(--primary)] hover:underline">
            General English →
          </Link>
        </div>
      </div>

      {units.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-soft)] py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">IELTS units are being loaded…</p>
        </div>
      )}

      <div className="space-y-3">
        {units.map((unit) => {
          const starsPercent = unit.maxStars > 0 ? Math.round((unit.totalStars / unit.maxStars) * 100) : 0;
          const isComplete = unit.totalStars > 0 && unit.totalStars >= unit.maxStars;

          return (
            <div
              key={unit.id}
              className={`rounded-2xl border bg-[var(--bg-elevated)] p-4 transition-all ${
                unit.isUnlocked ? "border-[var(--border)]" : "border-[var(--border)] opacity-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                    isComplete ? "bg-yellow-400/10" : "bg-[var(--bg-soft)]"
                  }`}
                >
                  {unit.isUnlocked ? unit.iconEmoji : <Lock className="h-5 w-5 text-[var(--text-muted)]" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{unit.title}</h3>
                    <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      {unit.level}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">{unit.description}</p>

                  {unit.isUnlocked && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${starsPercent >= s * 33 ? "fill-yellow-400 text-yellow-400" : "text-[var(--text-muted)] opacity-30"}`} />
                        ))}
                      </div>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all"
                          style={{ width: `${starsPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {unit.lessons?.filter(l => l.isCompleted).length ?? 0}/{unit.lessons?.length ?? 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lessons list */}
              {unit.isUnlocked && (
                <div className="mt-3 space-y-1.5">
                  {(unit.lessons ?? []).map((lesson, li) => {
                    const isBoss = lesson.lessonType === "boss";
                    const prevCompleted = li === 0 || (unit.lessons[li - 1]?.bestStars ?? 0) > 0;

                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          lesson.isCompleted
                            ? "bg-emerald-500/15 text-emerald-500"
                            : isBoss
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                        }`}>
                          {isBoss ? <Trophy className="h-4 w-4" /> : `${li + 1}`}
                        </div>
                        <span className="flex-1 truncate text-xs font-medium text-[var(--text-primary)]">
                          {lesson.title}
                        </span>
                        {prevCompleted ? (
                          <Link
                            href={`/learn/lessons/${lesson.id}`}
                            className="shrink-0 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white active:scale-95"
                          >
                            {lesson.isCompleted ? "Retry" : "Play"}
                          </Link>
                        ) : (
                          <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link back to general English */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Looking for General English practice?
        </p>
        <Link
          href="/learn/map"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95"
        >
          Go to General English →
        </Link>
      </div>
    </div>
  );
}
