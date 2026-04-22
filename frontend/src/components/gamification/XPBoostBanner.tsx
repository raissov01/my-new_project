"use client";

import { useEffect, useState } from "react";
import type { XPEvent } from "@/features/gamification/api";

interface XPBoostBannerProps {
  event: XPEvent;
}

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function XPBoostBanner({ event }: XPBoostBannerProps) {
  const [label, setLabel] = useState(() => timeLeft(event.endsAt));

  useEffect(() => {
    const id = setInterval(() => setLabel(timeLeft(event.endsAt)), 60_000);
    return () => clearInterval(id);
  }, [event.endsAt]);

  if (label === "ended") return null;

  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
      style={{ background: event.bannerColor ?? "#f97316" }}
      role="banner"
      aria-label={event.title}
    >
      <span>{event.title ?? `🔥 ${event.multiplier}× XP Active!`}</span>
      <span className="text-xs font-normal opacity-90">Ends in {label}</span>
    </div>
  );
}
