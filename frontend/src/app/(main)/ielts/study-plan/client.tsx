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
import {
  checkAdaptive,
  completeStudyTask,
  generateStudyPlan,
  getPlanHistory,
  getStudyPlan,
  getTaskCompletions,
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

export function IELTSStudyPlanClient() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"checklist" | "guide">("checklist");
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

  // taskKey → status
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await getStudyPlan();
        if (!mounted) return;
        if (resp.plan) {
          const p = resp.plan as StudyPlan;
          setPlan(p);
          // Load task completions
          try {
            const completionsResp = await getTaskCompletions(p.id);
            if (!mounted) return;
            const map: Record<string, string> = {};
            for (const c of completionsResp.completions ?? []) {
              map[`${c.week}-${c.day}-${c.skill}`] = c.status;
            }
            setTaskStatuses(map);
          } catch {
            // ignore — completions just won't show
          }
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load study plan.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

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
      const response = await generateStudyPlan(wizardData);
      setPlan(response.plan as StudyPlan);
      setShowWizard(false);
      setWizardStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-[var(--text-muted)]">Loading your study plan...</p>
      </div>
    );
  }

  if (showWizard || !plan) {
    return (
      <div className="space-y-6">
        <WizardFlow
          step={wizardStep}
          data={wizardData}
          submitting={submitting}
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
            <button onClick={() => setViewMode("checklist")} className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === "checklist" ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)]"}`}>
              Checklist
            </button>
            <button onClick={() => setViewMode("guide")} className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === "guide" ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)]"}`}>
              Study Guide
            </button>
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

const WIZARD_STEPS = [
  { title: "Exam Goal", desc: "What band score do you need?" },
  { title: "Current Level", desc: "Where are you right now?" },
  { title: "Time & Schedule", desc: "How much time do you have?" },
  { title: "Strengths & Weaknesses", desc: "Which skills need work?" },
  { title: "Generate", desc: "Review and create your roadmap" },
];

function WizardFlow({
  step,
  data,
  submitting,
  onChange,
  onNext,
  onBack,
  onGenerate,
}: {
  step: number;
  data: WizardData;
  submitting: boolean;
  onChange: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {WIZARD_STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              i < step ? "bg-[var(--success)] text-white"
                : i === step ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-[var(--text-muted)]"
            }`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`hidden h-0.5 w-6 sm:block ${i < step ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-[var(--text-primary)]">{WIZARD_STEPS[step].title}</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{WIZARD_STEPS[step].desc}</p>

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

        {step < WIZARD_STEPS.length - 1 ? (
          <Button onClick={onNext}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onGenerate} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {submitting ? "Generating roadmap..." : "Generate my roadmap"}
          </Button>
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
