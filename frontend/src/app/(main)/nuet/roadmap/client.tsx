"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Flag } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

type WeekPlan = {
  week: number | string;
  focus: string;
  tasks: string[];
  milestone?: string;
};

type Plan = {
  key: "intensive" | "steady";
  weeks: WeekPlan[];
};

const INTENSIVE_PLAN: Plan = {
  key: "intensive",
  weeks: [
    {
      week: 1,
      focus: "Diagnostic + foundations",
      tasks: [
        "Sit one full mock without preparation — establish a baseline score.",
        "Read every Math topic explanation in the platform; note which feel weakest.",
        "Watch 2–3 Khan Academy videos per weak topic (algebra, geometry, trig).",
        "Memorise the basic formulas: quadratic, distance, area, trig ratios.",
      ],
      milestone: "Baseline mock score recorded; weak-topic shortlist (5–7 items) written down.",
    },
    {
      week: 2,
      focus: "Math intensive — algebra + geometry",
      tasks: [
        "Drill: Algebraic Simplification (10 questions/day for 5 days).",
        "Drill: Coordinate Geometry, Parallel/Perpendicular lines, Circle Theorems.",
        "Solve 2 PDF mocks Math-only (untimed).",
        "Re-read explanations after every wrong answer.",
      ],
      milestone: "Math-section score in section practice ≥ 80/120.",
    },
    {
      week: 3,
      focus: "Math intensive — trig, vectors, 3D, graphs",
      tasks: [
        "Drill: Trigonometry in Right-Angled Triangle, Vectors, Bearings.",
        "Drill: Compound 3D Figures (cylinder/sphere/cone surface area + volume).",
        "Drill: Graph Transformation, Vertex of Parabola, Real-life Velocity-Time.",
        "Solve 2 PDF mocks Math-only (timed: 60 minutes).",
      ],
      milestone: "Math section in 60 minutes with ≥ 22/30 correct.",
    },
    {
      week: 4,
      focus: "Critical Thinking intensive",
      tasks: [
        "Read all 5 CT topic explanations on the platform.",
        "Drill: Data Interpretation (charts, percentage change traps).",
        "Drill: Argument Analysis (assumption, weaken, strengthen patterns).",
        "Drill: Logical Reasoning (must be true vs could be true).",
        "Solve 2 PDF mocks CT-only (timed: 60 minutes).",
      ],
      milestone: "CT section ≥ 22/30 within time.",
    },
    {
      week: 5,
      focus: "Full mocks under exam conditions",
      tasks: [
        "Sit 3 full mocks (60 questions × 120 minutes) using strict mode.",
        "Review every wrong answer — write a 1-line lesson per mistake.",
        "Re-drill the 2 weakest topics from your error log.",
        "Sleep on a regular schedule; no late-night cramming.",
      ],
      milestone: "Two consecutive mocks ≥ 160/240.",
    },
    {
      week: 6,
      focus: "Polish + exam-week routine",
      tasks: [
        "Sit 2 full mocks early in the week, focus on pacing.",
        "Stop drilling 2 days before the exam; only review notes.",
        "Day before: walk through formula sheet, sleep early.",
        "Exam day: arrive 30 min early, eat a normal breakfast.",
      ],
      milestone: "Confident pacing: never spend > 2 minutes on a single question.",
    },
  ],
};

const STEADY_PLAN: Plan = {
  key: "steady",
  weeks: [
    {
      week: 1,
      focus: "Orientation",
      tasks: [
        "Sit 1 baseline mock (untimed if needed).",
        "Read all 17 Math + 5 CT topic explanations.",
        "Set up a daily 45-minute study slot.",
      ],
      milestone: "Baseline score + study calendar set.",
    },
    {
      week: 2,
      focus: "Algebra + percentages",
      tasks: [
        "Drill Algebraic Simplification, Direct/Inverse Proportion, Percentages.",
        "10 questions per day; focus on showing work, not speed.",
      ],
    },
    {
      week: 3,
      focus: "Geometry — lines + triangles",
      tasks: [
        "Drill Coordinate Geometry, Parallel/Perpendicular, Circle Theorems.",
        "Memorise: midpoint, slope, distance formulas.",
      ],
    },
    {
      week: 4,
      focus: "Geometry — quadrilaterals + 3D",
      tasks: [
        "Drill Rhombus/Kite/Trapezium, Compound 3D Figures.",
        "Mid-month: 1 timed Math-only PDF mock.",
      ],
      milestone: "Math-only mock ≥ 18/30 in 60 minutes.",
    },
    {
      week: 5,
      focus: "Trigonometry + vectors",
      tasks: [
        "Drill Trigonometry, Vectors, Bearings.",
        "Practice converting word problems into diagrams.",
      ],
    },
    {
      week: 6,
      focus: "Functions + graphs",
      tasks: [
        "Drill Graph Transformation, Vertex of Parabola, Velocity-Time graphs.",
        "Sit 1 full mock (untimed) — focus on understanding, not speed.",
      ],
      milestone: "Full mock ≥ 130/240.",
    },
    {
      week: 7,
      focus: "Number sense",
      tasks: [
        "Drill Recurring Decimals, Significant Figures / Standard Form.",
        "Drill Exponents (bases 2, 3, 5).",
      ],
    },
    {
      week: 8,
      focus: "CT — data + patterns",
      tasks: [
        "Drill Data Interpretation, Pattern Recognition.",
        "Read every chart axis and footnote — do not skim.",
      ],
    },
    {
      week: 9,
      focus: "CT — arguments + logic",
      tasks: [
        "Drill Argument Analysis, Logical Reasoning.",
        "Practice the 'must be true' vs 'could be true' distinction daily.",
      ],
      milestone: "CT-only mock ≥ 20/30.",
    },
    {
      week: 10,
      focus: "Full mock 1 + review",
      tasks: [
        "Sit 1 full mock under strict mode.",
        "Spend 2–3 days reviewing every wrong answer.",
        "Re-drill the 3 weakest topics.",
      ],
    },
    {
      week: 11,
      focus: "Full mock 2 + pacing",
      tasks: [
        "Sit 1 full mock, focus on pacing (never > 2 min/question).",
        "Re-drill error log topics.",
      ],
      milestone: "Mock ≥ 170/240.",
    },
    {
      week: 12,
      focus: "Final week",
      tasks: [
        "Sit 1 final mock early in the week.",
        "Stop drilling 2 days before the exam.",
        "Light review only; sleep well.",
      ],
    },
  ],
};

export function RoadmapPlanTabs() {
  const { t } = useLocale();
  const [active, setActive] = useState<Plan["key"]>("intensive");
  const plan = active === "intensive" ? INTENSIVE_PLAN : STEADY_PLAN;
  const labelByKey = {
    intensive: t("nuet.roadmap.plan6"),
    steady: t("nuet.roadmap.plan12"),
  };

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        {(["intensive", "steady"] as const).map((key) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
              }`}
            >
              <Calendar className="h-4 w-4" />
              {labelByKey[key]}
            </button>
          );
        })}
      </div>

      <ol className="mt-5 space-y-3">
        {plan.weeks.map((week) => (
          <li
            key={`${plan.key}-${week.week}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="rounded-full bg-[var(--bg-base)] px-3 py-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
                {t("nuet.roadmap.weekLabel")} {week.week}
              </span>
              <p className="text-base font-semibold text-[var(--text-primary)]">{week.focus}</p>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t("nuet.roadmap.tasksLabel")}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {week.tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {week.milestone ? (
                <aside className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 lg:max-w-[260px]">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    <Flag className="h-3 w-3" />
                    {t("nuet.roadmap.milestoneLabel")}
                  </p>
                  <p className="mt-1 text-xs text-emerald-900">{week.milestone}</p>
                </aside>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
