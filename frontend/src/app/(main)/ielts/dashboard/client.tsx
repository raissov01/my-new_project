"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, CalendarDays, ChartColumn, PenLine, RefreshCw, Sparkles, Target, Mic } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { getIELTSDashboard, getIELTSWeakness, getRoadmapProgress } from "../simulator/attempt-actions";

type DashboardData = {
  recentAttempts: Array<{
    id: string;
    attemptType: string;
    section: string;
    status: string;
    bandTarget: string;
    createdAt: string;
    violationCount: number;
  }>;
  totalAttempts: number;
  completedAttempts: number;
  averageBands: Record<string, number>;
  writingCount: number;
  speakingCount: number;
  writingAvgBand: number;
  speakingAvgBand: number;
  activePlan: Record<string, unknown> | null;
  recentWriting: Array<{ id: string; taskType: string; overallBand: number; createdAt: string }>;
  recentSpeaking: Array<{ id: string; part: string; overallBand: number; createdAt: string }>;
};

type WeaknessData = {
  writingWeakest: string;
  writingWeakestBand: number;
  writingCriteria: Record<string, number>;
  speakingWeakest: string;
  speakingWeakestBand: number;
  speakingCriteria: Record<string, number>;
  overallWeakSkill: string;
  recommendations: string[];
  attemptCount: number;
};

type RoadmapProgress = {
  planId: string;
  targetBand: string;
  currentBand: string;
  examDate: string | null;
  daysLeft: number;
  currentWeek: number;
  totalPlannedTasks: number;
  completedTasks: number;
  skippedTasks: number;
  completionPercent: number;
  readiness: string;
  weakSections: string[];
  prioritySkills: string[];
};

export function IELTSDashboardClient() {
  const { t } = useLocale();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [weakness, setWeakness] = useState<WeaknessData | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, weak, progress] = await Promise.all([getIELTSDashboard(), getIELTSWeakness(), getRoadmapProgress()]);
      setDashboard(dash as DashboardData);
      setWeakness(weak as WeaknessData);
      if (progress && typeof progress === "object" && "progress" in progress) {
        setRoadmap((progress as { progress: RoadmapProgress | null }).progress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bandItems = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: t("ielts.dashboard.writing"), value: dashboard.writingAvgBand },
      { label: t("ielts.dashboard.speaking"), value: dashboard.speakingAvgBand },
    ];
  }, [dashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <div className="h-3.5 w-24 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-[var(--border)]" />
            </div>
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]" />
          <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]" />
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]" />
          <div className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]" />
        </section>
        <div className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{t("error.pageTitle")}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("error.pageBody")}</p>
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <RefreshCw className="h-4 w-4" />
            {t("error.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard || !weakness) {
    return null;
  }

  const criteriaLabels: Record<string, string> = {
    coherence: t("ielts.criterion.coherence"),
    grammar: t("ielts.criterion.grammar"),
    lexicalResource: t("ielts.criterion.lexicalResource"),
    taskAchievement: t("ielts.criterion.taskAchievement"),
    fluencyCoherence: t("ielts.criterion.fluencyCoherence"),
    pronunciation: t("ielts.criterion.pronunciation"),
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard icon={Target} label={t("ielts.dashboard.totalAttempts")} value={dashboard.totalAttempts} />
        <StatCard icon={ChartColumn} label={t("ielts.dashboard.completed")} value={dashboard.completedAttempts} />
        <StatCard icon={PenLine} label={t("ielts.dashboard.writingSubmissions")} value={dashboard.writingCount} />
        <StatCard icon={Mic} label={t("ielts.dashboard.speakingSessions")} value={dashboard.speakingCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
            <BookOpen className="h-4 w-4" />
            {t("ielts.dashboard.recentAttempts")}
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.recentAttempts.map((attempt) => (
              <div key={attempt.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{attempt.attemptType.replaceAll("_", " ")}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{attempt.section} · {t("ielts.dashboard.bandTarget")} {attempt.bandTarget}</p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                    {attempt.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  {t("ielts.dashboard.violations")}: {attempt.violationCount} · {new Date(attempt.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Roadmap progress widget */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <Sparkles className="h-4 w-4" />
                {t("ielts.dashboard.yourRoadmap")}
              </div>
              {roadmap && (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  roadmap.readiness === "exam ready" ? "bg-emerald-500/10 text-emerald-400" :
                  roadmap.readiness === "strong progress" ? "bg-blue-500/10 text-blue-400" :
                  roadmap.readiness === "on track" ? "bg-amber-500/10 text-amber-400" :
                  "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                }`}>
                  {roadmap.readiness}
                </span>
              )}
            </div>

            {roadmap ? (
              <div className="mt-4 space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{t("ielts.dashboard.completion")}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{roadmap.completionPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-[var(--bg-soft)]">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-cyan-400 transition-all"
                      style={{ width: `${Math.min(100, roadmap.completionPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{roadmap.completedTasks}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{t("ielts.dashboard.done")}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">W{roadmap.currentWeek}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{t("ielts.dashboard.week")}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{roadmap.daysLeft >= 0 ? roadmap.daysLeft : "—"}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{t("ielts.dashboard.daysLeft")}</p>
                  </div>
                </div>

                {/* Band target */}
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm">
                  <span className="text-[var(--text-secondary)]">Band {roadmap.currentBand} → {roadmap.targetBand}</span>
                  <Target className="h-4 w-4 text-[var(--text-muted)]" />
                </div>

                <div className="flex gap-2">
                  <Link href="/ielts/study-plan" className="flex-1"><Button size="sm" className="w-full">{t("ielts.dashboard.openRoadmap")}</Button></Link>
                  <Link href="/ielts/simulator"><Button size="sm" variant="secondary">{t("ielts.dashboard.startMock")}</Button></Link>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-[var(--text-secondary)]">{t("ielts.dashboard.noActivePlan")}</p>
                <div className="mt-4 flex gap-2">
                  <Link href="/ielts/study-plan"><Button size="sm">{t("ielts.dashboard.createRoadmap")}</Button></Link>
                  <Link href="/ielts/simulator"><Button size="sm" variant="secondary">{t("ielts.dashboard.startMock")}</Button></Link>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="text-sm font-medium text-[var(--text-secondary)]">{t("ielts.dashboard.bandTrend")}</div>
            <div className="mt-4 space-y-4">
              {bandItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{item.label}</span>
                    <span className="font-medium text-[var(--text-primary)]">Band {item.value.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--bg-soft)]">
                    <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${Math.min(100, item.value * 11.111)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"><PenLine className="h-4 w-4" /> {t("ielts.dashboard.recentWriting")}</div>
          <div className="mt-4 space-y-3">
            {dashboard.recentWriting.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-primary)]">{item.taskType}</span>
                  <span className="font-medium text-emerald-400">Band {item.overallBand.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"><Mic className="h-4 w-4" /> {t("ielts.dashboard.recentSpeaking")}</div>
          <div className="mt-4 space-y-3">
            {dashboard.recentSpeaking.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-primary)]">{item.part}</span>
                  <span className="font-medium text-violet-400">Band {item.overallBand.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <CalendarDays className="h-4 w-4" /> {t("ielts.dashboard.weaknessAnalysis")}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <WeaknessCard title={t("ielts.dashboard.writing")} weakest={weakness.writingWeakest} band={weakness.writingWeakestBand} criteria={weakness.writingCriteria} criteriaLabels={criteriaLabels} weakestLabel={t("ielts.dashboard.weakest")} />
          <WeaknessCard title={t("ielts.dashboard.speaking")} weakest={weakness.speakingWeakest} band={weakness.speakingWeakestBand} criteria={weakness.speakingCriteria} criteriaLabels={criteriaLabels} weakestLabel={t("ielts.dashboard.weakest")} />
        </div>
        <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          {weakness.recommendations.map((item) => <p key={item}>• {item}</p>)}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">{label}</div>
        <Icon className="h-4 w-4 text-[var(--primary)]" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function WeaknessCard({ title, weakest, band, criteria, criteriaLabels, weakestLabel }: { title: string; weakest: string; band: number; criteria: Record<string, number>; criteriaLabels: Record<string, string>; weakestLabel: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{weakestLabel}: {weakest || "n/a"} · Band {band.toFixed(1)}</p>
      <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
        {Object.entries(criteria).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span>{criteriaLabels[key] ?? key}</span>
            <span className="font-medium text-[var(--text-primary)]">{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
