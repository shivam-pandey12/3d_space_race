import { EDITION_IDS } from './editionConfig.js';

export const ADVANCED_COSMETIC_CATEGORY_IDS = Object.freeze({
  shipSkin: 'shipSkin',
  decal: 'decal',
  animatedHullPattern: 'animatedHullPattern',
  exhaustStyle: 'exhaustStyle',
  trailShape: 'trailShape',
  boostFlameStyle: 'boostFlameStyle',
  cockpitGlow: 'cockpitGlow',
  pilotBadge: 'pilotBadge',
  numberPlate: 'numberPlate',
  victoryPose: 'victoryPose',
  podiumAnimation: 'podiumAnimation',
  garageLightingPreset: 'garageLightingPreset'
});

export const ADVANCED_COSMETIC_CATEGORIES = Object.freeze([
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.shipSkin, label: 'Ship Skins', shortLabel: 'Skins' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.decal, label: 'Decals', shortLabel: 'Decals' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.animatedHullPattern, label: 'Animated Hull Patterns', shortLabel: 'Patterns' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.exhaustStyle, label: 'Exhaust Styles', shortLabel: 'Exhaust' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.trailShape, label: 'Trail Shapes', shortLabel: 'Trails' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.boostFlameStyle, label: 'Boost Flame Styles', shortLabel: 'Boost' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.cockpitGlow, label: 'Cockpit Glow', shortLabel: 'Cockpit' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.pilotBadge, label: 'Pilot Badge', shortLabel: 'Badge' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.numberPlate, label: 'Ship Number Plate', shortLabel: 'Plate' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.victoryPose, label: 'Victory Pose', shortLabel: 'Pose' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.podiumAnimation, label: 'Podium Animation', shortLabel: 'Podium' },
  { id: ADVANCED_COSMETIC_CATEGORY_IDS.garageLightingPreset, label: 'Garage Lighting Preset', shortLabel: 'Lighting' }
]);

const EA = EDITION_IDS.STANDALONE_EARLY_ACCESS;
const FULL = EDITION_IDS.STANDALONE_FULL_PREMIUM;

function item({
  id,
  category,
  name,
  rarity = 'rare',
  requiredEdition = EA,
  unlockType = 'edition',
  unlockText = '',
  visualConfig = {}
}) {
  return Object.freeze({
    id,
    category,
    name,
    rarity,
    requiredEdition,
    unlockType,
    unlockText: unlockText || (requiredEdition === FULL ? 'Requires Full Premium' : 'Requires Early Access or Full Premium'),
    previewConfig: visualConfig,
    visualConfig,
    ownedByDefault: false
  });
}

export const ADVANCED_COSMETIC_ITEMS = Object.freeze([
  item({
    id: 'eclipse-carbon',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.shipSkin,
    name: 'Eclipse Carbon',
    rarity: 'epic',
    visualConfig: { skinColor: 0x090d15, emissive: 0x151a26, metalness: 0.98, roughness: 0.08 }
  }),
  item({
    id: 'solar-ivory',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.shipSkin,
    name: 'Solar Ivory',
    rarity: 'rare',
    visualConfig: { skinColor: 0xf2e8cf, emissive: 0x483616, metalness: 0.52, roughness: 0.18 }
  }),
  item({
    id: 'nebula-chrome',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.shipSkin,
    name: 'Nebula Chrome',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { skinColor: 0x6f7dff, emissive: 0x17125f, metalness: 1, roughness: 0.04 }
  }),

  item({
    id: 'founder-stripe',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.decal,
    name: 'Founder Stripe',
    rarity: 'rare',
    unlockType: 'reward-placeholder',
    unlockText: 'Rookie League reward',
    visualConfig: { decalColor: 0xffc66d, decalShape: 'stripe' }
  }),
  item({
    id: 'rift-mark',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.decal,
    name: 'Rift Mark',
    rarity: 'epic',
    visualConfig: { decalColor: 0x98eaff, decalShape: 'chevron' }
  }),
  item({
    id: 'champion-crest',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.decal,
    name: 'Champion Crest',
    rarity: 'legendary',
    requiredEdition: FULL,
    unlockType: 'reward-placeholder',
    unlockText: 'Campaign/tournament reward placeholder',
    visualConfig: { decalColor: 0xffe39b, decalShape: 'crest' }
  }),

  item({
    id: 'pulse-grid',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.animatedHullPattern,
    name: 'Pulse Grid',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { patternColor: 0x8defff, patternSpeed: 1.4 }
  }),
  item({
    id: 'aurora-veins',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.animatedHullPattern,
    name: 'Aurora Veins',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { patternColor: 0x9cffc9, patternSpeed: 1.1 }
  }),
  item({
    id: 'singularity-flow',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.animatedHullPattern,
    name: 'Singularity Flow',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { patternColor: 0xd090ff, patternSpeed: 1.8 }
  }),

  item({
    id: 'twin-ion',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.exhaustStyle,
    name: 'Twin Ion',
    rarity: 'rare',
    visualConfig: { engineColor: 0x74eaff, exhaustScale: 1.05 }
  }),
  item({
    id: 'plasma-fork',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.exhaustStyle,
    name: 'Plasma Fork',
    rarity: 'epic',
    visualConfig: { engineColor: 0xff7fd6, exhaustScale: 1.12 }
  }),
  item({
    id: 'solar-flare',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.exhaustStyle,
    name: 'Solar Flare',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { engineColor: 0xffc66d, exhaustScale: 1.2 }
  }),

  item({
    id: 'ribbon-trail',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.trailShape,
    name: 'Ribbon Trail',
    rarity: 'rare',
    visualConfig: { trailColor: 0x85eeff, trailWidth: 1.18, trailLength: 1.04 }
  }),
  item({
    id: 'spark-trail',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.trailShape,
    name: 'Spark Trail',
    rarity: 'epic',
    visualConfig: { trailColor: 0xffd28b, trailWidth: 0.86, trailLength: 1.18 }
  }),
  item({
    id: 'comet-split',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.trailShape,
    name: 'Comet Split',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { trailColor: 0xc28dff, trailWidth: 1.34, trailLength: 1.22 }
  }),

  item({
    id: 'blue-lance',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.boostFlameStyle,
    name: 'Blue Lance',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { boostColor: 0x66dfff, boostScale: 1.12 }
  }),
  item({
    id: 'golden-burst',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.boostFlameStyle,
    name: 'Golden Burst',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { boostColor: 0xffd37a, boostScale: 1.18 }
  }),
  item({
    id: 'void-flame',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.boostFlameStyle,
    name: 'Void Flame',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { boostColor: 0x9c6dff, boostScale: 1.24 }
  }),

  item({
    id: 'cyan-core-cockpit',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.cockpitGlow,
    name: 'Cyan Core',
    rarity: 'rare',
    visualConfig: { cockpitColor: 0x74f4ff }
  }),
  item({
    id: 'amber-crown-cockpit',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.cockpitGlow,
    name: 'Amber Crown',
    rarity: 'rare',
    visualConfig: { cockpitColor: 0xffd28a }
  }),
  item({
    id: 'violet-pulse-cockpit',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.cockpitGlow,
    name: 'Violet Pulse',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { cockpitColor: 0xd8a0ff }
  }),

  item({
    id: 'early-access-pilot',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.pilotBadge,
    name: 'Early Access Pilot',
    rarity: 'rare',
    visualConfig: { badgeColor: 0x84eaff }
  }),
  item({
    id: 'tournament-finalist',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.pilotBadge,
    name: 'Tournament Finalist',
    rarity: 'epic',
    unlockType: 'reward-placeholder',
    unlockText: 'Tournament reward placeholder',
    visualConfig: { badgeColor: 0xffc66d }
  }),
  item({
    id: 'full-premium-ace',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.pilotBadge,
    name: 'Full Premium Ace',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { badgeColor: 0xffe1a4 }
  }),

  item({
    id: 'pilot-number-plate',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.numberPlate,
    name: 'Pilot Number Plate',
    rarity: 'rare',
    visualConfig: { plateColor: 0x8defff, plateAccent: 0x102236 }
  }),
  item({
    id: 'founder-number-plate',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.numberPlate,
    name: 'Founder Plate',
    rarity: 'epic',
    unlockType: 'reward-placeholder',
    unlockText: 'Neon Circuit Cup reward',
    visualConfig: { plateColor: 0xffc66d, plateAccent: 0x2f1c07 }
  }),
  item({
    id: 'champion-number-plate',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.numberPlate,
    name: 'Champion Plate',
    rarity: 'legendary',
    requiredEdition: FULL,
    unlockType: 'reward-placeholder',
    unlockText: '8-player tournament champion reward',
    visualConfig: { plateColor: 0xffe39b, plateAccent: 0x1f1706 }
  }),

  item({
    id: 'wing-tilt',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.victoryPose,
    name: 'Wing Tilt',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { pose: 'wingTilt' }
  }),
  item({
    id: 'boost-spin',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.victoryPose,
    name: 'Boost Spin',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { pose: 'boostSpin' }
  }),
  item({
    id: 'silent-hover',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.victoryPose,
    name: 'Silent Hover',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { pose: 'silentHover' }
  }),

  item({
    id: 'engine-roar',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.podiumAnimation,
    name: 'Engine Roar',
    rarity: 'epic',
    requiredEdition: FULL,
    visualConfig: { podiumAnimation: 'engineRoar' }
  }),
  item({
    id: 'trail-spiral',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.podiumAnimation,
    name: 'Trail Spiral',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { podiumAnimation: 'trailSpiral' }
  }),
  item({
    id: 'champion-flash',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.podiumAnimation,
    name: 'Champion Flash',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { podiumAnimation: 'championFlash' }
  }),

  item({
    id: 'hangar-classic-lighting',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.garageLightingPreset,
    name: 'Hangar Classic',
    rarity: 'rare',
    visualConfig: { lightingPreset: 'classic', ambient: 0xbfd7ff, key: 0xd7f3ff, rim: 0x7ce7ff }
  }),
  item({
    id: 'solar-gold-lighting',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.garageLightingPreset,
    name: 'Solar Gold',
    rarity: 'epic',
    visualConfig: { lightingPreset: 'solarGold', ambient: 0xffddaa, key: 0xffc36d, rim: 0x8feeff }
  }),
  item({
    id: 'void-blue-lighting',
    category: ADVANCED_COSMETIC_CATEGORY_IDS.garageLightingPreset,
    name: 'Void Blue',
    rarity: 'legendary',
    requiredEdition: FULL,
    visualConfig: { lightingPreset: 'voidBlue', ambient: 0x9db4ff, key: 0x6d85ff, rim: 0x9fefff }
  })
]);

export const ADVANCED_COSMETIC_LOOKUP = Object.freeze(
  Object.fromEntries(ADVANCED_COSMETIC_ITEMS.map((entry) => [entry.id, entry]))
);

export const ADVANCED_COSMETIC_CATEGORY_LOOKUP = Object.freeze(
  Object.fromEntries(ADVANCED_COSMETIC_CATEGORIES.map((entry) => [entry.id, entry]))
);

export function sanitizeNumberPlate(value = {}) {
  const digits = String(value.digits ?? '07').replace(/\D/g, '').slice(0, 3) || '07';
  const tag = String(value.tag ?? 'ACE').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4) || 'ACE';

  return { digits, tag };
}

export function getAdvancedCosmeticItem(itemId) {
  return ADVANCED_COSMETIC_LOOKUP[itemId] ?? null;
}

export function buildAdvancedVisualConfig(selection = {}, numberPlate = {}) {
  const visualConfig = {};
  let hasNumberPlate = false;

  for (const itemId of Object.values(selection ?? {})) {
    const itemDef = getAdvancedCosmeticItem(itemId);

    if (!itemDef) {
      continue;
    }

    Object.assign(visualConfig, itemDef.visualConfig);
    hasNumberPlate = hasNumberPlate || itemDef.category === ADVANCED_COSMETIC_CATEGORY_IDS.numberPlate;
  }

  if (hasNumberPlate) {
    visualConfig.numberPlate = sanitizeNumberPlate(numberPlate);
  }

  return visualConfig;
}
