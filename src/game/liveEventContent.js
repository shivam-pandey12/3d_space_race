import { EDITION_IDS } from './editionConfig.js';
import { SHIP_DEFS, SHIP_LOOKUP, TRACK_DEFS, TRACK_LOOKUP } from './gameContent.js';
import { buildCustomTrackDefinition } from './customRaceLabContent.js';

const EARLY = EDITION_IDS.STANDALONE_EARLY_ACCESS;
const FULL = EDITION_IDS.STANDALONE_FULL_PREMIUM;

const DAY_MS = 24 * 60 * 60 * 1000;

const EVENT_TRACK_ROTATION = Object.freeze([
  'night-circuit',
  'rift-run',
  'singularity-loop',
  'solar-storm-corridor',
  'eclipse-promenade',
  'aurora-sanctum'
]);

const EVENT_SHIP_ROTATION = Object.freeze([
  'starling',
  'vector',
  'atlas',
  'ghostwire',
  'nova',
  'solstice',
  'imperion'
]);

const DAILY_GOALS = Object.freeze([
  {
    id: 'top-three',
    label: 'Finish Top 3',
    description: 'Place third or better in today\'s seeded challenge.',
    evaluate: (summary) => (summary.position ?? 99) <= 3
  },
  {
    id: 'clean-finish',
    label: 'Clean Finish',
    description: 'Finish with no hazard hits.',
    evaluate: (summary) => (summary.stats?.hazardHits ?? 0) === 0
  },
  {
    id: 'overtakes',
    label: 'Four Overtakes',
    description: 'Make at least four overtakes before the finish.',
    evaluate: (summary) => (summary.stats?.overtakes ?? 0) >= 4
  },
  {
    id: 'drift-release',
    label: 'Three Drift Releases',
    description: 'Trigger three drift releases during the race.',
    evaluate: (summary) => (summary.stats?.driftReleases ?? 0) >= 3
  }
]);

function cloneTrack(track) {
  return JSON.parse(JSON.stringify(track ?? TRACK_DEFS[0]));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalDayKey(date = new Date()) {
  const local = new Date(date);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

function getWeekInfo(date = new Date()) {
  const local = new Date(date);
  const yearStart = new Date(local.getFullYear(), 0, 1);
  const dayOffset = Math.floor((local - yearStart) / DAY_MS);
  const week = Math.floor((dayOffset + yearStart.getDay()) / 7) + 1;
  const day = local.getDay();
  const start = new Date(local);
  start.setHours(0, 0, 0, 0);
  start.setDate(local.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return {
    year: local.getFullYear(),
    week,
    day,
    start,
    end,
    key: `${local.getFullYear()}-w${pad(week)}`
  };
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value);

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickSeeded(list, seed, offset = 0) {
  if (!list.length) {
    return null;
  }

  return list[(hashString(`${seed}:${offset}`) % list.length + list.length) % list.length];
}

function makeDateRange(start, durationDays = 1) {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + durationDays);

  return {
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString()
  };
}

function makeEvent(definition) {
  const track = TRACK_LOOKUP[definition.trackId] ?? TRACK_DEFS[0];
  const ship = SHIP_LOOKUP[definition.shipId] ?? SHIP_DEFS[0];

  return Object.freeze({
    ...definition,
    trackName: track.name,
    shipName: ship.name,
    status: definition.status ?? 'active',
    rewardPreview: definition.rewardPreview ?? 'Premium event reward',
    fairPlayNote: 'Live Events are offline challenges and do not affect ranked, multiplayer, ghosts, or online rating.'
  });
}

export function getLiveEventSet(date = new Date()) {
  const dayKey = toLocalDayKey(date);
  const week = getWeekInfo(date);
  const dailyGoal = pickSeeded(DAILY_GOALS, dayKey, 1) ?? DAILY_GOALS[0];
  const dailyTrackId = pickSeeded(EVENT_TRACK_ROTATION, dayKey, 2) ?? TRACK_DEFS[0].id;
  const dailyShipId = pickSeeded(EVENT_SHIP_ROTATION, dayKey, 3) ?? SHIP_DEFS[0].id;
  const weeklyTrackId = pickSeeded(EVENT_TRACK_ROTATION, week.key, 4) ?? 'rift-run';
  const limitedTrackId = pickSeeded(EVENT_TRACK_ROTATION, week.key, 5) ?? 'eclipse-promenade';
  const weekendActive = week.day === 0 || week.day === 6;
  const dayRange = makeDateRange(date, 1);
  const weekRange = { startsAt: week.start.toISOString(), endsAt: week.end.toISOString() };

  return [
    makeEvent({
      id: `daily-${dayKey}`,
      type: 'daily',
      title: 'Today\'s Challenge',
      shortTitle: 'Daily',
      description: dailyGoal.description,
      requiredEdition: EARLY,
      trackId: dailyTrackId,
      shipId: dailyShipId,
      laps: 2 + (hashString(dayKey) % 2),
      aiCount: 4,
      difficulty: 'standard',
      hazardsEnabled: true,
      pickupsEnabled: true,
      powerupsEnabled: true,
      boostPadDensity: 'normal',
      shortcutDifficulty: 'normal',
      visualEffect: 'default',
      goal: dailyGoal,
      rewardId: 'event-daily-challenge',
      rewardPreview: 'Daily challenge badge progress',
      startsAt: dayRange.startsAt,
      endsAt: dayRange.endsAt
    }),
    makeEvent({
      id: `weekly-${week.key}`,
      type: 'weekly',
      title: 'Weekly Event',
      shortTitle: 'Weekly',
      description: 'A longer seeded premium event with a tougher podium target.',
      requiredEdition: FULL,
      trackId: weeklyTrackId,
      shipId: 'nova',
      laps: 4,
      aiCount: 6,
      difficulty: 'elite',
      hazardsEnabled: true,
      pickupsEnabled: true,
      powerupsEnabled: true,
      boostPadDensity: 'dense',
      shortcutDifficulty: 'risky',
      visualEffect: 'storm',
      goal: {
        id: 'weekly-podium',
        label: 'Finish Top 2',
        description: 'Finish second or better in this week\'s event.',
        evaluate: (summary) => (summary.position ?? 99) <= 2
      },
      rewardId: 'event-weekly-champion',
      rewardPreview: 'Weekly event trophy',
      startsAt: weekRange.startsAt,
      endsAt: weekRange.endsAt
    }),
    makeEvent({
      id: `weekend-${week.key}`,
      type: 'weekend',
      title: 'Weekend Championship Preview',
      shortTitle: 'Weekend',
      description: weekendActive
        ? 'A weekend-only premium race that previews future online championship energy.'
        : 'Weekend championship opens on Saturday and Sunday.',
      requiredEdition: FULL,
      trackId: 'eclipse-promenade',
      shipId: 'solstice',
      laps: 3,
      aiCount: 7,
      difficulty: 'elite',
      hazardsEnabled: true,
      pickupsEnabled: true,
      powerupsEnabled: true,
      boostPadDensity: 'normal',
      shortcutDifficulty: 'normal',
      visualEffect: 'aurora',
      status: weekendActive ? 'active' : 'upcoming',
      goal: {
        id: 'weekend-win',
        label: 'Win Weekend Preview',
        description: 'Win the weekend championship preview race.',
        evaluate: (summary) => (summary.position ?? 99) === 1
      },
      rewardId: 'event-weekend-preview',
      rewardPreview: 'Weekend championship badge',
      startsAt: weekRange.startsAt,
      endsAt: weekRange.endsAt
    }),
    makeEvent({
      id: `limited-${week.key}`,
      type: 'limited',
      title: 'Limited-Time Reward Preview',
      shortTitle: 'Limited',
      description: 'Complete a clean premium run to unlock this limited gallery entry.',
      requiredEdition: FULL,
      trackId: limitedTrackId,
      shipId: 'imperion',
      laps: 3,
      aiCount: 5,
      difficulty: 'standard',
      hazardsEnabled: true,
      pickupsEnabled: true,
      powerupsEnabled: true,
      boostPadDensity: 'sparse',
      shortcutDifficulty: 'safe',
      visualEffect: 'void',
      goal: {
        id: 'limited-clean-top3',
        label: 'Clean Top 3',
        description: 'Finish top three with no hazard hits.',
        evaluate: (summary) => (summary.position ?? 99) <= 3 && (summary.stats?.hazardHits ?? 0) === 0
      },
      rewardId: 'event-limited-reward',
      rewardPreview: 'Limited reward gallery title',
      startsAt: weekRange.startsAt,
      endsAt: weekRange.endsAt
    })
  ];
}

export function getLiveEvent(eventId, date = new Date()) {
  const events = getLiveEventSet(date);
  return events.find((event) => event.id === eventId) ?? events[0];
}

export function buildLiveEventTrackDefinition(event) {
  const baseTrack = cloneTrack(TRACK_LOOKUP[event?.trackId] ?? TRACK_DEFS[0]);
  return buildCustomTrackDefinition(baseTrack, {
    lapCount: event?.laps ?? baseTrack.laps ?? 3,
    hazardsEnabled: event?.hazardsEnabled !== false,
    pickupsEnabled: event?.pickupsEnabled !== false,
    boostPadDensity: event?.boostPadDensity ?? 'normal',
    shortcutDifficulty: event?.shortcutDifficulty ?? 'normal',
    visualEffect: event?.visualEffect ?? 'default'
  });
}

export function evaluateLiveEventGoal(event, raceSummary = {}) {
  const goal = event?.goal ?? DAILY_GOALS[0];
  const completed = Boolean(goal.evaluate?.(raceSummary)) ||
    (goal.id === 'top-three' && (raceSummary.position ?? 99) <= 3) ||
    (goal.id === 'clean-finish' && (raceSummary.stats?.hazardHits ?? 0) === 0) ||
    (goal.id === 'overtakes' && (raceSummary.stats?.overtakes ?? 0) >= 4) ||
    (goal.id === 'drift-release' && (raceSummary.stats?.driftReleases ?? 0) >= 3) ||
    (goal.id === 'weekly-podium' && (raceSummary.position ?? 99) <= 2) ||
    (goal.id === 'weekend-win' && (raceSummary.position ?? 99) === 1) ||
    (goal.id === 'limited-clean-top3' && (raceSummary.position ?? 99) <= 3 && (raceSummary.stats?.hazardHits ?? 0) === 0);

  return {
    eventId: event?.id ?? '',
    goalId: goal.id,
    goalLabel: goal.label,
    goalDescription: goal.description,
    completed,
    resultLabel: completed ? 'Goal complete' : 'Goal missed'
  };
}

export function getLiveEventRewardIds(event, completed = false) {
  return completed && event?.rewardId ? [event.rewardId] : [];
}
