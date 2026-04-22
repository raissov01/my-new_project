"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Scissors } from "lucide-react";

interface Props {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  maxPlays?: number; // undefined = unlimited
}

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export function AudioPlayer({ src, onTimeUpdate, onEnded, maxPlays }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1×
  const [playsUsed, setPlaysUsed] = useState(0);
  const [abStart, setAbStart] = useState<number | null>(null);
  const [abEnd, setAbEnd] = useState<number | null>(null);
  const [settingAB, setSettingAB] = useState<"start" | "end" | null>(null);

  const speed = SPEEDS[speedIdx];

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handleTime = () => {
      setCurrentTime(el.currentTime);
      onTimeUpdate?.(el.currentTime);
      // A-B loop
      if (abStart !== null && abEnd !== null && el.currentTime >= abEnd) {
        el.currentTime = abStart;
      }
    };
    const handleEnded = () => { setPlaying(false); onEnded?.(); };
    const handleLoaded = () => setDuration(el.duration);
    el.addEventListener("timeupdate", handleTime);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("loadedmetadata", handleLoaded);
    return () => {
      el.removeEventListener("timeupdate", handleTime);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [onTimeUpdate, onEnded, abStart, abEnd]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      if (maxPlays !== undefined && playsUsed >= maxPlays) return;
      el.play();
      setPlaying(true);
      setPlaysUsed((n) => n + 1);
    }
  }, [playing, maxPlays, playsUsed]);

  const seek = (t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const setABPoint = () => {
    const t = audioRef.current?.currentTime ?? 0;
    if (settingAB === "start") { setAbStart(t); setSettingAB("end"); }
    else if (settingAB === "end") { setAbEnd(t); setSettingAB(null); }
    else { setSettingAB("start"); setAbStart(null); setAbEnd(null); }
  };

  const clearAB = () => { setAbStart(null); setAbEnd(null); setSettingAB(null); };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const canPlay = maxPlays === undefined || playsUsed < maxPlays;

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "j") seek(Math.max(0, (audioRef.current?.currentTime ?? 0) - 5));
      if (e.key === "l") seek(Math.min(duration, (audioRef.current?.currentTime ?? 0) + 5));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Scrubber */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          step={0.1}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-[var(--primary)] cursor-pointer"
          aria-label="Audio progress"
        />
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={togglePlay}
          disabled={!canPlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Speed */}
        <div className="flex items-center gap-0.5">
          {SPEEDS.map((s, i) => (
            <button
              key={s}
              onClick={() => setSpeedIdx(i)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                speedIdx === i
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* A-B loop */}
        <div className="ml-auto flex items-center gap-1">
          {(abStart !== null || abEnd !== null) && (
            <button onClick={clearAB} className="text-xs text-[var(--text-secondary)] hover:text-red-500">
              Clear A-B
            </button>
          )}
          <button
            onClick={setABPoint}
            title="Set A-B loop points (press once for A, again for B)"
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              settingAB
                ? "bg-amber-100 text-amber-700"
                : abStart !== null && abEnd !== null
                ? "bg-green-100 text-green-700"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
            }`}
          >
            <Scissors className="h-3 w-3" />
            {settingAB === "start" ? "Set A" : settingAB === "end" ? "Set B" : "A-B"}
          </button>
        </div>
      </div>

      {/* A-B indicator */}
      {abStart !== null && abEnd !== null && (
        <p className="text-xs text-green-600">
          🔁 Looping {fmt(abStart)} → {fmt(abEnd)}
        </p>
      )}

      {/* Play limit */}
      {maxPlays !== undefined && (
        <p className="text-xs text-[var(--text-secondary)]">
          Plays: {playsUsed} / {maxPlays}
        </p>
      )}

      {/* A11y: hidden progress bar */}
      <div className="sr-only" role="status" aria-live="polite">
        {playing ? `Playing: ${fmt(currentTime)} of ${fmt(duration)}` : "Paused"}
      </div>
    </div>
  );
}

// Thin wrapper for replaying a specific segment (used by comprehension questions)
export function SegmentReplay({ src, start, end }: { src: string; start: number; end: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const replay = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = start;
    el.play();
    setPlaying(true);
    const remaining = (end - start) * 1000;
    setTimeout(() => { el.pause(); setPlaying(false); }, remaining);
  };

  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={replay}
        disabled={playing}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-40 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Replay
      </button>
    </>
  );
}
