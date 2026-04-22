import { describe, it, expect } from "vitest";

// ── StreakCalendar day-status helpers ────────────────────────────────────────

function buildCalendarAligned(calendar: { date: string; status: string }[], today: Date) {
  const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon
  const pad = Array(dayOfWeek).fill({ date: "", status: "future", xp: 0 });
  return [...pad, ...calendar].slice(0, 35);
}

describe("streak calendar alignment", () => {
  it("pads correctly for a Wednesday (dayOfWeek=2)", () => {
    const fakeToday = new Date("2026-04-22"); // Wednesday
    const calendar = [{ date: "2026-04-22", status: "active", xp: 50 }];
    const result = buildCalendarAligned(calendar, fakeToday);
    expect(result[0].status).toBe("future"); // padding
    expect(result[1].status).toBe("future"); // padding
    expect(result[2].status).toBe("active");  // the actual day
  });

  it("no padding for a Monday (dayOfWeek=0)", () => {
    const fakeToday = new Date("2026-04-20"); // Monday
    const calendar = [{ date: "2026-04-20", status: "active", xp: 30 }];
    const result = buildCalendarAligned(calendar, fakeToday);
    expect(result[0].status).toBe("active");
  });

  it("truncates total length to 35", () => {
    const fakeToday = new Date("2026-04-26"); // Sunday → dayOfWeek=6
    const calendar = Array(30).fill({ date: "x", status: "active", xp: 0 });
    const result = buildCalendarAligned(calendar, fakeToday);
    expect(result.length).toBe(35);
  });
});

// ── League tier ordering ─────────────────────────────────────────────────────

const LEAGUE_TIER_ORDER = [
  "bronze", "silver", "gold", "sapphire", "ruby",
  "emerald", "amethyst", "pearl", "obsidian", "diamond",
];

function tierIndex(tier: string) {
  return LEAGUE_TIER_ORDER.indexOf(tier);
}

function nextTier(tier: string): string | null {
  const idx = tierIndex(tier);
  return idx >= 0 && idx < LEAGUE_TIER_ORDER.length - 1 ? LEAGUE_TIER_ORDER[idx + 1] : null;
}

function prevTier(tier: string): string | null {
  const idx = tierIndex(tier);
  return idx > 0 ? LEAGUE_TIER_ORDER[idx - 1] : null;
}

describe("league tier logic", () => {
  it("bronze → silver promotion", () => expect(nextTier("bronze")).toBe("silver"));
  it("diamond has no next tier", () => expect(nextTier("diamond")).toBeNull());
  it("bronze has no previous tier", () => expect(prevTier("bronze")).toBeNull());
  it("gold → silver demotion", () => expect(prevTier("gold")).toBe("silver"));
  it("all 10 tiers are indexed correctly", () => {
    expect(tierIndex("diamond")).toBe(9);
    expect(tierIndex("bronze")).toBe(0);
  });
});

// ── XP boost banner countdown ─────────────────────────────────────────────────

function timeLeftLabel(endsAt: string, now: Date): string {
  const diff = new Date(endsAt).getTime() - now.getTime();
  if (diff <= 0) return "ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

describe("XP boost banner countdown", () => {
  it("shows Xh Ym left for hours remaining", () => {
    const now = new Date("2026-04-26T10:00:00Z");
    const endsAt = "2026-04-26T12:30:00Z";
    expect(timeLeftLabel(endsAt, now)).toBe("2h 30m left");
  });

  it("shows Xd left for multi-day events", () => {
    const now = new Date("2026-04-26T10:00:00Z");
    const endsAt = "2026-04-28T10:00:00Z";
    expect(timeLeftLabel(endsAt, now)).toBe("2d left");
  });

  it('shows "ended" when event is past', () => {
    const now = new Date("2026-04-26T12:00:00Z");
    const endsAt = "2026-04-26T11:00:00Z";
    expect(timeLeftLabel(endsAt, now)).toBe("ended");
  });

  it("shows Xm left for sub-hour", () => {
    const now = new Date("2026-04-26T10:00:00Z");
    const endsAt = "2026-04-26T10:45:00Z";
    expect(timeLeftLabel(endsAt, now)).toBe("45m left");
  });
});

// ── Daily quest progress ──────────────────────────────────────────────────────

function questPercent(progress: number, target: number): number {
  return Math.min(100, Math.round((progress / target) * 100));
}

describe("daily quest progress", () => {
  it("0% at start", () => expect(questPercent(0, 50)).toBe(0));
  it("50% halfway", () => expect(questPercent(25, 50)).toBe(50));
  it("100% when complete", () => expect(questPercent(50, 50)).toBe(100));
  it("capped at 100% when over target", () => expect(questPercent(60, 50)).toBe(100));
});

// ── Achievement unlock engine (candidate selection) ───────────────────────────

function candidateIds(ev: {
  streakDays?: number;
  lessonsTotal?: number;
  totalXP?: number;
  isNoMistake?: boolean;
  leagueRank?: number;
  friendsCount?: number;
  hour?: number;
}) {
  const ids: string[] = [];
  const add = (id: string) => ids.push(id);
  if ((ev.streakDays ?? 0) >= 3)  add("streak_3");
  if ((ev.streakDays ?? 0) >= 7)  add("streak_7");
  if ((ev.streakDays ?? 0) >= 30) add("streak_30");
  if ((ev.lessonsTotal ?? 0) >= 1) add("first_lesson");
  if ((ev.lessonsTotal ?? 0) >= 10) add("lessons_10");
  if ((ev.totalXP ?? 0) >= 500)   add("xp_500");
  if (ev.isNoMistake)             add("perfect_lesson_1");
  if ((ev.leagueRank ?? 99) <= 3) add("top_3_league");
  if ((ev.leagueRank ?? 99) === 1) add("top_1_league");
  if ((ev.friendsCount ?? 0) >= 1) add("friend_1");
  if ((ev.hour ?? 12) < 6)        add("early_bird");
  if ((ev.hour ?? 12) >= 23)      add("night_owl");
  return ids;
}

describe("achievement candidate selection", () => {
  it("first lesson unlocks first_lesson", () => {
    expect(candidateIds({ lessonsTotal: 1 })).toContain("first_lesson");
  });

  it("7-day streak gives streak_3 and streak_7", () => {
    const ids = candidateIds({ streakDays: 7 });
    expect(ids).toContain("streak_3");
    expect(ids).toContain("streak_7");
    expect(ids).not.toContain("streak_30");
  });

  it("rank 1 gives top_3_league and top_1_league", () => {
    const ids = candidateIds({ leagueRank: 1 });
    expect(ids).toContain("top_3_league");
    expect(ids).toContain("top_1_league");
  });

  it("rank 2 gives top_3 but not top_1", () => {
    const ids = candidateIds({ leagueRank: 2 });
    expect(ids).toContain("top_3_league");
    expect(ids).not.toContain("top_1_league");
  });

  it("perfect lesson gives perfect_lesson_1", () => {
    expect(candidateIds({ isNoMistake: true })).toContain("perfect_lesson_1");
  });

  it("early morning lesson gives early_bird", () => {
    expect(candidateIds({ hour: 5 })).toContain("early_bird");
  });

  it("late night lesson gives night_owl", () => {
    expect(candidateIds({ hour: 23 })).toContain("night_owl");
  });

  it("500 XP gives xp_500", () => {
    expect(candidateIds({ totalXP: 500 })).toContain("xp_500");
  });
});
