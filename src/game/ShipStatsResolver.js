import { SHIP_LOOKUP } from './gameContent.js';
import { MULTIPLAYER_BALANCE_STATS } from './multiplayerContent.js';
import { UPGRADE_MODULES, getModuleMaxLevel } from './shipUpgradeContent.js';

function copyStats(stats = {}) {
  return {
    maxSpeed: Number(stats.maxSpeed ?? 82),
    acceleration: Number(stats.acceleration ?? 46),
    friction: Number(stats.friction ?? 19),
    lateralAcceleration: Number(stats.lateralAcceleration ?? 35),
    lateralDamping: Number(stats.lateralDamping ?? 4.8),
    startBoostEnergy: Number(stats.startBoostEnergy ?? 36),
    maxBoostEnergy: Number(stats.maxBoostEnergy ?? 100),
    boostEnergyDrain: Number(stats.boostEnergyDrain ?? 28),
    driftChargeMultiplier: Number(stats.driftChargeMultiplier ?? 1),
    driftReleaseMultiplier: Number(stats.driftReleaseMultiplier ?? 1),
    shieldDurationMultiplier: Number(stats.shieldDurationMultiplier ?? 1)
  };
}

export function shouldUseNormalizedStats(context = {}) {
  return Boolean(
    context.multiplayer ||
    context.online ||
    context.competitive ||
    context.mode === 'multiplayer' ||
    context.mode === 'ranked-season'
  );
}

export function areOfflineUpgradesEnabled(context = {}, entitlements = null) {
  // Offline upgrades are deliberately kept out of Time Trial, ranked, multiplayer,
  // campaign, and tournament so comparisons and online play stay fair.
  return Boolean(
    (context.mode === 'career-race' || (context.mode === 'custom-race' && context.statMode === 'upgraded')) &&
    !shouldUseNormalizedStats(context) &&
    entitlements?.canUseOfflineShipUpgrades?.()
  );
}

export function applyOfflineUpgrades(baseStats, upgrades = {}, context = {}, entitlements = null) {
  if (!areOfflineUpgradesEnabled(context, entitlements)) {
    return copyStats(baseStats);
  }

  const resolved = copyStats(baseStats);

  for (const module of UPGRADE_MODULES) {
    if (!entitlements?.canAccessUpgradeModule?.(module)) {
      continue;
    }

    const maxLevel = getModuleMaxLevel(module, entitlements);
    const level = Math.max(0, Math.min(maxLevel, Math.floor(Number(upgrades[module.id] ?? 0))));

    if (level <= 0) {
      continue;
    }

    const effects = module.statEffects ?? {};
    resolved.maxSpeed *= 1 + (effects.maxSpeedPercent ?? 0) * level;
    resolved.acceleration *= 1 + (effects.accelerationPercent ?? 0) * level;
    resolved.lateralAcceleration *= 1 + (effects.lateralAccelerationPercent ?? 0) * level;
    resolved.lateralDamping *= 1 + (effects.lateralDampingPercent ?? 0) * level;
    resolved.startBoostEnergy += (effects.startBoostEnergyFlat ?? 0) * level;
    resolved.maxBoostEnergy += (effects.maxBoostEnergyFlat ?? 0) * level;
    resolved.driftChargeMultiplier *= 1 + (effects.driftChargeMultiplier ?? 0) * level;
    resolved.driftReleaseMultiplier *= 1 + (effects.driftReleaseMultiplier ?? 0) * level;
    resolved.shieldDurationMultiplier *= 1 + (effects.shieldDurationMultiplier ?? 0) * level;

    if (effects.boostDrainReduction) {
      resolved.boostEnergyDrain *= Math.max(0.72, 1 - effects.boostDrainReduction * level);
    }
  }

  resolved.startBoostEnergy = Math.min(resolved.maxBoostEnergy, resolved.startBoostEnergy);
  return resolved;
}

export function getEffectiveShipStats(shipId, context = {}, profile = {}, entitlements = null) {
  if (shouldUseNormalizedStats(context)) {
    return copyStats(MULTIPLAYER_BALANCE_STATS);
  }

  const ship = SHIP_LOOKUP[shipId] ?? Object.values(SHIP_LOOKUP)[0];
  const baseStats = copyStats(ship?.stats);
  const upgrades = profile.shipUpgrades?.[ship?.id] ?? {};

  return applyOfflineUpgrades(baseStats, upgrades, context, entitlements);
}

export function summarizeShipUpgrades(shipId, profile = {}, entitlements = null) {
  const upgrades = profile.shipUpgrades?.[shipId] ?? {};

  return UPGRADE_MODULES.map((module) => {
    const maxLevel = getModuleMaxLevel(module, entitlements);
    const level = Math.max(0, Math.min(maxLevel || 99, Math.floor(Number(upgrades[module.id] ?? 0))));

    return {
      module,
      level,
      maxLevel,
      locked: maxLevel <= 0,
      capped: maxLevel > 0 && level >= maxLevel
    };
  });
}
