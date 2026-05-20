import { sanitizeCustomRaceConfig } from './customRaceLabContent.js';
import { SHIP_LOOKUP, TRACK_LOOKUP } from './gameContent.js';

const PRESET_CODE_PREFIX = 'SRLAB1';
const MAX_CODE_LENGTH = 1800;

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalized = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createPresetPayload(config) {
  return {
    v: 1,
    name: config.name,
    trackId: config.trackId,
    selectedShipId: config.selectedShipId,
    lapCount: config.lapCount,
    aiCount: config.aiCount,
    aiDifficulty: config.aiDifficulty,
    hazardsEnabled: config.hazardsEnabled,
    pickupsEnabled: config.pickupsEnabled,
    boostPadDensity: config.boostPadDensity,
    shortcutDifficulty: config.shortcutDifficulty,
    powerupsEnabled: config.powerupsEnabled,
    visualEffect: config.visualEffect,
    statMode: config.statMode
  };
}

export function exportCustomRacePresetCode(config, entitlements = null, profile = {}) {
  const sanitized = sanitizeCustomRaceConfig(config, entitlements, profile);
  const payload = createPresetPayload(sanitized);
  return `${PRESET_CODE_PREFIX}.${encodeBase64Url(JSON.stringify(payload))}`;
}

export function parseCustomRacePresetCode(code, entitlements = null, profile = {}) {
  const trimmed = String(code ?? '').trim();

  if (!trimmed) {
    return { ok: false, reason: 'Paste a Race Lab preset code first.' };
  }

  if (trimmed.length > MAX_CODE_LENGTH) {
    return { ok: false, reason: 'Preset code is too long.' };
  }

  const [prefix, encoded, extra] = trimmed.split('.');

  if (prefix !== PRESET_CODE_PREFIX || !encoded || extra != null) {
    return { ok: false, reason: 'Unsupported Race Lab preset code format.' };
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encoded));

    if (!payload || payload.v !== 1 || typeof payload !== 'object') {
      return { ok: false, reason: 'Unsupported Race Lab preset version.' };
    }

    if (payload.trackId && !TRACK_LOOKUP[payload.trackId]) {
      return { ok: false, reason: 'Preset references an unknown track.' };
    }

    if (payload.selectedShipId && !SHIP_LOOKUP[payload.selectedShipId]) {
      return { ok: false, reason: 'Preset references an unknown ship.' };
    }

    const config = sanitizeCustomRaceConfig(payload, entitlements, profile);
    return {
      ok: true,
      config,
      payload: createPresetPayload(config),
      warnings: []
    };
  } catch {
    return { ok: false, reason: 'Preset code could not be decoded safely.' };
  }
}

export function summarizeCustomRacePresetCode(config) {
  const track = TRACK_LOOKUP[config?.trackId];
  const ship = SHIP_LOOKUP[config?.selectedShipId];

  return {
    title: config?.name ?? 'Imported Race Lab Preset',
    trackName: track?.name ?? 'Unknown track',
    shipName: ship?.name ?? 'Unknown ship',
    rules: `${config?.lapCount ?? 3} laps | ${config?.aiCount ?? 5} AI | ${config?.aiDifficulty ?? 'standard'}`,
    modifiers: [
      config?.hazardsEnabled ? 'Hazards' : 'No hazards',
      config?.pickupsEnabled ? 'Pickups' : 'No pickups',
      `Boost pads: ${config?.boostPadDensity ?? 'normal'}`,
      `Shortcuts: ${config?.shortcutDifficulty ?? 'normal'}`,
      `Stats: ${config?.statMode ?? 'base'}`
    ].join(' | ')
  };
}

