import { EDITION_IDS } from './editionConfig.js';
import { SHIP_LOOKUP, TRACK_LOOKUP } from './gameContent.js';
import { ADVANCED_COSMETIC_LOOKUP } from './advancedGarageContent.js';

export const CONTENT_PACK_IDS = Object.freeze({
  ECLIPSE_VANGUARD: 'eclipse-vanguard',
  SOLAR_MONARCH: 'solar-monarch',
  OBSIDIAN_HALO: 'obsidian-halo'
});

export const PREMIUM_CONTENT_PACKS = Object.freeze([
  {
    id: CONTENT_PACK_IDS.ECLIPSE_VANGUARD,
    title: 'Eclipse Vanguard Pack',
    requiredEdition: EDITION_IDS.STANDALONE_EARLY_ACCESS,
    summary: 'Knife-frame premium ships, a downhill Crimson Nebula slalom, and the Eclipse cosmetic set.',
    ships: ['eclipse-viper', 'riftblade'],
    tracks: ['crimson-nebula-descent'],
    cosmetics: ['eclipse-carbon', 'void-flame', 'rift-mark']
  },
  {
    id: CONTENT_PACK_IDS.SOLAR_MONARCH,
    title: 'Solar Monarch Pack',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    summary: 'Regal halo ships, a wide glass-cathedral raceway with chained boosts, and Solar Monarch cosmetics.',
    ships: ['astral-monarch', 'solar-phantom'],
    tracks: ['celestial-glassway'],
    cosmetics: ['solar-ivory', 'golden-burst', 'champion-crest']
  },
  {
    id: CONTENT_PACK_IDS.OBSIDIAN_HALO,
    title: 'Obsidian Halo Pack',
    requiredEdition: EDITION_IDS.STANDALONE_FULL_PREMIUM,
    summary: 'A gravity-halo ship, a narrow palace precision course, a hypernova overdrive track, and cosmic cosmetics.',
    ships: ['obsidian-halo'],
    tracks: ['void-palace-circuit', 'hypernova-spine'],
    cosmetics: ['nebula-chrome', 'singularity-flow', 'comet-split']
  }
]);

export const PREMIUM_CONTENT_PACK_LOOKUP = Object.freeze(
  Object.fromEntries(PREMIUM_CONTENT_PACKS.map((pack) => [pack.id, pack]))
);

export function getContentPackForItem(item = {}) {
  return PREMIUM_CONTENT_PACK_LOOKUP[item?.contentPackId] ?? null;
}

export function decorateContentPack(pack, entitlements) {
  const accessible = entitlements.canAccessTier(pack.requiredEdition);
  const ships = pack.ships.map((shipId) => SHIP_LOOKUP[shipId]).filter(Boolean);
  const tracks = pack.tracks.map((trackId) => TRACK_LOOKUP[trackId]).filter(Boolean);
  const cosmetics = pack.cosmetics.map((cosmeticId) => ADVANCED_COSMETIC_LOOKUP[cosmeticId]).filter(Boolean);

  return {
    ...pack,
    accessible,
    requiredEditionBadge: entitlements.getEditionBadge(pack.requiredEdition),
    statusLabel: accessible ? 'Unlocked' : 'Locked',
    ships,
    tracks: tracks.map((track) => ({
      ...track,
      playable: track.playable !== false
    })),
    cosmetics
  };
}
