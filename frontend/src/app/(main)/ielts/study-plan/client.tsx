"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocale } from "@/components/providers/locale-provider";
import {
  checkAdaptive,
  completeStudyTask,
  getPlanHistory,
  pollStudyPlanJob,
  startStudyPlanGeneration,
  submitReflection,
} from "../simulator/attempt-actions";

// ── Types ───────────────────────────────────────────────────────────────────

type DayTask = {
  day: string;
  skill: string;
  activity: string;
  durationMinutes: number;
  details?: string;
  howTo?: string;
  whatToAvoid?: string;
  whyItMatters?: string;
};

type WeeklyGoal = {
  week: number;
  focus: string;
  tasks: DayTask[];
};

type Phase = {
  name: string;
  weeks: string;
  goal: string;
  actions: string;
  avoid: string;
  expectedProgress: string;
};

type Strategy = {
  whatToFocusFirst?: string;
  urgentSkills?: string;
  stableSkills?: string;
  commonMistakes?: string;
  dailyStructure?: string;
  timingStrategy?: string;
};

type PlanData = {
  overview?: string;
  strategy?: Strategy;
  phases?: Phase[];
  weeklyGoals?: WeeklyGoal[];
  prioritySkills?: string[];
  tips?: string[];
  moduleGuide?: Record<string, string>;
  examCountdown?: string;
  raw?: string;
};

type StudyPlan = {
  id: string;
  targetBand: string;
  currentBand: string;
  examDate?: string;
  examType: string;
  weeklyHours: number;
  weakSections?: string[];
  strengths?: string[];
  struggles?: string[];
  planData?: PlanData;
  status: string;
  version: number;
  versionReason: string;
  parentPlanId?: string;
  createdAt: string;
};

// ── Wizard steps ────────────────────────────────────────────────────────────

const BAND_OPTIONS = ["4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0"];
const SKILLS = ["listening", "reading", "writing", "speaking"];
const SKILL_ICONS: Record<string, typeof BookOpen> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

type WizardData = {
  targetBand: string;
  currentBand: string;
  examDate: string;
  examType: string;
  weeklyHours: number;
  weakSections: string[];
  strengths: string[];
  struggles: string[];
};

export function IELTSStudyPlanClient({
  initialPlan,
  initialTaskStatuses,
}: {
  initialPlan: Record<string, unknown> | null;
  initialTaskStatuses: Record<string, string>;
}) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<StudyPlan | null>(initialPlan as StudyPlan | null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"roadmap" | "checklist" | "guide">("roadmap");
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    targetBand: "6.5",
    currentBand: "5.5",
    examDate: "",
    examType: "academic",
    weeklyHours: 10,
    weakSections: ["writing", "speaking"],
    strengths: ["reading", "listening"],
    struggles: ["timing", "grammar"],
  });

  // taskKey → status (pre-populated from server-side load)
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>(initialTaskStatuses);

  async function handleTaskToggle(week: number, day: string, skill: string, activity: string) {
    if (!plan) return;
    const key = `${week}-${day}-${skill}`;
    const current = taskStatuses[key];
    const next = current === "completed" ? "pending" : "completed";
    setTaskStatuses((prev) => ({ ...prev, [key]: next }));
    try {
      await completeStudyTask({ planId: plan.id, week, day, skill, activity, status: next });
    } catch {
      // revert on error
      setTaskStatuses((prev) => ({ ...prev, [key]: current ?? "pending" }));
    }
  }

  async function handleGenerate() {
    setSubmitting(true);
    setError(null);
    try {
      // Step 1: enqueue job (returns immediately)
      const start = await startStudyPlanGeneration(wizardData);
      if (!start.jobId) {
        setError(start.error ?? "Failed to start generation.");
        return;
      }
      const jobId = start.jobId;

      // Step 2: poll until done / failed. Cap at 5 minutes (150 attempts × 2s).
      const maxAttempts = 150;
      const intervalMs = 2_000;
      let finalError: string | null = null;
      let finalPlan: StudyPlan | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        const status = await pollStudyPlanJob(jobId);
        if (status.status === "done") {
          finalPlan = status.plan as StudyPlan;
          break;
        }
        if (status.status === "failed" || status.status === "error") {
          finalError = status.error;
          break;
        }
        // pending / running → keep polling
      }

      if (finalPlan) {
        setPlan(finalPlan);
        setShowWizard(false);
        setWizardStep(0);
      } else if (finalError) {
        setError(finalError);
      } else {
        setError("Generation timed out. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (showWizard || !plan) {
    return (
      <div className="space-y-6">
        <WizardFlow
          step={wizardStep}
          data={wizardData}
          submitting={submitting}
          isLoggedIn={Boolean(user)}
          onChange={(updates) => setWizardData((prev) => ({ ...prev, ...updates }))}
          onNext={() => setWizardStep((s) => s + 1)}
          onBack={() => setWizardStep((s) => s - 1)}
          onGenerate={handleGenerate}
        />
        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Your IELTS Roadmap</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Generated {new Date(plan.createdAt).toLocaleDateString()} • {plan.examType === "academic" ? "Academic" : "General Training"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-0.5">
            {(["roadmap", "checklist", "guide"] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === mode ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)]"}`}>
                {mode === "roadmap" ? "Roadmap" : mode === "checklist" ? "Checklist" : "Full Guide"}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { setShowWizard(true); setWizardStep(0); }}>
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Target} label="Current band" value={plan.currentBand} color="text-amber-500 bg-amber-500/10" />
        <SummaryCard icon={TrendingUp} label="Target band" value={plan.targetBand} color="text-emerald-500 bg-emerald-500/10" />
        <SummaryCard icon={Clock} label="Weekly hours" value={`${plan.weeklyHours}h`} color="text-blue-500 bg-blue-500/10" />
        <SummaryCard icon={CalendarDays} label="Exam date" value={plan.examDate ? new Date(plan.examDate).toLocaleDateString() : "Not set"} color="text-violet-500 bg-violet-500/10" />
      </div>

      {/* Priority skills */}
      {plan.planData?.prioritySkills && plan.planData.prioritySkills.length > 0 && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Priority Focus Areas</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.planData.prioritySkills.map((skill) => {
              const Icon = SKILL_ICONS[skill] ?? Zap;
              return (
                <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
                  <Icon className="h-3.5 w-3.5" />
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════ VISUAL ROADMAP MODE ═══════════════ */}
      {viewMode === "roadmap" && (
        <div className="space-y-6">
          {/* Visual timeline */}
          {plan.planData?.phases && plan.planData.phases.length > 0 && (
            <VisualRoadmapTimeline
              phases={plan.planData.phases}
              weeklyGoals={plan.planData.weeklyGoals ?? []}
              taskStatuses={taskStatuses}
              selectedPhase={selectedPhase}
              onSelectPhase={setSelectedPhase}
              onToggleTask={handleTaskToggle}
              currentWeek={Math.max(1, Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)}
            />
          )}

          {/* Fallback if no phases — show weekly goals as roadmap */}
          {(!plan.planData?.phases || plan.planData.phases.length === 0) && plan.planData?.weeklyGoals && (
            <VisualRoadmapTimeline
              phases={plan.planData.weeklyGoals.map((w) => ({
                name: `Week ${w.week}`,
                weeks: `Week ${w.week}`,
                goal: w.focus,
                actions: "",
                avoid: "",
                expectedProgress: "",
              }))}
              weeklyGoals={plan.planData.weeklyGoals}
              taskStatuses={taskStatuses}
              selectedPhase={selectedPhase}
              onSelectPhase={setSelectedPhase}
              onToggleTask={handleTaskToggle}
              currentWeek={Math.max(1, Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)}
            />
          )}

          {/* Overview below roadmap */}
          {plan.planData?.overview && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strategy Overview</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.overview}</p>
            </div>
          )}

          {/* Module readiness */}
          {plan.planData?.moduleGuide && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(plan.planData.moduleGuide).map(([skill, guide]) => {
                const Icon = SKILL_ICONS[skill] ?? Zap;
                return (
                  <div key={skill} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[var(--primary)]" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{guide}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ STUDY GUIDE MODE ═══════════════ */}
      {viewMode === "guide" && (
        <div className="space-y-5">
          {/* Strategy overview */}
          {plan.planData?.overview && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Strategy Overview</h3>
              <div className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {plan.planData.overview.split("\n").map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
              </div>
            </div>
          )}

          {/* Strategy details */}
          {plan.planData?.strategy && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Your Personalized Strategy</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {plan.planData.strategy.whatToFocusFirst && (
                  <StrategyCard title="What to focus on first" icon="🎯" text={plan.planData.strategy.whatToFocusFirst} />
                )}
                {plan.planData.strategy.urgentSkills && (
                  <StrategyCard title="Skills needing urgent work" icon="🔴" text={plan.planData.strategy.urgentSkills} />
                )}
                {plan.planData.strategy.stableSkills && (
                  <StrategyCard title="Your stable skills" icon="✅" text={plan.planData.strategy.stableSkills} />
                )}
                {plan.planData.strategy.commonMistakes && (
                  <StrategyCard title="Mistakes slowing your progress" icon="⚠️" text={plan.planData.strategy.commonMistakes} />
                )}
                {plan.planData.strategy.dailyStructure && (
                  <StrategyCard title="Recommended daily structure" icon="📅" text={plan.planData.strategy.dailyStructure} />
                )}
                {plan.planData.strategy.timingStrategy && (
                  <StrategyCard title="Timing strategy" icon="⏱️" text={plan.planData.strategy.timingStrategy} />
                )}
              </div>
            </div>
          )}

          {/* Phases */}
          {plan.planData?.phases && plan.planData.phases.length > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Preparation Phases</h3>
              <div className="mt-4 space-y-4">
                {plan.planData.phases.map((phase, i) => (
                  <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">{i + 1}</div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{phase.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{phase.weeks}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{phase.goal}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{phase.actions}</p>
                    {phase.avoid && (
                      <p className="mt-2 rounded-[var(--radius-md)] border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
                        Avoid: {phase.avoid}
                      </p>
                    )}
                    {phase.expectedProgress && (
                      <p className="mt-2 rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
                        Expected: {phase.expectedProgress}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module guide */}
          {plan.planData?.moduleGuide && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Module-by-Module Guide</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(plan.planData.moduleGuide).map(([skill, guide]) => {
                  const Icon = SKILL_ICONS[skill] ?? Zap;
                  return (
                    <div key={skill} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[var(--primary)]" />
                        <span className="text-sm font-bold text-[var(--text-primary)]">{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{guide}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exam countdown */}
          {plan.planData?.examCountdown && (
            <div className="rounded-[var(--radius-xl)] border border-orange-500/20 bg-orange-500/5 p-5 sm:p-6">
              <h3 className="text-base font-bold text-orange-400">Final Exam Countdown Strategy</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.examCountdown}</p>
            </div>
          )}

          {/* Tips */}
          {plan.planData?.tips && plan.planData.tips.length > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Personalized Tips</h3>
              <ul className="mt-3 space-y-2">
                {plan.planData.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ CHECKLIST MODE ═══════════════ */}
      {viewMode === "checklist" && (
        <div className="space-y-5">
          {/* Overview (compact in checklist mode) */}
          {plan.planData?.overview && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strategy Overview</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.overview}</p>
            </div>
          )}

          {/* Weekly plan with checklists */}
          {plan.planData?.weeklyGoals && plan.planData.weeklyGoals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Weekly Checklist</h3>
              {plan.planData.weeklyGoals.map((week) => (
                <WeekCard key={week.week} week={week} taskStatuses={taskStatuses} onToggleTask={handleTaskToggle} />
              ))}
            </div>
          )}

          {/* Tips */}
          {plan.planData?.tips && plan.planData.tips.length > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Personalized Tips</h3>
              <ul className="mt-3 space-y-2">
                {plan.planData.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw fallback */}
      {plan.planData?.raw && !plan.planData?.weeklyGoals && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Plan Details</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.raw}</div>
        </div>
      )}

      {/* Adaptive banner */}
      <AdaptiveBanner planId={plan.id} onRegenerate={() => { setShowWizard(true); setWizardStep(0); }} />

      {/* Weekly reflection */}
      <WeeklyReflectionForm planId={plan.id} currentWeek={Math.max(1, Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)} />

      {/* Plan version history */}
      {plan.version > 1 && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Plan Version</h3>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Version {plan.version} • {plan.versionReason || "updated"}
          </p>
        </div>
      )}

      <PlanHistorySection />

      {error && <ErrorBanner message={error} />}
    </div>
  );
}

// ── Adaptive Banner ─────────────────────────────────────────────────────────

function AdaptiveBanner({ planId, onRegenerate }: { planId: string; onRegenerate: () => void }) {
  const [adaptive, setAdaptive] = useState<{ status: string; level: number; message: string } | null>(null);

  useEffect(() => {
    checkAdaptive().then((data) => setAdaptive(data)).catch(() => {});
  }, []);

  if (!adaptive || adaptive.status === "stable" || adaptive.status === "no_plan") return null;

  const colors = {
    suggest_catchup: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    suggest_rebalance: "border-orange-500/20 bg-orange-500/5 text-orange-400",
    suggest_rebuild: "border-red-500/20 bg-red-500/5 text-red-400",
  };

  return (
    <div className={`rounded-[var(--radius-xl)] border p-5 ${colors[adaptive.status as keyof typeof colors] ?? "border-[var(--border)] bg-[var(--bg-surface)]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Roadmap Check-in</h3>
          <p className="mt-1 text-sm leading-6">{adaptive.message}</p>
        </div>
        {adaptive.level >= 3 && (
          <Button size="sm" variant="secondary" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" /> Adjust roadmap
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Weekly Reflection ───────────────────────────────────────────────────────

function WeeklyReflectionForm({ planId, currentWeek }: { planId: string; currentWeek: number }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [coachNote, setCoachNote] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitReflection({
        planId,
        week: currentWeek,
        completed: String(fd.get("completed") ?? ""),
        difficult: String(fd.get("difficult") ?? ""),
        improved: String(fd.get("improved") ?? ""),
        slowedDown: String(fd.get("slowedDown") ?? ""),
        nextWeek: String(fd.get("nextWeek") ?? "same"),
      });
      setSubmitted(true);
      if (result && typeof result === "object" && "coachNote" in result && typeof result.coachNote === "string") {
        setCoachNote(result.coachNote);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Week {currentWeek} reflection submitted
        </div>
        {coachNote && (
          <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <p className="text-xs font-semibold text-[var(--primary)]">AI Coach Note</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{coachNote}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4 text-[var(--primary)]" />
          Weekly Check-in (Week {currentWeek})
        </div>
        <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <ReflectionField name="completed" label="What did you complete this week?" placeholder="e.g. 3 reading practices, 2 writing tasks" />
          <ReflectionField name="difficult" label="What was difficult?" placeholder="e.g. Writing Task 2 timing, vocabulary" />
          <ReflectionField name="improved" label="Which section improved most?" placeholder="e.g. Listening comprehension" />
          <ReflectionField name="slowedDown" label="What slowed you down?" placeholder="e.g. Work schedule, fatigue" />
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Next week preference</label>
            <div className="mt-1.5 flex gap-2">
              {["lighter", "same", "intensive"].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] has-[:checked]:border-[var(--primary)]/30 has-[:checked]:bg-[var(--primary-soft)] has-[:checked]:text-[var(--primary)]">
                  <input type="radio" name="nextWeek" value={opt} defaultChecked={opt === "same"} className="sr-only" />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Submit & get AI coach note
          </Button>
        </form>
      )}
    </div>
  );
}

function ReflectionField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <input name={name} placeholder={placeholder} className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]" />
    </div>
  );
}

// ── Plan History ────────────────────────────────────────────────────────────

function PlanHistorySection() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadHistory() {
    if (loaded) { setOpen(!open); return; }
    try {
      const resp = await getPlanHistory();
      setPlans(resp.plans ?? []);
      setLoaded(true);
      setOpen(true);
    } catch {
      // ignore
    }
  }

  const archivedPlans = plans.filter((p) => p.status === "archived");
  if (!open && archivedPlans.length === 0 && loaded) return null;

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <button onClick={loadHistory} className="flex w-full items-center justify-between text-left">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Roadmap History</h3>
        <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && archivedPlans.length > 0 && (
        <div className="mt-4 space-y-2">
          {archivedPlans.map((p) => (
            <div key={String(p.id)} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Version {String(p.version ?? "?")}
                  </span>
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {p.versionReason ? String(p.versionReason) : "archived"}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {p.createdAt ? new Date(String(p.createdAt)).toLocaleDateString() : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Band {String(p.currentBand ?? "?")} → {String(p.targetBand ?? "?")} • {String(p.examType ?? "academic")}
              </p>
            </div>
          ))}
        </div>
      )}

      {open && archivedPlans.length === 0 && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">No previous roadmap versions yet.</p>
      )}
    </div>
  );
}

// ── Wizard Flow ─────────────────────────────────────────────────────────────

function getWizardSteps(t: (key: string) => string) {
  return [
    { title: t("ielts.plan.stepExam"), desc: t("ielts.plan.stepExamDesc") },
    { title: t("ielts.plan.stepLevel"), desc: t("ielts.plan.stepLevelDesc") },
    { title: t("ielts.plan.stepTime"), desc: t("ielts.plan.stepTimeDesc") },
    { title: t("ielts.plan.stepSkills"), desc: t("ielts.plan.stepSkillsDesc") },
    { title: t("ielts.plan.stepGenerate"), desc: t("ielts.plan.stepGenerateDesc") },
  ];
}

function WizardFlow({
  step,
  data,
  submitting,
  isLoggedIn,
  onChange,
  onNext,
  onBack,
  onGenerate,
}: {
  step: number;
  data: WizardData;
  submitting: boolean;
  isLoggedIn: boolean;
  onChange: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const { t } = useLocale();
  const wizardSteps = getWizardSteps(t);
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {wizardSteps.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              i < step ? "bg-[var(--success)] text-white"
                : i === step ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-[var(--text-muted)]"
            }`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < wizardSteps.length - 1 && (
              <div className={`hidden h-0.5 w-6 sm:block ${i < step ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-[var(--text-primary)]">{wizardSteps[step].title}</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{wizardSteps[step].desc}</p>

      <div className="mt-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Target band score</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BAND_OPTIONS.filter((b) => parseFloat(b) >= 5.0).map((band) => (
                  <button key={band} onClick={() => onChange({ targetBand: band })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-all ${data.targetBand === band ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}>
                    {band}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Exam type</label>
              <div className="mt-2 flex gap-3">
                {["academic", "general"].map((type) => (
                  <button key={type} onClick={() => onChange({ examType: type })} className={`flex-1 rounded-[var(--radius-lg)] border p-4 text-left transition-all ${data.examType === type ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                    <p className={`text-sm font-semibold ${data.examType === type ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                      {type === "academic" ? "Academic" : "General Training"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {type === "academic" ? "For university admission" : "For immigration/work"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Current estimated band</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BAND_OPTIONS.map((band) => (
                  <button key={band} onClick={() => onChange({ currentBand: band })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-all ${data.currentBand === band ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}>
                    {band}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Main struggles</label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Select all that apply</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["timing", "grammar", "vocabulary", "reading speed", "listening focus", "writing structure", "speaking confidence"].map((s) => (
                  <button key={s} onClick={() => onChange({ struggles: data.struggles.includes(s) ? data.struggles.filter((x) => x !== s) : [...data.struggles, s] })} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${data.struggles.includes(s) ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Exam date</label>
              <input type="date" value={data.examDate} onChange={(e) => onChange({ examDate: e.target.value })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Weekly study hours: {data.weeklyHours}h</label>
              <input type="range" min={3} max={40} value={data.weeklyHours} onChange={(e) => onChange({ weeklyHours: parseInt(e.target.value) })} className="mt-2 w-full accent-[var(--primary)]" />
              <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
                <span>3h (light)</span>
                <span>20h (moderate)</span>
                <span>40h (intensive)</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Weakest skills</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SKILLS.map((skill) => {
                  const Icon = SKILL_ICONS[skill] ?? Zap;
                  const isWeak = data.weakSections.includes(skill);
                  return (
                    <button key={skill} onClick={() => onChange({ weakSections: isWeak ? data.weakSections.filter((s) => s !== skill) : [...data.weakSections, skill] })} className={`flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border p-4 transition-all ${isWeak ? "border-red-500/30 bg-red-500/10" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                      <Icon className={`h-5 w-5 ${isWeak ? "text-red-400" : "text-[var(--text-muted)]"}`} />
                      <span className={`text-xs font-semibold ${isWeak ? "text-red-400" : "text-[var(--text-secondary)]"}`}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Strongest skills</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SKILLS.map((skill) => {
                  const Icon = SKILL_ICONS[skill] ?? Zap;
                  const isStrong = data.strengths.includes(skill);
                  return (
                    <button key={skill} onClick={() => onChange({ strengths: isStrong ? data.strengths.filter((s) => s !== skill) : [...data.strengths, skill] })} className={`flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border p-4 transition-all ${isStrong ? "border-emerald-500/30 bg-emerald-500/10" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                      <Icon className={`h-5 w-5 ${isStrong ? "text-emerald-400" : "text-[var(--text-muted)]"}`} />
                      <span className={`text-xs font-semibold ${isStrong ? "text-emerald-400" : "text-[var(--text-secondary)]"}`}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">Review your profile and generate a personalized roadmap.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReviewItem label="Target" value={`Band ${data.targetBand}`} />
              <ReviewItem label="Current" value={`Band ${data.currentBand}`} />
              <ReviewItem label="Exam type" value={data.examType === "academic" ? "Academic" : "General Training"} />
              <ReviewItem label="Weekly hours" value={`${data.weeklyHours}h / week`} />
              <ReviewItem label="Exam date" value={data.examDate || "Not set"} />
              <ReviewItem label="Weak areas" value={data.weakSections.join(", ") || "None"} />
              <ReviewItem label="Strengths" value={data.strengths.join(", ") || "None"} />
              <ReviewItem label="Struggles" value={data.struggles.join(", ") || "None"} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : <div />}

        {step < wizardSteps.length - 1 ? (
          <Button onClick={onNext}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : isLoggedIn ? (
          <Button onClick={onGenerate} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {submitting ? "Generating roadmap..." : "Generate my roadmap"}
          </Button>
        ) : (
          <AuthRequiredPrompt
            triggerLabel="Generate my roadmap"
            title="Sign in to generate your roadmap"
            description="Your personalized IELTS study plan will be created with AI based on your profile. Create a free account to save and access it anytime."
            loginLabel="Log in"
            signupLabel="Sign up free"
            cancelLabel="Continue browsing"
            icon={<Sparkles className="h-4 w-4" />}
          />
        )}
      </div>
    </div>
  );
}

// ── Week Card ───────────────────────────────────────────────────────────────

function WeekCard({ week, taskStatuses, onToggleTask }: {
  week: WeeklyGoal;
  taskStatuses: Record<string, string>;
  onToggleTask: (week: number, day: string, skill: string, activity: string) => void;
}) {
  const [open, setOpen] = useState(week.week === 1);

  const completedCount = week.tasks?.filter((t) => taskStatuses[`${week.week}-${t.day}-${t.skill}`] === "completed").length ?? 0;
  const totalCount = week.tasks?.length ?? 0;

  const SKILL_LINKS: Record<string, string> = {
    reading: "/ielts/simulator",
    listening: "/ielts/simulator",
    writing: "/ielts/writing",
    speaking: "/ielts/speaking",
    vocabulary: "/flashcards",
    grammar: "/flashcards",
  };

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--bg-soft)]">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold ${
            completedCount === totalCount && totalCount > 0
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-[var(--primary-soft)] text-[var(--primary)]"
          }`}>
            {completedCount === totalCount && totalCount > 0 ? <CheckCircle2 className="h-5 w-5" /> : `W${week.week}`}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Week {week.week}</p>
            <p className="text-xs text-[var(--text-muted)]">{week.focus}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-muted)]">{completedCount}/{totalCount}</span>
          <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {open && week.tasks && week.tasks.length > 0 && (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <div className="space-y-2.5">
            {week.tasks.map((task, i) => (
              <TaskRow key={i} task={task} isDone={taskStatuses[`${week.week}-${task.day}-${task.skill}`] === "completed"} onToggle={() => onToggleTask(week.week, task.day, task.skill, task.activity)} actionLink={SKILL_LINKS[task.skill]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Visual Roadmap Timeline ─────────────────────────────────────────────────

function VisualRoadmapTimeline({ phases, weeklyGoals, taskStatuses, selectedPhase, onSelectPhase, onToggleTask, currentWeek }: {
  phases: Phase[];
  weeklyGoals: WeeklyGoal[];
  taskStatuses: Record<string, string>;
  selectedPhase: number | null;
  onSelectPhase: (index: number | null) => void;
  onToggleTask: (week: number, day: string, skill: string, activity: string) => void;
  currentWeek: number;
}) {
  // Calculate phase completion from task statuses
  function getPhaseCompletion(phaseIndex: number): number {
    // Map phases to weeks: phase 0 → weeks 1-2, phase 1 → weeks 3-4, etc.
    const weeksPerPhase = Math.max(1, Math.ceil(weeklyGoals.length / Math.max(1, phases.length)));
    const startWeek = phaseIndex * weeksPerPhase + 1;
    const endWeek = startWeek + weeksPerPhase;
    const phaseWeeks = weeklyGoals.filter((w) => w.week >= startWeek && w.week < endWeek);
    if (phaseWeeks.length === 0) return 0;
    let total = 0;
    let done = 0;
    for (const w of phaseWeeks) {
      for (const t of w.tasks) {
        total++;
        if (taskStatuses[`${w.week}-${t.day}-${t.skill}`] === "completed") done++;
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // Determine which phase the user is currently in
  const weeksPerPhase = Math.max(1, Math.ceil(weeklyGoals.length / Math.max(1, phases.length)));
  const currentPhaseIndex = Math.min(phases.length - 1, Math.floor((currentWeek - 1) / weeksPerPhase));

  const PHASE_COLORS = [
    { bg: "bg-blue-500", soft: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
    { bg: "bg-violet-500", soft: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30" },
    { bg: "bg-amber-500", soft: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
    { bg: "bg-emerald-500", soft: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
  ];

  // Get weeks belonging to selected phase
  const selectedPhaseWeeks = selectedPhase !== null
    ? weeklyGoals.filter((w) => {
        const start = selectedPhase * weeksPerPhase + 1;
        return w.week >= start && w.week < start + weeksPerPhase;
      })
    : [];

  const SKILL_LINKS: Record<string, string> = {
    reading: "/ielts/simulator",
    listening: "/ielts/simulator",
    writing: "/ielts/writing",
    speaking: "/ielts/speaking",
    vocabulary: "/flashcards",
    grammar: "/flashcards",
  };

  return (
    <div className="space-y-6">
      {/* Timeline visualization */}
      <div className="relative rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Your Learning Journey</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{phases.length} phases • {weeklyGoals.length} weeks</p>

        {/* Phase nodes */}
        <div className="mt-6 flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
          {phases.map((phase, i) => {
            const colors = PHASE_COLORS[i % PHASE_COLORS.length];
            const completion = getPhaseCompletion(i);
            const isCurrent = i === currentPhaseIndex;
            const isSelected = selectedPhase === i;
            const isPast = i < currentPhaseIndex;

            return (
              <div key={i} className="flex flex-1 flex-col items-center sm:items-stretch">
                {/* Connector line + node */}
                <div className="flex items-center sm:flex-col">
                  {/* Node */}
                  <button
                    onClick={() => onSelectPhase(isSelected ? null : i)}
                    className={`relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] transition-all sm:mx-auto ${
                      isSelected
                        ? `${colors.border} ${colors.soft} ring-4 ring-[var(--primary-soft)]`
                        : isPast
                          ? `border-emerald-500/40 bg-emerald-500/10`
                          : isCurrent
                            ? `${colors.border} ${colors.soft} animate-pulse`
                            : `border-[var(--border)] bg-[var(--bg-elevated)]`
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <>
                        <span className={`text-xs font-bold ${isCurrent || isSelected ? colors.text : "text-[var(--text-muted)]"}`}>{completion}%</span>
                      </>
                    )}
                  </button>

                  {/* Connector */}
                  {i < phases.length - 1 && (
                    <div className={`hidden h-1 flex-1 sm:block ${isPast ? "bg-emerald-500/30" : "bg-[var(--border)]"}`} />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center sm:px-1">
                  <p className={`text-xs font-bold ${isCurrent ? colors.text : "text-[var(--text-primary)]"}`}>
                    {phase.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{phase.weeks}</p>
                  {isCurrent && (
                    <span className={`mt-1 inline-block rounded-full ${colors.soft} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors.text}`}>
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected phase detail panel */}
      {selectedPhase !== null && phases[selectedPhase] && (
        <div className="space-y-4">
          <div className={`rounded-[var(--radius-xl)] border ${PHASE_COLORS[selectedPhase % PHASE_COLORS.length].border} bg-[var(--bg-surface)] p-5 sm:p-6`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${PHASE_COLORS[selectedPhase % PHASE_COLORS.length].soft}`}>
                <span className={`text-sm font-bold ${PHASE_COLORS[selectedPhase % PHASE_COLORS.length].text}`}>{selectedPhase + 1}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{phases[selectedPhase].name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{phases[selectedPhase].weeks} • {getPhaseCompletion(selectedPhase)}% complete</p>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">{phases[selectedPhase].goal}</p>

            {phases[selectedPhase].actions && (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{phases[selectedPhase].actions}</p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {phases[selectedPhase].avoid && (
                <div className="rounded-[var(--radius-md)] border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Avoid</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{phases[selectedPhase].avoid}</p>
                </div>
              )}
              {phases[selectedPhase].expectedProgress && (
                <div className="rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Expected Progress</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{phases[selectedPhase].expectedProgress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Weeks in this phase */}
          {selectedPhaseWeeks.length > 0 && (
            <div className="space-y-3">
              {selectedPhaseWeeks.map((week) => (
                <WeekCard key={week.week} week={week} taskStatuses={taskStatuses} onToggleTask={onToggleTask} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Task Row (expandable) ───────────────────────────────────────────────────

function TaskRow({ task, isDone, onToggle, actionLink }: {
  task: DayTask;
  isDone: boolean;
  onToggle: () => void;
  actionLink?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SKILL_ICONS[task.skill] ?? Zap;
  const hasDetails = task.howTo || task.whatToAvoid || task.whyItMatters || task.details;

  return (
    <div className={`rounded-[var(--radius-md)] border transition-all ${isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="flex items-start gap-3 p-3">
        <button onClick={onToggle} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--border-strong)] hover:border-[var(--primary)]"}`}>
          {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${isDone ? "text-emerald-400" : "text-[var(--text-muted)]"}`} />
            <span className={`text-xs font-semibold ${isDone ? "text-emerald-400 line-through" : "text-[var(--text-primary)]"}`}>{task.day}</span>
            <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {task.skill} • {task.durationMinutes}min
            </span>
          </div>
          <button onClick={() => hasDetails && setExpanded(!expanded)} className={`mt-0.5 text-left text-xs ${isDone ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"} ${hasDetails && !isDone ? "cursor-pointer hover:text-[var(--text-primary)]" : ""}`}>
            {task.activity}
            {hasDetails && !isDone && <span className="ml-1 text-[var(--text-muted)]">{expanded ? "▾" : "▸"}</span>}
          </button>
        </div>
        {actionLink && !isDone && (
          <a href={actionLink} className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)]">
            Start
          </a>
        )}
      </div>

      {expanded && !isDone && hasDetails && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2.5 pl-12 space-y-2">
          {task.details && (
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{task.details}</p>
          )}
          {task.howTo && (
            <div className="rounded-[var(--radius-sm)] border border-blue-500/20 bg-blue-500/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">How to do it</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{task.howTo}</p>
            </div>
          )}
          {task.whatToAvoid && (
            <div className="rounded-[var(--radius-sm)] border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">What to avoid</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{task.whatToAvoid}</p>
            </div>
          )}
          {task.whyItMatters && (
            <div className="rounded-[var(--radius-sm)] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Why it matters</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{task.whyItMatters}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper components ───────────────────────────────────────────────────────

function StrategyCard({ title, icon, text }: { title: string; icon: string; text: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold text-[var(--text-primary)]">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof Target; label: string; value: string; color: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  );
}
