function getApiBaseUrl() {
  return String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

function isBackendEventsEnabled() {
  return String(import.meta.env.VITE_ENABLE_BACKEND_EVENTS ?? '').toLowerCase() === 'true';
}

function isGlobalLeaderboardsEnabled() {
  return String(import.meta.env.VITE_ENABLE_GLOBAL_EVENT_LEADERBOARDS ?? '').toLowerCase() === 'true';
}

export class EventService {
  constructor() {
    this.current = {
      status: 'idle',
      source: 'local',
      sourceLabel: 'Local Offline Fallback',
      message: '',
      events: [],
      updatedAt: 0
    };
    this.upcoming = [];
    this.leaderboards = new Map();
  }

  isBackendEnabled() {
    return isBackendEventsEnabled();
  }

  isLeaderboardEnabled() {
    return isGlobalLeaderboardsEnabled();
  }

  async fetchBackend(path, { method = 'GET', body = null, authPayload = null } = {}) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (authPayload?.authToken) {
      headers.Authorization = `Bearer ${authPayload.authToken}`;
    } else if (import.meta.env.DEV && authPayload?.playerId) {
      headers['x-dev-user-id'] = authPayload.playerId;
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || `Event backend request failed (${response.status}).`);
    }

    return payload;
  }

  async refreshCurrentEvents() {
    if (!this.isBackendEnabled()) {
      this.current = {
        status: 'disabled',
        source: 'local',
        sourceLabel: 'Local Offline Fallback',
        message: 'Backend events are disabled in this build.',
        events: [],
        updatedAt: Date.now()
      };
      return this.current;
    }

    try {
      const [current, upcoming] = await Promise.all([
        this.fetchBackend('/api/events/current'),
        this.fetchBackend('/api/events/upcoming').catch(() => ({ events: [] }))
      ]);
      this.current = {
        status: 'ready',
        source: current.source ?? 'backend',
        sourceLabel: current.sourceLabel ?? 'Backend Scheduled',
        message: current.message ?? '',
        events: current.events ?? [],
        updatedAt: Date.now()
      };
      this.upcoming = upcoming.events ?? [];
      return this.current;
    } catch (error) {
      this.current = {
        status: 'error',
        source: 'unavailable',
        sourceLabel: import.meta.env.DEV ? 'Local Offline Fallback' : 'Unavailable',
        message: error?.message ?? 'Event backend unavailable.',
        events: [],
        updatedAt: Date.now()
      };
      return this.current;
    }
  }

  getCurrentState() {
    return {
      ...this.current,
      upcoming: [...this.upcoming],
      leaderboards: Object.fromEntries(this.leaderboards)
    };
  }

  getBackendEvent(eventId) {
    const allEvents = [...(this.current.events ?? []), ...this.upcoming];
    return allEvents.find((event) => event.id === eventId || event.eventId === eventId) ?? null;
  }

  async fetchLeaderboard(eventId, playerId = '') {
    if (!this.isLeaderboardEnabled()) {
      return {
        ok: false,
        leaderboard: {
          eventId,
          source: 'unavailable',
          sourceLabel: 'Unavailable',
          rows: [],
          playerRank: null
        }
      };
    }

    const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
    const payload = await this.fetchBackend(`/api/events/${encodeURIComponent(eventId)}/leaderboard${query}`);
    this.leaderboards.set(eventId, payload.leaderboard);
    return payload;
  }

  async submitScore(event, raceSummary, authPayload) {
    if (!this.isLeaderboardEnabled() || !event?.leaderboardEnabled) {
      return {
        ok: false,
        message: 'Global event leaderboard is disabled for this event.'
      };
    }

    const stats = raceSummary.stats ?? {};
    const payload = await this.fetchBackend(`/api/events/${encodeURIComponent(event.eventId ?? event.id)}/submit-score`, {
      method: 'POST',
      authPayload,
      body: {
        eventId: event.eventId ?? event.id,
        displayName: authPayload?.name ?? 'Pilot',
        finishTime: Math.round(raceSummary.timing?.totalTimeMs ?? stats.totalTimeMs ?? 0),
        position: raceSummary.position,
        cleanRace: (stats.hazardHits ?? 0) === 0,
        hazardHits: stats.hazardHits ?? 0,
        overtakes: stats.overtakes ?? 0,
        driftReleases: stats.driftReleases ?? 0,
        score: 0,
        eventConfigHash: event.configHash,
        clientVersion: 'phase-8-part-2',
        buildVersion: String(import.meta.env.MODE ?? 'development')
      }
    });

    if (payload.leaderboard) {
      this.leaderboards.set(event.eventId ?? event.id, payload.leaderboard);
    }

    return payload;
  }
}
