"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type Labels = {
  toggleSound: string;
  volume: string;
  muted: string;
};

type Props = {
  volume: number;
  muted: boolean;
  setVolume: (next: number) => void;
  toggleMuted: () => void;
  labels: Labels;
  className?: string;
};

// SoundSettings renders a single icon button (Volume2/VolumeX) that opens
// a popover with a volume slider and a mute toggle. Closes on outside-click
// or Escape. Designed to be drop-in for any quiz HUD.
export function SoundSettings({
  volume,
  muted,
  setVolume,
  toggleMuted,
  labels,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Icon = muted || volume === 0 ? VolumeX : Volume2;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        aria-label={labels.toggleSound}
        title={labels.toggleSound}
        aria-expanded={open}
      >
        <Icon className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="dialog"
          className="absolute right-0 top-12 z-30 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-lg"
        >
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            {labels.volume}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            disabled={muted}
            className="mt-2 w-full accent-[var(--primary)] disabled:opacity-50"
            aria-label={labels.volume}
          />
          <button
            type="button"
            onClick={toggleMuted}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-soft-hover,var(--bg-soft))]"
          >
            {muted ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            {muted ? labels.toggleSound : labels.muted}
          </button>
        </div>
      ) : null}
    </div>
  );
}
