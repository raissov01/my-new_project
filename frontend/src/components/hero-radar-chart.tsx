"use client";

import { useEffect, useRef } from "react";

// ── Geometry constants ───────────────────────────────────────────────────────
const CX = 190; // SVG horizontal centre
const CY = 160; // SVG vertical centre
const R  = 110; // max radius
const MAX = 9;  // max IELTS band

// Axes: [label, angleDeg, text-anchor, labelOffsetX, labelOffsetY]
// Angles use SVG convention (0° = right, 90° = down)
const AXES: [string, number, "middle" | "start" | "end", number, number][] = [
  ["Reading",   -90, "middle",  0,   -15],
  ["Listening",   0, "start",   14,    4],
  ["Writing",    90, "middle",  0,    18],
  ["Speaking",  180, "end",    -14,    4],
];

// Scores: same order as AXES [Reading, Listening, Writing, Speaking]
const AVG_SCORES = [5.5, 6.0, 5.0, 5.5];
const STU_SCORES = [7.5, 8.0, 7.0, 7.5];

// Grid rings at these band levels
const GRID_BANDS = [3, 5, 7, 9];
// Band labels shown on right axis (skip 9 to avoid overlap with axis label)
const LABEL_BANDS = [3, 5, 7];

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcPt(score: number, angleDeg: number): [number, number] {
  const r = (score / MAX) * R;
  const a = (angleDeg * Math.PI) / 180;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
}

function toPolygonPoints(scores: number[]): string {
  return AXES.map(([, angleDeg], i) => {
    const [x, y] = calcPt(scores[i], angleDeg);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function diamondAt(band: number): string {
  const r = (band / MAX) * R;
  return `${CX},${CY - r} ${CX + r},${CY} ${CX},${CY + r} ${CX - r},${CY}`;
}

// easeOutCubic
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const CENTRE_PTS = `${CX},${CY} ${CX},${CY} ${CX},${CY} ${CX},${CY}`;

// ── Component ────────────────────────────────────────────────────────────────
export function HeroRadarChart() {
  const avgRef = useRef<SVGPolygonElement>(null);
  const stuRef = useRef<SVGPolygonElement>(null);
  const rafRef = useRef<number>(0);

  // Animate polygon points from 0 → final on mount
  useEffect(() => {
    const start = performance.now();
    const dur   = 2000;

    const tick = (now: number) => {
      const p = ease(Math.min((now - start) / dur, 1));
      avgRef.current?.setAttribute("points", toPolygonPoints(AVG_SCORES.map(s => s * p)));
      stuRef.current?.setAttribute("points", toPolygonPoints(STU_SCORES.map(s => s * p)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Pre-compute static SVG positions
  const axisEndpts  = AXES.map(([, ang]) => calcPt(MAX, ang));
  const bandLblPts  = LABEL_BANDS.map(b => calcPt(b, 0)); // on right axis

  return (
    <div className="radar-outer">
      {/* Glowing "Band 7.5" pill badge */}
      <div className="radar-band-badge" aria-label="Overall IELTS Band Score 7.5">
        <span className="radar-band-badge-dot" />
        Band&nbsp;7.5
      </div>

      {/* 3-D rotating wrapper */}
      <div className="radar-spin-wrapper">
        <div className="radar-inner-scale">
          <div className="radar-panel">
            <svg
              viewBox="0 0 380 325"
              width="100%"
              style={{ maxWidth: 380, display: "block" }}
              role="img"
              aria-label="IELTS score radar chart comparing average student vs StudyWithRaissov student"
            >
              <defs>
                {/* Fill gradient for student polygon */}
                <linearGradient id="rdr-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#5533ff" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#00ccaa" stopOpacity="0.38" />
                </linearGradient>

                {/* Stroke gradient for student polygon */}
                <linearGradient
                  id="rdr-stroke"
                  gradientUnits="userSpaceOnUse"
                  x1="90" y1="65" x2="290" y2="255"
                >
                  <stop offset="0%"   stopColor="#5533ff" />
                  <stop offset="100%" stopColor="#00ccaa" />
                </linearGradient>
              </defs>

              {/* ── Grid diamond rings ─────────────────────────────── */}
              {GRID_BANDS.map(b => (
                <polygon
                  key={b}
                  points={diamondAt(b)}
                  fill="none"
                  stroke={b === 9 ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.07)"}
                  strokeWidth="1"
                  strokeDasharray={b === 9 ? undefined : "4,3"}
                />
              ))}

              {/* ── Axis lines ────────────────────────────────────── */}
              {axisEndpts.map(([x, y], i) => (
                <line
                  key={i}
                  x1={CX} y1={CY} x2={x} y2={y}
                  stroke="rgba(255,255,255,0.11)"
                  strokeWidth="1"
                />
              ))}

              {/* ── Band score labels on right axis ───────────────── */}
              {bandLblPts.map(([x, y], i) => (
                <text
                  key={LABEL_BANDS[i]}
                  x={x + 5}
                  y={y - 3}
                  fontSize="8.5"
                  fill="rgba(255,255,255,0.28)"
                  fontFamily="inherit"
                >
                  {LABEL_BANDS[i]}
                </text>
              ))}

              {/* ── Average student shape ─────────────────────────── */}
              <polygon
                ref={avgRef}
                points={CENTRE_PTS}
                fill="rgba(170,170,180,0.11)"
                stroke="rgba(180,180,190,0.45)"
                strokeWidth="1.5"
                strokeDasharray="5,4"
              />

              {/* ── StudyWithRaissov student shape ────────────────── */}
              <polygon
                ref={stuRef}
                points={CENTRE_PTS}
                fill="url(#rdr-fill)"
                stroke="url(#rdr-stroke)"
                strokeWidth="2"
                className="radar-stu-poly"
              />

              {/* ── Axis labels ───────────────────────────────────── */}
              {AXES.map(([label, angleDeg, anchor, dx, dy]) => {
                const [bx, by] = calcPt(MAX, angleDeg);
                return (
                  <text
                    key={label}
                    x={bx + dx}
                    y={by + dy}
                    textAnchor={anchor}
                    fontSize="11"
                    fontWeight="600"
                    fill="rgba(255,255,255,0.68)"
                    fontFamily="inherit"
                  >
                    {label}
                  </text>
                );
              })}

              {/* Centre dot */}
              <circle cx={CX} cy={CY} r="3" fill="rgba(255,255,255,0.18)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="radar-legend" role="list" aria-label="Chart legend">
        <div className="radar-legend-item" role="listitem">
          <span className="radar-legend-dot radar-legend-avg" aria-hidden="true" />
          <span>Орташа студент</span>
        </div>
        <div className="radar-legend-item" role="listitem">
          <span className="radar-legend-dot radar-legend-stu" aria-hidden="true" />
          <span>StudyWithRaissov студенті</span>
        </div>
      </div>
    </div>
  );
}
