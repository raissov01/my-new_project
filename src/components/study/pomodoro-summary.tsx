"use client";

import { useState } from "react";
import {
  Clock,
  BookOpen,
  CheckCircle2,
  Target,
  Trophy,
  Loader2,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { savePomodoroSession } from "@/app/(main)/sets/pomodoro-actions";
import type { PomodoroPreset } from "@/lib/pomodoro";
import type { StudyMode } from "@/hooks/use-study-session";

interface PomodoroSummaryProps {
  preset: PomodoroPreset;
  workMinutes: number;
  breakMinutes: number;
  elapsedWorkSeconds: number;
  cardsReviewed: number;
  correctAnswers: number;
  studyMode: StudyMode;
  setId: string | null;
  onClose: () => void;
}

export function PomodoroSummary({
  preset,
  workMinutes,
  breakMinutes,
  elapsedWorkSeconds,
  cardsReviewed,
  correctAnswers,
  studyMode,
  setId,
  onClose,
}: PomodoroSummaryProps) {
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accuracy =
    cardsReviewed > 0
      ? Math.round((correctAnswers / cardsReviewed) * 100)
      : 0;
  const actualMinutes = Math.ceil(elapsedWorkSeconds / 60);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await savePomodoroSession({
      setId,
      studyMode,
      preset,
      workMinutes,
      breakMinutes,
      cardsReviewed,
      correctAnswers,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  }

  return (
    <div className="animate-fade-in-up glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Trophy className="h-5 w-5 text-amber-500" />
        {t("pomodoro.summaryTitle")}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Clock}
          label={t("pomodoro.studyTime")}
          value={`${actualMinutes} ${t("pomodoro.min")}`}
          gradient="from-indigo-500 to-purple-500"
        />
        <SummaryCard
          icon={BookOpen}
          label={t("pomodoro.cardsReviewed")}
          value={String(cardsReviewed)}
          gradient="from-blue-500 to-cyan-500"
        />
        <SummaryCard
          icon={CheckCircle2}
          label={t("pomodoro.correctAnswers")}
          value={String(correctAnswers)}
          gradient="from-green-500 to-emerald-500"
        />
        <SummaryCard
          icon={Target}
          label={t("pomodoro.accuracy")}
          value={`${accuracy}%`}
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        {!saved ? (
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {t("pomodoro.saving")}
              </>
            ) : (
              t("pomodoro.saveSession")
            )}
          </Button>
        ) : (
          <span className="text-sm font-medium text-green-600">
            {t("pomodoro.sessionSaved")}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("pomodoro.dismiss")}
        </Button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2">
        <div
          className={`rounded-lg bg-gradient-to-br ${gradient} p-1.5 shadow-sm`}
        >
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
