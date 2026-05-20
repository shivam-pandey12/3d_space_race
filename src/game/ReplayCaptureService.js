import * as THREE from 'three';

const DEFAULT_SAMPLE_INTERVAL_MS = 160;
const PERFORMANCE_SAMPLE_INTERVAL_MS = 240;
const DEFAULT_MAX_FRAMES = 560;
const PERFORMANCE_MAX_FRAMES = 360;

function sanitizeReplayId(value) {
  return String(value ?? '').trim() || `replay-${Date.now().toString(36)}`;
}

function createSnapshot(ship, index) {
  return {
    id: String(ship.replayParticipantId || ship.premiumParticipantId || ship.config?.shipId || `ship-${index}`),
    progress: Number(ship.progress ?? 0),
    distance: Number(ship.distance ?? ship.getTravelledDistance?.() ?? 0),
    lateralOffset: Number(ship.lateralOffset ?? 0),
    speed: Number(ship.speed ?? 0),
    boosting: Boolean(ship.boosting),
    drifting: Boolean(ship.drifting),
    lap: Math.max(1, Math.floor(ship.getLapNumber?.() ?? 1))
  };
}

function createParticipant(ship, index, fallbackCosmetics = {}) {
  return {
    id: String(ship.replayParticipantId || ship.premiumParticipantId || ship.config?.shipId || `ship-${index}`),
    label: String(ship.label ?? ship.config?.label ?? `Pilot ${index + 1}`),
    shipId: String(ship.config?.shipId ?? 'starling'),
    scoring: ship.premiumScoring !== false,
    cosmetics: {
      hullId: fallbackCosmetics.hullId ?? 'azure',
      glowId: fallbackCosmetics.glowId ?? 'cyan-core',
      trailId: fallbackCosmetics.trailId ?? 'ion-trail'
    },
    advancedVisuals: ship.config?.advancedVisuals ?? null
  };
}

export function sampleReplayFrame(replay, timeMs) {
  const frames = replay?.frames ?? [];

  if (frames.length === 0) {
    return null;
  }

  const clampedTime = THREE.MathUtils.clamp(Number(timeMs ?? 0), 0, replay.durationMs ?? frames.at(-1).timeMs ?? 0);

  if (frames.length === 1 || clampedTime <= frames[0].timeMs) {
    return frames[0];
  }

  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];

    if (clampedTime >= current.timeMs && clampedTime <= next.timeMs) {
      const span = Math.max(1, next.timeMs - current.timeMs);
      const alpha = THREE.MathUtils.clamp((clampedTime - current.timeMs) / span, 0, 1);
      const nextById = new Map(next.ships.map((ship) => [ship.id, ship]));

      return {
        timeMs: clampedTime,
        ships: current.ships.map((ship) => {
          const target = nextById.get(ship.id) ?? ship;
          return {
            ...ship,
            progress: THREE.MathUtils.lerp(ship.progress, target.progress, alpha),
            distance: THREE.MathUtils.lerp(ship.distance, target.distance, alpha),
            lateralOffset: THREE.MathUtils.lerp(ship.lateralOffset, target.lateralOffset, alpha),
            speed: THREE.MathUtils.lerp(ship.speed, target.speed, alpha),
            boosting: alpha < 0.5 ? ship.boosting : target.boosting,
            drifting: alpha < 0.5 ? ship.drifting : target.drifting,
            lap: alpha < 0.5 ? ship.lap : target.lap
          };
        })
      };
    }
  }

  return frames.at(-1);
}

export class ReplayCaptureService {
  constructor() {
    this.active = null;
    this.latestReplay = null;
  }

  start({ mode, trackId, trackName, trackDefinition = null, lapTarget, graphicsQuality = 'high', participants = [] } = {}) {
    const performanceMode = graphicsQuality === 'performance';

    this.active = {
      id: sanitizeReplayId(),
      mode: String(mode ?? 'career-race'),
      trackId: String(trackId ?? 'night-circuit'),
      trackName: String(trackName ?? 'Track'),
      trackDefinition,
      lapTarget: Math.max(1, Math.floor(Number(lapTarget ?? 3))),
      sampleIntervalMs: performanceMode ? PERFORMANCE_SAMPLE_INTERVAL_MS : DEFAULT_SAMPLE_INTERVAL_MS,
      maxFrames: performanceMode ? PERFORMANCE_MAX_FRAMES : DEFAULT_MAX_FRAMES,
      lastSampleMs: -Infinity,
      participants,
      frames: [],
      events: [],
      startedAt: Date.now()
    };
  }

  updateParticipants(racers = [], fallbackCosmetics = {}) {
    if (!this.active) {
      return;
    }

    this.active.participants = racers.map((ship, index) => createParticipant(ship, index, fallbackCosmetics));
  }

  addEvent(type, payload = {}, timeMs = 0) {
    if (!this.active) {
      return;
    }

    this.active.events.push({
      type: String(type ?? 'event'),
      label: String(payload.label ?? type ?? 'Event').slice(0, 80),
      timeMs: Math.max(0, Math.floor(Number(timeMs ?? 0))),
      shipId: String(payload.shipId ?? ''),
      detail: String(payload.detail ?? '').slice(0, 120)
    });
    this.active.events = this.active.events.slice(-80);
  }

  sample(timeMs, racers = []) {
    if (!this.active || racers.length === 0) {
      return;
    }

    const safeTime = Math.max(0, Math.floor(Number(timeMs ?? 0)));

    if (safeTime - this.active.lastSampleMs < this.active.sampleIntervalMs && this.active.frames.length > 0) {
      return;
    }

    this.active.lastSampleMs = safeTime;
    this.active.frames.push({
      timeMs: safeTime,
      ships: racers.map(createSnapshot)
    });

    if (this.active.frames.length > this.active.maxFrames) {
      this.active.frames.shift();
    }
  }

  finish(summary = {}) {
    if (!this.active) {
      return null;
    }

    const frames = this.active.frames;
    const durationMs = Math.max(1, summary.durationMs ?? frames.at(-1)?.timeMs ?? 1);
    const replay = {
      id: this.active.id,
      mode: this.active.mode,
      trackId: this.active.trackId,
      trackName: this.active.trackName,
      trackDefinition: this.active.trackDefinition,
      lapTarget: this.active.lapTarget,
      durationMs,
      participants: [...this.active.participants],
      frames: [...frames],
      events: [...this.active.events],
      summary: {
        position: summary.position ?? null,
        totalRacers: summary.totalRacers ?? null,
        resultLabel: summary.resultLabel ?? '',
        createdAt: Date.now()
      }
    };

    this.latestReplay = replay;
    this.active = null;
    return replay;
  }

  cancel() {
    this.active = null;
  }
}
