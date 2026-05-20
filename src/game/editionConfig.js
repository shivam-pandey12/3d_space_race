export const EDITION_IDS = Object.freeze({
  GAMEHUB_LITE: 'GAMEHUB_LITE',
  STANDALONE_EARLY_ACCESS: 'STANDALONE_EARLY_ACCESS',
  STANDALONE_FULL_PREMIUM: 'STANDALONE_FULL_PREMIUM'
});

export const PLAN_IDS = Object.freeze({
  EARLY_ACCESS_PASS_120D: 'early_access_pass_120d',
  FULL_PREMIUM_PASS_120D: 'full_premium_pass_120d',
  EARLY_ACCESS: 'early_access_pass_120d',
  FULL_PREMIUM: 'full_premium_pass_120d'
});

export const PREMIUM_PASS_DURATION_DAYS = 120;

const PLAN_ALIASES = Object.freeze({
  'early-access': PLAN_IDS.EARLY_ACCESS_PASS_120D,
  early_access: PLAN_IDS.EARLY_ACCESS_PASS_120D,
  early_access_pass: PLAN_IDS.EARLY_ACCESS_PASS_120D,
  early_access_pass_120d: PLAN_IDS.EARLY_ACCESS_PASS_120D,
  'full-premium': PLAN_IDS.FULL_PREMIUM_PASS_120D,
  full_premium: PLAN_IDS.FULL_PREMIUM_PASS_120D,
  full_premium_pass: PLAN_IDS.FULL_PREMIUM_PASS_120D,
  full_premium_pass_120d: PLAN_IDS.FULL_PREMIUM_PASS_120D
});

export const FEATURE_KEYS = Object.freeze({
  premiumCampaign: 'premiumCampaign',
  tournamentMode: 'tournamentMode',
  rankedSeasons: 'rankedSeasons',
  advancedGarage: 'advancedGarage',
  replayPhotoMode: 'replayPhotoMode',
  customRaceLab: 'customRaceLab',
  liveEvents: 'liveEvents',
  bossRaceEvents: 'bossRaceEvents',
  premiumShips: 'premiumShips',
  premiumTracks: 'premiumTracks',
  premiumCosmetics: 'premiumCosmetics',
  offlineShipUpgrades: 'offlineShipUpgrades'
});

export const EDITION_ORDER = [
  EDITION_IDS.GAMEHUB_LITE,
  EDITION_IDS.STANDALONE_EARLY_ACCESS,
  EDITION_IDS.STANDALONE_FULL_PREMIUM
];

export const EDITION_RANK = Object.fromEntries(
  EDITION_ORDER.map((editionId, index) => [editionId, index])
);

const EDITION_ALIASES = Object.freeze({
  lite: EDITION_IDS.GAMEHUB_LITE,
  gamehub: EDITION_IDS.GAMEHUB_LITE,
  gamehub_lite: EDITION_IDS.GAMEHUB_LITE,
  early: EDITION_IDS.STANDALONE_EARLY_ACCESS,
  early_access: EDITION_IDS.STANDALONE_EARLY_ACCESS,
  standalone_early_access: EDITION_IDS.STANDALONE_EARLY_ACCESS,
  full: EDITION_IDS.STANDALONE_FULL_PREMIUM,
  premium: EDITION_IDS.STANDALONE_FULL_PREMIUM,
  full_premium: EDITION_IDS.STANDALONE_FULL_PREMIUM,
  standalone_full_premium: EDITION_IDS.STANDALONE_FULL_PREMIUM
});

export const ACCESS_STATE_LABELS = Object.freeze({
  current: 'Current Plan',
  includedFuture: 'Included in your plan / coming later',
  locked: 'Locked Preview',
  unavailable: 'Safe Preview'
});

export const EDITION_CONFIG = Object.freeze({
  [EDITION_IDS.GAMEHUB_LITE]: {
    id: EDITION_IDS.GAMEHUB_LITE,
    label: 'GameHub Lite',
    shortLabel: 'Lite',
    badge: 'Lite',
    badgeTone: 'common',
    iconLabel: 'L',
    deck: 'Free GameHub experience',
    description: 'The existing GameHub/free version with the full current racing loop kept open.',
    isStandalone: false,
    comparisonFeatures: [
      'Free GameHub experience',
      'Base racing',
      'Basic career and time trial',
      'Basic multiplayer',
      'Basic garage',
      'Basic ships and tracks'
    ]
  },
  [EDITION_IDS.STANDALONE_EARLY_ACCESS]: {
    id: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    label: 'Early Access Pass',
    shortLabel: 'Early',
    badge: 'Early',
    badgeTone: 'rare',
    iconLabel: 'EA',
    deck: '120-day standalone access',
    description: 'Seasonal Early Access Pass for campaign cups, tournaments, core replay, Race Lab, and selected premium content.',
    isStandalone: true,
    comparisonFeatures: [
      '120-day access',
      'Rookie League',
      'Neon Circuit Cup',
      '4-player AI tournament',
      'Basic replay viewer',
      'Basic custom Race Lab',
      'Selected advanced garage',
      'Eclipse Vanguard Pack',
      'Daily challenges',
      'Solar Flare Escape'
    ]
  },
  [EDITION_IDS.STANDALONE_FULL_PREMIUM]: {
    id: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    label: 'Full Premium Pass',
    shortLabel: 'Full',
    badge: 'Full',
    badgeTone: 'legendary',
    iconLabel: 'FP',
    deck: '120-day full standalone access',
    description: 'Seasonal Full Premium Pass for every premium campaign, event, content pack, replay, garage, and Race Lab system.',
    isStandalone: true,
    comparisonFeatures: [
      '120-day access',
      'Full campaign',
      'Full tournament modes',
      'Ranked seasons',
      'Live events',
      'All boss races',
      'Full advanced garage',
      'All offline upgrade modules',
      'Full replay/photo mode',
      'Full custom Race Lab',
      'All premium content packs',
      'Private tournament rooms and global event leaderboards'
    ]
  }
});

export const PLAN_CONFIG = Object.freeze({
  [PLAN_IDS.EARLY_ACCESS]: {
    id: PLAN_IDS.EARLY_ACCESS,
    editionId: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    label: 'Early Access Pass',
    shortLabel: 'Early Access Pass',
    upgradeLabel: 'Buy Early Access Pass',
    renewLabel: 'Renew Pass',
    upgradeFromLowerLabel: 'Buy Early Access Pass',
    durationDays: PREMIUM_PASS_DURATION_DAYS,
    description: 'A fixed-duration seasonal pass for early campaign, tournaments, replay, Race Lab, and selected premium content.'
  },
  [PLAN_IDS.FULL_PREMIUM]: {
    id: PLAN_IDS.FULL_PREMIUM,
    editionId: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    label: 'Full Premium Pass',
    shortLabel: 'Full Premium Pass',
    upgradeLabel: 'Buy Full Premium Pass',
    renewLabel: 'Renew Pass',
    upgradeFromLowerLabel: 'Upgrade to Full Premium Pass',
    durationDays: PREMIUM_PASS_DURATION_DAYS,
    description: 'A fixed-duration seasonal pass for every premium standalone feature and content pack.'
  }
});

export const EDITION_TO_PLAN = Object.freeze({
  [EDITION_IDS.STANDALONE_EARLY_ACCESS]: PLAN_IDS.EARLY_ACCESS,
  [EDITION_IDS.STANDALONE_FULL_PREMIUM]: PLAN_IDS.FULL_PREMIUM
});

export const PRICING_REGIONS = Object.freeze({
  global: {
    id: 'global',
    label: 'Global',
    currency: 'USD',
    plans: {
      [PLAN_IDS.EARLY_ACCESS]: {
        amount: 3.99,
        display: '$3.99'
      },
      [PLAN_IDS.FULL_PREMIUM]: {
        amount: 6.99,
        display: '$6.99'
      }
    }
  },
  IN: {
    id: 'IN',
    label: 'India',
    currency: 'INR',
    plans: {
      [PLAN_IDS.EARLY_ACCESS]: {
        amount: 49,
        display: '\u20b949'
      },
      [PLAN_IDS.FULL_PREMIUM]: {
        amount: 149,
        display: '\u20b9149'
      }
    }
  }
});

export const FEATURE_DEFINITIONS = Object.freeze([
  {
    key: FEATURE_KEYS.premiumCampaign,
    title: 'Premium Campaign',
    iconLabel: 'CAM',
    description: 'Playable premium cup progression with Early Access leagues and Full Premium championship cups.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.tournamentMode,
    title: 'Tournament Mode',
    iconLabel: 'TRN',
    description: 'Playable local AI elimination brackets with 4-player Early Access and 8-player Full Premium modes.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.rankedSeasons,
    title: 'Ranked Seasons',
    iconLabel: 'RKS',
    description: 'Local AI ranked season ladder with normalized stats, fair-play rules, rating tiers, and Full Premium rewards.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.advancedGarage,
    title: 'Advanced Garage',
    iconLabel: 'GRG',
    description: 'Advanced standalone garage categories with cosmetic-only ship personalization.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.replayPhotoMode,
    title: 'Replay & Photo Mode',
    iconLabel: 'RPL',
    description: 'Runtime highlight replay viewer and screenshot-friendly photo tools for standalone editions.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.customRaceLab,
    title: 'Custom Race Lab',
    iconLabel: 'LAB',
    description: 'Offline custom race setup with saved presets and Full Premium modifiers.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.liveEvents,
    title: 'Live Events',
    iconLabel: 'EVT',
    description: 'Date-seeded daily, weekly, weekend, and limited offline event challenges with idempotent reward wiring.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.bossRaceEvents,
    title: 'Boss Race Events',
    iconLabel: 'BOS',
    description: 'Offline cinematic boss race events using existing track, AI, hazard, VFX, replay, and reward systems.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.premiumShips,
    title: 'Premium Ships',
    iconLabel: 'SHP',
    description: 'Standalone premium content-pack ships with offline flavor and normalized online stats.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.premiumTracks,
    title: 'Premium Tracks',
    iconLabel: 'TRK',
    description: 'Standalone premium content-pack tracks. Only race-ready tracks are selectable.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.premiumCosmetics,
    title: 'Premium Cosmetics',
    iconLabel: 'COS',
    description: 'Premium cosmetic previews and apply flow for standalone editions. Cosmetics never affect stats.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  },
  {
    key: FEATURE_KEYS.offlineShipUpgrades,
    title: 'Offline Ship Upgrades',
    iconLabel: 'UPG',
    description: 'Offline career-only upgrade modules. Online competition stays normalized.',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    phaseLabel: 'Playable now',
    status: 'active'
  }
]);

export const PREMIUM_PREVIEW_HUB = Object.freeze([
  {
    id: 'campaign-preview',
    featureKey: FEATURE_KEYS.premiumCampaign,
    title: 'Premium Campaign',
    summary: 'Rookie League and premium campaign cups are playable for entitled standalone editions.'
  },
  {
    id: 'tournament-preview',
    featureKey: FEATURE_KEYS.tournamentMode,
    title: 'Tournament Mode',
    summary: 'Local AI tournament brackets are playable for entitled standalone editions.'
  },
  {
    id: 'ranked-season-preview',
    featureKey: FEATURE_KEYS.rankedSeasons,
    title: 'Ranked Seasons',
    summary: 'Local AI ranked ladder with normalized stats and no paid advantage.'
  },
  {
    id: 'live-events-preview',
    featureKey: FEATURE_KEYS.liveEvents,
    title: 'Live Events',
    summary: 'Daily and weekly date-seeded offline events with premium rewards.'
  },
  {
    id: 'custom-race-lab-preview',
    featureKey: FEATURE_KEYS.customRaceLab,
    title: 'Custom Race Lab',
    summary: 'Offline custom race setup with safe preset storage.'
  },
  {
    id: 'replay-photo-preview',
    featureKey: FEATURE_KEYS.replayPhotoMode,
    title: 'Replay/Photo Mode',
    summary: 'Runtime highlight replay and photo tools after offline races.'
  },
  {
    id: 'boss-events-preview',
    featureKey: FEATURE_KEYS.bossRaceEvents,
    title: 'Boss Race Events',
    summary: 'Cinematic offline boss races with lightweight scripted pressure.'
  },
  {
    id: 'premium-garage-preview',
    featureKey: FEATURE_KEYS.advancedGarage,
    title: 'Advanced Garage',
    summary: 'Deeper garage layer with cosmetic-only customization and online fairness preserved.'
  }
]);

export const PREMIUM_ROADMAP = Object.freeze({
  [EDITION_IDS.STANDALONE_EARLY_ACCESS]: {
    editionId: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    title: 'Early Access Roadmap',
    items: [
      'Rookie League premium campaign playable',
      '4-player AI tournament playable',
      'Basic replay viewer playable',
      'Basic custom race lab playable',
      'Selected premium ships and tracks preview later',
      'Founder and early supporter badge placeholder'
    ]
  },
  [EDITION_IDS.STANDALONE_FULL_PREMIUM]: {
    editionId: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    title: 'Full Premium Roadmap',
    items: [
      'Full campaign cups playable',
      'Ranked seasons playable',
      '8-player AI tournaments playable',
      'Advanced garage playable',
      'Boss race events playable',
      'Full replay/photo controls playable',
      'Full custom race lab modifiers playable',
      'Live events playable'
    ]
  }
});

export const MULTIPLAYER_FAIR_PLAY_POLICY = Object.freeze([
  'Ranked and competitive online racing uses normalized ship stats.',
  'Offline or career upgrades may affect solo play later, not competitive balance.',
  'Cosmetics do not affect stats.',
  'Paid content must not create unfair online advantage.'
]);

export function normalizeEditionId(value, fallback = EDITION_IDS.GAMEHUB_LITE) {
  const rawValue = String(value ?? '').trim();

  if (EDITION_CONFIG[rawValue]) {
    return rawValue;
  }

  const alias = rawValue.toLowerCase().replace(/[-\s]+/g, '_');
  return EDITION_ALIASES[alias] ?? fallback;
}

export function normalizePlanId(value) {
  const rawValue = String(value ?? '').trim();

  if (PLAN_CONFIG[rawValue]) {
    return rawValue;
  }

  const alias = rawValue.toLowerCase().replace(/[\s-]+/g, '_');
  if (PLAN_ALIASES[rawValue] || PLAN_ALIASES[alias]) {
    return PLAN_ALIASES[rawValue] ?? PLAN_ALIASES[alias];
  }

  const editionId = normalizeEditionId(rawValue, '');
  return EDITION_TO_PLAN[editionId] ?? '';
}
