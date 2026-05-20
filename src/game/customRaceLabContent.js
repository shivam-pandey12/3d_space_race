import { SHIP_LOOKUP, TRACK_DEFS, TRACK_LOOKUP } from './gameContent.js';

export const CUSTOM_RACE_PRESET_LIMITS = Object.freeze({
  early: 3,
  full: 12
});

export const DEFAULT_CUSTOM_RACE_CONFIG = Object.freeze({
  id: 'custom-race-active',
  name: 'Custom Sprint',
  trackId: 'night-circuit',
  lapCount: 3,
  aiCount: 5,
  aiDifficulty: 'standard',
  hazardsEnabled: true,
  pickupsEnabled: true,
  boostPadDensity: 'normal',
  shortcutDifficulty: 'normal',
  powerupsEnabled: true,
  visualEffect: 'default',
  statMode: 'base',
  selectedShipId: 'starling'
});

export const CUSTOM_RACE_DIFFICULTIES = Object.freeze(['casual', 'standard', 'elite']);
export const CUSTOM_RACE_DENSITIES = Object.freeze(['sparse', 'normal', 'dense']);
export const CUSTOM_RACE_SHORTCUTS = Object.freeze(['safe', 'normal', 'risky']);
export const CUSTOM_RACE_VISUAL_EFFECTS = Object.freeze(['default', 'storm', 'aurora', 'void']);
export const CUSTOM_RACE_STAT_MODES = Object.freeze(['base', 'upgraded']);

const CUSTOM_VISUAL_THEME_IDS = Object.freeze({
  storm: 'solar-storm-corridor',
  aurora: 'shattered-ringworld',
  void: 'megacity-orbit'
});

function clampInteger(value, min, max, fallback) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

function pickAllowed(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function getCustomRaceLimits(entitlements) {
  const full = Boolean(entitlements?.canUseFullCustomRaceLab?.());

  return {
    full,
    maxPresets: full ? CUSTOM_RACE_PRESET_LIMITS.full : CUSTOM_RACE_PRESET_LIMITS.early,
    maxLaps: full ? 8 : 5,
    maxAiCount: full ? 7 : 5,
    allowAdvancedModifiers: full
  };
}

export function sanitizeCustomRaceConfig(rawConfig = {}, entitlements = null, profile = {}) {
  const limits = getCustomRaceLimits(entitlements);
  const base = {
    ...DEFAULT_CUSTOM_RACE_CONFIG,
    selectedShipId: profile.selectedShipId ?? DEFAULT_CUSTOM_RACE_CONFIG.selectedShipId,
    ...rawConfig
  };
  const trackId = TRACK_LOOKUP[base.trackId] ? base.trackId : DEFAULT_CUSTOM_RACE_CONFIG.trackId;
  const selectedShipId = SHIP_LOOKUP[base.selectedShipId] ? base.selectedShipId : (profile.selectedShipId ?? DEFAULT_CUSTOM_RACE_CONFIG.selectedShipId);

  return {
    id: String(base.id ?? `custom-${Date.now().toString(36)}`).slice(0, 48),
    name: String(base.name ?? DEFAULT_CUSTOM_RACE_CONFIG.name).replace(/\s+/g, ' ').trim().slice(0, 28) || DEFAULT_CUSTOM_RACE_CONFIG.name,
    trackId,
    selectedShipId: SHIP_LOOKUP[selectedShipId] ? selectedShipId : DEFAULT_CUSTOM_RACE_CONFIG.selectedShipId,
    lapCount: clampInteger(base.lapCount, 1, limits.maxLaps, DEFAULT_CUSTOM_RACE_CONFIG.lapCount),
    aiCount: clampInteger(base.aiCount, 1, limits.maxAiCount, DEFAULT_CUSTOM_RACE_CONFIG.aiCount),
    aiDifficulty: pickAllowed(base.aiDifficulty, CUSTOM_RACE_DIFFICULTIES, DEFAULT_CUSTOM_RACE_CONFIG.aiDifficulty),
    hazardsEnabled: base.hazardsEnabled !== false,
    pickupsEnabled: base.pickupsEnabled !== false,
    boostPadDensity: limits.allowAdvancedModifiers
      ? pickAllowed(base.boostPadDensity, CUSTOM_RACE_DENSITIES, DEFAULT_CUSTOM_RACE_CONFIG.boostPadDensity)
      : DEFAULT_CUSTOM_RACE_CONFIG.boostPadDensity,
    shortcutDifficulty: limits.allowAdvancedModifiers
      ? pickAllowed(base.shortcutDifficulty, CUSTOM_RACE_SHORTCUTS, DEFAULT_CUSTOM_RACE_CONFIG.shortcutDifficulty)
      : DEFAULT_CUSTOM_RACE_CONFIG.shortcutDifficulty,
    powerupsEnabled: limits.allowAdvancedModifiers ? base.powerupsEnabled !== false : true,
    visualEffect: limits.allowAdvancedModifiers
      ? pickAllowed(base.visualEffect, CUSTOM_RACE_VISUAL_EFFECTS, DEFAULT_CUSTOM_RACE_CONFIG.visualEffect)
      : DEFAULT_CUSTOM_RACE_CONFIG.visualEffect,
    statMode: limits.allowAdvancedModifiers
      ? pickAllowed(base.statMode, CUSTOM_RACE_STAT_MODES, DEFAULT_CUSTOM_RACE_CONFIG.statMode)
      : DEFAULT_CUSTOM_RACE_CONFIG.statMode
  };
}

export function createCustomRacePreset(config) {
  return {
    ...config,
    id: `preset-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    savedAt: Date.now()
  };
}

export function randomizeCustomRaceConfig(entitlements = null, profile = {}) {
  const limits = getCustomRaceLimits(entitlements);
  const tracks = TRACK_DEFS.filter((track) => profile.unlockedTracks?.includes(track.id)) ?? TRACK_DEFS;
  const ships = Object.keys(SHIP_LOOKUP).filter((shipId) => profile.unlockedShips?.includes(shipId));
  const track = tracks[Math.floor(Math.random() * Math.max(1, tracks.length))] ?? TRACK_DEFS[0];
  const shipId = ships[Math.floor(Math.random() * Math.max(1, ships.length))] ?? profile.selectedShipId ?? 'starling';

  return sanitizeCustomRaceConfig({
    id: 'custom-race-active',
    name: `${track.name.slice(0, 16)} Lab`,
    trackId: track.id,
    selectedShipId: shipId,
    lapCount: 1 + Math.floor(Math.random() * limits.maxLaps),
    aiCount: 1 + Math.floor(Math.random() * limits.maxAiCount),
    aiDifficulty: CUSTOM_RACE_DIFFICULTIES[Math.floor(Math.random() * CUSTOM_RACE_DIFFICULTIES.length)],
    hazardsEnabled: Math.random() > 0.25,
    pickupsEnabled: Math.random() > 0.15,
    boostPadDensity: CUSTOM_RACE_DENSITIES[Math.floor(Math.random() * CUSTOM_RACE_DENSITIES.length)],
    shortcutDifficulty: CUSTOM_RACE_SHORTCUTS[Math.floor(Math.random() * CUSTOM_RACE_SHORTCUTS.length)],
    powerupsEnabled: Math.random() > 0.15,
    visualEffect: CUSTOM_RACE_VISUAL_EFFECTS[Math.floor(Math.random() * CUSTOM_RACE_VISUAL_EFFECTS.length)],
    statMode: Math.random() > 0.55 ? 'upgraded' : 'base'
  }, entitlements, profile);
}

export function buildCustomTrackDefinition(baseTrack, config) {
  const track = JSON.parse(JSON.stringify(baseTrack ?? TRACK_DEFS[0]));
  track.laps = config.lapCount;

  if (!config.hazardsEnabled) {
    track.hazardZones = [];
    track.slowZones = [];
  }

  if (!config.pickupsEnabled) {
    track.pickupSpawns = [];
  }

  if (config.boostPadDensity === 'sparse') {
    track.boostPads = track.boostPads.filter((_, index) => index % 2 === 0);
  } else if (config.boostPadDensity === 'dense') {
    track.boostPads = [
      ...track.boostPads,
      ...track.boostPads.slice(0, 3).map((pad, index) => ({
        ...pad,
        progress: (pad.progress + 0.045 + index * 0.018) % 1
      }))
    ];
  }

  if (config.shortcutDifficulty !== 'normal') {
    const safeMode = config.shortcutDifficulty === 'safe';
    track.shortcutZones = (track.shortcutZones ?? []).map((shortcut) => ({
      ...shortcut,
      risk: Math.max(0.4, (shortcut.risk ?? 1) * (safeMode ? 0.72 : 1.28)),
      recommendedSpeed: Math.max(50, (shortcut.recommendedSpeed ?? 82) * (safeMode ? 0.94 : 1.08))
    }));
  }

  if (config.visualEffect !== 'default') {
    track.themeId = CUSTOM_VISUAL_THEME_IDS[config.visualEffect] ?? track.themeId;
    track.themeName = `${track.themeName ?? track.name} / ${config.visualEffect.toUpperCase()}`;
  }

  return track;
}
