import { EDITION_IDS } from './editionConfig.js';

const EA = EDITION_IDS.STANDALONE_EARLY_ACCESS;
const FULL = EDITION_IDS.STANDALONE_FULL_PREMIUM;

function moduleDef({
  id,
  name,
  description,
  requiredEdition,
  maxLevelByEdition,
  costs,
  statEffects,
  unlockText,
  shortUi
}) {
  return Object.freeze({
    id,
    name,
    description,
    requiredEdition,
    maxLevelByEdition,
    costs,
    statEffects,
    unlockText,
    shortUi
  });
}

export const UPGRADE_MODULES = Object.freeze([
  moduleDef({
    id: 'engine',
    name: 'Engine',
    description: 'Improves top speed and acceleration in normal offline career races.',
    requiredEdition: EA,
    maxLevelByEdition: { [EA]: 2, [FULL]: 5 },
    costs: [300, 550, 850, 1200, 1600],
    statEffects: { maxSpeedPercent: 0.015, accelerationPercent: 0.01 },
    unlockText: 'Early Access basic module',
    shortUi: '+1.5% speed / +1% accel per level'
  }),
  moduleDef({
    id: 'handling',
    name: 'Handling',
    description: 'Improves steering response and damping in normal offline career races.',
    requiredEdition: EA,
    maxLevelByEdition: { [EA]: 2, [FULL]: 5 },
    costs: [300, 550, 850, 1200, 1600],
    statEffects: { lateralAccelerationPercent: 0.02, lateralDampingPercent: 0.015 },
    unlockText: 'Early Access basic module',
    shortUi: '+2% steering / +1.5% damping per level'
  }),
  moduleDef({
    id: 'boostCore',
    name: 'Boost Core',
    description: 'Adds starting boost and boost capacity in normal offline career races.',
    requiredEdition: EA,
    maxLevelByEdition: { [EA]: 2, [FULL]: 5 },
    costs: [300, 550, 850, 1200, 1600],
    statEffects: { startBoostEnergyFlat: 4, maxBoostEnergyFlat: 3 },
    unlockText: 'Early Access basic module',
    shortUi: '+4 start boost / +3 capacity per level'
  }),
  moduleDef({
    id: 'driftStabilizer',
    name: 'Drift Stabilizer',
    description: 'Improves drift charge and release control offline.',
    requiredEdition: FULL,
    maxLevelByEdition: { [FULL]: 4 },
    costs: [400, 700, 1050, 1450],
    statEffects: { driftChargeMultiplier: 0.03, driftReleaseMultiplier: 0.02 },
    unlockText: 'Full Premium module',
    shortUi: '+3% charge / +2% release per level'
  }),
  moduleDef({
    id: 'shieldModule',
    name: 'Shield Module',
    description: 'Improves shield duration for offline power-up defense.',
    requiredEdition: FULL,
    maxLevelByEdition: { [FULL]: 4 },
    costs: [400, 700, 1050, 1450],
    statEffects: { shieldDurationMultiplier: 0.05 },
    unlockText: 'Full Premium module',
    shortUi: '+5% shield duration per level'
  }),
  moduleDef({
    id: 'coolingSystem',
    name: 'Cooling System',
    description: 'Reduces manual boost drain in normal offline career races.',
    requiredEdition: FULL,
    maxLevelByEdition: { [FULL]: 4 },
    costs: [400, 700, 1050, 1450],
    statEffects: { boostDrainReduction: 0.02 },
    unlockText: 'Full Premium module',
    shortUi: '-2% boost drain per level'
  }),
  moduleDef({
    id: 'experimentalAlienTech',
    name: 'Experimental Alien Tech',
    description: 'Small balanced all-round offline tuning branch for Full Premium.',
    requiredEdition: FULL,
    maxLevelByEdition: { [FULL]: 3 },
    costs: [900, 1500, 2300],
    statEffects: {
      maxSpeedPercent: 0.008,
      accelerationPercent: 0.008,
      lateralAccelerationPercent: 0.008,
      startBoostEnergyFlat: 2
    },
    unlockText: 'Full Premium experimental branch',
    shortUi: 'Small all-round offline boost'
  })
]);

export const UPGRADE_MODULE_LOOKUP = Object.freeze(
  Object.fromEntries(UPGRADE_MODULES.map((entry) => [entry.id, entry]))
);

export function getUpgradeModule(moduleId) {
  return UPGRADE_MODULE_LOOKUP[moduleId] ?? null;
}

export function getModuleCost(module, level) {
  const index = Math.max(0, Math.floor(Number(level ?? 0)));
  return module?.costs?.[index] ?? null;
}

export function getModuleMaxLevel(module, entitlements) {
  if (!module || !entitlements?.canAccessTier?.(module.requiredEdition)) {
    return 0;
  }

  if (entitlements.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM)) {
    return module.maxLevelByEdition[EDITION_IDS.STANDALONE_FULL_PREMIUM] ?? 0;
  }

  if (entitlements.canAccessTier(EDITION_IDS.STANDALONE_EARLY_ACCESS)) {
    return module.maxLevelByEdition[EDITION_IDS.STANDALONE_EARLY_ACCESS] ?? 0;
  }

  return 0;
}
