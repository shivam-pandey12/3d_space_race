const AI_NAME_POOL = [
  'Astra Voss',
  'Rex Nova',
  'Kira Volt',
  'Jett Orion',
  'Luna Drift',
  'Vex Halo',
  'Zara Pulse',
  'Milo Rift',
  'Nyx Comet',
  'Kael Blaze',
  'Tara Flux',
  'Soren Jet',
  'Iris Quake',
  'Dax Vector',
  'Lyra Storm',
  'Nico Flash',
  'Aria Vortex',
  'Zane Turbo',
  'Mira Echo',
  'Axel Ion'
];

function shuffle(values) {
  const items = [...values];

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function randomOf(list, seed) {
  return list[Math.floor(seed * list.length) % list.length];
}

function getShipLabel(ship, fallback = 'Pilot') {
  return ship?.label ?? ship?.config?.label ?? fallback;
}

function getStandingsLabel(entry, fallback = 'Pilot') {
  return entry?.name ?? entry?.playerName ?? getShipLabel(entry, fallback);
}

function formatOrdinal(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${value}st`;
  }

  if (mod10 === 2 && mod100 !== 12) {
    return `${value}nd`;
  }

  if (mod10 === 3 && mod100 !== 13) {
    return `${value}rd`;
  }

  return `${value}th`;
}

export function createAiNames(count, blockedNames = []) {
  const blocked = new Set(blockedNames.map((name) => name.toLowerCase()));
  const options = shuffle(AI_NAME_POOL).filter((name) => !blocked.has(name.toLowerCase()));
  const names = [];

  for (let index = 0; index < count; index += 1) {
    names.push(options[index] ?? `Rival ${index + 1}`);
  }

  return names;
}

export class RaceCommentary {
  constructor() {
    this.entries = [];
    this.maxEntries = 7;
    this.elapsed = 0;
    this.idCounter = 0;
    this.idleTimer = 0;
    this.voiceQueue = [];
    this.context = {
      trackName: '',
      totalRacers: 0,
      playerShip: null
    };
    this.finalHeadline = '';
  }

  reset({ trackName, racers, playerShip }) {
    this.entries = [];
    this.elapsed = 0;
    this.idleTimer = 0;
    this.voiceQueue = [];
    this.finalHeadline = '';
    this.context = {
      trackName,
      totalRacers: racers.length,
      playerShip
    };

    if (racers.length <= 1) {
      this.push(
        `${trackName} time trial is live. ${getShipLabel(playerShip)} is chasing clean sectors and a faster ghost.`,
        'spotlight',
        `${trackName} time trial live. ${getShipLabel(playerShip)} begins the run.`
      );
      return;
    }

    this.push(
      `${trackName} is live. ${getShipLabel(playerShip)} is on the grid with ${racers.length - 1} rivals ready to tear into the first sector.`,
      'spotlight',
      `${trackName} live. ${getShipLabel(playerShip)} is on the grid.`
    );
  }

  update(deltaTime, { phase, standings, playerShip, track }) {
    this.elapsed += deltaTime;

    if (phase !== 'race' || standings.length <= 1 || !playerShip || !track) {
      return;
    }

    this.idleTimer -= deltaTime;

    if (this.idleTimer > 0) {
      return;
    }

    this.idleTimer = 5.2 + Math.random() * 2.4;
    const leader = standings[0];
    const playerRank = standings.findIndex((ship) => ship === playerShip) + 1;
    const leaderGap = leader === playerShip
      ? 0
      : (leader.distance - playerShip.distance) * track.length;

    if (leader === playerShip) {
      this.push(
        `${getShipLabel(playerShip)} is dictating the pace at the front. The field is trying to find a way around.`,
        'player',
        `${getShipLabel(playerShip)} leads the race and controls the pace.`
      );
      return;
    }

    if (playerRank <= 3 && leaderGap < 48) {
      this.push(
        `${getShipLabel(playerShip)} is right in the fight. One clean move could turn this whole race upside down.`,
        'player',
        `${getShipLabel(playerShip)} is still right in the fight.`
      );
      return;
    }

    const seed = Math.random();
    const line = randomOf([
      `${getShipLabel(leader)} is controlling the race right now, but the pack still looks volatile behind.`,
      `${getShipLabel(leader)} has the lead, and nobody in this field can afford a mistake now.`,
      `The leaders are squeezing every line on ${track.definition.name}. There is no room to breathe.`,
      `${getShipLabel(playerShip)} needs a sharp sector here. The gaps can still flip in a heartbeat.`
    ], seed * 1000);

    this.push(line, leader === playerShip ? 'player' : 'neutral');
  }

  announceCountdown(number) {
    this.push(
      `${number}. Engines are screaming on the grid and every pilot is hunting the holeshot.`,
      'countdown',
      String(number)
    );
  }

  announceGo(playerShip) {
    this.push(
      `GO! ${getShipLabel(playerShip)} launches into the chaos and the whole pack erupts off the line.`,
      'spotlight',
      `Go! ${getShipLabel(playerShip)} launches hard.`
    );
  }

  announceOvertake(attacker, defender, newPosition, isLeaderChange = false) {
    const baseLine = randomOf([
      `${getShipLabel(attacker)} blasts past ${getShipLabel(defender)} for P${newPosition}!`,
      `${getShipLabel(attacker)} throws a savage move on ${getShipLabel(defender)} and steals P${newPosition}!`,
      `${getShipLabel(attacker)} lights the afterburners and snatches P${newPosition} away from ${getShipLabel(defender)}!`,
      `${getShipLabel(defender)} gets mugged on corner exit as ${getShipLabel(attacker)} charges into P${newPosition}!`
    ], this.idCounter + newPosition * 3);

    this.push(baseLine, attacker === this.context.playerShip ? 'player' : 'overtake');

    if (isLeaderChange) {
      this.push(
        `${getShipLabel(attacker)} has the race lead now. Massive swing at the front!`,
        'lead',
        `New leader, ${getShipLabel(attacker)}.`
      );
    }
  }

  announceBoost(ship) {
    this.push(
      `${getShipLabel(ship)} hits the boost and absolutely rockets down the lane!`,
      ship === this.context.playerShip ? 'player' : 'boost',
      `${getShipLabel(ship)} hits boost.`
    );
  }

  announcePickup(ship, itemLabel) {
    this.push(
      `${getShipLabel(ship)} grabs ${itemLabel}. The strategy just changed.`,
      ship === this.context.playerShip ? 'player' : 'neutral',
      `${getShipLabel(ship)} picks up ${itemLabel}.`
    );
  }

  announceItemUse(ship, itemLabel) {
    this.push(
      `${getShipLabel(ship)} deploys ${itemLabel}! The race is getting wild now.`,
      ship === this.context.playerShip ? 'player' : 'chaos',
      `${getShipLabel(ship)} uses ${itemLabel}.`
    );
  }

  announceHazard(ship) {
    this.push(
      `${getShipLabel(ship)} gets caught out by a hazard and loses momentum!`,
      ship === this.context.playerShip ? 'player' : 'chaos',
      `${getShipLabel(ship)} hits a hazard.`
    );
  }

  announceNearMiss(ship) {
    this.push(
      `${getShipLabel(ship)} threads a ridiculous near miss. That was fearless flying.`,
      ship === this.context.playerShip ? 'player' : 'chaos',
      `${getShipLabel(ship)} slips through a huge near miss.`
    );
  }

  announceLap(ship, lapNumber, lapsTotal) {
    if (lapNumber >= lapsTotal) {
      this.push(
        `${getShipLabel(ship)} is on the final lap. Everything is on the line now.`,
        ship === this.context.playerShip ? 'player' : 'lead',
        `${getShipLabel(ship)} starts the final lap.`
      );
      return;
    }

    this.push(
      `${getShipLabel(ship)} starts lap ${lapNumber} of ${lapsTotal}. The pace is still climbing.`,
      ship === this.context.playerShip ? 'player' : 'neutral',
      `${getShipLabel(ship)} starts lap ${lapNumber} of ${lapsTotal}.`
    );
  }

  announceFinish(standings, playerShip) {
    const winner = standings[0];
    const playerPosition = standings.findIndex((ship) => ship === playerShip) + 1;

    if (winner === playerShip) {
      this.push(
        `${getShipLabel(playerShip)} wins it! What a drive, what a finish, what a statement.`,
        'spotlight',
        `${getShipLabel(playerShip)} wins the race.`
      );
      return;
    }

    this.push(
      `${getShipLabel(winner)} takes the win. ${getShipLabel(playerShip)} crosses in P${playerPosition} after a brutal fight.`,
      'lead',
      `${getShipLabel(winner)} takes the win. ${getShipLabel(playerShip)} finishes position ${playerPosition}.`
    );
  }

  finalizeResults(standings) {
    const ordered = Array.isArray(standings) ? standings.slice(0, 8) : [];

    if (ordered.length === 0) {
      this.entries = [];
      this.voiceQueue = [];
      this.finalHeadline = 'Final Standings';
      return;
    }

    const winnerLabel = getStandingsLabel(ordered[0]);
    this.finalHeadline = `Final Standings | Winner ${winnerLabel}`;
    this.entries = ordered.map((entry, index) => ({
      id: this.idCounter + index,
      text: `${formatOrdinal(index + 1)} ${getStandingsLabel(entry)}`,
      tone: index === 0 ? 'spotlight' : index < 3 ? 'lead' : 'neutral'
    }));
    this.idCounter += ordered.length;

    const voiceText = `Final standings. ${ordered
      .map((entry, index) => `${formatOrdinal(index + 1)} ${getStandingsLabel(entry)}`)
      .join(', ')}.`;

    this.voiceQueue = [{
      id: this.idCounter,
      text: voiceText,
      tone: 'spotlight'
    }];
    this.idCounter += 1;
  }

  getHudModel(standings, playerShip, track) {
    const leader = standings[0];
    const playerPosition = standings.findIndex((ship) => ship === playerShip) + 1;
    const playerGap = leader && leader !== playerShip
      ? Math.max(0, (leader.distance - playerShip.distance) * track.length)
      : 0;

    return {
      headline: this.finalHeadline || (leader
        ? `Leader ${getShipLabel(leader)} | ${getShipLabel(playerShip)} P${playerPosition}${leader === playerShip ? ' | In Control' : ` | Gap +${Math.round(playerGap)}u`}`
        : `${getShipLabel(playerShip)} on standby`),
      entries: this.entries
    };
  }

  push(text, tone = 'neutral', voiceText = text) {
    const entry = {
      id: this.idCounter,
      text,
      tone
    };

    this.entries.unshift(entry);

    if (voiceText) {
      this.voiceQueue.push({
        id: entry.id,
        text: voiceText,
        tone
      });
    }

    this.idCounter += 1;
    this.entries = this.entries.slice(0, this.maxEntries);
  }

  drainVoiceQueue() {
    const pending = this.voiceQueue;
    this.voiceQueue = [];
    return pending;
  }
}
