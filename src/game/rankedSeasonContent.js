import { EDITION_IDS } from './editionConfig.js';

export const RANKED_SEASON_RATING_BOUNDS = Object.freeze({
  min: 800,
  max: 1900,
  start: 1000
});

export const RANKED_TIERS = Object.freeze([
  Object.freeze({
    id: 'bronze',
    label: 'Bronze',
    minRating: 800,
    maxRating: 999,
    iconLabel: 'BRZ',
    rewardId: 'ranked-tier-bronze',
    rewardPreview: 'Bronze season badge',
    rankUpCopy: 'Hold steady and build clean podiums.'
  }),
  Object.freeze({
    id: 'silver',
    label: 'Silver',
    minRating: 1000,
    maxRating: 1199,
    iconLabel: 'SLV',
    rewardId: 'ranked-tier-silver',
    rewardPreview: 'Silver season title',
    rankUpCopy: 'The ladder is tightening. Keep the sectors clean.'
  }),
  Object.freeze({
    id: 'gold',
    label: 'Gold',
    minRating: 1200,
    maxRating: 1399,
    iconLabel: 'GLD',
    rewardId: 'ranked-tier-gold',
    rewardPreview: 'Gold season badge',
    rankUpCopy: 'Gold pace rewards controlled aggression.'
  }),
  Object.freeze({
    id: 'elite',
    label: 'Elite',
    minRating: 1400,
    maxRating: 1599,
    iconLabel: 'ELT',
    rewardId: 'ranked-tier-elite',
    rewardPreview: 'Elite season trophy',
    rankUpCopy: 'Elite races punish every sloppy boost.'
  }),
  Object.freeze({
    id: 'legend',
    label: 'Legend',
    minRating: 1600,
    maxRating: 1900,
    iconLabel: 'LGD',
    rewardId: 'ranked-tier-legend',
    rewardPreview: 'Legend season trophy',
    rankUpCopy: 'Legend status means complete laps under pressure.'
  })
]);

export const RANKED_SEASON_RULES = Object.freeze([
  'Local AI season ladder.',
  'Normalized ship stats are always used.',
  'Offline upgrades and paid cosmetics never affect ranked pace.',
  'No real-money prizes, entry fees, betting, or gambling mechanics.'
]);

const RANKED_TRACK_ROTATION = Object.freeze([
  'night-circuit',
  'rift-run',
  'singularity-loop',
  'solar-storm-corridor',
  'eclipse-promenade',
  'aurora-sanctum'
]);

function padMonth(value) {
  return String(value).padStart(2, '0');
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function nextMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function clampRating(value) {
  const numeric = Math.round(Number(value ?? RANKED_SEASON_RATING_BOUNDS.start));
  return Math.max(RANKED_SEASON_RATING_BOUNDS.min, Math.min(RANKED_SEASON_RATING_BOUNDS.max, numeric));
}

export function getRankedSeason(date = new Date()) {
  const start = monthStart(date);
  const end = nextMonthStart(date);
  const year = start.getFullYear();
  const month = padMonth(start.getMonth() + 1);
  const trackIndex = (year * 12 + start.getMonth()) % RANKED_TRACK_ROTATION.length;

  return {
    seasonId: `ranked-${year}-${month}`,
    seasonName: `Aurora Ranked ${year}.${month}`,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    status: date >= start && date < end ? 'active' : date < start ? 'upcoming' : 'ended',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    fullEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    trackId: RANKED_TRACK_ROTATION[trackIndex],
    laps: 3,
    aiCount: 5,
    difficulty: 'elite',
    rewardPreview: 'Tier badges, titles, trophies, and season history',
    fairPlayNote: 'Ranked uses normalized ship stats. Offline upgrades are ignored.',
    rules: RANKED_SEASON_RULES,
    tiers: RANKED_TIERS
  };
}

export function getRankedTier(rating = RANKED_SEASON_RATING_BOUNDS.start) {
  const safeRating = clampRating(rating);
  return RANKED_TIERS.find((tier) => safeRating >= tier.minRating && safeRating <= tier.maxRating)
    ?? RANKED_TIERS[0];
}

export function getRankedTierProgress(rating = RANKED_SEASON_RATING_BOUNDS.start) {
  const tier = getRankedTier(rating);
  const span = Math.max(1, tier.maxRating - tier.minRating);
  return {
    tier,
    progress: Math.max(0, Math.min(1, (clampRating(rating) - tier.minRating) / span))
  };
}

export function calculateRankedRatingChange({ position = 1, totalRacers = 6, currentRating = RANKED_SEASON_RATING_BOUNDS.start } = {}) {
  const safePosition = Math.max(1, Math.floor(Number(position ?? 1)));
  const safeTotal = Math.max(1, Math.floor(Number(totalRacers ?? 1)));
  const percentile = 1 - ((safePosition - 1) / Math.max(1, safeTotal - 1));
  const baseline = Math.round((percentile - 0.48) * 72);
  const podiumBonus = safePosition === 1 ? 18 : safePosition <= 3 ? 8 : 0;
  const pressurePenalty = currentRating >= 1500 && safePosition > Math.ceil(safeTotal / 2) ? -8 : 0;
  return Math.max(-42, Math.min(54, baseline + podiumBonus + pressurePenalty));
}

export function applyRankedResult(progress = {}, raceSummary = {}, date = new Date()) {
  const season = getRankedSeason(date);
  const previousRating = clampRating(progress.seasonRating);
  const previousTier = getRankedTier(previousRating);
  const ratingDelta = calculateRankedRatingChange({
    position: raceSummary.position,
    totalRacers: raceSummary.totalRacers,
    currentRating: previousRating
  });
  const nextRating = clampRating(previousRating + ratingDelta);
  const nextTier = getRankedTier(nextRating);
  const podium = raceSummary.position <= 3;
  const win = raceSummary.position === 1;
  const nextStreak = podium ? Math.max(1, Number(progress.currentStreak ?? 0) + 1) : 0;

  return {
    season,
    previousRating,
    nextRating,
    ratingDelta,
    previousTier,
    nextTier,
    tierChanged: previousTier.id !== nextTier.id,
    podium,
    win,
    currentStreak: nextStreak,
    bestStreak: Math.max(Number(progress.seasonBestStreak ?? 0), nextStreak)
  };
}

export function getRankedRewardIds(result) {
  const ids = [];

  if (result?.nextTier?.rewardId) {
    ids.push(result.nextTier.rewardId);
  }

  if (result?.podium) {
    ids.push('ranked-first-podium');
  }

  if (result?.win) {
    ids.push('ranked-first-win');
  }

  return ids;
}
