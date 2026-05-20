import { EDITION_IDS } from './editionConfig.js';
import { CAMPAIGN_CUPS } from './premiumCampaignContent.js';
import { TOURNAMENT_TYPES } from './premiumTournamentContent.js';

const EARLY = EDITION_IDS.STANDALONE_EARLY_ACCESS;
const FULL = EDITION_IDS.STANDALONE_FULL_PREMIUM;

function reward(definition) {
  return Object.freeze({
    rewardId: definition.rewardId,
    title: definition.title,
    description: definition.description,
    type: definition.type,
    unlockSource: definition.unlockSource,
    requiredEdition: definition.requiredEdition ?? EARLY,
    linkedCosmeticId: definition.linkedCosmeticId ?? '',
    iconLabel: definition.iconLabel ?? 'RWD'
  });
}

const campaignRewards = CAMPAIGN_CUPS.map((cup) => reward({
  rewardId: `campaign-${cup.id}`,
  title: `${cup.title} Trophy`,
  description: `Complete ${cup.title} in Premium Campaign.`,
  type: 'trophy',
  unlockSource: 'Premium Campaign',
  requiredEdition: cup.requiredEdition,
  iconLabel: 'CUP'
}));

export const PREMIUM_REWARD_DEFINITIONS = Object.freeze([
  ...campaignRewards,
  reward({
    rewardId: 'campaign-rookie-founder-stripe',
    title: 'Founder Stripe',
    description: 'Complete Rookie League to unlock a founder decal.',
    type: 'cosmetic',
    unlockSource: 'Rookie League completion',
    requiredEdition: EARLY,
    linkedCosmeticId: 'founder-stripe',
    iconLabel: 'DEC'
  }),
  reward({
    rewardId: 'campaign-neon-founder-plate',
    title: 'Founder Plate',
    description: 'Complete Neon Circuit Cup to unlock a premium number plate.',
    type: 'cosmetic',
    unlockSource: 'Neon Circuit Cup completion',
    requiredEdition: EARLY,
    linkedCosmeticId: 'founder-number-plate',
    iconLabel: 'PLT'
  }),
  reward({
    rewardId: 'campaign-final-champion-crest',
    title: 'Champion Crest',
    description: 'Clear the Final Rival Championship.',
    type: 'cosmetic',
    unlockSource: 'Final Rival Championship',
    requiredEdition: FULL,
    linkedCosmeticId: 'champion-crest',
    iconLabel: 'DEC'
  }),
  reward({
    rewardId: 'tournament-ai-knockout-4',
    title: '4-Player Tournament Trophy',
    description: 'Win the 4-player AI tournament.',
    type: 'trophy',
    unlockSource: 'Tournament Mode',
    requiredEdition: EARLY,
    iconLabel: 'TRN'
  }),
  reward({
    rewardId: 'tournament-finalist-badge',
    title: 'Tournament Finalist Badge',
    description: 'Reach a tournament final.',
    type: 'cosmetic',
    unlockSource: 'Tournament finalist',
    requiredEdition: EARLY,
    linkedCosmeticId: 'tournament-finalist',
    iconLabel: 'BDG'
  }),
  reward({
    rewardId: 'tournament-ai-knockout-8',
    title: '8-Player Tournament Trophy',
    description: 'Win the 8-player AI tournament.',
    type: 'trophy',
    unlockSource: 'Tournament Mode',
    requiredEdition: FULL,
    iconLabel: 'TRN'
  }),
  reward({
    rewardId: 'tournament-champion-plate',
    title: 'Champion Plate',
    description: 'Win a Full Premium tournament.',
    type: 'cosmetic',
    unlockSource: '8-player tournament champion',
    requiredEdition: FULL,
    linkedCosmeticId: 'champion-number-plate',
    iconLabel: 'PLT'
  }),
  reward({
    rewardId: 'custom-race-first-launch',
    title: 'Race Lab Pilot',
    description: 'Finish your first Custom Race Lab event.',
    type: 'badge',
    unlockSource: 'Custom Race Lab',
    requiredEdition: EARLY,
    iconLabel: 'LAB'
  }),
  reward({
    rewardId: 'custom-race-preset-maker',
    title: 'Preset Maker',
    description: 'Save a Custom Race Lab preset.',
    type: 'title',
    unlockSource: 'Custom Race Lab preset',
    requiredEdition: EARLY,
    iconLabel: 'SET'
  }),
  reward({
    rewardId: 'ranked-tier-bronze',
    title: 'Bronze Season Badge',
    description: 'Reach or hold Bronze in a ranked season.',
    type: 'badge',
    unlockSource: 'Ranked Seasons',
    requiredEdition: EARLY,
    iconLabel: 'BRZ'
  }),
  reward({
    rewardId: 'ranked-tier-silver',
    title: 'Silver Season Title',
    description: 'Reach Silver in a ranked season.',
    type: 'title',
    unlockSource: 'Ranked Seasons',
    requiredEdition: EARLY,
    iconLabel: 'SLV'
  }),
  reward({
    rewardId: 'ranked-tier-gold',
    title: 'Gold Season Badge',
    description: 'Reach Gold in a ranked season.',
    type: 'badge',
    unlockSource: 'Ranked Seasons',
    requiredEdition: FULL,
    iconLabel: 'GLD'
  }),
  reward({
    rewardId: 'ranked-tier-elite',
    title: 'Elite Season Trophy',
    description: 'Reach Elite in a ranked season.',
    type: 'trophy',
    unlockSource: 'Ranked Seasons',
    requiredEdition: FULL,
    iconLabel: 'ELT'
  }),
  reward({
    rewardId: 'ranked-tier-legend',
    title: 'Legend Season Trophy',
    description: 'Reach Legend in a ranked season.',
    type: 'trophy',
    unlockSource: 'Ranked Seasons',
    requiredEdition: FULL,
    iconLabel: 'LGD'
  }),
  reward({
    rewardId: 'ranked-first-podium',
    title: 'Ranked Podium Badge',
    description: 'Finish on the podium in Ranked Seasons.',
    type: 'badge',
    unlockSource: 'Ranked Seasons',
    requiredEdition: EARLY,
    iconLabel: 'POD'
  }),
  reward({
    rewardId: 'ranked-first-win',
    title: 'Ranked Winner Title',
    description: 'Win a ranked season race.',
    type: 'title',
    unlockSource: 'Ranked Seasons',
    requiredEdition: EARLY,
    iconLabel: 'WIN'
  }),
  reward({
    rewardId: 'event-daily-challenge',
    title: 'Daily Event Badge',
    description: 'Complete a daily live event challenge.',
    type: 'badge',
    unlockSource: 'Live Events',
    requiredEdition: EARLY,
    iconLabel: 'DAY'
  }),
  reward({
    rewardId: 'event-weekly-champion',
    title: 'Weekly Event Trophy',
    description: 'Complete a Full Premium weekly event.',
    type: 'trophy',
    unlockSource: 'Live Events',
    requiredEdition: FULL,
    iconLabel: 'WEK'
  }),
  reward({
    rewardId: 'event-weekend-preview',
    title: 'Weekend Championship Badge',
    description: 'Complete a weekend championship preview event.',
    type: 'badge',
    unlockSource: 'Live Events',
    requiredEdition: FULL,
    iconLabel: 'WKD'
  }),
  reward({
    rewardId: 'event-limited-reward',
    title: 'Limited-Time Pilot Title',
    description: 'Complete the limited-time reward preview event.',
    type: 'title',
    unlockSource: 'Live Events',
    requiredEdition: FULL,
    iconLabel: 'LTD'
  }),
  reward({
    rewardId: 'boss-solar-flare-escape',
    title: 'Solar Flare Trophy',
    description: 'Clear the Solar Flare Escape boss event.',
    type: 'trophy',
    unlockSource: 'Boss Race Events',
    requiredEdition: EARLY,
    iconLabel: 'SOL'
  }),
  reward({
    rewardId: 'boss-asteroid-collapse-run',
    title: 'Asteroid Collapse Trophy',
    description: 'Clear the Asteroid Collapse Run boss event.',
    type: 'trophy',
    unlockSource: 'Boss Race Events',
    requiredEdition: FULL,
    iconLabel: 'AST'
  }),
  reward({
    rewardId: 'boss-black-hole-gravity-duel',
    title: 'Gravity Duel Trophy',
    description: 'Clear the Black Hole Gravity Duel boss event.',
    type: 'trophy',
    unlockSource: 'Boss Race Events',
    requiredEdition: FULL,
    iconLabel: 'GRV'
  }),
  reward({
    rewardId: 'boss-alien-warship-chase',
    title: 'Warship Chase Badge',
    description: 'Clear the Alien Warship Chase boss event.',
    type: 'badge',
    unlockSource: 'Boss Race Events',
    requiredEdition: FULL,
    iconLabel: 'WRP'
  }),
  reward({
    rewardId: 'boss-final-rival-duel',
    title: 'Final Duel Title',
    description: 'Defeat the final rival boss event.',
    type: 'title',
    unlockSource: 'Boss Race Events',
    requiredEdition: FULL,
    iconLabel: 'FNL'
  })
]);

export const PREMIUM_REWARD_LOOKUP = Object.freeze(
  Object.fromEntries(PREMIUM_REWARD_DEFINITIONS.map((entry) => [entry.rewardId, entry]))
);

export function getPremiumReward(rewardId) {
  return PREMIUM_REWARD_LOOKUP[rewardId] ?? null;
}

export function getRewardIdsForCampaignCup(cupId) {
  const ids = [`campaign-${cupId}`];

  if (cupId === 'rookie-league') {
    ids.push('campaign-rookie-founder-stripe');
  }

  if (cupId === 'neon-circuit-cup') {
    ids.push('campaign-neon-founder-plate');
  }

  if (cupId === 'final-rival-championship') {
    ids.push('campaign-final-champion-crest');
  }

  return ids;
}

export function getRewardIdsForTournament(typeId, result = {}) {
  const type = TOURNAMENT_TYPES.find((entry) => entry.id === typeId);
  const ids = [];

  if (result.reachedFinal) {
    ids.push('tournament-finalist-badge');
  }

  if (result.champion && type?.id === 'ai-knockout-4') {
    ids.push('tournament-ai-knockout-4');
  }

  if (result.champion && type?.id === 'ai-knockout-8') {
    ids.push('tournament-ai-knockout-8', 'tournament-champion-plate');
  }

  return ids;
}

export function getRewardIdsForCustomRace({ firstRace = false, presetSaved = false } = {}) {
  return [
    firstRace ? 'custom-race-first-launch' : '',
    presetSaved ? 'custom-race-preset-maker' : ''
  ].filter(Boolean);
}
