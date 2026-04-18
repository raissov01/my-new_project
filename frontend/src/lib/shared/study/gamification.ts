export type Achievement = {
  id: string;
  label: string;
  description: string;
};

type Translator = (key: string, vars?: Record<string, string | number>) => string;
type LevelTier = {
  minLevel: number;
  nameKey: string;
  meaningKey: string;
  rewardKey: string;
  nextRewardKey: string;
};

type AchievementRule = Achievement & {
  qualifies: (stats: {
    points: number;
    streakDays: number;
    totalStudied: number;
    totalCorrect: number;
  }) => boolean;
};

export const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: "first_session",
    label: "achievement.first_session.label",
    description: "achievement.first_session.description",
    qualifies: ({ totalStudied }) => totalStudied >= 1,
  },
  {
    id: "streak_3",
    label: "achievement.streak_3.label",
    description: "achievement.streak_3.description",
    qualifies: ({ streakDays }) => streakDays >= 3,
  },
  {
    id: "streak_7",
    label: "achievement.streak_7.label",
    description: "achievement.streak_7.description",
    qualifies: ({ streakDays }) => streakDays >= 7,
  },
  {
    id: "xp_100",
    label: "achievement.xp_100.label",
    description: "achievement.xp_100.description",
    qualifies: ({ points }) => points >= 100,
  },
  {
    id: "xp_500",
    label: "achievement.xp_500.label",
    description: "achievement.xp_500.description",
    qualifies: ({ points }) => points >= 500,
  },
  {
    id: "correct_50",
    label: "achievement.correct_50.label",
    description: "achievement.correct_50.description",
    qualifies: ({ totalCorrect }) => totalCorrect >= 50,
  },
];

const LEVEL_TIERS: LevelTier[] = [
  {
    minLevel: 1,
    nameKey: "level.nameBeginner",
    meaningKey: "level.meaningBeginner",
    rewardKey: "level.rewardBeginner",
    nextRewardKey: "level.nextRewardBeginner",
  },
  {
    minLevel: 3,
    nameKey: "level.nameFocused",
    meaningKey: "level.meaningFocused",
    rewardKey: "level.rewardFocused",
    nextRewardKey: "level.nextRewardFocused",
  },
  {
    minLevel: 5,
    nameKey: "level.nameSkilled",
    meaningKey: "level.meaningSkilled",
    rewardKey: "level.rewardSkilled",
    nextRewardKey: "level.nextRewardSkilled",
  },
  {
    minLevel: 8,
    nameKey: "level.nameMaster",
    meaningKey: "level.meaningMaster",
    rewardKey: "level.rewardMaster",
    nextRewardKey: "level.nextRewardMaster",
  },
];

export function calculatePointsEarned(input: {
  totalResults: number;
  correctResults: number;
  difficultCount: number;
  perfectRun: boolean;
}): number {
  const base =
    input.correctResults * 10 + (input.totalResults - input.correctResults) * 4;
  const completionBonus = input.totalResults > 0 ? 5 : 0;
  const perfectBonus = input.perfectRun ? 20 : 0;
  const difficultBonus = Math.min(input.difficultCount * 2, 10);
  return base + completionBonus + perfectBonus + difficultBonus;
}

export function getLevelInfo(points: number) {
  const safePoints = Math.max(0, points);
  const level = Math.floor(safePoints / 100) + 1;
  const currentLevelStart = (level - 1) * 100;
  const nextLevelAt = level * 100;
  const currentLevelPoints = safePoints - currentLevelStart;
  const requiredPoints = nextLevelAt - currentLevelStart;
  const progressPercent = Math.round((currentLevelPoints / requiredPoints) * 100);
  const tier =
    [...LEVEL_TIERS].reverse().find((candidate) => level >= candidate.minLevel) ??
    LEVEL_TIERS[0];
  const nextTier =
    LEVEL_TIERS.find((candidate) => candidate.minLevel > tier.minLevel && level < candidate.minLevel) ??
    null;

  return {
    level,
    currentLevelPoints,
    requiredPoints,
    nextLevelAt,
    progressPercent,
    nameKey: tier.nameKey,
    meaningKey: tier.meaningKey,
    rewardKey: tier.rewardKey,
    nextRewardKey: nextTier?.rewardKey ?? tier.nextRewardKey,
  };
}

export function getLevelPresentation(points: number, t: Translator) {
  const info = getLevelInfo(points);

  return {
    ...info,
    name: t(info.nameKey),
    meaning: t(info.meaningKey),
    reward: t(info.rewardKey),
    nextReward: t(info.nextRewardKey),
  };
}

export function getAchievements(stats: {
  points: number;
  streakDays: number;
  totalStudied: number;
  totalCorrect: number;
}, t: Translator) {
  return ACHIEVEMENT_RULES.filter((rule) => rule.qualifies(stats)).map(
    ({ id, label, description }) => ({
      id,
      label: t(label),
      description: t(description),
    })
  );
}

export function getNewAchievements(beforeIds: string[], afterIds: string[], t: Translator) {
  const before = new Set(beforeIds);
  return ACHIEVEMENT_RULES.filter(
    (rule) => afterIds.includes(rule.id) && !before.has(rule.id)
  ).map(({ id, label, description }) => ({
    id,
    label: t(label),
    description: t(description),
  }));
}
