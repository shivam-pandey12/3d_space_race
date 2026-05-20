import { EDITION_IDS } from './editionConfig.js';

export const CAMPAIGN_RIVALS = Object.freeze({
  'kael-vector': Object.freeze({
    id: 'kael-vector',
    name: 'Kael Vector',
    callSign: 'Vector Break',
    bio: 'A pressure racer who forces mistakes on corner entry.',
    personality: 'Aggressive overtaker',
    hint: 'Defend early lanes and avoid side contact on exits.',
    preRaceLine: 'Hold the inside if you can. I only need one gap.',
    postRaceLine: 'Clean pass. I will remember that line.',
    preferredShipId: 'atlas',
    preferredTrackId: 'singularity-loop',
    profile: {
      label: 'Kael Vector',
      shipId: 'atlas',
      hullId: 'sunfire',
      glowId: 'amber-core',
      trailId: 'flare-trail',
      pace: 1.04,
      lanePreference: -2.1,
      laneAmplitude: 1.6,
      laneFrequency: 0.36,
      caution: 0.88,
      aggression: 1.28,
      wobble: 0.06,
      personaLabel: 'Aggressive Overtaker',
      boostAggression: 1.04,
      boostDiscipline: 0.92,
      shortcutBias: 0.94,
      driftBias: 0.9,
      contactBias: 1.32,
      precision: 0.92,
      preferredIdentity: 'hazard-chaos'
    }
  }),
  'nyra-sol': Object.freeze({
    id: 'nyra-sol',
    name: 'Nyra Sol',
    callSign: 'Blue Line',
    bio: 'A clean technician who wins by keeping every sector tidy.',
    personality: 'Clean technical racer',
    hint: 'Match her exits; reckless boosts usually lose time.',
    preRaceLine: 'No drama. Just sectors.',
    postRaceLine: 'That was measured. Good racing.',
    preferredShipId: 'vector',
    preferredTrackId: 'night-circuit',
    profile: {
      label: 'Nyra Sol',
      shipId: 'vector',
      hullId: 'mint',
      glowId: 'emerald-core',
      trailId: 'echo-trail',
      pace: 1.02,
      lanePreference: 1.2,
      laneAmplitude: 1.0,
      laneFrequency: 0.22,
      caution: 1.08,
      aggression: 0.88,
      wobble: 0.025,
      personaLabel: 'Clean Technical Racer',
      boostAggression: 0.92,
      boostDiscipline: 1.12,
      shortcutBias: 0.84,
      driftBias: 0.98,
      contactBias: 0.68,
      precision: 1.32,
      preferredIdentity: 'fast-open'
    }
  }),
  'orion-vex': Object.freeze({
    id: 'orion-vex',
    name: 'Orion Vex',
    callSign: 'Redline',
    bio: 'A boost-heavy risk taker with a habit of arriving too fast.',
    personality: 'Boost-heavy risk taker',
    hint: 'Let him overshoot risky lanes, then counter on the straight.',
    preRaceLine: 'Lift if you want. I am not.',
    postRaceLine: 'Fast enough. Next time I brake later.',
    preferredShipId: 'nova',
    preferredTrackId: 'solar-storm-corridor',
    profile: {
      label: 'Orion Vex',
      shipId: 'nova',
      hullId: 'crimson',
      glowId: 'plasma-core',
      trailId: 'nova-trail',
      pace: 1.05,
      lanePreference: -0.5,
      laneAmplitude: 1.8,
      laneFrequency: 0.38,
      caution: 0.94,
      aggression: 1.08,
      wobble: 0.065,
      personaLabel: 'Boost Risk Taker',
      boostAggression: 1.28,
      boostDiscipline: 0.9,
      shortcutBias: 1.0,
      driftBias: 0.98,
      contactBias: 0.92,
      precision: 1.0,
      preferredIdentity: 'storm-sprint'
    }
  }),
  'mira-flux': Object.freeze({
    id: 'mira-flux',
    name: 'Mira Flux',
    callSign: 'Slipstream',
    bio: 'A shortcut specialist who hunts risky inside cuts.',
    personality: 'Shortcut specialist',
    hint: 'Cover shortcut exits and keep enough boost to respond.',
    preRaceLine: 'The obvious route is rarely the quick one.',
    postRaceLine: 'You saw the cut before I did. Nice.',
    preferredShipId: 'ghostwire',
    preferredTrackId: 'rift-run',
    profile: {
      label: 'Mira Flux',
      shipId: 'ghostwire',
      hullId: 'azure',
      glowId: 'cyan-core',
      trailId: 'ion-trail',
      pace: 1.0,
      lanePreference: 2.4,
      laneAmplitude: 2.4,
      laneFrequency: 0.56,
      caution: 1.02,
      aggression: 0.98,
      wobble: 0.08,
      personaLabel: 'Shortcut Specialist',
      boostAggression: 0.92,
      boostDiscipline: 1.0,
      shortcutBias: 1.28,
      driftBias: 1.28,
      contactBias: 0.78,
      precision: 1.14,
      preferredIdentity: 'technical-drift'
    }
  }),
  'zane-eclipse': Object.freeze({
    id: 'zane-eclipse',
    name: 'Zane Eclipse',
    callSign: 'Champion',
    bio: 'The final rival: patient, fast, and difficult to bait.',
    personality: 'Final rival champion',
    hint: 'Beat him with complete laps; one messy sector gives him the race.',
    preRaceLine: 'Championship pace starts before the countdown.',
    postRaceLine: 'You earned the line. Defend it.',
    preferredShipId: 'imperion',
    preferredTrackId: 'aurora-sanctum',
    profile: {
      label: 'Zane Eclipse',
      shipId: 'imperion',
      hullId: 'violet',
      glowId: 'violet-core',
      trailId: 'rift-trail',
      pace: 1.07,
      lanePreference: -1.0,
      laneAmplitude: 1.5,
      laneFrequency: 0.32,
      caution: 1.02,
      aggression: 1.08,
      wobble: 0.035,
      personaLabel: 'Final Rival Champion',
      boostAggression: 1.12,
      boostDiscipline: 1.1,
      shortcutBias: 1.08,
      driftBias: 1.12,
      contactBias: 0.86,
      precision: 1.24,
      preferredIdentity: 'prestige-flow'
    }
  })
});

const DEFAULT_ROSTER = ['nyra-sol', 'kael-vector', 'orion-vex', 'mira-flux', 'zane-eclipse'];

export const CAMPAIGN_CUPS = Object.freeze([
  Object.freeze({
    id: 'rookie-league',
    title: 'Rookie League',
    description: 'A controlled premium ladder for learning pressure racing without changing the normal career.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    recommendedDifficulty: 'Casual',
    trophyKey: 'rookie-league-trophy',
    rewardPreview: '+650 XP / +900 CR / Rookie League trophy',
    races: Object.freeze([
      Object.freeze({
        id: 'rookie-opening-grid',
        title: 'Opening Grid',
        trackId: 'night-circuit',
        laps: 2,
        difficulty: 'casual',
        recommendedShipId: 'starling',
        spotlightRivalId: 'nyra-sol',
        aiRoster: ['nyra-sol', 'kael-vector', 'mira-flux', 'orion-vex', 'zane-eclipse'],
        rewardPreview: '+180 XP / +240 CR'
      }),
      Object.freeze({
        id: 'rookie-pressure-run',
        title: 'Pressure Run',
        trackId: 'night-circuit',
        laps: 3,
        difficulty: 'casual',
        recommendedShipId: 'vector',
        spotlightRivalId: 'kael-vector',
        aiRoster: ['kael-vector', 'nyra-sol', 'orion-vex', 'mira-flux', 'zane-eclipse'],
        rewardPreview: '+220 XP / +300 CR'
      }),
      Object.freeze({
        id: 'rookie-final-check',
        title: 'Final Check',
        trackId: 'rift-run',
        laps: 3,
        difficulty: 'standard',
        recommendedShipId: 'vector',
        spotlightRivalId: 'mira-flux',
        aiRoster: ['mira-flux', 'nyra-sol', 'kael-vector', 'orion-vex', 'zane-eclipse'],
        rewardPreview: '+250 XP / +360 CR'
      })
    ])
  }),
  Object.freeze({
    id: 'neon-circuit-cup',
    title: 'Neon Circuit Cup',
    description: 'A faster Early Access cup built around drafting, boost timing, and clean recoveries.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    recommendedDifficulty: 'Standard',
    trophyKey: 'neon-circuit-cup-trophy',
    rewardPreview: '+820 XP / +1,100 CR / Neon Circuit trophy',
    races: Object.freeze([
      Object.freeze({
        id: 'neon-draft-heat',
        title: 'Draft Heat',
        trackId: 'night-circuit',
        laps: 3,
        difficulty: 'standard',
        recommendedShipId: 'vector',
        spotlightRivalId: 'orion-vex',
        aiRoster: ['orion-vex', 'nyra-sol', 'kael-vector', 'mira-flux', 'zane-eclipse'],
        rewardPreview: '+240 XP / +320 CR'
      }),
      Object.freeze({
        id: 'neon-shortcut-scramble',
        title: 'Shortcut Scramble',
        trackId: 'rift-run',
        laps: 3,
        difficulty: 'standard',
        recommendedShipId: 'ghostwire',
        spotlightRivalId: 'mira-flux',
        aiRoster: ['mira-flux', 'orion-vex', 'nyra-sol', 'kael-vector', 'zane-eclipse'],
        rewardPreview: '+270 XP / +370 CR'
      }),
      Object.freeze({
        id: 'neon-cup-final',
        title: 'Neon Cup Final',
        trackId: 'eclipse-promenade',
        laps: 3,
        difficulty: 'standard',
        recommendedShipId: 'nova',
        spotlightRivalId: 'kael-vector',
        aiRoster: ['kael-vector', 'orion-vex', 'mira-flux', 'nyra-sol', 'zane-eclipse'],
        rewardPreview: '+310 XP / +410 CR'
      })
    ])
  }),
  Object.freeze({
    id: 'asteroid-belt-championship',
    title: 'Asteroid Belt Championship',
    description: 'Full Premium technical racing through refinery lanes and heavy shortcut pressure.',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    recommendedDifficulty: 'Standard',
    trophyKey: 'asteroid-belt-championship-trophy',
    rewardPreview: '+1,000 XP / +1,350 CR / Asteroid trophy',
    races: Object.freeze([
      Object.freeze({
        id: 'asteroid-refinery-entry',
        title: 'Refinery Entry',
        trackId: 'rift-run',
        laps: 3,
        difficulty: 'standard',
        recommendedShipId: 'ghostwire',
        spotlightRivalId: 'mira-flux',
        aiRoster: ['mira-flux', 'kael-vector', 'nyra-sol', 'orion-vex', 'zane-eclipse'],
        rewardPreview: '+300 XP / +390 CR'
      }),
      Object.freeze({
        id: 'asteroid-chaos-lane',
        title: 'Chaos Lane',
        trackId: 'singularity-loop',
        laps: 3,
        difficulty: 'elite',
        recommendedShipId: 'atlas',
        spotlightRivalId: 'kael-vector',
        aiRoster: ['kael-vector', 'orion-vex', 'mira-flux', 'nyra-sol', 'zane-eclipse'],
        rewardPreview: '+340 XP / +450 CR'
      }),
      Object.freeze({
        id: 'asteroid-title-race',
        title: 'Asteroid Title Race',
        trackId: 'rift-run',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'solstice',
        spotlightRivalId: 'orion-vex',
        aiRoster: ['orion-vex', 'mira-flux', 'kael-vector', 'nyra-sol', 'zane-eclipse'],
        rewardPreview: '+360 XP / +510 CR'
      })
    ])
  }),
  Object.freeze({
    id: 'solar-storm-trials',
    title: 'Solar Storm Trials',
    description: 'Full Premium boost discipline races through volatile storm corridors.',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    recommendedDifficulty: 'Elite',
    trophyKey: 'solar-storm-trials-trophy',
    rewardPreview: '+1,100 XP / +1,450 CR / Solar Storm trophy',
    races: Object.freeze([
      Object.freeze({
        id: 'storm-sprint-open',
        title: 'Storm Sprint Open',
        trackId: 'solar-storm-corridor',
        laps: 3,
        difficulty: 'elite',
        recommendedShipId: 'nova',
        spotlightRivalId: 'orion-vex',
        aiRoster: ['orion-vex', 'nyra-sol', 'kael-vector', 'mira-flux', 'zane-eclipse'],
        rewardPreview: '+330 XP / +430 CR'
      }),
      Object.freeze({
        id: 'storm-recovery-test',
        title: 'Recovery Test',
        trackId: 'night-circuit',
        laps: 4,
        difficulty: 'standard',
        recommendedShipId: 'vector',
        spotlightRivalId: 'nyra-sol',
        aiRoster: ['nyra-sol', 'orion-vex', 'kael-vector', 'mira-flux', 'zane-eclipse'],
        rewardPreview: '+350 XP / +470 CR'
      }),
      Object.freeze({
        id: 'storm-trials-final',
        title: 'Storm Trials Final',
        trackId: 'solar-storm-corridor',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'nova',
        spotlightRivalId: 'orion-vex',
        aiRoster: ['orion-vex', 'zane-eclipse', 'kael-vector', 'mira-flux', 'nyra-sol'],
        rewardPreview: '+420 XP / +550 CR'
      })
    ])
  }),
  Object.freeze({
    id: 'singularity-grand-prix',
    title: 'Singularity Grand Prix',
    description: 'A Full Premium grand prix for pilots who can survive hazard chaos and prestige flow.',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    recommendedDifficulty: 'Elite',
    trophyKey: 'singularity-grand-prix-trophy',
    rewardPreview: '+1,240 XP / +1,620 CR / Singularity trophy',
    races: Object.freeze([
      Object.freeze({
        id: 'singularity-slot-run',
        title: 'Singularity Slot Run',
        trackId: 'singularity-loop',
        laps: 3,
        difficulty: 'elite',
        recommendedShipId: 'atlas',
        spotlightRivalId: 'kael-vector',
        aiRoster: ['kael-vector', 'zane-eclipse', 'orion-vex', 'mira-flux', 'nyra-sol'],
        rewardPreview: '+370 XP / +470 CR'
      }),
      Object.freeze({
        id: 'eclipse-pressure-finalist',
        title: 'Eclipse Pressure',
        trackId: 'eclipse-promenade',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'solstice',
        spotlightRivalId: 'zane-eclipse',
        aiRoster: ['zane-eclipse', 'nyra-sol', 'kael-vector', 'orion-vex', 'mira-flux'],
        rewardPreview: '+410 XP / +540 CR'
      }),
      Object.freeze({
        id: 'aurora-prestige-run',
        title: 'Aurora Prestige Run',
        trackId: 'aurora-sanctum',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'imperion',
        spotlightRivalId: 'zane-eclipse',
        aiRoster: ['zane-eclipse', 'orion-vex', 'mira-flux', 'kael-vector', 'nyra-sol'],
        rewardPreview: '+460 XP / +610 CR'
      })
    ])
  }),
  Object.freeze({
    id: 'final-rival-championship',
    title: 'Final Rival Championship',
    description: 'The current Full Premium campaign finale against Zane Eclipse and the strongest rivals.',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    recommendedDifficulty: 'Elite',
    trophyKey: 'final-rival-championship-trophy',
    rewardPreview: '+1,500 XP / +1,950 CR / Champion trophy',
    races: Object.freeze([
      Object.freeze({
        id: 'final-eclipse-grid',
        title: 'Eclipse Grid',
        trackId: 'eclipse-promenade',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'solstice',
        spotlightRivalId: 'nyra-sol',
        aiRoster: ['nyra-sol', 'kael-vector', 'mira-flux', 'orion-vex', 'zane-eclipse'],
        rewardPreview: '+420 XP / +540 CR'
      }),
      Object.freeze({
        id: 'final-storm-pressure',
        title: 'Storm Pressure',
        trackId: 'solar-storm-corridor',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'nova',
        spotlightRivalId: 'orion-vex',
        aiRoster: ['orion-vex', 'zane-eclipse', 'kael-vector', 'mira-flux', 'nyra-sol'],
        rewardPreview: '+460 XP / +600 CR'
      }),
      Object.freeze({
        id: 'final-aurora-duel',
        title: 'Aurora Duel',
        trackId: 'aurora-sanctum',
        laps: 4,
        difficulty: 'elite',
        recommendedShipId: 'imperion',
        spotlightRivalId: 'zane-eclipse',
        aiRoster: ['zane-eclipse', 'kael-vector', 'orion-vex', 'mira-flux', 'nyra-sol'],
        rewardPreview: '+500 XP / +660 CR'
      }),
      Object.freeze({
        id: 'final-singularity-crown',
        title: 'Singularity Crown',
        trackId: 'singularity-loop',
        laps: 5,
        difficulty: 'elite',
        recommendedShipId: 'imperion',
        spotlightRivalId: 'zane-eclipse',
        aiRoster: ['zane-eclipse', 'kael-vector', 'orion-vex', 'mira-flux', 'nyra-sol'],
        rewardPreview: '+620 XP / +820 CR'
      })
    ])
  })
]);

export const CAMPAIGN_CUP_LOOKUP = Object.freeze(
  Object.fromEntries(CAMPAIGN_CUPS.map((cup) => [cup.id, cup]))
);

export function getCampaignCup(cupId) {
  return CAMPAIGN_CUP_LOOKUP[cupId] ?? CAMPAIGN_CUPS[0];
}

export function getCampaignRace(cupId, raceId) {
  const cup = getCampaignCup(cupId);
  return cup.races.find((race) => race.id === raceId) ?? cup.races[0];
}

export function getCampaignRival(rivalId) {
  return CAMPAIGN_RIVALS[rivalId] ?? CAMPAIGN_RIVALS[DEFAULT_ROSTER[0]];
}

export function createCampaignAiRoster(race) {
  const roster = Array.isArray(race?.aiRoster) && race.aiRoster.length > 0
    ? race.aiRoster
    : DEFAULT_ROSTER;

  return roster.map((rivalId, index) => {
    const rival = getCampaignRival(rivalId);
    return {
      ...rival.profile,
      participantId: rival.id,
      scoring: true,
      name: rival.name,
      label: rival.name,
      idlePhase: index * 0.7 + 1.1
    };
  });
}
