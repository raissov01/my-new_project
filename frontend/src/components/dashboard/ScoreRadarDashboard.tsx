"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface ScoreEntry {
  label: string;
  date: string;
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
}

interface Props {
  scoreHistory: ScoreEntry[];
}

const AXES = ["Reading", "Writing", "Listening", "Speaking"] as const;
type Axis = typeof AXES[number];

const AXIS_KEYS: Record<Axis, keyof ScoreEntry> = {
  Reading: "reading", Writing: "writing", Listening: "listening", Speaking: "speaking",
};

function buildSparklines(history: ScoreEntry[]): Record<Axis, number[]> {
  return {
    Reading:   history.map((e) => e.reading),
    Writing:   history.map((e) => e.writing),
    Listening: history.map((e) => e.listening),
    Speaking:  history.map((e) => e.speaking),
  };
}

const MIN = 0;
const MAX = 9;

function toXY(value: number, axisIndex: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (Math.PI * 2 * axisIndex) / total - Math.PI / 2;
  const r = ((value - MIN) / (MAX - MIN)) * radius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function axisLabelPos(axisIndex: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (Math.PI * 2 * axisIndex) / total - Math.PI / 2;
  const r = radius + 22;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function polygonPoints(scores: number[], total: number, radius: number, cx: number, cy: number) {
  return scores.map((s, i) => {
    const p = toXY(s, i, total, radius, cx, cy);
    return `${p.x},${p.y}`;
  }).join(" ");
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpScores(a: ScoreEntry, b: ScoreEntry, t: number): number[] {
  return AXES.map(ax => lerp(a[AXIS_KEYS[ax]] as number, b[AXIS_KEYS[ax]] as number, t));
}

function bandAvg(entry: ScoreEntry) {
  return ((entry.reading + entry.writing + entry.listening + entry.speaking) / 4).toFixed(1);
}

export default function ScoreRadarDashboard({ scoreHistory }: Props) {
  const sparklines = buildSparklines(scoreHistory);
  const [sliderIndex, setSliderIndex] = useState(scoreHistory.length - 1);
  const [animFrac, setAnimFrac] = useState(0);
  const [targetBand, setTargetBand] = useState(8.0);
  const [activeAxis, setActiveAxis] = useState<Axis | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: ScoreEntry; label: string } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [rotY, setRotY] = useState(0);
  const rafRef = useRef<number | null>(null);
  const mountRef = useRef(false);
  const isMobile = useRef(false);

  // Detect mobile
  useEffect(() => {
    isMobile.current = window.innerWidth < 768;
  }, []);

  // Entry animation: scale from 0 → 1
  useEffect(() => {
    mountRef.current = true;
    let start: number | null = null;
    const duration = 1500;
    function tick(ts: number) {
      if (!start) start = ts;
      const frac = Math.min((ts - start) / duration, 1);
      // ease out cubic
      setAnimFrac(1 - Math.pow(1 - frac, 3));
      if (frac < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Y-axis slow rotation
  useEffect(() => {
    if (hovered) return;
    let raf: number;
    function tick() {
      setRotY(r => (r + 0.12) % 360);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  // SVG dimensions
  const SIZE = 260;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 90;
  const n = AXES.length;

  const current = scoreHistory[scoreHistory.length - 1];
  const first   = scoreHistory[0];
  const mid     = scoreHistory.length > 2 ? scoreHistory[1] : null;

  // Animated current scores (counts up from 0)
  const animatedScores = AXES.map(ax => (current[AXIS_KEYS[ax]] as number) * animFrac);

  // Target ghost scores
  const targetScores = AXES.map(() => targetBand);

  // Grid circles
  const gridLevels = [2, 4, 6, 8];

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderIndex(Number(e.target.value));
  }, []);

  const sliderEntry = scoreHistory[sliderIndex];

  // Which entry is displayed on radar via slider
  const displayedScores = AXES.map(ax => sliderEntry[AXIS_KEYS[ax]] as number);

  // Use animated scores only on initial load (animFrac < 1), then full scores
  const radarScores = animFrac < 1 ? animatedScores : displayedScores;

  const currentBand = bandAvg(sliderEntry);

  return (
    <section className="mb-6 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">IELTS Прогресс</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">Балл картасы</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" /></span>
            Белсенді
          </span>
        </div>
      </div>

      {/* Body: left radar + right cards */}
      <div className="grid md:grid-cols-[3fr_2fr]">

        {/* ── LEFT: Radar ── */}
        <div className="flex flex-col items-center justify-center gap-4 border-b border-[var(--border)] p-5 sm:p-7 md:border-b-0 md:border-r">

          {/* 3D wrapper */}
          <div
            className="relative select-none"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setTooltip(null); }}
            style={{
              perspective: "600px",
            }}
          >
            <div
              style={{
                transform: isMobile.current
                  ? "none"
                  : `rotateX(15deg) rotateY(${rotY}deg)`,
                transition: hovered ? "transform 0.3s ease" : "none",
              }}
            >
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="overflow-visible"
              >
                <defs>
                  <radialGradient id="radar-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#5533ff" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#00ccaa" stopOpacity="0.15" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <linearGradient id="stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5533ff" />
                    <stop offset="100%" stopColor="#00ccaa" />
                  </linearGradient>
                </defs>

                {/* Grid circles */}
                {gridLevels.map(lvl => (
                  <circle
                    key={lvl}
                    cx={CX} cy={CY}
                    r={(lvl / MAX) * R}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Grid score labels */}
                {gridLevels.map(lvl => (
                  <text key={`lbl-${lvl}`} x={CX + 4} y={CY - (lvl / MAX) * R + 4} fontSize="8" fill="var(--text-muted)" opacity="0.7">{lvl}</text>
                ))}

                {/* Axis lines */}
                {AXES.map((_, i) => {
                  const end = toXY(MAX, i, n, R, CX, CY);
                  return <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="var(--border-strong)" strokeWidth="1" />;
                })}

                {/* First attempt — muted red dashed */}
                <polygon
                  points={polygonPoints(AXES.map(ax => first[AXIS_KEYS[ax]] as number), n, R, CX, CY)}
                  fill="rgba(239,68,68,0.08)"
                  stroke="rgba(239,68,68,0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                  className="cursor-pointer"
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, entry: first, label: first.label })}
                  onMouseLeave={() => setTooltip(null)}
                />

                {/* Mid attempt — muted yellow */}
                {mid && (
                  <polygon
                    points={polygonPoints(AXES.map(ax => mid[AXIS_KEYS[ax]] as number), n, R, CX, CY)}
                    fill="rgba(234,179,8,0.10)"
                    stroke="rgba(234,179,8,0.55)"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, entry: mid, label: mid.label })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}

                {/* Target ghost shape */}
                <polygon
                  points={polygonPoints(targetScores, n, R, CX, CY)}
                  fill="rgba(85,51,255,0.06)"
                  stroke="rgba(85,51,255,0.25)"
                  strokeWidth="1"
                  strokeDasharray="5,4"
                />

                {/* Current / animated shape */}
                <polygon
                  points={polygonPoints(radarScores, n, R, CX, CY)}
                  fill="url(#radar-grad)"
                  stroke="url(#stroke-grad)"
                  strokeWidth="2.5"
                  filter="url(#glow)"
                  className="cursor-pointer"
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, entry: current, label: current.label })}
                  onMouseLeave={() => setTooltip(null)}
                />

                {/* Axis dots on current shape */}
                {radarScores.map((s, i) => {
                  const p = toXY(s, i, n, R, CX, CY);
                  const ax = AXES[i];
                  return (
                    <circle
                      key={i}
                      cx={p.x} cy={p.y} r="4"
                      fill={activeAxis === ax ? "#00ccaa" : "#5533ff"}
                      stroke="white"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onClick={() => setActiveAxis(prev => prev === ax ? null : ax)}
                    />
                  );
                })}

                {/* Axis labels */}
                {AXES.map((ax, i) => {
                  const pos = axisLabelPos(i, n, R, CX, CY);
                  const isActive = activeAxis === ax;
                  return (
                    <text
                      key={ax}
                      x={pos.x} y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fontWeight={isActive ? "800" : "600"}
                      fill={isActive ? "#5533ff" : "var(--text-secondary)"}
                      className="cursor-pointer"
                      onClick={() => setActiveAxis(prev => prev === ax ? null : ax)}
                    >
                      {ax}
                    </text>
                  );
                })}

                {/* Center band badge background */}
                <circle cx={CX} cy={CY} r="26" fill="var(--bg-surface)" stroke="url(#stroke-grad)" strokeWidth="1.5" />
              </svg>

              {/* Band score pill — overlaid in center */}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ filter: "drop-shadow(0 0 8px rgba(85,51,255,0.5))" }}
              >
                <span className="flex flex-col items-center justify-center rounded-full bg-[var(--bg-surface)] px-2 py-1 text-center">
                  <span className="text-[10px] font-bold leading-none text-[var(--text-muted)]">Band</span>
                  <span className="mt-0.5 text-base font-extrabold leading-none tracking-tight text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#5533ff,#00ccaa)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
                    {currentBand}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full border border-dashed border-red-400/60 bg-red-400/15" /> {first.label}</span>
            {mid && <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full border border-yellow-400/60 bg-yellow-400/15" /> {mid.label}</span>}
            <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full" style={{ background: "linear-gradient(90deg,#5533ff,#00ccaa)" }} /> {current.label}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full border border-dashed border-purple-400/40 bg-purple-400/10" /> Мақсат</span>
          </div>

          {/* Timeline slider */}
          <div className="w-full max-w-[280px]">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Уақыт шкаласы</span>
              <span className="font-semibold text-[var(--text-secondary)]">{sliderEntry.label} ({sliderEntry.date})</span>
            </div>
            <input
              type="range"
              min={0}
              max={scoreHistory.length - 1}
              step={1}
              value={sliderIndex}
              onChange={handleSliderChange}
              className="w-full accent-purple-500"
              style={{ cursor: "pointer" }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
              {scoreHistory.map((e, i) => (
                <span key={i} className={i === sliderIndex ? "font-bold text-purple-500" : ""}>{e.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Score cards + target ── */}
        <div className="flex flex-col gap-3 p-5 sm:p-6">

          {/* 4 skill cards */}
          <div className="grid grid-cols-2 gap-3">
            {AXES.map(ax => {
              const curScore = current[AXIS_KEYS[ax]] as number;
              const firstScore = first[AXIS_KEYS[ax]] as number;
              const delta = +(curScore - firstScore).toFixed(1);
              const isWeak = curScore < 6.5;
              const isActive = activeAxis === ax;
              const sparks = sparklines[ax];
              const sparkMax = Math.max(...sparks);
              const sparkMin = Math.min(...sparks);

              return (
                <button
                  key={ax}
                  onClick={() => setActiveAxis(prev => prev === ax ? null : ax)}
                  className={[
                    "relative flex flex-col rounded-[var(--radius-lg)] border p-3 text-left transition-all",
                    isActive
                      ? "border-purple-500/60 bg-purple-500/10 shadow-[0_0_12px_rgba(85,51,255,0.2)]"
                      : "border-[var(--border)] bg-[var(--bg-soft)] hover:border-[var(--border-strong)]",
                  ].join(" ")}
                >
                  {isWeak && (
                    <span className="absolute right-2 top-2 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-500">
                      Əлсіз
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">{ax}</span>
                  <span className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
                    {curScore.toFixed(1)}
                  </span>
                  <span className={`mt-0.5 text-[11px] font-bold ${delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(1)} ↑
                  </span>

                  {/* Sparkline */}
                  <div className="mt-2 flex h-8 items-end gap-0.5">
                    {sparks.map((v, i) => {
                      const h = sparkMax === sparkMin ? 1 : (v - sparkMin) / (sparkMax - sparkMin);
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${Math.max(h * 100, 12)}%`,
                            background: i === sparks.length - 1
                              ? "linear-gradient(180deg,#5533ff,#00ccaa)"
                              : "var(--bg-muted)",
                          }}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Target section */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Мақсат (Target)</p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Мақсат балл</span>
              <span className="font-extrabold text-[var(--text-primary)]" style={{ color: "#5533ff" }}>
                Band {targetBand.toFixed(1)}
              </span>
            </div>

            <input
              type="range"
              min={6.0} max={9.0} step={0.5}
              value={targetBand}
              onChange={e => setTargetBand(Number(e.target.value))}
              className="mt-2 w-full accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(v => (
                <span key={v} className={targetBand === v ? "font-bold text-purple-500" : ""}>{v}</span>
              ))}
            </div>

            <PaceEstimate current={current} target={targetBand} />

            <a
              href="/ielts"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#5533ff,#00ccaa)" }}
            >
              Жаттығуды бастау →
            </a>
          </div>
        </div>
      </div>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs shadow-[var(--shadow-lg)]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="mb-1.5 font-bold text-[var(--text-primary)]">{tooltip.label}</p>
          {AXES.map(ax => (
            <p key={ax} className="text-[var(--text-secondary)]">
              {ax}: <span className="font-semibold text-[var(--text-primary)]">{(tooltip.entry[AXIS_KEYS[ax]] as number).toFixed(1)}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function PaceEstimate({ current, target }: { current: ScoreEntry; target: number }) {
  const avg = (current.reading + current.writing + current.listening + current.speaking) / 4;
  const gap = target - avg;

  if (gap <= 0) {
    return <p className="mt-2 text-xs font-semibold text-emerald-500">Мақсатыңа жеттің! 🎉</p>;
  }

  // Rough estimate: ~0.5 band per 2 months of practice
  const months = Math.ceil(gap / 0.5) * 2;
  const text = months <= 2
    ? "~1–2 ай жаттықсаң жетесің"
    : months <= 4
    ? `~${months} ай жаттықсаң жетесің`
    : `~${months} ай (жүйелі жаттықсаң)`;

  return (
    <p className="mt-2 text-xs text-[var(--text-muted)]">
      Саған қанша уақыт керек:{" "}
      <span className="font-semibold text-[var(--text-secondary)]">{text}</span>
    </p>
  );
}
