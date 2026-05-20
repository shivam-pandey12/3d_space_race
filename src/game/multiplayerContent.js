export const MULTIPLAYER_BALANCE_STATS = {
  maxSpeed: 88,
  acceleration: 51,
  friction: 18.1,
  lateralAcceleration: 40,
  lateralDamping: 4.8,
  startBoostEnergy: 34
};

export const RANK_TIERS = [
  { id: 'bronze', name: 'Bronze', minRating: 0, accent: '#b8815c' },
  { id: 'silver', name: 'Silver', minRating: 1100, accent: '#b7c6d8' },
  { id: 'gold', name: 'Gold', minRating: 1350, accent: '#f3c86a' },
  { id: 'elite', name: 'Elite', minRating: 1650, accent: '#8ce9ff' }
];

export const QUICK_EMOTES = [
  'Good luck',
  'Bring it',
  'No mistakes',
  'On your six'
];

export const DAILY_MULTIPLAYER_GOALS = [
  {
    id: 'daily-win-one',
    label: 'Win 1 online race',
    metric: 'wins',
    target: 1,
    rewardXp: 120,
    rewardCurrency: 90
  },
  {
    id: 'daily-top-three',
    label: 'Finish top 3 in 3 online races',
    metric: 'top3',
    target: 3,
    rewardXp: 150,
    rewardCurrency: 110
  },
  {
    id: 'daily-overtakes',
    label: 'Land 8 online overtakes',
    metric: 'overtakes',
    target: 8,
    rewardXp: 130,
    rewardCurrency: 96
  },
  {
    id: 'daily-races',
    label: 'Complete 4 online races',
    metric: 'races',
    target: 4,
    rewardXp: 100,
    rewardCurrency: 84
  },
  {
    id: 'daily-clean-run',
    label: 'Finish 2 clean online races',
    metric: 'cleanRaces',
    target: 2,
    rewardXp: 140,
    rewardCurrency: 100
  }
];

export const WEEKLY_MULTIPLAYER_GOALS = [
  {
    id: 'weekly-wins',
    label: 'Win 5 online races',
    metric: 'wins',
    target: 5,
    rewardXp: 280,
    rewardCurrency: 210
  },
  {
    id: 'weekly-podiums',
    label: 'Earn 10 online podiums',
    metric: 'top3',
    target: 10,
    rewardXp: 320,
    rewardCurrency: 240
  },
  {
    id: 'weekly-private-room',
    label: 'Finish 4 private room races',
    metric: 'privateRaces',
    target: 4,
    rewardXp: 260,
    rewardCurrency: 210
  },
  {
    id: 'weekly-tournament',
    label: 'Win 2 tournament finals',
    metric: 'tournamentWins',
    target: 2,
    rewardXp: 340,
    rewardCurrency: 280
  },
  {
    id: 'weekly-close-finishes',
    label: 'Survive 4 close finishes',
    metric: 'closeFinishes',
    target: 4,
    rewardXp: 300,
    rewardCurrency: 220
  }
];

export function getRankInfo(rating = 1000) {
  let currentTier = RANK_TIERS[0];
  let nextTier = null;

  for (let index = 0; index < RANK_TIERS.length; index += 1) {
    const tier = RANK_TIERS[index];

    if (rating >= tier.minRating) {
      currentTier = tier;
      nextTier = RANK_TIERS[index + 1] ?? null;
    }
  }

  return {
    tier: currentTier,
    rating,
    nextTier,
    progress: nextTier
      ? Math.min(1, Math.max(0, (rating - currentTier.minRating) / Math.max(1, nextTier.minRating - currentTier.minRating)))
      : 1
  };
}

export function getGoalMetricValue(stats, metric) {
  const safeStats = stats ?? {};

  if (metric === 'wins') {
    return safeStats.wins ?? 0;
  }

  if (metric === 'top3') {
    return safeStats.podiums ?? 0;
  }

  if (metric === 'overtakes') {
    return safeStats.totalOvertakes ?? 0;
  }

  if (metric === 'races') {
    return safeStats.races ?? 0;
  }

  if (metric === 'cleanRaces') {
    return safeStats.cleanRaces ?? 0;
  }

  if (metric === 'privateRaces') {
    return safeStats.privateRaces ?? 0;
  }

  if (metric === 'tournamentWins') {
    return safeStats.tournamentWins ?? 0;
  }

  if (metric === 'closeFinishes') {
    return safeStats.closeFinishes ?? 0;
  }

  return 0;
}

export function getGoalProgress(goal, stats) {
  const value = getGoalMetricValue(stats, goal.metric);

  return {
    current: Math.min(goal.target, value),
    target: goal.target,
    completed: value >= goal.target,
    text: `${Math.min(goal.target, value)}/${goal.target}`
  };
}

export function pickRotatingGoals(pool, count, seedText) {
  let hash = 0;

  for (let index = 0; index < seedText.length; index += 1) {
    hash = (hash * 31 + seedText.charCodeAt(index)) >>> 0;
  }

  const items = [...pool];

  for (let index = items.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swapIndex = hash % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items.slice(0, count);
}

export function getDailyGoalKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getWeeklyGoalKey(date = new Date()) {
  const safeDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = safeDate.getUTCDay() || 7;
  safeDate.setUTCDate(safeDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(safeDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((safeDate - yearStart) / 86400000) + 1) / 7);
  return `${safeDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
