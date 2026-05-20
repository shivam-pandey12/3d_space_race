import { EDITION_IDS } from './editionConfig.js';
import { TRACK_DEFS, TRACK_LOOKUP } from './gameContent.js';
import { buildCustomTrackDefinition } from './customRaceLabContent.js';

const EARLY = EDITION_IDS.STANDALONE_EARLY_ACCESS;
const FULL = EDITION_IDS.STANDALONE_FULL_PREMIUM;

function boss(definition) {
  return Object.freeze({
    status: 'active',
    replayHighlight: true,
    fairPlayNote: 'Boss races are offline premium events. Multiplayer stats, ranked rating, and time-trial ghosts are not changed.',
    ...definition
  });
}

export const BOSS_EVENT_DEFS = Object.freeze([
  boss({
    id: 'solar-flare-escape',
    title: 'Solar Flare Escape',
    shortTitle: 'Solar Flare',
    description: 'Outrun timed flare pulses through the storm corridor.',
    requiredEdition: EARLY,
    trackId: 'solar-storm-corridor',
    laps: 3,
    difficulty: 'standard',
    bossName: 'Helios Warden',
    introCopy: 'The flare front is already moving. Stay ahead and keep the hull clean.',
    objective: 'Finish top 3 with no more than 3 hazard hits.',
    rewardId: 'boss-solar-flare-escape',
    rewardPreview: 'Solar Flare Escape trophy',
    hazardScript: 'Timed flare zones and denser boost-pad pressure',
    vfxScript: 'Solar storm theme with flare-heavy pacing',
    aiRoster: [
      { participantId: 'boss-helios', label: 'Helios Warden', shipId: 'nova', hullId: 'crimson', glowId: 'amber-core', trailId: 'flare-trail', pace: 1.08, aggression: 1.1, precision: 1.05 },
      { participantId: 'flare-a', label: 'Flare Escort', shipId: 'vector', hullId: 'sunfire', glowId: 'cyan-core', trailId: 'ion-trail', pace: 1.01, aggression: 0.96, precision: 0.98 },
      { participantId: 'flare-b', label: 'Corona Wing', shipId: 'atlas', hullId: 'azure', glowId: 'amber-core', trailId: 'flare-trail', pace: 0.98, aggression: 1.16, precision: 0.9 }
    ]
  }),
  boss({
    id: 'asteroid-collapse-run',
    title: 'Asteroid Collapse Run',
    shortTitle: 'Asteroid Collapse',
    description: 'Thread the refinery lanes while debris pressure tightens each lap.',
    requiredEdition: FULL,
    trackId: 'rift-run',
    laps: 4,
    difficulty: 'elite',
    bossName: 'Mira Flux',
    introCopy: 'The belt is folding in. She knows the shortcuts better than the map does.',
    objective: 'Finish top 2 and survive the collapse route.',
    rewardId: 'boss-asteroid-collapse-run',
    rewardPreview: 'Asteroid collapse trophy',
    hazardScript: 'Extra slow zones and risky shortcut pressure',
    vfxScript: 'Asteroid refinery theme with collapse pacing',
    aiRoster: [
      { participantId: 'boss-mira', label: 'Mira Flux', shipId: 'ghostwire', hullId: 'azure', glowId: 'violet-core', trailId: 'rift-trail', pace: 1.1, aggression: 0.92, precision: 1.18 },
      { participantId: 'belt-a', label: 'Debris Runner', shipId: 'atlas', hullId: 'mint', glowId: 'emerald-core', trailId: 'echo-trail', pace: 1.02, aggression: 1.08, precision: 0.95 }
    ]
  }),
  boss({
    id: 'black-hole-gravity-duel',
    title: 'Black Hole Gravity Duel',
    shortTitle: 'Gravity Duel',
    description: 'Hold stable racing lines against gravity wells and a pressure rival.',
    requiredEdition: FULL,
    trackId: 'singularity-loop',
    laps: 4,
    difficulty: 'elite',
    bossName: 'Kael Vector',
    introCopy: 'Kael will shove for the apex. Let the gravity punish the wrong line.',
    objective: 'Win the gravity duel.',
    rewardId: 'boss-black-hole-gravity-duel',
    rewardPreview: 'Gravity duel trophy',
    hazardScript: 'Heavy slow zones emulate gravity wells',
    vfxScript: 'Shattered ringworld theme with black-hole pressure copy',
    aiRoster: [
      { participantId: 'boss-kael', label: 'Kael Vector', shipId: 'atlas', hullId: 'sunfire', glowId: 'amber-core', trailId: 'flare-trail', pace: 1.12, aggression: 1.34, precision: 0.96 },
      { participantId: 'gravity-a', label: 'Vector Wing', shipId: 'velour', hullId: 'violet', glowId: 'plasma-core', trailId: 'rift-trail', pace: 1.04, aggression: 1.02, precision: 1.04 }
    ]
  }),
  boss({
    id: 'alien-warship-chase',
    title: 'Alien Warship Chase',
    shortTitle: 'Warship Chase',
    description: 'Dodge pressure waves and keep speed through an eclipse pursuit.',
    requiredEdition: FULL,
    trackId: 'eclipse-promenade',
    laps: 4,
    difficulty: 'elite',
    bossName: 'Orion Vex',
    introCopy: 'The warship does not need to catch you. It only needs you to hesitate.',
    objective: 'Finish top 2 with at least two boosts used.',
    rewardId: 'boss-alien-warship-chase',
    rewardPreview: 'Warship chase badge',
    hazardScript: 'Power-up pressure and chase-wave pacing',
    vfxScript: 'Eclipse palace theme with pursuit tone',
    aiRoster: [
      { participantId: 'boss-orion', label: 'Orion Vex', shipId: 'nova', hullId: 'crimson', glowId: 'plasma-core', trailId: 'nova-trail', pace: 1.13, aggression: 1.12, precision: 1.02 },
      { participantId: 'warship-a', label: 'Warship Drone', shipId: 'imperion', hullId: 'violet', glowId: 'violet-core', trailId: 'rift-trail', pace: 1.03, aggression: 1.08, precision: 0.92 }
    ]
  }),
  boss({
    id: 'final-rival-duel',
    title: 'Final Rival Duel',
    shortTitle: 'Final Duel',
    description: 'A high-difficulty duel against the champion in the aurora vault.',
    requiredEdition: FULL,
    trackId: 'aurora-sanctum',
    laps: 5,
    difficulty: 'elite',
    bossName: 'Zane Eclipse',
    introCopy: 'No speeches. Five laps, one crown, clean lines only.',
    objective: 'Win the final duel.',
    rewardId: 'boss-final-rival-duel',
    rewardPreview: 'Final rival championship title',
    hazardScript: 'Precision gates and high-speed shortcut pressure',
    vfxScript: 'Aurora vault theme with final-rival camera copy',
    aiRoster: [
      { participantId: 'boss-zane', label: 'Zane Eclipse', shipId: 'imperion', hullId: 'violet', glowId: 'plasma-core', trailId: 'nova-trail', pace: 1.16, aggression: 1.05, precision: 1.24 }
    ]
  })
]);

export const BOSS_EVENT_LOOKUP = Object.freeze(
  Object.fromEntries(BOSS_EVENT_DEFS.map((event) => [event.id, event]))
);

export function getBossEvent(eventId) {
  return BOSS_EVENT_LOOKUP[eventId] ?? BOSS_EVENT_DEFS[0];
}

export function buildBossTrackDefinition(event) {
  const bossEvent = getBossEvent(event?.id ?? event);
  const baseTrack = TRACK_LOOKUP[bossEvent.trackId] ?? TRACK_DEFS[0];
  const track = buildCustomTrackDefinition(baseTrack, {
    lapCount: bossEvent.laps,
    hazardsEnabled: true,
    pickupsEnabled: true,
    boostPadDensity: bossEvent.id === 'solar-flare-escape' ? 'dense' : 'normal',
    shortcutDifficulty: ['asteroid-collapse-run', 'final-rival-duel'].includes(bossEvent.id) ? 'risky' : 'normal',
    visualEffect: bossEvent.id === 'black-hole-gravity-duel' ? 'void' : bossEvent.id === 'asteroid-collapse-run' ? 'storm' : 'default'
  });

  if (bossEvent.id === 'black-hole-gravity-duel') {
    track.slowZones = [
      ...(track.slowZones ?? []),
      { progress: 0.28, length: 0.05, strength: 0.42 },
      { progress: 0.68, length: 0.04, strength: 0.38 }
    ];
  }

  if (bossEvent.id === 'solar-flare-escape') {
    track.hazardZones = [
      ...(track.hazardZones ?? []),
      { progress: 0.18, length: 0.035, lane: -1.6, width: 2.2 },
      { progress: 0.52, length: 0.04, lane: 1.4, width: 2.4 }
    ];
  }

  track.themeName = `${track.themeName ?? track.name} / Boss Event`;
  return track;
}

export function createBossAiRoster(event) {
  const bossEvent = getBossEvent(event?.id ?? event);
  return bossEvent.aiRoster.map((entry, index) => ({
    participantId: entry.participantId ?? `boss-ai-${index}`,
    label: entry.label,
    shipId: entry.shipId,
    hullId: entry.hullId,
    glowId: entry.glowId,
    trailId: entry.trailId,
    pace: entry.pace,
    aggression: entry.aggression,
    precision: entry.precision,
    lanePreference: index === 0 ? 0.7 : -1.4 + index,
    laneAmplitude: index === 0 ? 0.8 : 1.2,
    laneFrequency: index === 0 ? 0.18 : 0.28,
    caution: index === 0 ? 0.94 : 1,
    personaLabel: index === 0 ? 'Boss Rival' : 'Boss Event AI',
    boostAggression: index === 0 ? 1.12 : 1,
    boostDiscipline: index === 0 ? 1.08 : 0.98,
    shortcutBias: index === 0 ? 1.18 : 0.92,
    driftBias: index === 0 ? 1.08 : 0.9,
    contactBias: index === 0 ? 0.92 : 0.84
  }));
}

export function evaluateBossResult(event, raceSummary = {}) {
  const bossEvent = getBossEvent(event?.id ?? event);
  const position = raceSummary.position ?? 99;
  const hazardHits = raceSummary.stats?.hazardHits ?? 0;
  const boostSeconds = raceSummary.stats?.boostSeconds ?? 0;
  let completed = position === 1;

  if (bossEvent.id === 'solar-flare-escape') {
    completed = position <= 3 && hazardHits <= 3;
  } else if (bossEvent.id === 'asteroid-collapse-run') {
    completed = position <= 2;
  } else if (bossEvent.id === 'alien-warship-chase') {
    completed = position <= 2 && boostSeconds >= 1.4;
  }

  return {
    bossEventId: bossEvent.id,
    completed,
    objective: bossEvent.objective,
    resultLabel: completed ? 'Boss objective complete' : 'Boss objective missed'
  };
}

export function getBossRewardIds(event, completed = false) {
  const bossEvent = getBossEvent(event?.id ?? event);
  return completed && bossEvent.rewardId ? [bossEvent.rewardId] : [];
}
