"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  PauseCircle,
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
import { useSpeakingRecorder } from "@/features/ielts/use-speaking-recorder";
import {
  checkAdaptive,
  completeStudyTask,
  getPlanHistory,
  getStudyPlanPlacement,
  pollStudyPlanJob,
  scoreStudyPlanPlacement,
  startStudyPlanGeneration,
  submitReflection,
  type PlacementQuestion,
  type PlacementScoreResult,
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

// BCP-47 tags for browser-side date formatting.
const DATE_LOCALES: Record<string, string> = { kk: "kk-KZ", ru: "ru-RU", en: "en-US" };

const STRUGGLE_OPTIONS = [
  { value: "timing", key: "ielts.studyPlan.struggle.timing" },
  { value: "grammar", key: "ielts.studyPlan.struggle.grammar" },
  { value: "vocabulary", key: "ielts.studyPlan.struggle.vocabulary" },
  { value: "reading speed", key: "ielts.studyPlan.struggle.readingSpeed" },
  { value: "listening focus", key: "ielts.studyPlan.struggle.listeningFocus" },
  { value: "writing structure", key: "ielts.studyPlan.struggle.writingStructure" },
  { value: "speaking confidence", key: "ielts.studyPlan.struggle.speakingConfidence" },
];

function skillLabel(t: (key: string, vars?: Record<string, string | number>) => string, skill: string): string {
  const key = `ielts.skill.${skill}`;
  const label = t(key);
  return label === key ? skill.charAt(0).toUpperCase() + skill.slice(1) : label;
}

function struggleLabel(t: (key: string, vars?: Record<string, string | number>) => string, value: string): string {
  const opt = STRUGGLE_OPTIONS.find((o) => o.value === value);
  if (!opt) return value;
  const label = t(opt.key);
  return label === opt.key ? value : label;
}

export function IELTSStudyPlanClient({
  initialPlan,
  initialTaskStatuses,
}: {
  initialPlan: Record<string, unknown> | null;
  initialTaskStatuses: Record<string, string>;
}) {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const dateLocale = DATE_LOCALES[locale] ?? "en-US";
  const [plan, setPlan] = useState<StudyPlan | null>(initialPlan as StudyPlan | null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"roadmap" | "checklist" | "guide">("roadmap");
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [placementStage, setPlacementStage] = useState<"prompt" | "skipped" | "done">("prompt");
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

  function startWizardFlow() {
    setShowWizard(true);
    setWizardStep(0);
    setPlacementStage("prompt");
  }

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
        setError(t("ielts.studyPlan.errTimeout"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ielts.studyPlan.errTimeout"));
    } finally {
      setSubmitting(false);
    }
  }

  if (showWizard || !plan) {
    if (placementStage === "prompt" && Boolean(user)) {
      return (
        <div className="space-y-6">
          <PlacementCheck
            onAccept={({ band, weakSkills }) => {
              setWizardData((prev) => ({
                ...prev,
                currentBand: band,
                // Pre-populate weakSections from placement only when the
                // diagnostic actually flagged something — otherwise keep the
                // existing default so the wizard isn't empty for users who
                // scored evenly across all four skills.
                weakSections: weakSkills.length > 0 ? weakSkills : prev.weakSections,
              }));
              setPlacementStage("done");
            }}
            onSkip={() => setPlacementStage("skipped")}
          />
        </div>
      );
    }
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
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("ielts.dashboard.yourRoadmap")}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {new Date(plan.createdAt).toLocaleDateString(dateLocale)} • {plan.examType === "academic" ? t("studyPlan.academic") : t("studyPlan.generalTraining")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-0.5" role="group" aria-label={t("ielts.studyPlan.viewMode.roadmap")}>
            {(["roadmap", "checklist", "guide"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === mode ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)]"}`}
              >
                {t(`ielts.studyPlan.viewMode.${mode}`)}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={startWizardFlow}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("ielts.studyPlan.regenerate")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Target} label={t("ielts.studyPlan.currentBand")} value={plan.currentBand} color="text-amber-500 bg-amber-500/10" />
        <SummaryCard icon={TrendingUp} label={t("ielts.studyPlan.targetBand")} value={plan.targetBand} color="text-emerald-500 bg-emerald-500/10" />
        <SummaryCard icon={Clock} label={t("ielts.studyPlan.weeklyHours")} value={`${plan.weeklyHours}h`} color="text-blue-500 bg-blue-500/10" />
        <SummaryCard icon={CalendarDays} label={t("ielts.studyPlan.examDate")} value={plan.examDate ? new Date(plan.examDate).toLocaleDateString(dateLocale) : t("ielts.studyPlan.notSet")} color="text-violet-500 bg-violet-500/10" />
      </div>

      {/* Priority skills */}
      {plan.planData?.prioritySkills && plan.planData.prioritySkills.length > 0 && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.priorityFocusAreas")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.planData.prioritySkills.map((skill) => {
              const Icon = SKILL_ICONS[skill] ?? Zap;
              return (
                <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {skillLabel(t, skill)}
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
                name: t("ielts.studyPlan.weekN", { n: w.week }),
                weeks: t("ielts.studyPlan.weekN", { n: w.week }),
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
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.strategyOverview")}</h3>
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
                      <Icon className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">{skillLabel(t, skill)}</span>
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
              <h3 className="text-base font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.strategyOverview")}</h3>
              <div className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {plan.planData.overview.split("\n").map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
              </div>
            </div>
          )}

          {/* Strategy details */}
          {plan.planData?.strategy && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.personalizedStrategy")}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {plan.planData.strategy.whatToFocusFirst && (
                  <StrategyCard title={t("ielts.studyPlan.strategy.whatToFocusFirst")} icon="🎯" text={plan.planData.strategy.whatToFocusFirst} />
                )}
                {plan.planData.strategy.urgentSkills && (
                  <StrategyCard title={t("ielts.studyPlan.strategy.urgentSkills")} icon="🔴" text={plan.planData.strategy.urgentSkills} />
                )}
                {plan.planData.strategy.stableSkills && (
                  <StrategyCard title={t("ielts.studyPlan.strategy.stableSkills")} icon="✅" text={plan.planData.strategy.stableSkills} />
                )}
                {plan.planData.strategy.commonMistakes && (
                  <StrategyCard title={t("ielts.studyPlan.strategy.commonMistakes")} icon="⚠️" text={plan.planData.strategy.commonMistakes} />
                )}
                {plan.planData.strategy.dailyStructure && (
                  <StrategyCard title={t("ielts.studyPlan.strategy.dailyStructure")} icon="📅" text={plan.planData.strategy.dailyStructure} />
                )}
                {plan.planData.strategy.timingStrategy && (
                  <StrategyCard title={t("ielts.studyPlan.strategy.timingStrategy")} icon="⏱️" text={plan.planData.strategy.timingStrategy} />
                )}
              </div>
            </div>
          )}

          {/* Phases */}
          {plan.planData?.phases && plan.planData.phases.length > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.preparationPhases")}</h3>
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
                        {t("ielts.studyPlan.avoidLabel")}: {phase.avoid}
                      </p>
                    )}
                    {phase.expectedProgress && (
                      <p className="mt-2 rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
                        {t("ielts.studyPlan.expectedLabel")}: {phase.expectedProgress}
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
              <h3 className="text-base font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.moduleByModule")}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(plan.planData.moduleGuide).map(([skill, guide]) => {
                  const Icon = SKILL_ICONS[skill] ?? Zap;
                  return (
                    <div key={skill} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                        <span className="text-sm font-bold text-[var(--text-primary)]">{skillLabel(t, skill)}</span>
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
              <h3 className="text-base font-bold text-orange-400">{t("ielts.studyPlan.finalCountdown")}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.examCountdown}</p>
            </div>
          )}

          {/* Tips */}
          {plan.planData?.tips && plan.planData.tips.length > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.personalizedTips")}</h3>
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
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.strategyOverview")}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.overview}</p>
            </div>
          )}

          {/* Weekly plan with checklists */}
          {plan.planData?.weeklyGoals && plan.planData.weeklyGoals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.weeklyChecklist")}</h3>
              {plan.planData.weeklyGoals.map((week) => (
                <WeekCard key={week.week} week={week} taskStatuses={taskStatuses} onToggleTask={handleTaskToggle} />
              ))}
            </div>
          )}

          {/* Tips */}
          {plan.planData?.tips && plan.planData.tips.length > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.personalizedTips")}</h3>
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
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.planDetails")}</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{plan.planData.raw}</div>
        </div>
      )}

      {/* Adaptive banner */}
      <AdaptiveBanner planId={plan.id} onRegenerate={startWizardFlow} />

      {/* Weekly reflection */}
      <WeeklyReflectionForm planId={plan.id} currentWeek={Math.max(1, Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)} />

      {/* Plan version history */}
      {plan.version > 1 && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.planVersion")}</h3>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {t("ielts.studyPlan.versionN", { n: plan.version })} • {plan.versionReason || t("ielts.studyPlan.updated")}
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
  const { t } = useLocale();
  const [adaptive, setAdaptive] = useState<{ status: string; level: number; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkAdaptive().then((data) => {
      if (!cancelled) setAdaptive(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!adaptive || adaptive.status === "stable" || adaptive.status === "no_plan") return null;

  const colors = {
    suggest_catchup: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    suggest_rebalance: "border-orange-500/20 bg-orange-500/5 text-orange-400",
    suggest_rebuild: "border-red-500/20 bg-red-500/5 text-red-400",
  };

  return (
    <div className={`rounded-[var(--radius-xl)] border p-5 ${colors[adaptive.status as keyof typeof colors] ?? "border-[var(--border)] bg-[var(--bg-surface)]"}`} role="status">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{t("ielts.studyPlan.checkin")}</h3>
          <p className="mt-1 text-sm leading-6">{adaptive.message}</p>
        </div>
        {adaptive.level >= 3 && (
          <Button size="sm" variant="secondary" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> {t("ielts.studyPlan.adjustRoadmap")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Weekly Reflection ───────────────────────────────────────────────────────

function WeeklyReflectionForm({ planId, currentWeek }: { planId: string; currentWeek: number }) {
  const { t } = useLocale();
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
      <div className="rounded-[var(--radius-xl)] border border-emerald-500/20 bg-emerald-500/5 p-5" role="status">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("ielts.studyPlan.weekReflectionSubmitted", { n: currentWeek })}
        </div>
        {coachNote && (
          <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <p className="text-xs font-semibold text-[var(--primary)]">{t("ielts.studyPlan.aiCoachNote")}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{coachNote}</p>
          </div>
        )}
      </div>
    );
  }

  const reflectionId = `weekly-checkin-${currentWeek}`;
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
        aria-controls={reflectionId}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          {t("ielts.studyPlan.weeklyCheckin", { n: currentWeek })}
        </div>
        <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <form id={reflectionId} onSubmit={handleSubmit} className="mt-4 space-y-3">
          <ReflectionField name="completed" label={t("ielts.studyPlan.reflection.completed")} placeholder={t("ielts.studyPlan.reflection.completedPlaceholder")} />
          <ReflectionField name="difficult" label={t("ielts.studyPlan.reflection.difficult")} placeholder={t("ielts.studyPlan.reflection.difficultPlaceholder")} />
          <ReflectionField name="improved" label={t("ielts.studyPlan.reflection.improved")} placeholder={t("ielts.studyPlan.reflection.improvedPlaceholder")} />
          <ReflectionField name="slowedDown" label={t("ielts.studyPlan.reflection.slowedDown")} placeholder={t("ielts.studyPlan.reflection.slowedDownPlaceholder")} />
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">{t("ielts.studyPlan.reflection.nextWeek")}</label>
            <div className="mt-1.5 flex gap-2">
              {(["lighter", "same", "intensive"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] has-[:checked]:border-[var(--primary)]/30 has-[:checked]:bg-[var(--primary-soft)] has-[:checked]:text-[var(--primary)]">
                  <input type="radio" name="nextWeek" value={opt} defaultChecked={opt === "same"} className="sr-only" />
                  {t(`ielts.studyPlan.reflection.${opt}`)}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            {t("ielts.studyPlan.reflection.submit")}
          </Button>
        </form>
      )}
    </div>
  );
}

function ReflectionField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  const id = `reflection-${name}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <input id={id} name={name} placeholder={placeholder} className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]" />
    </div>
  );
}

// ── Plan History ────────────────────────────────────────────────────────────

function PlanHistorySection() {
  const { t, locale } = useLocale();
  const dateLocale = DATE_LOCALES[locale] ?? "en-US";
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

  const historyId = "roadmap-history";
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <button
        onClick={loadHistory}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
        aria-controls={historyId}
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.history")}</h3>
        <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>

      {open && archivedPlans.length > 0 && (
        <div id={historyId} className="mt-4 space-y-2">
          {archivedPlans.map((p) => (
            <div key={String(p.id)} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {t("ielts.studyPlan.versionN", { n: String(p.version ?? "?") })}
                  </span>
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {p.versionReason ? String(p.versionReason) : t("ielts.studyPlan.archived")}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {p.createdAt ? new Date(String(p.createdAt)).toLocaleDateString(dateLocale) : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t("ielts.dashboard.bandPrefix")} {String(p.currentBand ?? "?")} → {String(p.targetBand ?? "?")} • {p.examType === "general" ? t("studyPlan.generalTraining") : t("studyPlan.academic")}
              </p>
            </div>
          ))}
        </div>
      )}

      {open && archivedPlans.length === 0 && (
        <p id={historyId} className="mt-3 text-xs text-[var(--text-muted)]">{t("ielts.studyPlan.historyEmpty")}</p>
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
              <label className="text-sm font-medium text-[var(--text-primary)]">{t("studyPlan.targetBandScore")}</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BAND_OPTIONS.filter((b) => parseFloat(b) >= 5.0).map((band) => (
                  <button key={band} onClick={() => onChange({ targetBand: band })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-all ${data.targetBand === band ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}>
                    {band}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">{t("studyPlan.examType")}</label>
              <div className="mt-2 flex gap-3">
                {["academic", "general"].map((type) => (
                  <button key={type} onClick={() => onChange({ examType: type })} className={`flex-1 rounded-[var(--radius-lg)] border p-4 text-left transition-all ${data.examType === type ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                    <p className={`text-sm font-semibold ${data.examType === type ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                      {type === "academic" ? t("studyPlan.academic") : t("studyPlan.generalTraining")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {type === "academic" ? t("studyPlan.academicDesc") : t("studyPlan.generalDesc")}
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
              <label className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.studyPlan.wizard.currentEstimated")}</label>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("ielts.studyPlan.wizard.currentEstimated")}>
                {BAND_OPTIONS.map((band) => (
                  <button
                    key={band}
                    onClick={() => onChange({ currentBand: band })}
                    aria-pressed={data.currentBand === band}
                    className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-all ${data.currentBand === band ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
                  >
                    {band}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.studyPlan.wizard.struggles")}</label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t("ielts.studyPlan.wizard.selectAll")}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("ielts.studyPlan.wizard.struggles")}>
                {STRUGGLE_OPTIONS.map(({ value, key }) => {
                  const active = data.struggles.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => onChange({ struggles: active ? data.struggles.filter((x) => x !== value) : [...data.struggles, value] })}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${active ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
                    >
                      {t(key)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="exam-date" className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.studyPlan.wizard.examDate")}</label>
              <input id="exam-date" type="date" value={data.examDate} onChange={(e) => onChange({ examDate: e.target.value })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]" />
            </div>
            <div>
              <label htmlFor="weekly-hours" className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.studyPlan.wizard.weeklyHoursLabel", { n: data.weeklyHours })}</label>
              <input id="weekly-hours" type="range" min={3} max={40} value={data.weeklyHours} onChange={(e) => onChange({ weeklyHours: parseInt(e.target.value) })} className="mt-2 w-full accent-[var(--primary)]" />
              <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
                <span>{t("ielts.studyPlan.wizard.hoursLight")}</span>
                <span>{t("ielts.studyPlan.wizard.hoursMod")}</span>
                <span>{t("ielts.studyPlan.wizard.hoursIntensive")}</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.studyPlan.wizard.weakestSkills")}</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t("ielts.studyPlan.wizard.weakestSkills")}>
                {SKILLS.map((skill) => {
                  const Icon = SKILL_ICONS[skill] ?? Zap;
                  const isWeak = data.weakSections.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => onChange({ weakSections: isWeak ? data.weakSections.filter((s) => s !== skill) : [...data.weakSections, skill] })}
                      aria-pressed={isWeak}
                      className={`flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border p-4 transition-all ${isWeak ? "border-red-500/30 bg-red-500/10" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}
                    >
                      <Icon className={`h-5 w-5 ${isWeak ? "text-red-400" : "text-[var(--text-muted)]"}`} aria-hidden="true" />
                      <span className={`text-xs font-semibold ${isWeak ? "text-red-400" : "text-[var(--text-secondary)]"}`}>{skillLabel(t, skill)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.studyPlan.wizard.strongestSkills")}</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t("ielts.studyPlan.wizard.strongestSkills")}>
                {SKILLS.map((skill) => {
                  const Icon = SKILL_ICONS[skill] ?? Zap;
                  const isStrong = data.strengths.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => onChange({ strengths: isStrong ? data.strengths.filter((s) => s !== skill) : [...data.strengths, skill] })}
                      aria-pressed={isStrong}
                      className={`flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border p-4 transition-all ${isStrong ? "border-emerald-500/30 bg-emerald-500/10" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}
                    >
                      <Icon className={`h-5 w-5 ${isStrong ? "text-emerald-400" : "text-[var(--text-muted)]"}`} aria-hidden="true" />
                      <span className={`text-xs font-semibold ${isStrong ? "text-emerald-400" : "text-[var(--text-secondary)]"}`}>{skillLabel(t, skill)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (() => {
          const bandPrefix = t("ielts.dashboard.bandPrefix");
          const noneLabel = t("ielts.studyPlan.wizard.none");
          const weakSectionLabels = data.weakSections.map((s) => skillLabel(t, s)).join(", ") || noneLabel;
          const strengthLabels = data.strengths.map((s) => skillLabel(t, s)).join(", ") || noneLabel;
          const struggleLabels = data.struggles.map((s) => struggleLabel(t, s)).join(", ") || noneLabel;
          return (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">{t("ielts.studyPlan.wizard.review")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ReviewItem label={t("ielts.studyPlan.wizard.target")} value={`${bandPrefix} ${data.targetBand}`} />
                <ReviewItem label={t("ielts.studyPlan.wizard.current")} value={`${bandPrefix} ${data.currentBand}`} />
                <ReviewItem label={t("studyPlan.examType")} value={data.examType === "academic" ? t("studyPlan.academic") : t("studyPlan.generalTraining")} />
                <ReviewItem label={t("ielts.studyPlan.weeklyHours")} value={`${data.weeklyHours}h / week`} />
                <ReviewItem label={t("ielts.studyPlan.examDate")} value={data.examDate || t("ielts.studyPlan.notSet")} />
                <ReviewItem label={t("ielts.studyPlan.wizard.weakAreas")} value={weakSectionLabels} />
                <ReviewItem label={t("ielts.studyPlan.wizard.strengths")} value={strengthLabels} />
                <ReviewItem label={t("ielts.studyPlan.wizard.strugglesLabel")} value={struggleLabels} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("ielts.studyPlan.wizard.back")}
          </Button>
        ) : <div />}

        {step < wizardSteps.length - 1 ? (
          <Button onClick={onNext}>
            {t("studyPlan.next")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : isLoggedIn ? (
          <Button onClick={onGenerate} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {submitting ? t("ielts.studyPlan.wizard.generating") : t("ielts.studyPlan.wizard.generate")}
          </Button>
        ) : (
          <AuthRequiredPrompt
            triggerLabel={t("ielts.studyPlan.wizard.generate")}
            title={t("ielts.studyPlan.wizard.signinTitle")}
            description={t("ielts.studyPlan.wizard.signinDesc")}
            loginLabel={t("ielts.studyPlan.wizard.login")}
            signupLabel={t("ielts.studyPlan.wizard.signup")}
            cancelLabel={t("ielts.studyPlan.wizard.cancel")}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
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
  const { t } = useLocale();
  const [open, setOpen] = useState(week.week === 1);

  const completedCount = week.tasks?.filter((task) => taskStatuses[`${week.week}-${task.day}-${task.skill}`] === "completed").length ?? 0;
  const totalCount = week.tasks?.length ?? 0;

  const SKILL_LINKS: Record<string, string> = {
    reading: "/ielts/simulator",
    listening: "/ielts/simulator",
    writing: "/ielts/writing",
    speaking: "/ielts/speaking",
    vocabulary: "/flashcards",
    grammar: "/flashcards",
  };

  const weekId = `week-${week.week}`;
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--bg-soft)]"
        aria-expanded={open}
        aria-controls={weekId}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold ${
            completedCount === totalCount && totalCount > 0
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-[var(--primary-soft)] text-[var(--primary)]"
          }`}>
            {completedCount === totalCount && totalCount > 0 ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : t("ielts.studyPlan.weekShort", { n: week.week })}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.studyPlan.weekN", { n: week.week })}</p>
            <p className="text-xs text-[var(--text-muted)]">{week.focus}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-muted)]">{completedCount}/{totalCount}</span>
          <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
        </div>
      </button>

      {open && week.tasks && week.tasks.length > 0 && (
        <div id={weekId} className="border-t border-[var(--border)] px-5 py-4">
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
  const { t } = useLocale();
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
      for (const task of w.tasks) {
        total++;
        if (taskStatuses[`${w.week}-${task.day}-${task.skill}`] === "completed") done++;
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
        <h3 className="text-base font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.timeline.title")}</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t("ielts.studyPlan.timeline.summary", { phases: phases.length, weeks: weeklyGoals.length })}</p>

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
                    aria-pressed={isSelected}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${phase.name} — ${t("ielts.studyPlan.timeline.percentComplete", { p: completion })}`}
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
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
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
                      {t("ielts.studyPlan.timeline.current")}
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
                <p className="text-xs text-[var(--text-muted)]">{phases[selectedPhase].weeks} • {t("ielts.studyPlan.timeline.percentComplete", { p: getPhaseCompletion(selectedPhase) })}</p>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">{phases[selectedPhase].goal}</p>

            {phases[selectedPhase].actions && (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{phases[selectedPhase].actions}</p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {phases[selectedPhase].avoid && (
                <div className="rounded-[var(--radius-md)] border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{t("ielts.studyPlan.timeline.avoid")}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{phases[selectedPhase].avoid}</p>
                </div>
              )}
              {phases[selectedPhase].expectedProgress && (
                <div className="rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{t("ielts.studyPlan.timeline.expectedProgress")}</p>
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
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const Icon = SKILL_ICONS[task.skill] ?? Zap;
  const hasDetails = task.howTo || task.whatToAvoid || task.whyItMatters || task.details;
  const minSuffix = t("ielts.studyPlan.task.minSuffix");

  return (
    <div className={`rounded-[var(--radius-md)] border transition-all ${isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="flex items-start gap-3 p-3">
        <button
          onClick={onToggle}
          aria-pressed={isDone}
          aria-label={task.activity}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--border-strong)] hover:border-[var(--primary)]"}`}
        >
          {isDone && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${isDone ? "text-emerald-400" : "text-[var(--text-muted)]"}`} aria-hidden="true" />
            <span className={`text-xs font-semibold ${isDone ? "text-emerald-400 line-through" : "text-[var(--text-primary)]"}`}>{task.day}</span>
            <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {skillLabel(t, task.skill)} • {task.durationMinutes}{minSuffix}
            </span>
          </div>
          <button
            onClick={() => hasDetails && setExpanded(!expanded)}
            aria-expanded={hasDetails ? expanded : undefined}
            className={`mt-0.5 text-left text-xs ${isDone ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"} ${hasDetails && !isDone ? "cursor-pointer hover:text-[var(--text-primary)]" : ""}`}
          >
            {task.activity}
            {hasDetails && !isDone && <span className="ml-1 text-[var(--text-muted)]" aria-hidden="true">{expanded ? "▾" : "▸"}</span>}
          </button>
        </div>
        {actionLink && !isDone && (
          <Link href={actionLink} className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)]">
            {t("ielts.studyPlan.task.start")}
          </Link>
        )}
      </div>

      {expanded && !isDone && hasDetails && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2.5 pl-12 space-y-2">
          {task.details && (
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{task.details}</p>
          )}
          {task.howTo && (
            <div className="rounded-[var(--radius-sm)] border border-blue-500/20 bg-blue-500/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{t("ielts.studyPlan.task.howTo")}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{task.howTo}</p>
            </div>
          )}
          {task.whatToAvoid && (
            <div className="rounded-[var(--radius-sm)] border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{t("ielts.studyPlan.task.whatToAvoid")}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{task.whatToAvoid}</p>
            </div>
          )}
          {task.whyItMatters && (
            <div className="rounded-[var(--radius-sm)] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{t("ielts.studyPlan.task.whyItMatters")}</p>
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

// ── Placement Check ─────────────────────────────────────────────────────────
//
// Four-skill diagnostic: 4 reading MCQ + 4 listening MCQ + 1 writing micro
// prompt (50-80 words, LLM-scored) + 1 speaking micro prompt (~30s, browser
// records audio and transcribes via the Web Speech API, transcript is LLM-
// scored). The result pre-fills wizardData.currentBand (overall band) and
// wizardData.weakSections (skills more than 0.5 below the mean). Every step
// is optional — users can skip the whole diagnostic or any individual skill.
//
// No audio leaves the browser; only the live transcript is sent.

const PLACEMENT_SPEAKING_SECONDS = 30;

function PlacementCheck({
  onAccept,
  onSkip,
}: {
  onAccept: (data: { band: string; weakSkills: string[] }) => void;
  onSkip: () => void;
}) {
  const { t } = useLocale();
  const [stage, setStage] = useState<
    "intro" | "loading" | "questions" | "writing" | "speaking" | "scoring" | "result" | "error"
  >("intro");
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [writingPrompt, setWritingPrompt] = useState("");
  const [speakingPrompt, setSpeakingPrompt] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [writingText, setWritingText] = useState("");
  const [speakingTranscript, setSpeakingTranscript] = useState("");
  const [result, setResult] = useState<PlacementScoreResult | null>(null);

  async function startTest() {
    setStage("loading");
    try {
      const data = await getStudyPlanPlacement();
      if (!data.questions || data.questions.length === 0) {
        setStage("error");
        return;
      }
      setQuestions(data.questions);
      setWritingPrompt(data.writingPrompt ?? "");
      setSpeakingPrompt(data.speakingPrompt ?? "");
      setAnswers({});
      setIndex(0);
      setWritingText("");
      setSpeakingTranscript("");
      setStage("questions");
    } catch {
      setStage("error");
    }
  }

  async function submitScore(payload: { writingText: string; speakingTranscript: string }) {
    setStage("scoring");
    try {
      const readingAnswers: Record<string, string> = {};
      const listeningAnswers: Record<string, string> = {};
      for (const q of questions) {
        const a = answers[q.id];
        if (!a) continue;
        if (q.section === "reading") readingAnswers[q.id] = a;
        else if (q.section === "listening") listeningAnswers[q.id] = a;
      }
      const data = await scoreStudyPlanPlacement({
        readingAnswers,
        listeningAnswers,
        writingText: payload.writingText,
        writingPrompt,
        speakingTranscript: payload.speakingTranscript,
        speakingPrompt,
      });
      setResult(data);
      setStage("result");
    } catch {
      setStage("error");
    }
  }

  if (stage === "intro") {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)]">
            <Target className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.placement.title")}</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("ielts.studyPlan.placement.intro")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={startTest}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("ielts.studyPlan.placement.startButton")}
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            {t("ielts.studyPlan.placement.skipButton")}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-secondary)]">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--primary)]" aria-hidden="true" />
        <p className="mt-3">{t("ielts.studyPlan.placement.loading")}</p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="space-y-3">
        <ErrorBanner message={t("ielts.studyPlan.placement.loadError")} />
        <div className="flex gap-2">
          <Button onClick={startTest}>{t("ielts.studyPlan.placement.retakeButton")}</Button>
          <Button variant="ghost" onClick={onSkip}>{t("ielts.studyPlan.placement.skipButton")}</Button>
        </div>
      </div>
    );
  }

  if (stage === "scoring") {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-secondary)]">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--primary)]" aria-hidden="true" />
        <p className="mt-3">{t("ielts.studyPlan.placement.scoring")}</p>
      </div>
    );
  }

  if (stage === "writing") {
    return (
      <PlacementWritingStep
        prompt={writingPrompt}
        value={writingText}
        onChange={setWritingText}
        onSubmit={() => setStage("speaking")}
        onSkip={() => {
          setWritingText("");
          setStage("speaking");
        }}
      />
    );
  }

  if (stage === "speaking") {
    return (
      <PlacementSpeakingStep
        prompt={speakingPrompt}
        onSubmit={(transcript) => {
          setSpeakingTranscript(transcript);
          void submitScore({ writingText, speakingTranscript: transcript });
        }}
        onSkip={() => {
          setSpeakingTranscript("");
          void submitScore({ writingText, speakingTranscript: "" });
        }}
      />
    );
  }

  if (stage === "result" && result) {
    return (
      <PlacementResultPanel
        result={result}
        onAccept={() =>
          onAccept({
            band: result.estimatedBand,
            weakSkills: result.weakSkills ?? [],
          })
        }
        onRetake={startTest}
      />
    );
  }

  // stage === "questions"
  const q = questions[index];
  if (!q) return null;
  const isLast = index === questions.length - 1;
  const sectionPill = q.section === "reading"
    ? t("ielts.studyPlan.placement.readingPill")
    : t("ielts.studyPlan.placement.listeningPill");

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
          {sectionPill}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {t("ielts.studyPlan.placement.questionN", { i: index + 1, total: questions.length })}
        </span>
      </div>

      {q.section === "listening" && q.content && (
        <p className="mt-3 text-[10px] uppercase tracking-wider text-amber-400">{t("ielts.studyPlan.placement.audioWarn")}</p>
      )}

      {q.content && (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs leading-6 text-[var(--text-secondary)] whitespace-pre-wrap">
          {q.content}
        </div>
      )}

      <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{q.title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{q.prompt}</p>

      <div className="mt-4 space-y-2" role="radiogroup" aria-label={q.title}>
        {q.options.map((opt, i) => {
          const value = String.fromCharCode(65 + i); // A, B, C, ...
          const checked = answers[q.id] === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 text-sm transition-all ${
                checked ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <input
                type="radio"
                name={q.id}
                value={value}
                checked={checked}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                className="mt-0.5 accent-[var(--primary)]"
              />
              <span className="flex-1 text-[var(--text-primary)]">
                <span className="font-semibold">{value}.</span> {opt}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("ielts.studyPlan.placement.previous")}
        </Button>
        {isLast ? (
          <Button onClick={() => setStage("writing")} disabled={!answers[q.id]}>
            {t("ielts.studyPlan.placement.next")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={!answers[q.id]}
          >
            {t("ielts.studyPlan.placement.next")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Placement Writing step ─────────────────────────────────────────────────

function PlacementWritingStep({
  prompt,
  value,
  onChange,
  onSubmit,
  onSkip,
}: {
  prompt: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const { t } = useLocale();
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const targetMin = 50;
  const targetMax = 80;
  const meetsMin = wordCount >= targetMin;

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
          <PenLine className="h-5 w-5 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.placement.writingTitle")}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {t("ielts.studyPlan.placement.writingIntro")}
      </p>

      {prompt && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-sm leading-6 text-[var(--text-primary)]">
          {prompt}
        </div>
      )}

      <label htmlFor="placement-writing" className="sr-only">
        {t("ielts.studyPlan.placement.writingTitle")}
      </label>
      <textarea
        id="placement-writing"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
        placeholder={t("ielts.studyPlan.placement.writingPlaceholder")}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className={
            meetsMin
              ? "text-emerald-400"
              : "text-[var(--text-muted)]"
          }
        >
          {t("ielts.studyPlan.placement.wordCount", {
            n: wordCount,
            min: targetMin,
            max: targetMax,
          })}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onSkip}>
          {t("ielts.studyPlan.placement.skipStep")}
        </Button>
        <Button onClick={onSubmit} disabled={!meetsMin}>
          {t("ielts.studyPlan.placement.next")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ── Placement Speaking step ────────────────────────────────────────────────

function PlacementSpeakingStep({
  prompt,
  onSubmit,
  onSkip,
}: {
  prompt: string;
  onSubmit: (transcript: string) => void;
  onSkip: () => void;
}) {
  const { t } = useLocale();
  const {
    audioUrl,
    clearRecording,
    detectedTranscript,
    error,
    isRecording,
    isStarting,
    startRecording,
    stopRecording,
    supportsRecording,
    supportsSpeechRecognition,
  } = useSpeakingRecorder();

  // Live 30-second countdown that auto-stops the recording when it expires.
  const [secondsLeft, setSecondsLeft] = useState(PLACEMENT_SPEAKING_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setSecondsLeft(PLACEMENT_SPEAKING_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, stopRecording]);

  const canSubmit = Boolean(audioUrl) && !isRecording;

  if (!supportsRecording) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
            <Mic className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.placement.speakingTitle")}</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("ielts.studyPlan.placement.recorderUnavailable")}
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={onSkip}>{t("ielts.studyPlan.placement.skipStep")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
          <Mic className="h-5 w-5 text-rose-400" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.placement.speakingTitle")}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {t("ielts.studyPlan.placement.speakingIntro")}
      </p>

      {prompt && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-sm leading-6 text-[var(--text-primary)]">
          {prompt}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <Button onClick={startRecording} disabled={isStarting}>
            <Mic className="h-4 w-4" aria-hidden="true" />
            {isStarting
              ? t("ielts.studyPlan.placement.recStarting")
              : audioUrl
                ? t("ielts.studyPlan.placement.recRetry")
                : t("ielts.studyPlan.placement.recStart")}
          </Button>
        ) : (
          <Button onClick={stopRecording}>
            <PauseCircle className="h-4 w-4" aria-hidden="true" />
            {t("ielts.studyPlan.placement.recStop")}
          </Button>
        )}
        {audioUrl && !isRecording ? (
          <Button variant="secondary" onClick={clearRecording}>
            {t("ielts.studyPlan.placement.recClear")}
          </Button>
        ) : null}
        {isRecording ? (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
            {t("ielts.studyPlan.placement.recCountdown", { s: secondsLeft })}
          </span>
        ) : null}
      </div>

      {audioUrl && !isRecording ? (
        <div className="mt-4 space-y-3">
          <audio controls src={audioUrl} className="w-full">
            <track kind="captions" />
          </audio>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs leading-6 text-[var(--text-secondary)]">
            {detectedTranscript
              ? detectedTranscript
              : supportsSpeechRecognition
                ? t("ielts.studyPlan.placement.transcriptEmpty")
                : t("ielts.studyPlan.placement.transcriptUnsupported")}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">
        {t("ielts.studyPlan.placement.audioPrivacy")}
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onSkip}>
          {t("ielts.studyPlan.placement.skipStep")}
        </Button>
        <Button onClick={() => onSubmit(detectedTranscript.trim())} disabled={!canSubmit}>
          {t("ielts.studyPlan.placement.finish")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ── Placement Result panel ─────────────────────────────────────────────────

function PlacementResultPanel({
  result,
  onAccept,
  onRetake,
}: {
  result: PlacementScoreResult;
  onAccept: () => void;
  onRetake: () => void;
}) {
  const { t } = useLocale();
  const skills: Array<{ key: string; label: string; band: number | null; note?: string }> = [
    {
      key: "reading",
      label: t("ielts.skill.reading"),
      band: result.readingBand,
      note:
        result.readingTotal > 0
          ? `${result.readingCorrect}/${result.readingTotal}`
          : t("ielts.studyPlan.placement.skipped"),
    },
    {
      key: "listening",
      label: t("ielts.skill.listening"),
      band: result.listeningBand,
      note:
        result.listeningTotal > 0
          ? `${result.listeningCorrect}/${result.listeningTotal}`
          : t("ielts.studyPlan.placement.skipped"),
    },
    {
      key: "writing",
      label: t("ielts.skill.writing"),
      band: result.writingBand,
      note: result.writingFeedback || (result.writingBand == null ? t("ielts.studyPlan.placement.skipped") : ""),
    },
    {
      key: "speaking",
      label: t("ielts.skill.speaking"),
      band: result.speakingBand,
      note: result.speakingFeedback || (result.speakingBand == null ? t("ielts.studyPlan.placement.skipped") : ""),
    },
  ];

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("ielts.studyPlan.placement.resultTitle")}</h2>
      </div>
      <p className="mt-4 text-2xl font-bold text-[var(--primary)]">
        {t("ielts.studyPlan.placement.resultBand", {
          band: result.overallBand != null ? result.overallBand.toFixed(1) : result.estimatedBand,
        })}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {skills.map((s) => (
          <div
            key={s.key}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {s.label}
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {s.band != null ? s.band.toFixed(1) : "—"}
              </span>
            </div>
            {s.note ? (
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">{s.note}</p>
            ) : null}
          </div>
        ))}
      </div>

      {result.weakSkills && result.weakSkills.length > 0 ? (
        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          {t("ielts.studyPlan.placement.weakSkillsLabel", {
            skills: result.weakSkills.join(", "),
          })}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-[var(--text-muted)]">{t("ielts.studyPlan.placement.note")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onAccept}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          {t("ielts.studyPlan.placement.acceptButton")}
        </Button>
        <Button variant="ghost" onClick={onRetake}>
          {t("ielts.studyPlan.placement.retakeButton")}
        </Button>
      </div>
    </div>
  );
}
