import {
  ACHIEVEMENT_DEFS,
  CHALLENGE_DEFS,
  GLOW_COLORS,
  GLOW_LOOKUP,
  HULL_COLORS,
  HULL_LOOKUP,
  SHIP_DEFS,
  SHIP_LOOKUP,
  TRACK_DEFS,
  TRACK_LOOKUP,
  TRAIL_COLORS,
  TRAIL_LOOKUP
} from './gameContent.js';
import {
  DAILY_MULTIPLAYER_GOALS,
  getDailyGoalKey,
  getGoalProgress,
  getRankInfo,
  getWeeklyGoalKey,
  pickRotatingGoals,
  WEEKLY_MULTIPLAYER_GOALS
} from './multiplayerContent.js';
import {
  ADVANCED_COSMETIC_CATEGORY_IDS,
  ADVANCED_COSMETIC_LOOKUP,
  sanitizeNumberPlate
} from './advancedGarageContent.js';
import { UPGRADE_MODULE_LOOKUP, getModuleCost } from './shipUpgradeContent.js';
import {
  DEFAULT_CUSTOM_RACE_CONFIG,
  createCustomRacePreset,
  sanitizeCustomRaceConfig
} from './customRaceLabContent.js';
import {
  PREMIUM_REWARD_DEFINITIONS,
  PREMIUM_REWARD_LOOKUP,
  getPremiumReward
} from './premiumRewardContent.js';
import {
  RANKED_SEASON_RATING_BOUNDS,
  applyRankedResult,
  getRankedRewardIds,
  getRankedSeason,
  getRankedTier
} from './rankedSeasonContent.js';
import {
  evaluateLiveEventGoal,
  getLiveEventRewardIds
} from './liveEventContent.js';
import {
  evaluateBossResult,
  getBossRewardIds
} from './bossEventContent.js';
import {
  TEST_ACCOUNT_UNLOCK_CREDIT_FLOOR,
  TEST_ACCOUNT_UNLOCK_XP_FLOOR,
  isTestUnlockAccount
} from './testAccountUnlocks.js';

const STORAGE_KEY = 'spaceship-race-codex-profile-v1';

const PLAYER_NAME_PREFIXES = [
  'Nova',
  'Solar',
  'Drift',
  'Pulse',
  'Star',
  'Ion',
  'Echo',
  'Turbo',
  'Void',
  'Comet'
];

const PLAYER_NAME_SUFFIXES = [
  'Runner',
  'Rider',
  'Ace',
  'Pilot',
  'Hunter',
  'Spark',
  'Rift',
  'Blaze',
  'Vector',
  'Flux'
];

function createDefaultPlayerName() {
  const prefix = PLAYER_NAME_PREFIXES[Math.floor(Math.random() * PLAYER_NAME_PREFIXES.length)];
  const suffix = PLAYER_NAME_SUFFIXES[Math.floor(Math.random() * PLAYER_NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

function sanitizePlayerName(value) {
  const cleaned = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);

  return cleaned || createDefaultPlayerName();
}

function sanitizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function sanitizeUnitInterval(value, fallback = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.min(1, numeric))
    : fallback;
}

function sanitizeDifficulty(value) {
  const allowed = ['casual', 'standard', 'elite'];
  return allowed.includes(value) ? value : 'standard';
}

function sanitizeGraphicsQuality(value) {
  const allowed = ['performance', 'balanced', 'high'];
  return allowed.includes(value) ? value : 'high';
}

function cloneDefaultSettings() {
  return {
    audio: {
      master: 0.82,
      effects: 0.92,
      voice: 0.84,
      voiceEnabled: true
    },
    graphics: {
      quality: 'high',
      particles: true,
      speedLines: true,
      cameraShake: true,
      animatedTrack: true
    },
    gameplay: {
      difficulty: 'standard',
      onboardingSeen: false
    },
    controls: {
      bindings: {}
    }
  };
}

function createPilotId() {
  return `pilot-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeFriend(value) {
  const cleaned = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);

  return cleaned || null;
}

function cloneDefaultMultiplayerStats() {
  return {
    rating: 1000,
    races: 0,
    wins: 0,
    podiums: 0,
    privateRaces: 0,
    privateWins: 0,
    tournamentRaces: 0,
    tournamentWins: 0,
    totalOvertakes: 0,
    cleanRaces: 0,
    closeFinishes: 0,
    recentHighlights: [],
    lastRoomLeaderboard: []
  };
}

function cloneDefaultPremiumProgress() {
  return {
    campaign: {
      selectedCupId: 'rookie-league',
      cups: {},
      trophies: [],
      stats: {
        races: 0,
        wins: 0,
        cupsCompleted: 0
      }
    },
    tournaments: {
      selectedTypeId: 'ai-knockout-4',
      activeBracket: null,
      history: [],
      trophies: [],
      stats: {
        started: 0,
        completed: 0,
        wins: 0,
        eliminations: 0
      }
    },
    customRaceLab: {
      activeConfig: { ...DEFAULT_CUSTOM_RACE_CONFIG },
      presets: [],
      recentConfigs: [],
      stats: {
        races: 0,
        wins: 0,
        presetsSaved: 0
      }
    },
    rankedSeasons: {
      currentSeasonId: '',
      seasonRating: RANKED_SEASON_RATING_BOUNDS.start,
      seasonTier: 'silver',
      seasonRaces: 0,
      seasonWins: 0,
      seasonPodiums: 0,
      currentStreak: 0,
      seasonBestStreak: 0,
      seasonHistory: [],
      claimedSeasonRewards: []
    },
    liveEvents: {
      completedEventIds: [],
      bestResults: {},
      recentCompletions: []
    },
    bossEvents: {
      selectedBossEventId: 'solar-flare-escape',
      completedBossIds: [],
      bestResults: {},
      trophies: []
    },
    rewards: {
      unlockedRewardIds: [],
      unlockedCosmeticIds: [],
      trophies: [],
      badges: [],
      titles: [],
      equippedBadgeId: '',
      unlockedAt: {}
    }
  };
}

function sanitizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeStringArray(values, limit = 32) {
  return Array.isArray(values)
    ? [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].slice(0, limit)
    : [];
}

function normalizeCampaignCupProgress(record = {}) {
  const completedRaceIds = sanitizeStringArray(record.completedRaceIds, 24);
  const rawBestPositions = record.bestPositions && typeof record.bestPositions === 'object'
    ? record.bestPositions
    : {};

  return {
    unlockedRaceIndex: Math.max(0, Math.floor(sanitizeNumber(record.unlockedRaceIndex, 0))),
    completedRaceIds,
    bestPositions: Object.fromEntries(
      Object.entries(rawBestPositions)
        .map(([raceId, position]) => [String(raceId), Math.max(1, Math.floor(sanitizeNumber(position, 99)))])
        .filter(([raceId]) => Boolean(raceId))
    ),
    completed: Boolean(record.completed),
    trophyEarned: Boolean(record.trophyEarned),
    trophyKey: String(record.trophyKey ?? ''),
    updatedAt: Math.max(0, sanitizeNumber(record.updatedAt, 0))
  };
}

function normalizeTournamentBracket(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  return {
    ...record,
    id: String(record.id ?? ''),
    typeId: String(record.typeId ?? ''),
    status: ['active', 'completed', 'eliminated'].includes(record.status) ? record.status : 'active',
    participantCount: Math.max(0, Math.floor(sanitizeNumber(record.participantCount, 0))),
    currentRoundIndex: Math.max(0, Math.floor(sanitizeNumber(record.currentRoundIndex, 0))),
    currentRace: Math.max(1, Math.floor(sanitizeNumber(record.currentRace, 1))),
    activeParticipantIds: sanitizeStringArray(record.activeParticipantIds, 16),
    participants: Array.isArray(record.participants) ? record.participants.slice(0, 12) : [],
    rounds: Array.isArray(record.rounds) ? record.rounds.slice(0, 6) : [],
    championId: String(record.championId ?? ''),
    startedAt: Math.max(0, sanitizeNumber(record.startedAt, 0)),
    updatedAt: Math.max(0, sanitizeNumber(record.updatedAt, 0)),
    completedAt: Math.max(0, sanitizeNumber(record.completedAt, 0))
  };
}

function normalizeCustomRaceLab(rawLab = {}, base = cloneDefaultPremiumProgress().customRaceLab) {
  const storageEntitlements = { canUseFullCustomRaceLab: () => true };
  const normalizedActive = sanitizeCustomRaceConfig(rawLab.activeConfig ?? base.activeConfig, storageEntitlements, {});
  const presets = Array.isArray(rawLab.presets)
    ? rawLab.presets.slice(0, 12).map((preset) => ({
        ...sanitizeCustomRaceConfig(preset, storageEntitlements, {}),
        id: String(preset.id ?? `preset-${Date.now().toString(36)}`),
        savedAt: Math.max(0, sanitizeNumber(preset.savedAt, Date.now()))
      }))
    : [];
  const recentConfigs = Array.isArray(rawLab.recentConfigs)
    ? rawLab.recentConfigs.slice(0, 8).map((config) => sanitizeCustomRaceConfig(config, storageEntitlements, {}))
    : [];

  return {
    activeConfig: normalizedActive,
    presets,
    recentConfigs,
    stats: {
      races: Math.max(0, Math.floor(sanitizeNumber(rawLab.stats?.races, base.stats.races))),
      wins: Math.max(0, Math.floor(sanitizeNumber(rawLab.stats?.wins, base.stats.wins))),
      presetsSaved: Math.max(0, Math.floor(sanitizeNumber(rawLab.stats?.presetsSaved, base.stats.presetsSaved)))
    }
  };
}

function normalizeRankedSeasons(rawRanked = {}, base = cloneDefaultPremiumProgress().rankedSeasons) {
  const rating = Math.max(
    RANKED_SEASON_RATING_BOUNDS.min,
    Math.min(RANKED_SEASON_RATING_BOUNDS.max, Math.round(sanitizeNumber(rawRanked.seasonRating, base.seasonRating)))
  );
  const tier = getRankedTier(rating);

  return {
    currentSeasonId: String(rawRanked.currentSeasonId ?? base.currentSeasonId),
    seasonRating: rating,
    seasonTier: tier.id,
    seasonRaces: Math.max(0, Math.floor(sanitizeNumber(rawRanked.seasonRaces, base.seasonRaces))),
    seasonWins: Math.max(0, Math.floor(sanitizeNumber(rawRanked.seasonWins, base.seasonWins))),
    seasonPodiums: Math.max(0, Math.floor(sanitizeNumber(rawRanked.seasonPodiums, base.seasonPodiums))),
    currentStreak: Math.max(0, Math.floor(sanitizeNumber(rawRanked.currentStreak, base.currentStreak))),
    seasonBestStreak: Math.max(0, Math.floor(sanitizeNumber(rawRanked.seasonBestStreak, base.seasonBestStreak))),
    seasonHistory: Array.isArray(rawRanked.seasonHistory)
      ? rawRanked.seasonHistory.slice(0, 8).map((entry) => ({
          seasonId: String(entry?.seasonId ?? ''),
          seasonName: String(entry?.seasonName ?? 'Ranked Season'),
          rating: Math.max(RANKED_SEASON_RATING_BOUNDS.min, Math.min(RANKED_SEASON_RATING_BOUNDS.max, Math.round(sanitizeNumber(entry?.rating, RANKED_SEASON_RATING_BOUNDS.start)))),
          tier: String(entry?.tier ?? 'silver'),
          races: Math.max(0, Math.floor(sanitizeNumber(entry?.races, 0))),
          wins: Math.max(0, Math.floor(sanitizeNumber(entry?.wins, 0))),
          podiums: Math.max(0, Math.floor(sanitizeNumber(entry?.podiums, 0))),
          archivedAt: Math.max(0, sanitizeNumber(entry?.archivedAt, 0))
        })).filter((entry) => Boolean(entry.seasonId))
      : [],
    claimedSeasonRewards: sanitizeStringArray(rawRanked.claimedSeasonRewards ?? base.claimedSeasonRewards, 64)
      .filter((rewardId) => Boolean(PREMIUM_REWARD_LOOKUP[rewardId]))
  };
}

function normalizeLiveEvents(rawEvents = {}, base = cloneDefaultPremiumProgress().liveEvents) {
  const rawBest = rawEvents.bestResults && typeof rawEvents.bestResults === 'object'
    ? rawEvents.bestResults
    : {};

  return {
    completedEventIds: sanitizeStringArray(rawEvents.completedEventIds ?? base.completedEventIds, 180),
    bestResults: Object.fromEntries(
      Object.entries(rawBest)
        .map(([eventId, record]) => [String(eventId), {
          eventId: String(eventId),
          completed: Boolean(record?.completed),
          position: Math.max(1, Math.floor(sanitizeNumber(record?.position, 99))),
          goalLabel: String(record?.goalLabel ?? ''),
          completedAt: Math.max(0, sanitizeNumber(record?.completedAt, 0))
        }])
        .filter(([eventId]) => Boolean(eventId))
    ),
    recentCompletions: Array.isArray(rawEvents.recentCompletions)
      ? rawEvents.recentCompletions.slice(0, 10).map((entry) => ({
          eventId: String(entry?.eventId ?? ''),
          title: String(entry?.title ?? 'Live Event'),
          goalLabel: String(entry?.goalLabel ?? ''),
          completed: Boolean(entry?.completed),
          completedAt: Math.max(0, sanitizeNumber(entry?.completedAt, 0))
        })).filter((entry) => Boolean(entry.eventId))
      : []
  };
}

function normalizeBossEvents(rawBoss = {}, base = cloneDefaultPremiumProgress().bossEvents) {
  const rawBest = rawBoss.bestResults && typeof rawBoss.bestResults === 'object'
    ? rawBoss.bestResults
    : {};

  return {
    selectedBossEventId: String(rawBoss.selectedBossEventId ?? base.selectedBossEventId),
    completedBossIds: sanitizeStringArray(rawBoss.completedBossIds ?? base.completedBossIds, 32),
    bestResults: Object.fromEntries(
      Object.entries(rawBest)
        .map(([bossEventId, record]) => [String(bossEventId), {
          bossEventId: String(bossEventId),
          completed: Boolean(record?.completed),
          position: Math.max(1, Math.floor(sanitizeNumber(record?.position, 99))),
          bestTimeMs: Math.max(0, sanitizeNumber(record?.bestTimeMs, 0)),
          completedAt: Math.max(0, sanitizeNumber(record?.completedAt, 0))
        }])
        .filter(([bossEventId]) => Boolean(bossEventId))
    ),
    trophies: sanitizeStringArray(rawBoss.trophies ?? base.trophies, 32)
  };
}

function normalizePremiumRewards(rawRewards = {}, base = cloneDefaultPremiumProgress().rewards) {
  const unlockedRewardIds = sanitizeStringArray(rawRewards.unlockedRewardIds ?? base.unlockedRewardIds, 128)
    .filter((rewardId) => Boolean(PREMIUM_REWARD_LOOKUP[rewardId]));
  const rawUnlockedAt = rawRewards.unlockedAt && typeof rawRewards.unlockedAt === 'object'
    ? rawRewards.unlockedAt
    : {};

  return {
    unlockedRewardIds,
    unlockedCosmeticIds: sanitizeStringArray(rawRewards.unlockedCosmeticIds ?? base.unlockedCosmeticIds, 128),
    trophies: sanitizeStringArray(rawRewards.trophies ?? base.trophies, 64),
    badges: sanitizeStringArray(rawRewards.badges ?? base.badges, 64),
    titles: sanitizeStringArray(rawRewards.titles ?? base.titles, 64),
    equippedBadgeId: String(rawRewards.equippedBadgeId ?? base.equippedBadgeId ?? ''),
    unlockedAt: Object.fromEntries(
      Object.entries(rawUnlockedAt)
        .filter(([rewardId]) => unlockedRewardIds.includes(rewardId))
        .map(([rewardId, value]) => [rewardId, Math.max(0, sanitizeNumber(value, 0))])
    )
  };
}

function normalizePremiumProgress(rawProgress = {}, base = cloneDefaultPremiumProgress()) {
  const rawCampaign = rawProgress.campaign ?? {};
  const rawTournaments = rawProgress.tournaments ?? {};
  const rawCups = rawCampaign.cups && typeof rawCampaign.cups === 'object'
    ? rawCampaign.cups
    : {};

  return {
    campaign: {
      selectedCupId: String(rawCampaign.selectedCupId ?? base.campaign.selectedCupId),
      cups: Object.fromEntries(
        Object.entries(rawCups)
          .map(([cupId, record]) => [String(cupId), normalizeCampaignCupProgress(record)])
          .filter(([cupId]) => Boolean(cupId))
      ),
      trophies: sanitizeStringArray(rawCampaign.trophies ?? base.campaign.trophies, 32),
      stats: {
        races: Math.max(0, Math.floor(sanitizeNumber(rawCampaign.stats?.races, base.campaign.stats.races))),
        wins: Math.max(0, Math.floor(sanitizeNumber(rawCampaign.stats?.wins, base.campaign.stats.wins))),
        cupsCompleted: Math.max(0, Math.floor(sanitizeNumber(rawCampaign.stats?.cupsCompleted, base.campaign.stats.cupsCompleted)))
      }
    },
    tournaments: {
      selectedTypeId: String(rawTournaments.selectedTypeId ?? base.tournaments.selectedTypeId),
      activeBracket: normalizeTournamentBracket(rawTournaments.activeBracket),
      history: Array.isArray(rawTournaments.history)
        ? rawTournaments.history.slice(0, 10).map(normalizeTournamentBracket).filter(Boolean)
        : [],
      trophies: sanitizeStringArray(rawTournaments.trophies ?? base.tournaments.trophies, 32),
      stats: {
        started: Math.max(0, Math.floor(sanitizeNumber(rawTournaments.stats?.started, base.tournaments.stats.started))),
        completed: Math.max(0, Math.floor(sanitizeNumber(rawTournaments.stats?.completed, base.tournaments.stats.completed))),
        wins: Math.max(0, Math.floor(sanitizeNumber(rawTournaments.stats?.wins, base.tournaments.stats.wins))),
        eliminations: Math.max(0, Math.floor(sanitizeNumber(rawTournaments.stats?.eliminations, base.tournaments.stats.eliminations)))
      }
    },
    customRaceLab: normalizeCustomRaceLab(rawProgress.customRaceLab, base.customRaceLab),
    rankedSeasons: normalizeRankedSeasons(rawProgress.rankedSeasons, base.rankedSeasons),
    liveEvents: normalizeLiveEvents(rawProgress.liveEvents, base.liveEvents),
    bossEvents: normalizeBossEvents(rawProgress.bossEvents, base.bossEvents),
    rewards: normalizePremiumRewards(rawProgress.rewards, base.rewards)
  };
}

function cloneDefaultAdvancedCosmetics() {
  return {
    selected: {},
    numberPlate: sanitizeNumberPlate()
  };
}

function normalizeAdvancedCosmetics(rawAdvanced = {}, base = cloneDefaultAdvancedCosmetics()) {
  const rawSelected = rawAdvanced.selected && typeof rawAdvanced.selected === 'object'
    ? rawAdvanced.selected
    : {};
  const selected = {};

  for (const [category, itemId] of Object.entries(rawSelected)) {
    const safeCategory = String(category ?? '');
    const safeItemId = String(itemId ?? '');
    const item = ADVANCED_COSMETIC_LOOKUP[safeItemId];

    if (item && item.category === safeCategory && Object.values(ADVANCED_COSMETIC_CATEGORY_IDS).includes(safeCategory)) {
      selected[safeCategory] = safeItemId;
    }
  }

  return {
    selected,
    numberPlate: sanitizeNumberPlate(rawAdvanced.numberPlate ?? base.numberPlate)
  };
}

function normalizeShipUpgrades(rawUpgrades = {}) {
  if (!rawUpgrades || typeof rawUpgrades !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawUpgrades)
      .map(([shipId, modules]) => {
        const safeModules = modules && typeof modules === 'object'
          ? Object.fromEntries(
              Object.entries(modules)
                .map(([moduleId, level]) => [
                  String(moduleId),
                  Math.max(0, Math.min(12, Math.floor(sanitizeNumber(level, 0))))
                ])
                .filter(([moduleId]) => Boolean(UPGRADE_MODULE_LOOKUP[moduleId]))
            )
          : {};
        return [String(shipId), safeModules];
      })
      .filter(([shipId]) => Boolean(SHIP_LOOKUP[shipId]))
  );
}

function sanitizeGhostFrame(frame) {
  return {
    timeMs: Math.max(0, sanitizeNumber(frame?.timeMs, 0)),
    progress: Math.max(0, sanitizeNumber(frame?.progress, 0)),
    distance: Math.max(0, sanitizeNumber(frame?.distance, 0)),
    lateralOffset: sanitizeNumber(frame?.lateralOffset, 0),
    speed: Math.max(0, sanitizeNumber(frame?.speed, 0)),
    boosting: Boolean(frame?.boosting),
    drifting: Boolean(frame?.drifting),
    throttle: sanitizeNumber(frame?.throttle, 0),
    steer: sanitizeNumber(frame?.steer, 0)
  };
}

function normalizeTimeTrialRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  return {
    bestLapMs: Math.max(0, sanitizeNumber(record.bestLapMs, 0)) || null,
    bestRunMs: Math.max(0, sanitizeNumber(record.bestRunMs, 0)) || null,
    bestSectors: Array.isArray(record.bestSectors)
      ? record.bestSectors.slice(0, 4).map((value) => Math.max(0, sanitizeNumber(value, 0)))
      : [],
    ghostDurationMs: Math.max(0, sanitizeNumber(record.ghostDurationMs, 0)) || null,
    ghostFrames: Array.isArray(record.ghostFrames)
      ? record.ghostFrames.slice(0, 420).map(sanitizeGhostFrame)
      : [],
    shipId: String(record.shipId ?? 'starling'),
    cosmetics: {
      hullId: String(record.cosmetics?.hullId ?? 'azure'),
      glowId: String(record.cosmetics?.glowId ?? 'cyan-core'),
      trailId: String(record.cosmetics?.trailId ?? 'ion-trail')
    },
    updatedAt: Math.max(0, sanitizeNumber(record.updatedAt, 0)) || Date.now()
  };
}

function cloneDefaultProfile() {
  const now = Date.now();

  return {
    pilotId: createPilotId(),
    createdAt: now,
    updatedAt: now,
    playerName: createDefaultPlayerName(),
    theme: 'dark',
    friends: [],
    settings: cloneDefaultSettings(),
    auth: {
      uid: '',
      provider: 'anonymous',
      isAnonymous: true,
      email: '',
      displayName: '',
      createdAt: now,
      lastLoginAt: now
    },
    xp: 0,
    currency: 0,
    totalPoints: 0,
    achievements: [],
    unlockedShips: ['starling'],
    unlockedTracks: ['night-circuit'],
    unlockedHullColors: ['azure', 'sunfire'],
    unlockedGlowColors: ['cyan-core', 'amber-core'],
    unlockedTrailColors: ['ion-trail'],
    selectedShipId: 'starling',
    favoriteShipId: '',
    selectedTrackId: 'night-circuit',
    cosmetics: {
      hullId: 'azure',
      glowId: 'cyan-core',
      trailId: 'ion-trail'
    },
    advancedCosmetics: cloneDefaultAdvancedCosmetics(),
    shipUpgrades: {},
    stats: {
      races: 0,
      wins: 0,
      podiums: 0,
      topFinishes: 0,
      totalOvertakes: 0,
      totalDriftReleases: 0,
      totalPickups: 0,
      totalCleanRaces: 0,
      totalBoostSeconds: 0,
      bestPosition: Number.POSITIVE_INFINITY,
      bestTopSpeed: 0,
      bestOvertakes: 0,
      bestDriftReleases: 0
    },
    multiplayer: cloneDefaultMultiplayerStats(),
    goalState: {
      daily: {
        key: '',
        goals: []
      },
      weekly: {
        key: '',
        goals: []
      }
    },
    premiumProgress: cloneDefaultPremiumProgress(),
    timeTrials: {}
  };
}

export class ProfileStore {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(profile) {
    for (const listener of this.listeners) {
      listener(profile);
    }
  }

  normalizeProfile(rawProfile, base = cloneDefaultProfile()) {
    const profile = {
      ...base,
      ...rawProfile,
      pilotId: String(rawProfile.pilotId ?? base.pilotId),
      createdAt: Math.max(0, Number(rawProfile.createdAt ?? base.createdAt)) || base.createdAt,
      updatedAt: Math.max(0, Number(rawProfile.updatedAt ?? base.updatedAt)) || base.updatedAt,
      playerName: sanitizePlayerName(rawProfile.playerName ?? base.playerName),
      theme: sanitizeTheme(rawProfile.theme ?? base.theme),
      friends: [...new Set((rawProfile.friends ?? []).map(sanitizeFriend).filter(Boolean))],
      auth: {
        ...base.auth,
        ...(rawProfile.auth ?? {}),
        uid: String(rawProfile.auth?.uid ?? base.auth.uid),
        provider: rawProfile.auth?.provider === 'google' ? 'google' : 'anonymous',
        isAnonymous: rawProfile.auth?.provider === 'google'
          ? false
          : Boolean(rawProfile.auth?.isAnonymous ?? true),
        email: String(rawProfile.auth?.email ?? ''),
        displayName: sanitizePlayerName(rawProfile.auth?.displayName || rawProfile.playerName || base.auth.displayName || base.playerName),
        createdAt: Math.max(0, Number(rawProfile.auth?.createdAt ?? rawProfile.createdAt ?? base.auth.createdAt)) || base.auth.createdAt,
        lastLoginAt: Math.max(0, Number(rawProfile.auth?.lastLoginAt ?? rawProfile.updatedAt ?? base.auth.lastLoginAt)) || base.auth.lastLoginAt
      },
      settings: {
        ...cloneDefaultSettings(),
        ...(rawProfile.settings ?? {}),
        audio: {
          ...cloneDefaultSettings().audio,
          ...(rawProfile.settings?.audio ?? {}),
          master: sanitizeUnitInterval(rawProfile.settings?.audio?.master, cloneDefaultSettings().audio.master),
          effects: sanitizeUnitInterval(rawProfile.settings?.audio?.effects, cloneDefaultSettings().audio.effects),
          voice: sanitizeUnitInterval(rawProfile.settings?.audio?.voice, cloneDefaultSettings().audio.voice),
          voiceEnabled: rawProfile.settings?.audio?.voiceEnabled !== false
        },
        graphics: {
          ...cloneDefaultSettings().graphics,
          ...(rawProfile.settings?.graphics ?? {}),
          quality: sanitizeGraphicsQuality(rawProfile.settings?.graphics?.quality),
          particles: rawProfile.settings?.graphics?.particles !== false,
          speedLines: rawProfile.settings?.graphics?.speedLines !== false,
          cameraShake: rawProfile.settings?.graphics?.cameraShake !== false,
          animatedTrack: rawProfile.settings?.graphics?.animatedTrack !== false
        },
        gameplay: {
          ...cloneDefaultSettings().gameplay,
          ...(rawProfile.settings?.gameplay ?? {}),
          difficulty: sanitizeDifficulty(rawProfile.settings?.gameplay?.difficulty),
          onboardingSeen: Boolean(rawProfile.settings?.gameplay?.onboardingSeen)
        },
        controls: {
          ...cloneDefaultSettings().controls,
          ...(rawProfile.settings?.controls ?? {}),
          bindings: {
            ...(rawProfile.settings?.controls?.bindings ?? {})
          }
        }
      },
      cosmetics: {
        ...base.cosmetics,
        ...(rawProfile.cosmetics ?? {})
      },
      favoriteShipId: SHIP_LOOKUP[rawProfile.favoriteShipId] ? String(rawProfile.favoriteShipId) : '',
      advancedCosmetics: normalizeAdvancedCosmetics(rawProfile.advancedCosmetics, base.advancedCosmetics),
      shipUpgrades: normalizeShipUpgrades(rawProfile.shipUpgrades),
      stats: {
        ...base.stats,
        ...(rawProfile.stats ?? {})
      },
      multiplayer: {
        ...base.multiplayer,
        ...(rawProfile.multiplayer ?? {}),
        recentHighlights: Array.isArray(rawProfile.multiplayer?.recentHighlights)
          ? rawProfile.multiplayer.recentHighlights.slice(0, 8).map((item) => String(item).slice(0, 140))
          : base.multiplayer.recentHighlights,
        lastRoomLeaderboard: Array.isArray(rawProfile.multiplayer?.lastRoomLeaderboard)
          ? rawProfile.multiplayer.lastRoomLeaderboard.slice(0, 8)
          : base.multiplayer.lastRoomLeaderboard
      },
      goalState: {
        daily: {
          ...base.goalState.daily,
          ...(rawProfile.goalState?.daily ?? {})
        },
        weekly: {
          ...base.goalState.weekly,
          ...(rawProfile.goalState?.weekly ?? {})
        }
      },
      premiumProgress: normalizePremiumProgress(rawProfile.premiumProgress, base.premiumProgress),
      timeTrials: Object.fromEntries(
        Object.entries(rawProfile.timeTrials ?? {})
          .map(([trackId, record]) => [trackId, normalizeTimeTrialRecord(record)])
          .filter(([, record]) => Boolean(record))
      ),
      achievements: [...new Set(rawProfile.achievements ?? base.achievements)],
      unlockedShips: [...new Set(rawProfile.unlockedShips ?? base.unlockedShips)],
      unlockedTracks: [...new Set(rawProfile.unlockedTracks ?? base.unlockedTracks)],
      unlockedHullColors: [...new Set(rawProfile.unlockedHullColors ?? base.unlockedHullColors)],
      unlockedGlowColors: [...new Set(rawProfile.unlockedGlowColors ?? base.unlockedGlowColors)],
      unlockedTrailColors: [...new Set(rawProfile.unlockedTrailColors ?? base.unlockedTrailColors)]
    };

    profile.stats.topFinishes = Math.max(profile.stats.topFinishes ?? 0, profile.stats.podiums ?? 0);
    profile.stats.bestPosition = Number.isFinite(profile.stats.bestPosition) ? profile.stats.bestPosition : Number.POSITIVE_INFINITY;
    profile.auth.isAnonymous = profile.auth.provider !== 'google';
    return profile;
  }

  load() {
    const base = cloneDefaultProfile();

    try {
      const raw = this.storage.getItem(STORAGE_KEY);

      if (!raw) {
        const seeded = this.ensureUnlocks(base);
        this.ensureGoalState(seeded);
        this.save(seeded, { touch: false, emit: false });
        return seeded;
      }

      const parsed = JSON.parse(raw);
      const profile = this.normalizeProfile(parsed, base);

      this.ensureUnlocks(profile);
      this.ensureSelections(profile);
      this.ensureGoalState(profile);
      this.save(profile, { touch: false, emit: false });
      return profile;
    } catch {
      const seeded = this.ensureUnlocks(base);
      this.ensureGoalState(seeded);
      this.save(seeded, { touch: false, emit: false });
      return seeded;
    }
  }

  save(profile, { touch = true, emit = true } = {}) {
    if (!profile.createdAt) {
      profile.createdAt = Date.now();
    }

    if (touch) {
      profile.updatedAt = Date.now();
    } else if (!profile.updatedAt) {
      profile.updatedAt = profile.createdAt;
    }

    this.storage.setItem(STORAGE_KEY, JSON.stringify(profile));

    if (emit) {
      this.notify(profile);
    }
  }

  replace(profileLike, { touch = false, emit = true } = {}) {
    const profile = this.normalizeProfile(profileLike);
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);
    this.ensureGoalState(profile);
    this.save(profile, { touch, emit });
    return profile;
  }

  getLevelInfo(xp) {
    let level = 1;
    let xpSpent = 0;
    let requirement = 120;

    while (xp >= xpSpent + requirement) {
      xpSpent += requirement;
      level += 1;
      requirement = 120 + (level - 1) * 65;
    }

    return {
      level,
      currentXp: xp - xpSpent,
      nextXp: requirement,
      progress: (xp - xpSpent) / requirement
    };
  }

  ensureSelections(profile) {
    if (!profile.unlockedShips.includes(profile.selectedShipId)) {
      profile.selectedShipId = profile.unlockedShips[0];
    }

    if (profile.favoriteShipId && !profile.unlockedShips.includes(profile.favoriteShipId)) {
      profile.favoriteShipId = '';
    }

    if (!profile.unlockedTracks.includes(profile.selectedTrackId)) {
      profile.selectedTrackId = profile.unlockedTracks[0];
    }

    if (!profile.unlockedHullColors.includes(profile.cosmetics.hullId)) {
      profile.cosmetics.hullId = profile.unlockedHullColors[0];
    }

    if (!profile.unlockedGlowColors.includes(profile.cosmetics.glowId)) {
      profile.cosmetics.glowId = profile.unlockedGlowColors[0];
    }

    if (!profile.unlockedTrailColors.includes(profile.cosmetics.trailId)) {
      profile.cosmetics.trailId = profile.unlockedTrailColors[0];
    }
  }

  ensureUnlocks(profile) {
    const { level } = this.getLevelInfo(profile.xp);

    for (const ship of SHIP_DEFS) {
      if (ship.unlockLevel && level >= ship.unlockLevel) {
        profile.unlockedShips.push(ship.id);
      }

      if (ship.unlockAchievement && profile.achievements.includes(ship.unlockAchievement)) {
        profile.unlockedShips.push(ship.id);
      }
    }

    for (const track of TRACK_DEFS) {
      if (level >= track.unlockLevel) {
        profile.unlockedTracks.push(track.id);
      }
    }

    for (const item of HULL_COLORS) {
      if (level >= item.unlockLevel) {
        profile.unlockedHullColors.push(item.id);
      }
    }

    for (const item of GLOW_COLORS) {
      if (level >= item.unlockLevel) {
        profile.unlockedGlowColors.push(item.id);
      }
    }

    for (const item of TRAIL_COLORS) {
      if (level >= item.unlockLevel) {
        profile.unlockedTrailColors.push(item.id);
      }
    }

    profile.unlockedShips = [...new Set(profile.unlockedShips)];
    profile.unlockedTracks = [...new Set(profile.unlockedTracks)];
    profile.unlockedHullColors = [...new Set(profile.unlockedHullColors)];
    profile.unlockedGlowColors = [...new Set(profile.unlockedGlowColors)];
    profile.unlockedTrailColors = [...new Set(profile.unlockedTrailColors)];

    this.ensureSelections(profile);
    return profile;
  }

  applyTestAccountUnlocks(profile) {
    if (!isTestUnlockAccount(profile.auth)) {
      return false;
    }

    const beforeSignature = JSON.stringify({
      xp: profile.xp,
      currency: profile.currency,
      ships: profile.unlockedShips,
      tracks: profile.unlockedTracks,
      hulls: profile.unlockedHullColors,
      glows: profile.unlockedGlowColors,
      trails: profile.unlockedTrailColors
    });

    profile.xp = Math.max(profile.xp, TEST_ACCOUNT_UNLOCK_XP_FLOOR);
    profile.currency = Math.max(profile.currency, TEST_ACCOUNT_UNLOCK_CREDIT_FLOOR);
    profile.unlockedShips = SHIP_DEFS.map((ship) => ship.id);
    profile.unlockedTracks = TRACK_DEFS.map((track) => track.id);
    profile.unlockedHullColors = HULL_COLORS.map((item) => item.id);
    profile.unlockedGlowColors = GLOW_COLORS.map((item) => item.id);
    profile.unlockedTrailColors = TRAIL_COLORS.map((item) => item.id);

    this.ensureSelections(profile);

    const afterSignature = JSON.stringify({
      xp: profile.xp,
      currency: profile.currency,
      ships: profile.unlockedShips,
      tracks: profile.unlockedTracks,
      hulls: profile.unlockedHullColors,
      glows: profile.unlockedGlowColors,
      trails: profile.unlockedTrailColors
    });

    return beforeSignature !== afterSignature;
  }

  ensureGoalState(profile, now = new Date()) {
    const dailyKey = getDailyGoalKey(now);
    const weeklyKey = getWeeklyGoalKey(now);

    if (profile.goalState.daily.key !== dailyKey || !Array.isArray(profile.goalState.daily.goals) || profile.goalState.daily.goals.length === 0) {
      profile.goalState.daily = {
        key: dailyKey,
        goals: pickRotatingGoals(
          DAILY_MULTIPLAYER_GOALS,
          3,
          `${profile.pilotId}:${dailyKey}`
        ).map((goal) => ({ id: goal.id }))
      };
    }

    if (profile.goalState.weekly.key !== weeklyKey || !Array.isArray(profile.goalState.weekly.goals) || profile.goalState.weekly.goals.length === 0) {
      profile.goalState.weekly = {
        key: weeklyKey,
        goals: pickRotatingGoals(
          WEEKLY_MULTIPLAYER_GOALS,
          3,
          `${profile.pilotId}:${weeklyKey}`
        ).map((goal) => ({ id: goal.id }))
      };
    }
  }

  getGoalDefinitions(profile) {
    this.ensureGoalState(profile);

    return {
      daily: profile.goalState.daily.goals
        .map((entry) => DAILY_MULTIPLAYER_GOALS.find((goal) => goal.id === entry.id))
        .filter(Boolean),
      weekly: profile.goalState.weekly.goals
        .map((entry) => WEEKLY_MULTIPLAYER_GOALS.find((goal) => goal.id === entry.id))
        .filter(Boolean)
    };
  }

  setSelectedTrack(profile, trackId) {
    if (!profile.unlockedTracks.includes(trackId)) {
      return false;
    }

    profile.selectedTrackId = trackId;
    this.save(profile);
    return true;
  }

  setPlayerName(profile, playerName) {
    profile.playerName = sanitizePlayerName(playerName);
    this.save(profile);
    return profile.playerName;
  }

  setTheme(profile, theme) {
    profile.theme = sanitizeTheme(theme);
    this.save(profile);
    return profile.theme;
  }

  setAudioSettings(profile, updates) {
    profile.settings.audio = {
      ...profile.settings.audio,
      ...updates,
      master: sanitizeUnitInterval(updates.master ?? profile.settings.audio.master, profile.settings.audio.master),
      effects: sanitizeUnitInterval(updates.effects ?? profile.settings.audio.effects, profile.settings.audio.effects),
      voice: sanitizeUnitInterval(updates.voice ?? profile.settings.audio.voice, profile.settings.audio.voice),
      voiceEnabled: updates.voiceEnabled ?? profile.settings.audio.voiceEnabled
    };
    this.save(profile);
    return { ...profile.settings.audio };
  }

  setGraphicsSettings(profile, updates) {
    profile.settings.graphics = {
      ...profile.settings.graphics,
      ...updates,
      quality: sanitizeGraphicsQuality(updates.quality ?? profile.settings.graphics.quality),
      particles: updates.particles ?? profile.settings.graphics.particles,
      speedLines: updates.speedLines ?? profile.settings.graphics.speedLines,
      cameraShake: updates.cameraShake ?? profile.settings.graphics.cameraShake,
      animatedTrack: updates.animatedTrack ?? profile.settings.graphics.animatedTrack
    };
    this.save(profile);
    return { ...profile.settings.graphics };
  }

  setDifficulty(profile, difficulty) {
    profile.settings.gameplay.difficulty = sanitizeDifficulty(difficulty);
    this.save(profile);
    return profile.settings.gameplay.difficulty;
  }

  setOnboardingSeen(profile, onboardingSeen = true) {
    profile.settings.gameplay.onboardingSeen = Boolean(onboardingSeen);
    this.save(profile);
    return profile.settings.gameplay.onboardingSeen;
  }

  setControlBinding(profile, action, code) {
    const bindings = {
      ...(profile.settings.controls.bindings ?? {})
    };

    if (code) {
      bindings[action] = String(code);
    } else {
      delete bindings[action];
    }

    profile.settings.controls.bindings = bindings;
    this.save(profile);
    return { ...bindings };
  }

  setFriendIds(profile, friendIds, { touch = false, emit = true } = {}) {
    profile.friends = [...new Set((friendIds ?? []).map(sanitizeFriend).filter(Boolean))];
    this.save(profile, { touch, emit });
    return [...profile.friends];
  }

  setAuthIdentity(profile, authState, { touch = true, emit = true } = {}) {
    const displayName = authState.displayName || authState.preferredName || profile.playerName;

    profile.auth = {
      ...profile.auth,
      uid: String(authState.uid ?? profile.auth.uid),
      provider: authState.provider === 'google' ? 'google' : 'anonymous',
      isAnonymous: authState.provider === 'google' ? false : Boolean(authState.isAnonymous ?? true),
      email: String(authState.email ?? profile.auth.email ?? ''),
      displayName: sanitizePlayerName(displayName),
      createdAt: Math.max(0, Number(authState.createdAt ?? profile.auth.createdAt ?? profile.createdAt)) || profile.createdAt,
      lastLoginAt: Math.max(0, Number(authState.lastLoginAt ?? Date.now()))
    };

    if (authState.uid) {
      profile.pilotId = String(authState.uid);
    }

    if (authState.preferredName && (!profile.playerName || profile.playerName === sanitizePlayerName(profile.auth.displayName))) {
      profile.playerName = sanitizePlayerName(authState.preferredName);
    }

    this.applyTestAccountUnlocks(profile);
    this.save(profile, { touch, emit });
    return profile;
  }

  mergeCloudProfile(localProfile, cloudProfile, authState) {
    const normalizedLocal = this.normalizeProfile(localProfile);
    const normalizedCloud = cloudProfile ? this.normalizeProfile(cloudProfile) : null;
    const useCloud = normalizedCloud && (normalizedCloud.updatedAt ?? 0) > (normalizedLocal.updatedAt ?? 0);
    const merged = this.normalizeProfile(useCloud ? normalizedCloud : normalizedLocal);

    this.setAuthIdentity(merged, authState, { touch: false, emit: false });

    if (
      authState.preferredName &&
      authState.shouldAdoptName &&
      (!normalizedLocal.playerName || normalizedLocal.playerName === normalizedLocal.auth.displayName)
    ) {
      const trimmedPreferred = sanitizePlayerName(authState.preferredName);
      merged.playerName = trimmedPreferred;
    }

    this.save(merged, { touch: false, emit: false });
    return merged;
  }

  createFreshProfile(authState = null, previousProfile = null) {
    const profile = this.normalizeProfile(cloneDefaultProfile());

    if (previousProfile) {
      profile.theme = sanitizeTheme(previousProfile.theme ?? profile.theme);
      profile.settings = {
        ...profile.settings,
        ...(previousProfile.settings ?? {}),
        audio: {
          ...profile.settings.audio,
          ...(previousProfile.settings?.audio ?? {})
        },
        graphics: {
          ...profile.settings.graphics,
          ...(previousProfile.settings?.graphics ?? {})
        },
        gameplay: {
          ...profile.settings.gameplay,
          ...(previousProfile.settings?.gameplay ?? {})
        },
        controls: {
          ...profile.settings.controls,
          bindings: {
            ...(previousProfile.settings?.controls?.bindings ?? {})
          }
        }
      };
      profile.playerName = sanitizePlayerName(previousProfile.playerName ?? profile.playerName);
    }

    if (authState) {
      this.setAuthIdentity(profile, authState, { touch: false, emit: false });
    }

    this.ensureUnlocks(profile);
    this.ensureGoalState(profile);
    this.save(profile, { touch: false, emit: false });
    return profile;
  }

  getCloudPayload(profile) {
    const normalized = this.normalizeProfile(profile);
    const payload = JSON.parse(JSON.stringify(normalized));

    if (!Number.isFinite(normalized.stats.bestPosition)) {
      payload.stats.bestPosition = null;
    }

    return payload;
  }

  getTimeTrialRecord(profile, trackId) {
    return normalizeTimeTrialRecord(profile.timeTrials?.[trackId]) ?? null;
  }

  saveTimeTrialRecord(profile, trackId, summary) {
    const existing = this.getTimeTrialRecord(profile, trackId) ?? {
      bestLapMs: null,
      bestRunMs: null,
      bestSectors: [],
      ghostDurationMs: null,
      ghostFrames: [],
      shipId: profile.selectedShipId,
      cosmetics: { ...profile.cosmetics },
      updatedAt: Date.now()
    };
    const next = {
      ...existing,
      updatedAt: Date.now()
    };
    let improvedLap = false;
    let improvedRun = false;

    if (summary.bestLapMs && (!existing.bestLapMs || summary.bestLapMs < existing.bestLapMs)) {
      next.bestLapMs = summary.bestLapMs;
      next.bestSectors = [...(summary.bestSectors ?? [])];
      next.ghostDurationMs = summary.ghostDurationMs ?? summary.bestLapMs;
      next.ghostFrames = (summary.ghostFrames ?? []).slice(0, 420).map(sanitizeGhostFrame);
      next.shipId = String(summary.shipId ?? profile.selectedShipId);
      next.cosmetics = {
        ...(summary.cosmetics ?? profile.cosmetics)
      };
      improvedLap = true;
    }

    if (summary.totalTimeMs && (!existing.bestRunMs || summary.totalTimeMs < existing.bestRunMs)) {
      next.bestRunMs = summary.totalTimeMs;
      improvedRun = true;
    }

    profile.timeTrials[trackId] = next;
    this.save(profile);

    return {
      record: next,
      improvedLap,
      improvedRun
    };
  }

  addFriend(profile, friendName) {
    const friend = sanitizeFriend(friendName);

    if (!friend) {
      return { ok: false, reason: 'Enter a friend name or pilot ID.' };
    }

    if (friend.toLowerCase() === profile.playerName.toLowerCase() || friend.toLowerCase() === profile.pilotId.toLowerCase()) {
      return { ok: false, reason: 'You are already on your own grid.' };
    }

    if (profile.friends.some((entry) => entry.toLowerCase() === friend.toLowerCase())) {
      return { ok: false, reason: 'Friend already added.' };
    }

    profile.friends.unshift(friend);
    profile.friends = profile.friends.slice(0, 16);
    this.save(profile);
    return { ok: true, label: friend };
  }

  setServerRating(profile, rating) {
    const nextRating = Math.max(800, Math.round(Number(rating ?? profile.multiplayer.rating)));

    if (nextRating === profile.multiplayer.rating) {
      return profile.multiplayer.rating;
    }

    profile.multiplayer.rating = nextRating;
    this.save(profile);
    return profile.multiplayer.rating;
  }

  setSelectedShip(profile, shipId) {
    if (!profile.unlockedShips.includes(shipId)) {
      return false;
    }

    profile.selectedShipId = shipId;
    this.save(profile);
    return true;
  }

  setCosmetic(profile, type, itemId) {
    const keyMap = {
      hull: ['unlockedHullColors', 'hullId'],
      glow: ['unlockedGlowColors', 'glowId'],
      trail: ['unlockedTrailColors', 'trailId']
    };
    const [unlockKey, cosmeticKey] = keyMap[type];

    if (!profile[unlockKey].includes(itemId)) {
      return false;
    }

    profile.cosmetics[cosmeticKey] = itemId;
    this.save(profile);
    return true;
  }

  ensurePremiumState(profile) {
    profile.premiumProgress = normalizePremiumProgress(profile.premiumProgress ?? {});
    return profile.premiumProgress;
  }

  setCustomRaceConfig(profile, updates = {}, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    premiumProgress.customRaceLab.activeConfig = sanitizeCustomRaceConfig({
      ...premiumProgress.customRaceLab.activeConfig,
      ...updates
    }, entitlements, profile);
    this.save(profile);
    return premiumProgress.customRaceLab.activeConfig;
  }

  randomizeCustomRaceConfig(profile, config, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    premiumProgress.customRaceLab.activeConfig = sanitizeCustomRaceConfig(config, entitlements, profile);
    this.save(profile);
    return premiumProgress.customRaceLab.activeConfig;
  }

  saveCustomRacePreset(profile, entitlements = null, maxPresets = 3) {
    const premiumProgress = this.ensurePremiumState(profile);
    const activeConfig = sanitizeCustomRaceConfig(premiumProgress.customRaceLab.activeConfig, entitlements, profile);
    const preset = createCustomRacePreset(activeConfig);
    const existing = premiumProgress.customRaceLab.presets ?? [];

    premiumProgress.customRaceLab.presets = [preset, ...existing.filter((entry) => entry.id !== preset.id)]
      .slice(0, Math.max(1, Math.floor(maxPresets)));
    premiumProgress.customRaceLab.stats.presetsSaved += 1;
    this.grantPremiumRewards(profile, ['custom-race-preset-maker'], { save: false });
    this.save(profile);
    return { ok: true, preset, presets: premiumProgress.customRaceLab.presets };
  }

  loadCustomRacePreset(profile, presetId, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    const preset = premiumProgress.customRaceLab.presets.find((entry) => entry.id === presetId);

    if (!preset) {
      return { ok: false, reason: 'Preset not found.' };
    }

    premiumProgress.customRaceLab.activeConfig = sanitizeCustomRaceConfig(preset, entitlements, profile);
    this.save(profile);
    return { ok: true, config: premiumProgress.customRaceLab.activeConfig };
  }

  deleteCustomRacePreset(profile, presetId) {
    const premiumProgress = this.ensurePremiumState(profile);
    const before = premiumProgress.customRaceLab.presets.length;
    premiumProgress.customRaceLab.presets = premiumProgress.customRaceLab.presets.filter((entry) => entry.id !== presetId);

    if (premiumProgress.customRaceLab.presets.length === before) {
      return { ok: false, reason: 'Preset not found.' };
    }

    this.save(profile);
    return { ok: true };
  }

  recordCustomRaceResult(profile, raceSummary, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    const config = sanitizeCustomRaceConfig(premiumProgress.customRaceLab.activeConfig, entitlements, profile);

    premiumProgress.customRaceLab.stats.races += 1;
    premiumProgress.customRaceLab.stats.wins += raceSummary.position === 1 ? 1 : 0;
    premiumProgress.customRaceLab.recentConfigs = [
      { ...config, racedAt: Date.now() },
      ...(premiumProgress.customRaceLab.recentConfigs ?? [])
    ].slice(0, 8);

    const rewards = {
      points: Math.max(80, 180 - (raceSummary.position - 1) * 18),
      currency: Math.max(36, 90 - (raceSummary.position - 1) * 8),
      xp: Math.max(52, 120 - (raceSummary.position - 1) * 10)
    };

    profile.totalPoints += rewards.points;
    profile.currency += rewards.currency;
    profile.xp += rewards.xp;
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);
    const rewardState = this.grantPremiumRewards(
      profile,
      premiumProgress.customRaceLab.stats.races === 1 ? ['custom-race-first-launch'] : [],
      { save: false }
    );
    this.save(profile);

    return {
      rewards,
      levelInfo: this.getLevelInfo(profile.xp),
      levelUp: false,
      unlocks: [],
      achievements: [],
      premiumUnlocks: rewardState.unlocked
    };
  }

  filterPremiumRewardIdsForEntitlement(rewardIds = [], entitlements = null) {
    return sanitizeStringArray(rewardIds, 32).filter((rewardId) => {
      const reward = getPremiumReward(rewardId);
      return reward && (entitlements?.canAccessTier?.(reward.requiredEdition) ?? true);
    });
  }

  recordRankedSeasonResult(profile, raceSummary, entitlements = null, date = new Date()) {
    const premiumProgress = this.ensurePremiumState(profile);
    const ranked = premiumProgress.rankedSeasons;
    const season = getRankedSeason(date);

    if (ranked.currentSeasonId && ranked.currentSeasonId !== season.seasonId && ranked.seasonRaces > 0) {
      ranked.seasonHistory.unshift({
        seasonId: ranked.currentSeasonId,
        seasonName: ranked.seasonName ?? 'Ranked Season',
        rating: ranked.seasonRating,
        tier: ranked.seasonTier,
        races: ranked.seasonRaces,
        wins: ranked.seasonWins,
        podiums: ranked.seasonPodiums,
        archivedAt: Date.now()
      });
      ranked.seasonHistory = ranked.seasonHistory.slice(0, 8);
      ranked.seasonRating = RANKED_SEASON_RATING_BOUNDS.start;
      ranked.seasonRaces = 0;
      ranked.seasonWins = 0;
      ranked.seasonPodiums = 0;
      ranked.currentStreak = 0;
      ranked.seasonBestStreak = 0;
    }

    ranked.currentSeasonId = season.seasonId;
    ranked.seasonName = season.seasonName;

    const result = applyRankedResult(ranked, raceSummary, date);
    ranked.seasonRating = result.nextRating;
    ranked.seasonTier = result.nextTier.id;
    ranked.seasonRaces += 1;
    ranked.seasonWins += result.win ? 1 : 0;
    ranked.seasonPodiums += result.podium ? 1 : 0;
    ranked.currentStreak = result.currentStreak;
    ranked.seasonBestStreak = result.bestStreak;

    const rewards = {
      points: Math.max(80, 190 + Math.max(0, result.ratingDelta) * 2 - (raceSummary.position - 1) * 20),
      currency: Math.max(36, 86 + Math.max(0, result.ratingDelta) - (raceSummary.position - 1) * 8),
      xp: Math.max(54, 112 + Math.max(0, result.ratingDelta) - (raceSummary.position - 1) * 10)
    };
    profile.totalPoints += rewards.points;
    profile.currency += rewards.currency;
    profile.xp += rewards.xp;
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);

    const rewardIds = this.filterPremiumRewardIdsForEntitlement(getRankedRewardIds(result), entitlements);
    ranked.claimedSeasonRewards = [...new Set([...ranked.claimedSeasonRewards, ...rewardIds])].slice(0, 64);
    const rewardState = this.grantPremiumRewards(profile, rewardIds, { save: false });

    this.save(profile);

    return {
      rewards,
      levelInfo: this.getLevelInfo(profile.xp),
      levelUp: false,
      unlocks: [],
      achievements: [],
      premiumUnlocks: rewardState.unlocked,
      rankedResult: result
    };
  }

  recordLiveEventResult(profile, event, raceSummary, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    const liveEvents = premiumProgress.liveEvents;
    const evaluation = evaluateLiveEventGoal(event, raceSummary);
    const alreadyCompleted = liveEvents.completedEventIds.includes(event.id);
    const firstCompletion = evaluation.completed && !alreadyCompleted;
    const completedAt = Date.now();

    liveEvents.bestResults[event.id] = {
      eventId: event.id,
      completed: evaluation.completed || Boolean(liveEvents.bestResults[event.id]?.completed),
      position: Math.min(liveEvents.bestResults[event.id]?.position ?? 99, raceSummary.position ?? 99),
      goalLabel: evaluation.goalLabel,
      completedAt: firstCompletion ? completedAt : (liveEvents.bestResults[event.id]?.completedAt ?? 0)
    };

    if (firstCompletion) {
      liveEvents.completedEventIds.push(event.id);
      liveEvents.recentCompletions.unshift({
        eventId: event.id,
        title: event.title,
        goalLabel: evaluation.goalLabel,
        completed: true,
        completedAt
      });
      liveEvents.recentCompletions = liveEvents.recentCompletions.slice(0, 10);
    }

    const rewards = firstCompletion
      ? {
          points: event.type === 'daily' ? 150 : 260,
          currency: event.type === 'daily' ? 70 : 125,
          xp: event.type === 'daily' ? 95 : 165
        }
      : { points: 0, currency: 0, xp: 0 };

    profile.totalPoints += rewards.points;
    profile.currency += rewards.currency;
    profile.xp += rewards.xp;
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);

    const rewardIds = firstCompletion
      ? this.filterPremiumRewardIdsForEntitlement(getLiveEventRewardIds(event, true), entitlements)
      : [];
    const rewardState = this.grantPremiumRewards(profile, rewardIds, { save: false });
    this.save(profile);

    return {
      rewards,
      levelInfo: this.getLevelInfo(profile.xp),
      levelUp: false,
      unlocks: [],
      achievements: [],
      premiumUnlocks: rewardState.unlocked,
      liveEventResult: {
        ...evaluation,
        firstCompletion,
        alreadyCompleted
      }
    };
  }

  recordBossEventResult(profile, event, raceSummary, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    const bossEvents = premiumProgress.bossEvents;
    const evaluation = evaluateBossResult(event, raceSummary);
    const alreadyCompleted = bossEvents.completedBossIds.includes(event.id);
    const firstCompletion = evaluation.completed && !alreadyCompleted;
    const completedAt = Date.now();
    const bestTimeMs = raceSummary.timing?.totalTimeMs ?? 0;

    bossEvents.bestResults[event.id] = {
      bossEventId: event.id,
      completed: evaluation.completed || Boolean(bossEvents.bestResults[event.id]?.completed),
      position: Math.min(bossEvents.bestResults[event.id]?.position ?? 99, raceSummary.position ?? 99),
      bestTimeMs: bestTimeMs > 0
        ? Math.min(bossEvents.bestResults[event.id]?.bestTimeMs || bestTimeMs, bestTimeMs)
        : (bossEvents.bestResults[event.id]?.bestTimeMs ?? 0),
      completedAt: firstCompletion ? completedAt : (bossEvents.bestResults[event.id]?.completedAt ?? 0)
    };

    if (firstCompletion) {
      bossEvents.completedBossIds.push(event.id);

      if (event.rewardId && !bossEvents.trophies.includes(event.rewardId)) {
        bossEvents.trophies.push(event.rewardId);
      }
    }

    const rewards = firstCompletion
      ? { points: 330, currency: 160, xp: 220 }
      : { points: 0, currency: 0, xp: 0 };

    profile.totalPoints += rewards.points;
    profile.currency += rewards.currency;
    profile.xp += rewards.xp;
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);

    const rewardIds = firstCompletion
      ? this.filterPremiumRewardIdsForEntitlement(getBossRewardIds(event, true), entitlements)
      : [];
    const rewardState = this.grantPremiumRewards(profile, rewardIds, { save: false });
    this.save(profile);

    return {
      rewards,
      levelInfo: this.getLevelInfo(profile.xp),
      levelUp: false,
      unlocks: [],
      achievements: [],
      premiumUnlocks: rewardState.unlocked,
      bossResult: {
        ...evaluation,
        firstCompletion,
        alreadyCompleted
      }
    };
  }

  grantPremiumRewards(profile, rewardIds = [], { save = true } = {}) {
    const premiumProgress = this.ensurePremiumState(profile);
    const rewards = premiumProgress.rewards;
    const unlocked = [];

    for (const rewardId of sanitizeStringArray(rewardIds, 32)) {
      const reward = getPremiumReward(rewardId);

      if (!reward || rewards.unlockedRewardIds.includes(reward.rewardId)) {
        continue;
      }

      rewards.unlockedRewardIds.push(reward.rewardId);
      rewards.unlockedAt[reward.rewardId] = Date.now();

      if (reward.linkedCosmeticId && !rewards.unlockedCosmeticIds.includes(reward.linkedCosmeticId)) {
        rewards.unlockedCosmeticIds.push(reward.linkedCosmeticId);
      }

      if (reward.type === 'trophy' && !rewards.trophies.includes(reward.rewardId)) {
        rewards.trophies.push(reward.rewardId);
      }

      if ((reward.type === 'badge' || reward.type === 'cosmetic') && !rewards.badges.includes(reward.rewardId)) {
        rewards.badges.push(reward.rewardId);
      }

      if (reward.type === 'title' && !rewards.titles.includes(reward.rewardId)) {
        rewards.titles.push(reward.rewardId);
      }

      unlocked.push(reward);
    }

    if (save && unlocked.length > 0) {
      this.save(profile);
    }

    return { unlocked, rewards };
  }

  getRewardGallery(profile, entitlements = null) {
    const premiumProgress = this.ensurePremiumState(profile);
    const rewards = premiumProgress.rewards;

    return PREMIUM_REWARD_DEFINITIONS.map((reward) => {
      const unlocked = rewards.unlockedRewardIds.includes(reward.rewardId);
      const canUseEdition = entitlements?.canAccessTier?.(reward.requiredEdition) ?? true;
      return {
        ...reward,
        unlocked,
        usable: unlocked && canUseEdition,
        lockedByEdition: !canUseEdition,
        unlockedAt: rewards.unlockedAt[reward.rewardId] ?? 0,
        unlockedAtLabel: rewards.unlockedAt[reward.rewardId]
          ? new Date(rewards.unlockedAt[reward.rewardId]).toLocaleDateString()
          : 'Locked'
      };
    });
  }

  setAdvancedCosmetic(profile, itemId) {
    const item = ADVANCED_COSMETIC_LOOKUP[itemId];

    if (!item) {
      return false;
    }

    if (!profile.advancedCosmetics) {
      profile.advancedCosmetics = cloneDefaultAdvancedCosmetics();
    }

    profile.advancedCosmetics.selected = profile.advancedCosmetics.selected ?? {};
    profile.advancedCosmetics.selected[item.category] = item.id;
    this.save(profile);
    return true;
  }

  setNumberPlate(profile, value) {
    if (!profile.advancedCosmetics) {
      profile.advancedCosmetics = cloneDefaultAdvancedCosmetics();
    }

    profile.advancedCosmetics.numberPlate = sanitizeNumberPlate(value);
    this.save(profile);
    return profile.advancedCosmetics.numberPlate;
  }

  upgradeShipModule(profile, shipId, moduleId, maxLevel) {
    const ship = SHIP_LOOKUP[shipId];
    const module = UPGRADE_MODULE_LOOKUP[moduleId];

    if (!ship || !module) {
      return { ok: false, reason: 'Unknown upgrade module.' };
    }

    if (!profile.shipUpgrades) {
      profile.shipUpgrades = {};
    }

    const shipModules = profile.shipUpgrades[ship.id] ?? {};
    const currentLevel = Math.max(0, Math.floor(sanitizeNumber(shipModules[module.id], 0)));
    const cappedMaxLevel = Math.max(0, Math.floor(sanitizeNumber(maxLevel, 0)));

    if (currentLevel >= cappedMaxLevel) {
      return { ok: false, reason: 'Upgrade level cap reached.' };
    }

    const cost = getModuleCost(module, currentLevel);

    if (!Number.isFinite(cost) || cost <= 0) {
      return { ok: false, reason: 'Upgrade cost is unavailable.' };
    }

    if (profile.currency < cost) {
      return { ok: false, reason: `Need ${cost} CR.` };
    }

    profile.currency -= cost;
    profile.shipUpgrades[ship.id] = {
      ...shipModules,
      [module.id]: currentLevel + 1
    };
    this.save(profile);

    return {
      ok: true,
      level: currentLevel + 1,
      cost,
      remainingCredits: profile.currency
    };
  }

  resetShipUpgrades(profile, shipId) {
    const ship = SHIP_LOOKUP[shipId];

    if (!ship || !profile.shipUpgrades?.[ship.id]) {
      return { ok: false, reason: 'No upgrades to reset.' };
    }

    // Phase 4 reset intentionally gives no refund to avoid credit duplication.
    profile.shipUpgrades[ship.id] = {};
    this.save(profile);
    return { ok: true, refunded: 0 };
  }

  canPurchaseShip(profile, shipId) {
    const ship = SHIP_LOOKUP[shipId];

    if (!ship || profile.unlockedShips.includes(shipId)) {
      return false;
    }

    const { level } = this.getLevelInfo(profile.xp);
    const eligibleForLevel = !ship.unlockLevel || level >= ship.unlockLevel;
    const eligibleForAchievement = !ship.unlockAchievement || profile.achievements.includes(ship.unlockAchievement);
    return Boolean(ship.cost && ship.cost > 0 && eligibleForLevel && eligibleForAchievement);
  }

  purchaseShip(profile, shipId) {
    const ship = SHIP_LOOKUP[shipId];

    if (!ship) {
      return { ok: false, reason: 'Unknown ship' };
    }

    if (profile.unlockedShips.includes(shipId)) {
      return { ok: false, reason: 'Already unlocked' };
    }

    if (!this.canPurchaseShip(profile, shipId)) {
      return { ok: false, reason: 'Not available yet' };
    }

    if (profile.currency < ship.cost) {
      return { ok: false, reason: 'Not enough credits' };
    }

    profile.currency -= ship.cost;
    profile.unlockedShips.push(shipId);
    profile.selectedShipId = shipId;
    this.save(profile);
    return { ok: true, label: ship.name };
  }

  createRaceChallenges(profile) {
    const offset = profile.stats.races % CHALLENGE_DEFS.length;
    const challengeIds = [];

    for (let index = 0; challengeIds.length < 3 && index < CHALLENGE_DEFS.length * 2; index += 1) {
      const challenge = CHALLENGE_DEFS[(offset + index) % CHALLENGE_DEFS.length];

      if (!challengeIds.includes(challenge.id)) {
        challengeIds.push(challenge.id);
      }
    }

    return challengeIds;
  }

  evaluateChallenges(challengeIds, raceStats, result) {
    return challengeIds.map((challengeId) => {
      const definition = CHALLENGE_DEFS.find((item) => item.id === challengeId);
      const completed = definition.isComplete(raceStats, result);

      return {
        id: challengeId,
        label: definition.label,
        completed,
        rewardXp: definition.rewardXp,
        rewardCurrency: definition.rewardCurrency,
        progressText: definition.getProgressText(raceStats, result)
      };
    });
  }

  evaluateAchievements(raceStats, result) {
    const unlocked = [];

    if (result.position <= 3 && raceStats.hazardHits === 0) {
      unlocked.push('precision-pilot');
    }

    if (result.position === 1 && !raceStats.usedManualBoost) {
      unlocked.push('quiet-victory');
    }

    return unlocked;
  }

  applyRaceRewards(profile, raceSummary) {
    const beforeLevel = this.getLevelInfo(profile.xp).level;
    const beforeSnapshot = this.snapshotUnlocks(profile);

    profile.totalPoints += raceSummary.rewards.points;
    profile.currency += raceSummary.rewards.currency;
    profile.xp += raceSummary.rewards.xp;

    profile.stats.races += 1;
    profile.stats.wins += raceSummary.position === 1 ? 1 : 0;
    profile.stats.podiums += raceSummary.position <= 3 ? 1 : 0;
    profile.stats.topFinishes += raceSummary.position <= 3 ? 1 : 0;
    profile.stats.totalOvertakes += raceSummary.stats.overtakes;
    profile.stats.totalDriftReleases += raceSummary.stats.driftReleases;
    profile.stats.totalPickups += raceSummary.stats.pickupsCollected;
    profile.stats.totalCleanRaces += raceSummary.stats.hazardHits === 0 ? 1 : 0;
    profile.stats.totalBoostSeconds += Math.round(raceSummary.stats.boostSeconds);
    profile.stats.bestPosition = Math.min(profile.stats.bestPosition, raceSummary.position);
    profile.stats.bestTopSpeed = Math.max(profile.stats.bestTopSpeed, raceSummary.stats.topSpeed ?? 0);
    profile.stats.bestOvertakes = Math.max(profile.stats.bestOvertakes, raceSummary.stats.overtakes ?? 0);
    profile.stats.bestDriftReleases = Math.max(profile.stats.bestDriftReleases, raceSummary.stats.driftReleases ?? 0);

    const earnedAchievements = this.evaluateAchievements(raceSummary.stats, raceSummary);

    for (const achievementId of earnedAchievements) {
      profile.achievements.push(achievementId);
    }

    profile.achievements = [...new Set(profile.achievements)];
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);
    this.save(profile);

    const afterLevelInfo = this.getLevelInfo(profile.xp);
    const unlocks = this.diffUnlocks(beforeSnapshot, this.snapshotUnlocks(profile));

    return {
      levelUp: afterLevelInfo.level > beforeLevel,
      unlocks,
      achievements: earnedAchievements.map((achievementId) => ACHIEVEMENT_DEFS.find((item) => item.id === achievementId)),
      levelInfo: afterLevelInfo
    };
  }

  applyPremiumRaceRewards(profile, raceSummary, { save = true } = {}) {
    const beforeLevel = this.getLevelInfo(profile.xp).level;
    const beforeSnapshot = this.snapshotUnlocks(profile);
    const rewards = raceSummary.rewards ?? { points: 0, currency: 0, xp: 0 };

    profile.totalPoints += rewards.points ?? 0;
    profile.currency += rewards.currency ?? 0;
    profile.xp += rewards.xp ?? 0;

    this.ensureUnlocks(profile);
    this.ensureSelections(profile);

    if (save) {
      this.save(profile);
    }

    const afterLevelInfo = this.getLevelInfo(profile.xp);
    const unlocks = this.diffUnlocks(beforeSnapshot, this.snapshotUnlocks(profile));

    return {
      levelUp: afterLevelInfo.level > beforeLevel,
      unlocks,
      achievements: [],
      levelInfo: afterLevelInfo
    };
  }

  snapshotUnlocks(profile) {
    return {
      unlockedShips: [...profile.unlockedShips],
      unlockedTracks: [...profile.unlockedTracks],
      unlockedHullColors: [...profile.unlockedHullColors],
      unlockedGlowColors: [...profile.unlockedGlowColors],
      unlockedTrailColors: [...profile.unlockedTrailColors]
    };
  }

  diffUnlocks(before, after) {
    const diffs = [];

    for (const shipId of after.unlockedShips) {
      if (!before.unlockedShips.includes(shipId)) {
        diffs.push({ type: 'Ship', label: SHIP_LOOKUP[shipId].name });
      }
    }

    for (const trackId of after.unlockedTracks) {
      if (!before.unlockedTracks.includes(trackId)) {
        diffs.push({ type: 'Track', label: TRACK_LOOKUP[trackId].name });
      }
    }

    for (const hullId of after.unlockedHullColors) {
      if (!before.unlockedHullColors.includes(hullId)) {
        diffs.push({ type: 'Hull Color', label: HULL_LOOKUP[hullId].name });
      }
    }

    for (const glowId of after.unlockedGlowColors) {
      if (!before.unlockedGlowColors.includes(glowId)) {
        diffs.push({ type: 'Engine Glow', label: GLOW_LOOKUP[glowId].name });
      }
    }

    for (const trailId of after.unlockedTrailColors) {
      if (!before.unlockedTrailColors.includes(trailId)) {
        diffs.push({ type: 'Trail', label: TRAIL_LOOKUP[trailId].name });
      }
    }

    return diffs;
  }

  getNextUnlock(profile) {
    const { level } = this.getLevelInfo(profile.xp);

    for (const ship of SHIP_DEFS) {
      if (!profile.unlockedShips.includes(ship.id) && ship.cost && ship.cost > 0 && level >= ship.unlockLevel) {
        return `${ship.name} available for ${ship.cost} credits`;
      }
    }

    const nextLevelUnlocks = [
      ...TRACK_DEFS
        .filter((track) => !profile.unlockedTracks.includes(track.id) && Number.isFinite(track.unlockLevel))
        .map((track, index) => ({
          label: `${track.name} unlocks at Level ${track.unlockLevel}`,
          unlockLevel: track.unlockLevel,
          categoryRank: 0,
          order: index
        })),
      ...SHIP_DEFS
        .filter((ship) => !profile.unlockedShips.includes(ship.id) && Number.isFinite(ship.unlockLevel))
        .map((ship, index) => ({
          label: `${ship.name} unlocks at Level ${ship.unlockLevel}`,
          unlockLevel: ship.unlockLevel,
          categoryRank: 1,
          order: index
        }))
    ]
      .sort((itemA, itemB) =>
        itemA.unlockLevel - itemB.unlockLevel ||
        itemA.categoryRank - itemB.categoryRank ||
        itemA.order - itemB.order
      );

    if (nextLevelUnlocks.length > 0) {
      return nextLevelUnlocks[0].label;
    }

    for (const ship of SHIP_DEFS) {
      if (!profile.unlockedShips.includes(ship.id) && ship.unlockAchievement) {
        const achievement = ACHIEVEMENT_DEFS.find((item) => item.id === ship.unlockAchievement);
        return `${ship.name} unlocks with "${achievement.name}"`;
      }
    }

    return 'Master the fleet and push your point total higher.';
  }

  buildGoalView(goals, stats) {
    return goals.map((goal) => {
      const progress = getGoalProgress(goal, stats);

      return {
        id: goal.id,
        label: goal.label,
        rewardXp: goal.rewardXp,
        rewardCurrency: goal.rewardCurrency,
        completed: progress.completed,
        progress: progress.text
      };
    });
  }

  getMultiplayerView(profile) {
    this.ensureGoalState(profile);
    const goals = this.getGoalDefinitions(profile);
    const rank = getRankInfo(profile.multiplayer.rating);

    return {
      pilotId: profile.pilotId,
      rank: {
        name: rank.tier.name,
        rating: rank.rating,
        accent: rank.tier.accent,
        nextLabel: rank.nextTier ? `${rank.nextTier.name} at ${rank.nextTier.minRating}` : 'Top tier reached',
        progress: rank.progress
      },
      friends: [...profile.friends],
      dailyGoals: this.buildGoalView(goals.daily, profile.multiplayer),
      weeklyGoals: this.buildGoalView(goals.weekly, profile.multiplayer),
      recentHighlights: [...profile.multiplayer.recentHighlights],
      lastRoomLeaderboard: [...profile.multiplayer.lastRoomLeaderboard]
    };
  }

  applyMultiplayerResults(profile, multiplayerSummary) {
    const beforeLevel = this.getLevelInfo(profile.xp).level;
    const beforeSnapshot = this.snapshotUnlocks(profile);
    const previousGoals = this.getMultiplayerView(profile);
    const entry = multiplayerSummary.localResult;
    const rewardBase = {
      points: Math.max(140, 440 - (entry.place - 1) * 52),
      currency: Math.max(90, 280 - (entry.place - 1) * 34),
      xp: Math.max(110, 240 - (entry.place - 1) * 26)
    };
    const overtakeReward = {
      points: (entry.stats?.overtakes ?? 0) * 22,
      currency: (entry.stats?.overtakes ?? 0) * 10,
      xp: (entry.stats?.overtakes ?? 0) * 14
    };
    const cleanReward = (entry.stats?.hazardHits ?? 0) === 0
      ? { points: 58, currency: 46, xp: 52 }
      : { points: 20, currency: 16, xp: 18 };
    const rankedBonus = {
      points: Math.max(0, entry.ratingDelta) * 6 + (multiplayerSummary.roomType === 'tournament' ? 90 : 40),
      currency: Math.max(0, entry.ratingDelta) * 2 + (multiplayerSummary.roomType === 'private' ? 24 : 42),
      xp: Math.max(0, entry.ratingDelta) * 3 + (multiplayerSummary.roomType === 'tournament' ? 74 : 34)
    };
    const rewards = [rewardBase, overtakeReward, cleanReward, rankedBonus].reduce(
      (total, reward) => ({
        points: total.points + reward.points,
        currency: total.currency + reward.currency,
        xp: total.xp + reward.xp
      }),
      { points: 0, currency: 0, xp: 0 }
    );

    profile.totalPoints += rewards.points;
    profile.currency += rewards.currency;
    profile.xp += rewards.xp;
    profile.multiplayer.rating = Math.max(800, entry.ratingAfter);
    profile.multiplayer.races += 1;
    profile.multiplayer.wins += entry.place === 1 ? 1 : 0;
    profile.multiplayer.podiums += entry.place <= 3 ? 1 : 0;
    profile.stats.bestPosition = Math.min(profile.stats.bestPosition, entry.place);
    profile.stats.bestOvertakes = Math.max(profile.stats.bestOvertakes, entry.stats?.overtakes ?? 0);
    profile.multiplayer.privateRaces += multiplayerSummary.roomType === 'private' ? 1 : 0;
    profile.multiplayer.privateWins += multiplayerSummary.roomType === 'private' && entry.place === 1 ? 1 : 0;
    profile.multiplayer.tournamentRaces += ['tournament', 'private-tournament'].includes(multiplayerSummary.roomType) ? 1 : 0;
    profile.multiplayer.tournamentWins += ['tournament', 'private-tournament'].includes(multiplayerSummary.roomType) && entry.place === 1 ? 1 : 0;
    profile.multiplayer.totalOvertakes += entry.stats?.overtakes ?? 0;
    profile.multiplayer.cleanRaces += (entry.stats?.hazardHits ?? 0) === 0 ? 1 : 0;
    profile.multiplayer.closeFinishes += multiplayerSummary.closeFinish ? 1 : 0;
    profile.multiplayer.lastRoomLeaderboard = multiplayerSummary.standings.slice(0, 8);
    profile.multiplayer.recentHighlights = [
      ...multiplayerSummary.highlights,
      ...profile.multiplayer.recentHighlights
    ].slice(0, 8);

    this.ensureGoalState(profile);
    this.ensureUnlocks(profile);
    this.ensureSelections(profile);
    this.save(profile);

    const currentGoals = this.getMultiplayerView(profile);
    const completedGoals = [
      ...currentGoals.dailyGoals.filter((goal) => goal.completed && previousGoals.dailyGoals.some((before) => before.id === goal.id && !before.completed)),
      ...currentGoals.weeklyGoals.filter((goal) => goal.completed && previousGoals.weeklyGoals.some((before) => before.id === goal.id && !before.completed))
    ];

    const goalRewards = completedGoals.reduce(
      (total, goal) => ({
        xp: total.xp + goal.rewardXp,
        currency: total.currency + goal.rewardCurrency,
        points: total.points + goal.rewardXp + goal.rewardCurrency
      }),
      { xp: 0, currency: 0, points: 0 }
    );

    if (goalRewards.xp > 0 || goalRewards.currency > 0 || goalRewards.points > 0) {
      profile.xp += goalRewards.xp;
      profile.currency += goalRewards.currency;
      profile.totalPoints += goalRewards.points;
      this.ensureUnlocks(profile);
      this.ensureSelections(profile);
      this.save(profile);
    }

    const levelInfo = this.getLevelInfo(profile.xp);
    const unlocks = this.diffUnlocks(beforeSnapshot, this.snapshotUnlocks(profile));

    return {
      rewards: {
        ...rewards,
        xp: rewards.xp + goalRewards.xp,
        currency: rewards.currency + goalRewards.currency,
        points: rewards.points + goalRewards.points
      },
      goalRewards,
      completedGoals,
      rank: getRankInfo(profile.multiplayer.rating),
      achievements: [],
      levelUp: levelInfo.level > beforeLevel,
      levelInfo,
      unlocks
    };
  }

  getProfileView(profile) {
    const levelInfo = this.getLevelInfo(profile.xp);

    return {
      playerName: profile.playerName,
      pilotId: profile.pilotId,
      theme: profile.theme,
      settings: JSON.parse(JSON.stringify(profile.settings)),
      createdAt: profile.createdAt,
      auth: {
        uid: profile.auth.uid,
        provider: profile.auth.provider,
        email: profile.auth.email,
        createdAt: profile.auth.createdAt,
        lastLoginAt: profile.auth.lastLoginAt
      },
      level: levelInfo.level,
      xpLabel: `${Math.floor(levelInfo.currentXp)}/${levelInfo.nextXp} XP`,
      xpProgress: levelInfo.progress,
      currency: profile.currency,
      totalPoints: profile.totalPoints,
      favoriteShipId: profile.favoriteShipId,
      achievements: profile.achievements,
      stats: {
        races: profile.stats.races,
        wins: profile.stats.wins,
        podiums: profile.stats.podiums,
        bestPosition: Number.isFinite(profile.stats.bestPosition) ? profile.stats.bestPosition : null
      },
      premiumProgress: JSON.parse(JSON.stringify(profile.premiumProgress ?? cloneDefaultPremiumProgress())),
      advancedCosmetics: JSON.parse(JSON.stringify(profile.advancedCosmetics ?? cloneDefaultAdvancedCosmetics())),
      shipUpgrades: JSON.parse(JSON.stringify(profile.shipUpgrades ?? {})),
      timeTrials: Object.fromEntries(
        TRACK_DEFS.map((track) => {
          const record = this.getTimeTrialRecord(profile, track.id);
          return [track.id, record
            ? {
              bestLapMs: record.bestLapMs,
              bestRunMs: record.bestRunMs,
              ghostReady: record.ghostFrames.length > 0
            }
            : null];
        })
      )
    };
  }
}
