import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { getPlacement } from "@/features/learn/api";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Layers,
  MessageCircle,
  RotateCcw,
} from "lucide-react";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-slate-100 text-slate-700 border-slate-200",
  A2: "bg-blue-50 text-blue-700 border-blue-200",
  B1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B2: "bg-violet-50 text-violet-700 border-violet-200",
  C1: "bg-amber-50 text-amber-700 border-amber-200",
  C2: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function PlacementResultPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const placement = await getPlacement();
  if (!placement) redirect("/learn/placement");

  const level = placement.level as CEFRLevel;

  let vocabLevel: CEFRLevel = level;
  let grammarLevel: CEFRLevel = level;
  let totalAnswered = placement.totalQuestions;

  try {
    const details = JSON.parse(placement.detailedResults ?? "{}") as Record<string, unknown>;
    if (typeof details.vocabLevel === "string") vocabLevel = details.vocabLevel as CEFRLevel;
    if (typeof details.grammarLevel === "string") grammarLevel = details.grammarLevel as CEFRLevel;
    if (typeof details.totalAnswered === "number") totalAnswered = details.totalAnswered;
  } catch {
    // detailedResults absent or malformed — fall back to overall level
  }

  const completedDate = new Date(placement.completedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/learn" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>{t("placement.back")}</Link>
          <h3 style={{ flex: 1 }}>{t("placement.result")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>{t("placement.resultTitle")}</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4">
      {/* Overall badge */}
      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 ${LEVEL_COLORS[level]}`}
        >
          <span className="text-4xl font-black">{level}</span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {t("placement.yourLevel", { level })}
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {t(`placement.level.${level}` as Parameters<typeof t>[0])}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {t("placement.completedOn", { date: completedDate, n: totalAnswered })}
        </p>
      </div>

      {/* Vocab + Grammar breakdown */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div
          className={`rounded-2xl border p-5 text-center ${LEVEL_COLORS[vocabLevel]}`}
        >
          <BookOpen className="mx-auto mb-2 h-6 w-6" />
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {t("placement.vocabulary")}
          </p>
          <p className="mt-1 text-3xl font-black">{vocabLevel}</p>
        </div>
        <div
          className={`rounded-2xl border p-5 text-center ${LEVEL_COLORS[grammarLevel]}`}
        >
          <Brain className="mx-auto mb-2 h-6 w-6" />
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {t("placement.grammar")}
          </p>
          <p className="mt-1 text-3xl font-black">{grammarLevel}</p>
        </div>
      </div>

      {/* CEFR scale */}
      <div className="mt-8 space-y-2">
        {(["A1", "A2", "B1", "B2", "C1", "C2"] as CEFRLevel[]).map((lvl) => (
          <div
            key={lvl}
            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition-all ${
              lvl === level
                ? `${LEVEL_COLORS[level]} font-bold`
                : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            <span className="font-semibold">{lvl}</span>
            <span className="text-xs">
              {lvl === level ? t("placement.yourLevelMark") : t(`placement.level.${lvl}` as Parameters<typeof t>[0])}
            </span>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="mt-10 space-y-3">
        {/* Primary: General English Simulator */}
        <Link
          href={`/learn/map?level=${level}`}
          className="flex items-center gap-3 rounded-2xl border border-[var(--primary)] bg-[var(--primary-soft)] px-5 py-4 font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-soft)]"
        >
          <GraduationCap className="h-5 w-5 text-[var(--primary)]" />
          <div>
            <p className="text-sm font-bold">{t("placement.startLearning")}</p>
            <p className="text-xs font-normal text-[var(--text-muted)]">
              {t("placement.startLearningDesc", { level })}
            </p>
          </div>
        </Link>

        <Link
          href="/sets"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
        >
          <Layers className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-bold">{t("placement.flashcardSets")}</p>
            <p className="text-xs font-normal text-[var(--text-muted)]">
              {t("placement.flashcardSetsDesc", { level })}
            </p>
          </div>
        </Link>

        <Link
          href="/chat"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
        >
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-bold">AI Tutor</p>
            <p className="text-xs font-normal text-[var(--text-muted)]">
              {t("placement.aiTutorDesc", { level })}
            </p>
          </div>
        </Link>

        <Link
          href="/learn/placement?retake=true"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border)] hover:bg-[var(--bg-muted)]"
        >
          <RotateCcw className="h-5 w-5" />
          <div>
            <p className="text-sm font-bold">{t("placement.retakeTest")}</p>
            <p className="text-xs font-normal text-[var(--text-muted)]">
              {t("placement.retakeTestDesc")}
            </p>
          </div>
        </Link>
      </div>
      </div>
    </div>
  );
}
