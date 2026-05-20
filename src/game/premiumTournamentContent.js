import { EDITION_IDS } from './editionConfig.js';
import { CAMPAIGN_RIVALS } from './premiumCampaignContent.js';

export const TOURNAMENT_PLAYER_ID = 'player';

const EXTRA_TOURNAMENT_PILOTS = Object.freeze({
  'sable-ion': Object.freeze({
    id: 'sable-ion',
    name: 'Sable Ion',
    callSign: 'Blackout',
    profile: {
      label: 'Sable Ion',
      shipId: 'solstice',
      hullId: 'violet',
      glowId: 'violet-core',
      trailId: 'rift-trail',
      pace: 1.01,
      lanePreference: 0.4,
      laneAmplitude: 1.5,
      laneFrequency: 0.34,
      caution: 0.98,
      aggression: 1.04,
      wobble: 0.055,
      personaLabel: 'Bracket Pressure',
      boostAggression: 1.08,
      boostDiscipline: 1.0,
      shortcutBias: 1.02,
      driftBias: 1.06,
      contactBias: 0.92,
      precision: 1.06,
      preferredIdentity: 'prestige-flow'
    }
  }),
  'rhea-quark': Object.freeze({
    id: 'rhea-quark',
    name: 'Rhea Quark',
    callSign: 'Needle',
    profile: {
      label: 'Rhea Quark',
      shipId: 'velour',
      hullId: 'mint',
      glowId: 'emerald-core',
      trailId: 'echo-trail',
      pace: 1.02,
      lanePreference: 1.7,
      laneAmplitude: 1.2,
      laneFrequency: 0.28,
      caution: 1.06,
      aggression: 0.94,
      wobble: 0.035,
      personaLabel: 'Precision Bracket Racer',
      boostAggression: 0.96,
      boostDiscipline: 1.08,
      shortcutBias: 0.9,
      driftBias: 1.0,
      contactBias: 0.74,
      precision: 1.22,
      preferredIdentity: 'crown-chicane'
    }
  }),
  'voss-meridian': Object.freeze({
    id: 'voss-meridian',
    name: 'Voss Meridian',
    callSign: 'Wide Arc',
    profile: {
      label: 'Voss Meridian',
      shipId: 'atlas',
      hullId: 'crimson',
      glowId: 'amber-core',
      trailId: 'flare-trail',
      pace: 1.0,
      lanePreference: -2.7,
      laneAmplitude: 2.1,
      laneFrequency: 0.4,
      caution: 0.96,
      aggression: 1.12,
      wobble: 0.072,
      personaLabel: 'Wide Arc Bruiser',
      boostAggression: 1.02,
      boostDiscipline: 0.96,
      shortcutBias: 0.98,
      driftBias: 0.92,
      contactBias: 1.18,
      precision: 0.96,
      preferredIdentity: 'hazard-chaos'
    }
  })
});

const TOURNAMENT_PILOT_POOL = Object.freeze([
  CAMPAIGN_RIVALS['nyra-sol'],
  CAMPAIGN_RIVALS['kael-vector'],
  CAMPAIGN_RIVALS['orion-vex'],
  CAMPAIGN_RIVALS['mira-flux'],
  CAMPAIGN_RIVALS['zane-eclipse'],
  EXTRA_TOURNAMENT_PILOTS['sable-ion'],
  EXTRA_TOURNAMENT_PILOTS['rhea-quark'],
  EXTRA_TOURNAMENT_PILOTS['voss-meridian']
]);

export const TOURNAMENT_TYPES = Object.freeze([
  Object.freeze({
    id: 'ai-knockout-4',
    title: '4-Player AI Tournament',
    shortTitle: '4-Player',
    description: 'A compact local AI elimination bracket for Early Access pilots.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    status: 'active',
    participantCount: 4,
    lapCount: 3,
    difficulty: 'standard',
    trophyKey: 'ai-knockout-4-trophy',
    rewardPreview: '+480 XP / +720 CR / 4-player trophy',
    rounds: Object.freeze([
      Object.freeze({ id: 'semi-final', label: 'Elimination Heat', trackId: 'night-circuit', advanceCount: 2 }),
      Object.freeze({ id: 'final', label: 'Final Race', trackId: 'rift-run', advanceCount: 1 })
    ])
  }),
  Object.freeze({
    id: 'ai-knockout-8',
    title: '8-Player AI Tournament',
    shortTitle: '8-Player',
    description: 'A longer Full Premium bracket with deeper eliminations and stronger AI pressure.',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    status: 'active',
    participantCount: 8,
    lapCount: 3,
    difficulty: 'elite',
    trophyKey: 'ai-knockout-8-trophy',
    rewardPreview: '+920 XP / +1,240 CR / 8-player trophy',
    rounds: Object.freeze([
      Object.freeze({ id: 'quarter-final', label: 'Quarter Final', trackId: 'night-circuit', advanceCount: 4 }),
      Object.freeze({ id: 'semi-final', label: 'Semi Final', trackId: 'solar-storm-corridor', advanceCount: 2 }),
      Object.freeze({ id: 'final', label: 'Final Race', trackId: 'singularity-loop', advanceCount: 1 })
    ])
  }),
  Object.freeze({
    id: 'private-online-preview',
    title: 'Private Online Tournament',
    shortTitle: 'Online Preview',
    description: 'Private online tournament rooms are preview-only for a future update.',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    status: 'preview',
    participantCount: 0,
    lapCount: 0,
    difficulty: 'standard',
    trophyKey: '',
    rewardPreview: 'Coming later',
    rounds: Object.freeze([])
  })
]);

export const TOURNAMENT_TYPE_LOOKUP = Object.freeze(
  Object.fromEntries(TOURNAMENT_TYPES.map((type) => [type.id, type]))
);

export function getTournamentType(typeId) {
  return TOURNAMENT_TYPE_LOOKUP[typeId] ?? TOURNAMENT_TYPES[0];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAiParticipant(pilot, index) {
  return {
    id: pilot.id,
    name: pilot.name,
    callSign: pilot.callSign,
    shipId: pilot.profile.shipId,
    isPlayer: false,
    eliminated: false,
    seed: index + 2,
    profile: {
      ...pilot.profile,
      participantId: pilot.id,
      scoring: true,
      name: pilot.name,
      label: pilot.name
    }
  };
}

export function createTournamentBracket(typeId, playerProfile) {
  const type = getTournamentType(typeId);

  if (!type || type.status !== 'active') {
    return null;
  }

  const player = {
    id: TOURNAMENT_PLAYER_ID,
    name: playerProfile?.playerName ?? 'You',
    callSign: 'Player',
    shipId: playerProfile?.selectedShipId ?? 'starling',
    isPlayer: true,
    eliminated: false,
    seed: 1
  };
  const aiParticipants = TOURNAMENT_PILOT_POOL
    .slice(0, Math.max(0, type.participantCount - 1))
    .map(buildAiParticipant);
  const participants = [player, ...aiParticipants];
  const now = Date.now();

  return {
    id: `${type.id}-${now}`,
    typeId: type.id,
    status: 'active',
    participantCount: type.participantCount,
    activeParticipantIds: participants.map((participant) => participant.id),
    currentRoundIndex: 0,
    currentRace: 1,
    participants,
    rounds: type.rounds.map((round, index) => ({
      id: round.id,
      label: round.label,
      trackId: round.trackId,
      advanceCount: round.advanceCount,
      participantIds: index === 0 ? participants.map((participant) => participant.id) : [],
      standings: [],
      advancingIds: [],
      eliminatedIds: [],
      completed: false
    })),
    championId: '',
    startedAt: now,
    updatedAt: now,
    completedAt: 0
  };
}

export function getTournamentParticipant(bracket, participantId) {
  return bracket?.participants?.find((participant) => participant.id === participantId) ?? null;
}

export function getTournamentRound(bracket) {
  return bracket?.rounds?.[bracket.currentRoundIndex] ?? null;
}

export function getTournamentRaceSetup(bracket) {
  const type = getTournamentType(bracket?.typeId);
  const round = getTournamentRound(bracket);

  if (!bracket || !type || !round || bracket.status !== 'active') {
    return null;
  }

  const activeIds = bracket.activeParticipantIds ?? [];
  const scoringParticipants = activeIds
    .map((participantId) => getTournamentParticipant(bracket, participantId))
    .filter(Boolean);
  const fillerCount = Math.max(0, Math.min(4, type.participantCount) - scoringParticipants.length);
  const fillerParticipants = TOURNAMENT_PILOT_POOL
    .filter((pilot) => !activeIds.includes(pilot.id))
    .slice(0, fillerCount)
    .map((pilot, index) => ({
      id: `filler-${pilot.id}-${index}`,
      name: pilot.name,
      callSign: pilot.callSign,
      shipId: pilot.profile.shipId,
      isPlayer: false,
      nonScoring: true,
      profile: {
        ...pilot.profile,
        participantId: `filler-${pilot.id}-${index}`,
        scoring: false,
        name: pilot.name,
        label: pilot.name
      }
    }));

  return {
    type,
    round,
    scoringParticipants,
    fillerParticipants,
    trackId: round.trackId,
    laps: type.lapCount,
    difficulty: type.difficulty,
    raceNumber: bracket.currentRace
  };
}

export function advanceTournamentBracket(bracket, standings) {
  const next = clone(bracket);
  const type = getTournamentType(next.typeId);
  const round = next.rounds[next.currentRoundIndex];
  const activeIds = new Set(next.activeParticipantIds ?? []);
  const scoringStandings = (standings ?? [])
    .filter((entry) => activeIds.has(entry.participantId))
    .sort((entryA, entryB) => (entryA.position ?? 99) - (entryB.position ?? 99));
  const advancingIds = scoringStandings
    .slice(0, Math.max(1, round.advanceCount))
    .map((entry) => entry.participantId);
  const eliminatedIds = [...activeIds].filter((participantId) => !advancingIds.includes(participantId));
  const now = Date.now();

  round.standings = scoringStandings;
  round.advancingIds = advancingIds;
  round.eliminatedIds = eliminatedIds;
  round.completed = true;
  next.updatedAt = now;

  const playerAdvanced = advancingIds.includes(TOURNAMENT_PLAYER_ID);
  const finalRound = round.advanceCount <= 1 || next.currentRoundIndex >= type.rounds.length - 1;

  if (!playerAdvanced) {
    next.status = 'eliminated';
    next.completedAt = now;
    next.championId = finalRound ? advancingIds[0] ?? '' : '';
  } else if (finalRound) {
    next.status = 'completed';
    next.completedAt = now;
    next.championId = advancingIds[0] ?? TOURNAMENT_PLAYER_ID;
  } else {
    next.currentRoundIndex += 1;
    next.currentRace += 1;
    next.activeParticipantIds = advancingIds;
    next.rounds[next.currentRoundIndex].participantIds = advancingIds;
  }

  next.participants = next.participants.map((participant) => ({
    ...participant,
    eliminated: eliminatedIds.includes(participant.id)
      ? true
      : participant.eliminated
  }));

  return {
    bracket: next,
    type,
    round,
    standings: scoringStandings,
    advancingIds,
    eliminatedIds,
    playerAdvanced,
    finalRound,
    champion: getTournamentParticipant(next, next.championId),
    completed: next.status === 'completed',
    eliminated: next.status === 'eliminated'
  };
}

export function createTournamentAiRoster(setup) {
  if (!setup) {
    return [];
  }

  return [...setup.scoringParticipants, ...setup.fillerParticipants]
    .filter((participant) => !participant.isPlayer)
    .map((participant, index) => ({
      ...participant.profile,
      participantId: participant.id,
      scoring: participant.nonScoring ? false : participant.profile?.scoring !== false,
      name: participant.name,
      label: participant.name,
      idlePhase: index * 0.7 + 1.1
    }));
}
