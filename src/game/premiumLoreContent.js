import { SHIP_DEFS, TRACK_DEFS } from './gameContent.js';
import { CAMPAIGN_CUPS, CAMPAIGN_RIVALS } from './premiumCampaignContent.js';

export const WORLD_LORE = Object.freeze({
  title: 'The Broken Colony Circuit',
  kicker: 'Premium Intel',
  summary: 'Illegal anti-gravity races run through shattered colonies, mining rings, and collapsing gravity wells. Pilots chase fame, prototype tech, and a final title near the Singularity.',
  notes: [
    'Race crews operate outside sanctioned orbital leagues.',
    'Manufacturers use the circuit as a public stress test for dangerous frame tech.',
    'The Final Rival Championship decides who controls the next generation of ship cores.'
  ]
});

export const MANUFACTURER_LORE = Object.freeze({
  aetherline: {
    title: 'Aetherline Works',
    philosophy: 'Balanced frames built for pilots who win by staying clean under pressure.',
    designStyle: 'Smooth canopy lines, stable aero fins, and bright telemetry cores.',
    statIdentity: 'Balanced speed, boost, and forgiving lateral control.',
    famousPilot: 'Nyra Sol trained on an Aetherline prototype before joining the Neon Circuit.'
  },
  veil: {
    title: 'Veil Dynamics',
    philosophy: 'Corner-first engineering for pilots who trust rotation more than armor.',
    designStyle: 'Needle noses, narrow wings, and precision drift vanes.',
    statIdentity: 'High handling, quick direction changes, and technical shortcut control.',
    famousPilot: 'Mira Flux is rumored to tune Veil frames for illegal shortcut entries.'
  },
  forgeframe: {
    title: 'Forgeframe Heavy',
    philosophy: 'Industrial pressure craft designed to bully straights and survive contact.',
    designStyle: 'Heavy hulls, exposed booster ribs, and reinforced engine pods.',
    statIdentity: 'Strong acceleration and boost capacity with heavier corner behavior.',
    famousPilot: 'Kael Vector uses Forgeframe tactics even when he is not flying one.'
  },
  nyx: {
    title: 'Nyx Phantom Lab',
    philosophy: 'Prototype stealth handling for pilots who win with silence and exact timing.',
    designStyle: 'Dark shells, hidden fins, and low-signature glow channels.',
    statIdentity: 'Technical drift control and precise mid-speed correction.',
    famousPilot: 'Zane Eclipse keeps a Nyx shell locked in his private final-race bay.'
  },
  solari: {
    title: 'Solari Apex',
    philosophy: 'Heat-bright premium craft made for heroic boost windows.',
    designStyle: 'White-gold armor, solar intakes, and wide exhaust bloom.',
    statIdentity: 'High boost expression with aggressive heat-risk handling.',
    famousPilot: 'Orion Vex keeps asking Solari to remove the safety limiter.'
  },
  quantum: {
    title: 'Quantum Division',
    philosophy: 'Experimental alien-adjacent engineering with fragile but explosive gains.',
    designStyle: 'Split hull geometry, impossible light bands, and unstable core housings.',
    statIdentity: 'Specialized high-end performance with strict pilot discipline.',
    famousPilot: 'The Final Rival Championship bans unregistered Quantum cores.'
  }
});

export const TRACK_LORE = Object.freeze({
  'night-circuit': {
    location: 'Megacity Orbit, low colony belt',
    dangerProfile: 'Wide straights, neon glare, and late hazard gates.',
    racingIdentity: 'Fast open pressure where boost timing matters more than bravery.',
    signature: 'Solar Cut rewards pilots who can stay calm at high entry speed.',
    recommendedPilotStyle: 'Balanced or boost-heavy pilots.'
  },
  'rift-run': {
    location: 'Asteroid refinery corridor',
    dangerProfile: 'Compression corners, debris-lighting, and narrow shortcut chutes.',
    racingIdentity: 'Technical drift rhythm with punishing over-rotation.',
    signature: 'Rift Apex turns one perfect entry into a race-winning sector.',
    recommendedPilotStyle: 'Clean technical racers.'
  },
  'singularity-loop': {
    location: 'Outer gravity research ring',
    dangerProfile: 'Unstable pull zones and hazard-heavy late sectors.',
    racingIdentity: 'Chaos control for pilots who can recover from bad lines.',
    signature: 'Gravity-side shortcuts punish greedy boost releases.',
    recommendedPilotStyle: 'Risk takers with strong correction discipline.'
  },
  'solar-storm-corridor': {
    location: 'Solar weather shield lane',
    dangerProfile: 'Flare timing, heat blooms, and violent visibility shifts.',
    racingIdentity: 'Survival pace with short, sharp attack windows.',
    signature: 'Storm-lane exits reward pilots who save boost for the final burn.',
    recommendedPilotStyle: 'Patient pilots who can win under pressure.'
  },
  'eclipse-promenade': {
    location: 'Abandoned orbital promenade',
    dangerProfile: 'Luxury-ring debris, blind turns, and low-light apexes.',
    racingIdentity: 'Elegant high-speed control across old colony architecture.',
    signature: 'The promenade cut is fast only if the ship stays settled.',
    recommendedPilotStyle: 'Precision pilots with smooth steering.'
  },
  'shattered-ringway': {
    location: 'Broken ringworld service spine',
    dangerProfile: 'Open void edges, sudden geometry changes, and late hazard stacks.',
    racingIdentity: 'Commitment racing with minimal room for second guesses.',
    signature: 'Ringway split lanes reward early decisions.',
    recommendedPilotStyle: 'Aggressive but disciplined overtakers.'
  }
});

export const CHAMPIONSHIP_LORE = Object.freeze({
  'rookie-league': {
    hook: 'The proving league for pilots brave enough to leave GameHub safety.',
    stakes: 'A clean finish earns a name in the hangar registry.',
    rivalAngle: 'Kael Vector tests whether the new pilot can survive traffic.'
  },
  'neon-circuit-cup': {
    hook: 'The first premium cup watched by colony sponsors and illegal crews.',
    stakes: 'Win here and manufacturers start paying attention.',
    rivalAngle: 'Nyra Sol measures discipline while Orion Vex tempts risky boosts.'
  },
  'asteroid-belt-championship': {
    hook: 'A refinery run where debris and shortcuts decide reputations.',
    stakes: 'The belt champion receives priority access to prototype frame parts.',
    rivalAngle: 'Mira Flux turns every shortcut into a challenge.'
  },
  'solar-storm-trials': {
    hook: 'A heat-soaked trial through the solar corridor during unstable weather.',
    stakes: 'Only pilots with patience and nerve survive the late-sector flares.',
    rivalAngle: 'Orion Vex tries to win the storm with boost alone.'
  },
  'singularity-grand-prix': {
    hook: 'The last sanctioned warning before the final forbidden championship.',
    stakes: 'Gravity tech buyers watch every lap.',
    rivalAngle: 'Every rival starts driving like the title is already on the line.'
  },
  'final-rival-championship': {
    hook: 'The premium finale near a collapsing singularity.',
    stakes: 'Beat Zane Eclipse and the pilot becomes the circuit champion.',
    rivalAngle: 'Zane does not race for fame. He races to prove the circuit belongs to him.'
  }
});

export function getManufacturerLore(manufacturerId) {
  return MANUFACTURER_LORE[manufacturerId] ?? {
    title: 'Independent Yard',
    philosophy: 'A private race shop with a reputation built in the hangar.',
    designStyle: 'Mixed prototype hardware and practical race repairs.',
    statIdentity: 'Specialized around the pilot rather than the brochure.',
    famousPilot: 'No official team record.'
  };
}

export function getShipLore(shipId) {
  const ship = SHIP_DEFS.find((entry) => entry.id === shipId) ?? SHIP_DEFS[0];
  const manufacturer = getManufacturerLore(ship.manufacturerId);

  return {
    shipId: ship.id,
    title: ship.name,
    summary: ship.tagline,
    manufacturer,
    rarity: ship.rarity,
    identity: `${manufacturer.statIdentity} ${ship.name} is treated as a ${ship.rarity} circuit frame.`
  };
}

export function getTrackLore(trackId) {
  const track = TRACK_DEFS.find((entry) => entry.id === trackId) ?? TRACK_DEFS[0];
  const lore = TRACK_LORE[track.id] ?? {
    location: track.themeName ?? 'Unknown colony route',
    dangerProfile: track.description,
    racingIdentity: track.identity ?? 'Race route',
    signature: track.shortcutZones?.[0]?.label ?? 'Standard racing line',
    recommendedPilotStyle: 'Adaptable pilots.'
  };

  return {
    trackId: track.id,
    title: track.name,
    ...lore
  };
}

export function getCupLore(cupId) {
  const cup = CAMPAIGN_CUPS.find((entry) => entry.id === cupId) ?? CAMPAIGN_CUPS[0];
  const lore = CHAMPIONSHIP_LORE[cup.id] ?? {
    hook: cup.description,
    stakes: cup.rewardPreview,
    rivalAngle: 'Rivals will test every weak habit.'
  };

  return {
    cupId: cup.id,
    title: cup.title,
    ...lore
  };
}

export function getRivalLore(rivalId) {
  const rival = CAMPAIGN_RIVALS[rivalId] ?? Object.values(CAMPAIGN_RIVALS)[0];

  return {
    rivalId,
    name: rival.name,
    callSign: rival.callSign,
    bio: rival.bio,
    racingStyle: rival.personality,
    faction: rival.faction ?? 'Independent circuit crew',
    quote: rival.preRaceLine,
    signatureTrack: rival.preferredTrackId ? getTrackLore(rival.preferredTrackId).title : 'Any track with pressure',
    signatureShip: rival.preferredShipId ? getShipLore(rival.preferredShipId).title : 'Private prototype'
  };
}
