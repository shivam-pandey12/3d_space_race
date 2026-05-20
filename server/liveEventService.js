import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { verifyPlayerToken } from './firebaseAdmin.js';
import { resolveEffectiveEntitlement } from './paymentRoutes.js';
import { EDITION_IDS, EDITION_RANK } from '../src/game/editionConfig.js';
import { getLiveEventSet } from '../src/game/liveEventContent.js';
import { SHIP_DEFS, SHIP_LOOKUP, TRACK_DEFS, TRACK_LOOKUP } from '../src/game/gameContent.js';

const LOCAL_DEV_USER_HEADER = 'x-dev-user-id';
const EVENT_COLLECTION = 'liveEvents';
const EVENT_SCORE_COLLECTION = 'liveEventScores';
const EVENT_TYPES = new Set(['daily', 'weekly', 'weekend', 'boss', 'ranked', 'special', 'limited']);
const SCORE_LIMIT = 25;
const MIN_TIME_BY_TRACK = {
  'night-circuit': 26000,
  'rift-run': 34000,
  'singularity-loop': 42000,
  'solar-storm-corridor': 46000,
  'eclipse-promenade': 38000,
  'aurora-sanctum': 42000,
  'crimson-nebula-descent': 50000,
  'celestial-glassway': 48000,
  'void-palace-circuit': 56000,
  'hypernova-spine': 58000
};

function isEnabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clampNumber(value, min, max, fallback = min) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

function hashEventConfig(config = {}) {
  return crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 16);
}

function normalizeEditionId(value) {
  return EDITION_RANK[value] != null ? value : EDITION_IDS.GAMEHUB_LITE;
}

function getEditionRank(editionId) {
  return Number(EDITION_RANK[editionId] ?? 0);
}

function getEventStatus(event, now = Date.now()) {
  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);

  if (Number.isFinite(start) && now < start) {
    return 'upcoming';
  }

  if (Number.isFinite(end) && now > end) {
    return 'ended';
  }

  return event.status === 'disabled' ? 'disabled' : 'active';
}

function normalizeGoal(rawGoal = {}) {
  return {
    id: String(rawGoal.id ?? 'finish').trim() || 'finish',
    label: String(rawGoal.label ?? 'Finish Event').trim() || 'Finish Event',
    description: String(rawGoal.description ?? 'Complete the official event challenge.').trim() || 'Complete the official event challenge.'
  };
}

function normalizeReward(rawReward = {}, fallbackId = '') {
  if (typeof rawReward === 'string') {
    return {
      rewardId: rawReward,
      title: rawReward,
      description: 'Official event reward'
    };
  }

  return {
    rewardId: String(rawReward.rewardId ?? rawReward.id ?? fallbackId).trim(),
    title: String(rawReward.title ?? rawReward.label ?? 'Official event reward').trim(),
    description: String(rawReward.description ?? rawReward.preview ?? 'Reward unlocks through the existing gallery flow.').trim()
  };
}

function normalizeEvent(rawEvent = {}, source = 'backend-schedule') {
  const eventId = String(rawEvent.eventId ?? rawEvent.id ?? '').trim();

  if (!eventId) {
    return null;
  }

  const track = TRACK_LOOKUP[rawEvent.trackId] ?? TRACK_DEFS[0];
  const ship = SHIP_LOOKUP[rawEvent.shipId] ?? SHIP_DEFS[0];
  const lapCount = Math.round(clampNumber(rawEvent.lapCount ?? rawEvent.laps, 1, 8, 3));
  const aiCount = Math.round(clampNumber(rawEvent.aiCount, 0, 7, 4));
  const startAt = new Date(rawEvent.startAt ?? rawEvent.startsAt ?? Date.now()).toISOString();
  const endAt = new Date(rawEvent.endAt ?? rawEvent.endsAt ?? Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const modifiers = {
    hazardsEnabled: rawEvent.modifiers?.hazardsEnabled ?? rawEvent.hazardsEnabled ?? true,
    pickupsEnabled: rawEvent.modifiers?.pickupsEnabled ?? rawEvent.pickupsEnabled ?? true,
    powerupsEnabled: rawEvent.modifiers?.powerupsEnabled ?? rawEvent.powerupsEnabled ?? true,
    boostPadDensity: String(rawEvent.modifiers?.boostPadDensity ?? rawEvent.boostPadDensity ?? 'normal'),
    shortcutDifficulty: String(rawEvent.modifiers?.shortcutDifficulty ?? rawEvent.shortcutDifficulty ?? 'normal'),
    visualEffect: String(rawEvent.modifiers?.visualEffect ?? rawEvent.visualEffect ?? 'default')
  };
  const configForHash = {
    eventId,
    type: rawEvent.type,
    trackId: track.id,
    shipId: ship.id,
    lapCount,
    aiCount,
    difficulty: rawEvent.difficulty ?? 'standard',
    modifiers,
    goal: normalizeGoal(rawEvent.goal)
  };

  return {
    eventId,
    id: eventId,
    type: EVENT_TYPES.has(rawEvent.type) ? rawEvent.type : 'special',
    title: String(rawEvent.title ?? 'Official Event').trim() || 'Official Event',
    shortTitle: String(rawEvent.shortTitle ?? rawEvent.type ?? 'Event').trim() || 'Event',
    description: String(rawEvent.description ?? 'Official backend scheduled event.').trim(),
    startAt,
    endAt,
    startsAt: startAt,
    endsAt: endAt,
    requiredEdition: normalizeEditionId(rawEvent.requiredEdition ?? EDITION_IDS.STANDALONE_EARLY_ACCESS),
    trackId: track.id,
    trackName: track.name,
    shipId: ship.id,
    shipName: ship.name,
    lapCount,
    laps: lapCount,
    aiCount,
    difficulty: String(rawEvent.difficulty ?? 'standard'),
    modifiers,
    hazardsEnabled: Boolean(modifiers.hazardsEnabled),
    pickupsEnabled: Boolean(modifiers.pickupsEnabled),
    powerupsEnabled: Boolean(modifiers.powerupsEnabled),
    boostPadDensity: modifiers.boostPadDensity,
    shortcutDifficulty: modifiers.shortcutDifficulty,
    visualEffect: modifiers.visualEffect,
    goal: normalizeGoal(rawEvent.goal),
    reward: normalizeReward(rawEvent.reward, rawEvent.rewardId),
    rewardId: String(rawEvent.rewardId ?? rawEvent.reward?.rewardId ?? rawEvent.reward?.id ?? '').trim(),
    rewardPreview: String(rawEvent.rewardPreview ?? rawEvent.reward?.description ?? 'Official event reward').trim(),
    leaderboardEnabled: Boolean(rawEvent.leaderboardEnabled),
    configHash: String(rawEvent.configHash ?? hashEventConfig(configForHash)),
    source,
    status: getEventStatus({
      startAt,
      endAt,
      status: rawEvent.status
    }),
    fairPlayNote: 'Official events do not affect ranked rating unless the backend marks them as ranked events.'
  };
}

function sanitizeEvents(events = [], source = 'backend-schedule') {
  return events
    .map((event) => normalizeEvent(event, source))
    .filter(Boolean);
}

async function readJsonFile(filePath, fallback = null) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.tmp`;
  await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.promises.rename(tempFile, filePath);
}

async function authenticateHttpRequest(request, { firebaseAdminStatus, production, allowLocalDevAuth }) {
  const authHeader = String(request.headers.authorization ?? '').trim();
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

  if (firebaseAdminStatus.enabled) {
    if (!token) {
      return { ok: false, status: 401, message: 'Sign in to submit official event leaderboard scores.' };
    }

    const decoded = await verifyPlayerToken(token);
    return {
      ok: true,
      user: {
        userId: decoded.uid,
        provider: decoded.firebase?.sign_in_provider ?? '',
        email: decoded.email ?? '',
        verified: true
      }
    };
  }

  if (production || !allowLocalDevAuth) {
    return { ok: false, status: 503, message: 'Backend auth is not configured for official event submissions.' };
  }

  const devUserId = String(request.headers[LOCAL_DEV_USER_HEADER] ?? request.body?.devUserId ?? '').trim();

  if (!devUserId) {
    return { ok: false, status: 401, message: 'Missing local development user identity.' };
  }

  return {
    ok: true,
    user: {
      userId: devUserId,
      provider: 'local-dev',
      email: '',
      verified: false
    }
  };
}

function getMinimumFinishTime(event) {
  const base = MIN_TIME_BY_TRACK[event.trackId] ?? 36000;
  return base * Math.max(1, Number(event.lapCount ?? event.laps ?? 3)) / 3;
}

function calculateScore(event, payload) {
  const finishTime = clampNumber(payload.finishTime, 1, 20 * 60 * 1000, 20 * 60 * 1000);
  const position = Math.round(clampNumber(payload.position, 1, 12, 12));
  const hazardHits = Math.round(clampNumber(payload.hazardHits, 0, 99, 0));
  const overtakes = Math.round(clampNumber(payload.overtakes, 0, 128, 0));
  const driftReleases = Math.round(clampNumber(payload.driftReleases, 0, 256, 0));
  const cleanBonus = payload.cleanRace || hazardHits === 0 ? 800 : 0;
  const eventBias = event.type === 'weekly' ? 900 : event.type === 'boss' ? 1100 : 500;
  return Math.max(0, Math.round(
    eventBias +
    Math.max(0, 120000 - finishTime) / 18 +
    Math.max(0, 12 - position) * 140 +
    overtakes * 18 +
    driftReleases * 10 +
    cleanBonus -
    hazardHits * 90
  ));
}

function validateScore(event, payload = {}) {
  if (event.status !== 'active') {
    return { ok: false, status: 400, message: 'This event is not active.' };
  }

  if (payload.eventConfigHash && payload.eventConfigHash !== event.configHash) {
    return { ok: false, status: 400, message: 'Event config hash mismatch.' };
  }

  const finishTime = Number(payload.finishTime);
  const position = Number(payload.position);
  const minFinishTime = getMinimumFinishTime(event);

  if (!Number.isFinite(finishTime) || finishTime <= 0 || finishTime > 20 * 60 * 1000) {
    return { ok: false, status: 400, message: 'Finish time is outside safe bounds.' };
  }

  if (!Number.isFinite(position) || position < 1 || position > Math.max(2, Number(event.aiCount ?? 0) + 1)) {
    return { ok: false, status: 400, message: 'Finish position is outside the event field.' };
  }

  if (finishTime < minFinishTime * 0.62) {
    return { ok: false, status: 400, message: 'Finish time is impossible for this event.' };
  }

  const suspicious = finishTime < minFinishTime ||
    Number(payload.hazardHits ?? 0) > 80 ||
    Number(payload.overtakes ?? 0) > 96 ||
    Number(payload.driftReleases ?? 0) > 180;

  return {
    ok: true,
    suspicious,
    verificationStatus: suspicious ? 'suspicious' : 'verified'
  };
}

export function installLiveEventRoutes(app, {
  scheduleFile,
  leaderboardFile,
  firestore = null,
  firebaseAdminStatus,
  production = false,
  allowLocalDevAuth = false,
  paymentRuntime = null
} = {}) {
  const schedulerEnabled = isEnabled(process.env.ENABLE_BACKEND_EVENT_SCHEDULER);
  const leaderboardEnabled = isEnabled(process.env.ENABLE_GLOBAL_EVENT_LEADERBOARDS);
  const canUseLocalLeaderboards = !production;
  let cachedEvents = null;
  let cachedAt = 0;

  async function loadEvents() {
    const now = Date.now();

    if (cachedEvents && now - cachedAt < 15000) {
      return cachedEvents;
    }

    if (!schedulerEnabled) {
      cachedEvents = {
        ok: false,
        enabled: false,
        source: 'disabled',
        events: [],
        message: 'Backend event scheduler is disabled.'
      };
      cachedAt = now;
      return cachedEvents;
    }

    if (firestore) {
      const snapshot = await firestore.collection(EVENT_COLLECTION)
        .orderBy('startAt', 'asc')
        .limit(64)
        .get();
      const events = sanitizeEvents(snapshot.docs.map((doc) => ({ eventId: doc.id, ...doc.data() })), 'firestore');

      cachedEvents = {
        ok: true,
        enabled: true,
        source: 'backend-scheduled',
        events,
        message: 'Firestore live-event schedule loaded.'
      };
      cachedAt = now;
      return cachedEvents;
    }

    const staticSchedule = await readJsonFile(scheduleFile, null);
    const staticEvents = Array.isArray(staticSchedule)
      ? staticSchedule
      : Array.isArray(staticSchedule?.events)
        ? staticSchedule.events
        : [];

    if (staticEvents.length > 0) {
      cachedEvents = {
        ok: true,
        enabled: true,
        source: 'backend-static',
        events: sanitizeEvents(staticEvents, 'backend-static'),
        message: 'Static live-event schedule loaded.'
      };
      cachedAt = now;
      return cachedEvents;
    }

    if (!production) {
      cachedEvents = {
        ok: true,
        enabled: true,
        source: 'local-fallback',
        events: sanitizeEvents(getLiveEventSet(new Date()), 'local-fallback'),
        message: 'Using local development fallback events.'
      };
      cachedAt = now;
      return cachedEvents;
    }

    cachedEvents = {
      ok: true,
      enabled: true,
      source: 'unavailable',
      events: [],
      message: 'Backend scheduler is enabled, but no production event source is configured.'
    };
    cachedAt = now;
    return cachedEvents;
  }

  async function findEvent(eventId) {
    const payload = await loadEvents();
    const event = payload.events.find((entry) => entry.eventId === eventId || entry.id === eventId) ?? null;
    return { payload, event };
  }

  async function canSubmitForEdition(userId, requiredEdition) {
    if (!production) {
      return true;
    }

    if (!requiredEdition || requiredEdition === EDITION_IDS.GAMEHUB_LITE) {
      return true;
    }

    const entitlement = await resolveEffectiveEntitlement(paymentRuntime?.store, userId);
    return entitlement.active &&
      getEditionRank(entitlement.effectiveTier) >= getEditionRank(requiredEdition);
  }

  async function loadScores(eventId) {
    if (firestore) {
      const snapshot = await firestore.collection(EVENT_SCORE_COLLECTION)
        .doc(eventId)
        .collection('scores')
        .orderBy('score', 'desc')
        .limit(SCORE_LIMIT)
        .get();
      return snapshot.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
    }

    if (!canUseLocalLeaderboards) {
      return [];
    }

    const state = await readJsonFile(leaderboardFile, { scores: {} });
    return Object.values(state.scores?.[eventId] ?? {})
      .sort((scoreA, scoreB) => scoreB.score - scoreA.score || scoreA.finishTime - scoreB.finishTime)
      .slice(0, SCORE_LIMIT);
  }

  async function saveScore(eventId, userId, scoreRecord) {
    if (firestore) {
      const ref = firestore.collection(EVENT_SCORE_COLLECTION)
        .doc(eventId)
        .collection('scores')
        .doc(userId);
      const snapshot = await ref.get();
      const previous = snapshot.exists ? snapshot.data() : null;
      const shouldReplace = !previous ||
        Number(scoreRecord.score) > Number(previous.score ?? 0) ||
        (Number(scoreRecord.score) === Number(previous.score ?? 0) && Number(scoreRecord.finishTime) < Number(previous.finishTime ?? Number.POSITIVE_INFINITY));

      if (shouldReplace) {
        await ref.set(scoreRecord, { merge: true });
      }

      return { record: shouldReplace ? scoreRecord : previous, replaced: shouldReplace };
    }

    if (!canUseLocalLeaderboards) {
      throw new Error('Global event leaderboard storage is not configured.');
    }

    const state = await readJsonFile(leaderboardFile, { scores: {} });
    state.scores[eventId] = state.scores[eventId] ?? {};
    const previous = state.scores[eventId][userId] ?? null;
    const shouldReplace = !previous ||
      Number(scoreRecord.score) > Number(previous.score ?? 0) ||
      (Number(scoreRecord.score) === Number(previous.score ?? 0) && Number(scoreRecord.finishTime) < Number(previous.finishTime ?? Number.POSITIVE_INFINITY));

    if (shouldReplace) {
      state.scores[eventId][userId] = scoreRecord;
      await writeJsonFile(leaderboardFile, state);
    }

    return { record: state.scores[eventId][userId], replaced: shouldReplace };
  }

  function buildLeaderboardResponse(event, scores, playerId = '') {
    const rows = scores
      .filter((score) => score.verificationStatus !== 'rejected')
      .sort((scoreA, scoreB) => Number(scoreB.score ?? 0) - Number(scoreA.score ?? 0) || Number(scoreA.finishTime ?? 0) - Number(scoreB.finishTime ?? 0))
      .slice(0, SCORE_LIMIT)
      .map((score, index) => ({
        position: index + 1,
        userId: score.userId,
        displayName: score.displayName,
        score: score.score,
        finishTime: score.finishTime,
        cleanRace: score.cleanRace,
        verificationStatus: score.verificationStatus,
        submittedAt: score.submittedAt
      }));
    const playerRank = rows.find((row) => row.userId === playerId) ?? null;

    return {
      eventId: event.eventId,
      source: firestore ? 'global' : canUseLocalLeaderboards ? 'local-dev' : 'unavailable',
      sourceLabel: firestore ? 'Global Leaderboard' : canUseLocalLeaderboards ? 'Local Dev Leaderboard' : 'Unavailable',
      updatedAt: Date.now(),
      rows,
      playerRank
    };
  }

  app.get('/api/events/current', async (_request, response) => {
    const payload = await loadEvents();
    const now = Date.now();
    const events = payload.events
      .map((event) => ({ ...event, status: getEventStatus(event, now) }))
      .filter((event) => event.status === 'active');

    response.json({
      ok: payload.ok,
      enabled: payload.enabled,
      source: payload.source,
      sourceLabel: payload.source === 'local-fallback' ? 'Local Offline Fallback' : payload.source === 'unavailable' ? 'Unavailable' : 'Backend Scheduled',
      message: payload.message,
      events
    });
  });

  app.get('/api/events/upcoming', async (_request, response) => {
    const payload = await loadEvents();
    const now = Date.now();
    const events = payload.events
      .map((event) => ({ ...event, status: getEventStatus(event, now) }))
      .filter((event) => event.status === 'upcoming')
      .slice(0, 12);

    response.json({
      ok: payload.ok,
      enabled: payload.enabled,
      source: payload.source,
      sourceLabel: payload.source === 'local-fallback' ? 'Local Offline Fallback' : payload.source === 'unavailable' ? 'Unavailable' : 'Backend Scheduled',
      message: payload.message,
      events
    });
  });

  app.get('/api/events/:eventId', async (request, response) => {
    const { event } = await findEvent(String(request.params.eventId ?? ''));

    if (!event) {
      response.status(404).json({ ok: false, message: 'Event not found.' });
      return;
    }

    response.json({ ok: true, event });
  });

  app.get('/api/events/:eventId/leaderboard', async (request, response) => {
    const { event } = await findEvent(String(request.params.eventId ?? ''));

    if (!event) {
      response.status(404).json({ ok: false, message: 'Event not found.' });
      return;
    }

    if (!leaderboardEnabled || !event.leaderboardEnabled) {
      response.json({
        ok: false,
        leaderboard: buildLeaderboardResponse(event, [], ''),
        message: 'Global event leaderboard is not enabled for this event.'
      });
      return;
    }

    if (production && !firestore) {
      response.status(503).json({
        ok: false,
        leaderboard: buildLeaderboardResponse(event, [], ''),
        message: 'Production global event leaderboards require Firestore.'
      });
      return;
    }

    const playerId = String(request.query.playerId ?? '').trim();
    const scores = await loadScores(event.eventId);
    response.json({
      ok: true,
      leaderboard: buildLeaderboardResponse(event, scores, playerId)
    });
  });

  app.post('/api/events/:eventId/submit-score', async (request, response) => {
    if (!leaderboardEnabled) {
      response.status(503).json({ ok: false, message: 'Global event leaderboards are disabled.' });
      return;
    }

    if (production && !firestore) {
      response.status(503).json({ ok: false, message: 'Production global event leaderboards require Firestore.' });
      return;
    }

    const { event } = await findEvent(String(request.params.eventId ?? request.body?.eventId ?? ''));

    if (!event) {
      response.status(404).json({ ok: false, message: 'Event not found.' });
      return;
    }

    const auth = await authenticateHttpRequest(request, { firebaseAdminStatus, production, allowLocalDevAuth });

    if (!auth.ok) {
      response.status(auth.status).json({ ok: false, message: auth.message });
      return;
    }

    if (!(await canSubmitForEdition(auth.user.userId, event.requiredEdition))) {
      response.status(403).json({ ok: false, message: 'Your verified entitlement does not include this official event leaderboard.' });
      return;
    }

    const validation = validateScore(event, request.body ?? {});

    if (!validation.ok) {
      response.status(validation.status).json({ ok: false, message: validation.message });
      return;
    }

    const finishTime = Math.round(clampNumber(request.body.finishTime, 1, 20 * 60 * 1000, 20 * 60 * 1000));
    const hazardHits = Math.round(clampNumber(request.body.hazardHits, 0, 99, 0));
    const scoreRecord = {
      userId: auth.user.userId,
      eventId: event.eventId,
      displayName: String(request.body.displayName ?? 'Pilot').trim().slice(0, 24) || 'Pilot',
      finishTime,
      position: Math.round(clampNumber(request.body.position, 1, 12, 12)),
      cleanRace: Boolean(request.body.cleanRace ?? hazardHits === 0),
      hazardHits,
      overtakes: Math.round(clampNumber(request.body.overtakes, 0, 128, 0)),
      driftReleases: Math.round(clampNumber(request.body.driftReleases, 0, 256, 0)),
      score: calculateScore(event, request.body ?? {}),
      eventConfigHash: event.configHash,
      verificationStatus: validation.verificationStatus,
      clientVersion: String(request.body.clientVersion ?? '').slice(0, 32),
      buildVersion: String(request.body.buildVersion ?? '').slice(0, 32),
      submittedAt: new Date().toISOString(),
      source: firestore ? 'global' : 'local-dev'
    };
    const saved = await saveScore(event.eventId, auth.user.userId, scoreRecord);
    const leaderboard = buildLeaderboardResponse(event, await loadScores(event.eventId), auth.user.userId);

    response.json({
      ok: true,
      replaced: saved.replaced,
      score: saved.record,
      leaderboard,
      message: saved.replaced ? 'Official event score submitted.' : 'Existing event score is better; leaderboard kept it.'
    });
  });

  return {
    getStatus() {
      return {
        schedulerEnabled,
        leaderboardEnabled,
        source: firestore ? 'firestore' : 'local',
        leaderboardSource: firestore ? 'firestore' : canUseLocalLeaderboards ? 'local-dev' : 'unavailable'
      };
    },
    loadEvents
  };
}
