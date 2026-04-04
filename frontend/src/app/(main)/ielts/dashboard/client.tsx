"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, ChartColumn, Loader2, PenLine, Sparkles, Target, Mic } from "lucide-react";
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
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [weakness, setWeakness] = useState<WeaknessData | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [dash, weak, progress] = await Promise.all([getIELTSDashboard(), getIELTSWeakness(), getRoadmapProgress()]);
        if (!mounted) return;
        setDashboard(dash as DashboardData);
        setWeakness(weak as WeaknessData);
        if (progress && typeof progress === "object" && "progress" in progress) {
          setRoadmap((progress as { progress: RoadmapProgress | null }).progress);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const bandItems = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Writing", value: dashboard.writingAvgBand },
      { label: "Speaking", value: dashboard.speakingAvgBand },
    ];
  }, [dashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">{error}</div>;
  }

  if (!dashboard || !weakness) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard icon={Target} label="Total attempts" value={dashboard.totalAttempts} />
        <StatCard icon={ChartColumn} label="Completed" value={dashboard.completedAttempts} />
        <StatCard icon={PenLine} label="Writing submissions" value={dashboard.writingCount} />
        <StatCard icon={Mic} label="Speaking sessions" value={dashboard.speakingCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
            <BookOpen className="h-4 w-4" />
            Recent attempts
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.recentAttempts.map((attempt) => (
              <div key={attempt.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{attempt.attemptType.replaceAll("_", " ")}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{attempt.section} · Band target {attempt.bandTarget}</p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                    {attempt.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Violations: {attempt.violationCount} · {new Date(attempt.createdAt).toLocaleString()}
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
                Your Roadmap
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
                    <span>Completion</span>
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
                    <p className="text-[10px] text-[var(--text-muted)]">Done</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">W{roadmap.currentWeek}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Week</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{roadmap.daysLeft >= 0 ? roadmap.daysLeft : "—"}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Days left</p>
                  </div>
                </div>

                {/* Band target */}
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm">
                  <span className="text-[var(--text-secondary)]">Band {roadmap.currentBand} → {roadmap.targetBand}</span>
                  <Target className="h-4 w-4 text-[var(--text-muted)]" />
                </div>

                <div className="flex gap-2">
                  <Link href="/ielts/study-plan" className="flex-1"><Button size="sm" className="w-full">Open roadmap</Button></Link>
                  <Link href="/ielts/simulator"><Button size="sm" variant="secondary">Start mock</Button></Link>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-[var(--text-secondary)]">No active study plan yet.</p>
                <div className="mt-4 flex gap-2">
                  <Link href="/ielts/study-plan"><Button size="sm">Create roadmap</Button></Link>
                  <Link href="/ielts/simulator"><Button size="sm" variant="secondary">Start mock</Button></Link>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="text-sm font-medium text-[var(--text-secondary)]">Band trend</div>
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
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"><PenLine className="h-4 w-4" /> Recent writing</div>
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
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"><Mic className="h-4 w-4" /> Recent speaking</div>
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
          <CalendarDays className="h-4 w-4" /> Weakness analysis
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <WeaknessCard title="Writing" weakest={weakness.writingWeakest} band={weakness.writingWeakestBand} criteria={weakness.writingCriteria} />
          <WeaknessCard title="Speaking" weakest={weakness.speakingWeakest} band={weakness.speakingWeakestBand} criteria={weakness.speakingCriteria} />
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

function WeaknessCard({ title, weakest, band, criteria }: { title: string; weakest: string; band: number; criteria: Record<string, number> }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Weakest: {weakest || "n/a"} · Band {band.toFixed(1)}</p>
      <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
        {Object.entries(criteria).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span>{key}</span>
            <span className="font-medium text-[var(--text-primary)]">{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
