"use client";

import { useState } from "react";

export interface SeriesDef<T> {
  key: keyof T & string;
  label: string;
  color: string;
}

interface Props<T extends { date: string }> {
  data: T[];
  series: SeriesDef<T>[];
  rangeLabel: string;
}

const WIDTH = 880;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

export function LineChart<T extends { date: string }>({
  data,
  series,
  rangeLabel,
}: Props<T>) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = series.filter((s) => !hidden.has(s.key));
  const max = Math.max(
    1,
    ...data.flatMap((d) => visible.map((s) => Number(d[s.key]) || 0)),
  );

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const point = (i: number, value: number) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + innerH - (value / max) * innerH,
  });

  const pathFor = (key: string) =>
    data
      .map((d, i) => {
        const value = Number(d[key as keyof T]) || 0;
        const { x, y } = point(i, value);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((max / yTicks) * i),
  );

  const everyNth = data.length <= 7 ? 1 : data.length <= 30 ? 5 : 14;

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hoveredRow = hovered != null ? data[hovered] : null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {rangeLabel}
        </h3>
        <div className="flex flex-wrap gap-3">
          {series.map((s) => {
            const isHidden = hidden.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={
                  "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium transition-opacity " +
                  (isHidden ? "opacity-40" : "opacity-100")
                }
                aria-pressed={!isHidden}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-[var(--text-primary)]">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-[240px] w-full"
          role="img"
          aria-label={rangeLabel}
        >
          {tickValues.map((v, i) => {
            const y = PAD.top + innerH - (v / max) * innerH;
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                  strokeDasharray={i === 0 ? "" : "2 3"}
                />
                <text
                  x={PAD.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-secondary)"
                >
                  {v.toLocaleString()}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            if (i % everyNth !== 0 && i !== data.length - 1) return null;
            const x = PAD.left + i * stepX;
            return (
              <text
                key={d.date}
                x={x}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-secondary)"
              >
                {d.date.slice(5)}
              </text>
            );
          })}

          {visible.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {visible.map((s) =>
            data.map((d, i) => {
              const value = Number(d[s.key as keyof T]) || 0;
              const { x, y } = point(i, value);
              return (
                <circle
                  key={`${s.key}-${i}`}
                  cx={x}
                  cy={y}
                  r={hovered === i ? 4 : 2.5}
                  fill={s.color}
                />
              );
            }),
          )}

          {hovered != null && (
            <line
              x1={PAD.left + hovered * stepX}
              x2={PAD.left + hovered * stepX}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--border)"
              strokeWidth={1}
            />
          )}

          {data.map((_, i) => {
            const x = PAD.left + i * stepX;
            const half = stepX / 2 || 4;
            return (
              <rect
                key={`hit-${i}`}
                x={x - half}
                y={PAD.top}
                width={Math.max(stepX, 8)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {hoveredRow && (
          <div
            className="pointer-events-none absolute z-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-xs shadow-md"
            style={{
              left: `min(calc(${((PAD.left + (hovered ?? 0) * stepX) / WIDTH) * 100}% + 8px), calc(100% - 200px))`,
              top: 8,
            }}
          >
            <p className="font-mono font-semibold text-[var(--text-primary)]">
              {hoveredRow.date}
            </p>
            <ul className="mt-1 space-y-0.5">
              {series.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {(Number(hoveredRow[s.key as keyof T]) || 0).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
