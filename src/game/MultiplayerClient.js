import { io } from 'socket.io-client';

function resolveServerUrl() {
  if (import.meta.env.VITE_MULTIPLAYER_URL) {
    return import.meta.env.VITE_MULTIPLAYER_URL;
  }

  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export class MultiplayerClient extends EventTarget {
  constructor() {
    super();

    this.url = resolveServerUrl();
    this.socket = null;
    this.identity = null;
    this.connected = false;
    this.connectionError = '';
    this.room = null;
    this.leaderboard = {
      global: [],
      friends: [],
      updatedAt: 0
    };
    this.rankedLeaderboard = {
      global: [],
      friends: [],
      updatedAt: 0
    };
    this.rankedQueue = {
      status: 'idle',
      message: ''
    };
    this.profile = null;
    this.pendingRace = null;
    this.latestRaceState = null;
    this.latestResults = null;
    this.connectionPromise = null;
    this.identitySyncPromise = null;
    this.identityReady = false;
    this.lastIdentitySignature = '';
  }

  async ensureConnection(identity) {
    this.identity = identity;

    if (this.socket?.connected) {
      await this.syncIdentity();
      return;
    }

    if (!this.socket) {
      this.createSocket();
    }

    if (this.connectionPromise) {
      await this.connectionPromise;
      return;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const cleanup = () => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        this.socket.off('connect', handleConnect);
        this.socket.off('connect_error', handleError);
      };

      const handleConnect = () => {
        cleanup();
        this.connectionPromise = null;
        resolve();
      };

      const handleError = (error) => {
        cleanup();
        this.connectionPromise = null;
        reject(new Error(error?.message ?? 'Unable to reach multiplayer server.'));
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        this.connectionPromise = null;
        reject(new Error('Multiplayer server timed out while connecting.'));
      }, 5000);

      this.socket.on('connect', handleConnect);
      this.socket.on('connect_error', handleError);

      if (!this.socket.connected) {
        this.socket.connect();
      }
    });

    await this.connectionPromise;
    await this.syncIdentity(true);
  }

  createSocket() {
    this.socket = io(this.url, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.identityReady = false;
      this.connectionError = '';
      this.lastIdentitySignature = '';
      void this.syncIdentity(true);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.identityReady = false;
      this.lastIdentitySignature = '';
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('connect_error', (error) => {
      this.connectionError = error?.message ?? 'Unable to reach multiplayer server.';
      this.identityReady = false;
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('profile:ack', (payload) => {
      this.profile = payload;
      this.dispatch('profile', payload);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('room:update', (room) => {
      this.room = room;
      this.dispatch('room-update', room);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('tournament:update', (room) => {
      this.room = room;
      this.dispatch('tournament-update', room);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('race:countdown', (payload) => {
      this.pendingRace = payload;
      this.dispatch('race-countdown', payload);
    });

    this.socket.on('race:state', (payload) => {
      this.latestRaceState = payload;
      this.dispatch('race-state', payload);
    });

    this.socket.on('race:results', (payload) => {
      this.latestResults = payload;
      this.pendingRace = null;
      this.latestRaceState = null;
      this.room = payload.room ?? this.room;
      this.dispatch('race-results', payload);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('leaderboard:update', (payload) => {
      this.leaderboard = payload;
      this.dispatch('leaderboard', payload);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('ranked:leaderboard', (payload) => {
      this.rankedLeaderboard = payload;
      this.dispatch('ranked-leaderboard', payload);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('ranked:status', (payload) => {
      this.rankedQueue = payload ?? { status: 'idle', message: '' };
      this.dispatch('ranked-status', this.rankedQueue);
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('social:emote', (payload) => {
      this.dispatch('social-emote', payload);
    });

    this.socket.on('room:kicked', (payload) => {
      this.room = null;
      this.pendingRace = null;
      this.latestRaceState = null;
      this.dispatch('error', { message: payload?.message ?? 'You were removed from the private room.' });
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('room:closed', (payload) => {
      this.room = null;
      this.pendingRace = null;
      this.latestRaceState = null;
      this.dispatch('error', { message: payload?.message ?? 'The private room was closed.' });
      this.dispatch('state-change', this.getPublicState());
    });

    this.socket.on('match:error', (payload) => {
      this.dispatch('error', payload);
    });
  }

  syncIdentity(force = false) {
    if (!this.socket?.connected || !this.identity) {
      return Promise.resolve(null);
    }

    const signature = JSON.stringify({
      playerId: this.identity.playerId,
      name: this.identity.name,
      shipId: this.identity.shipId,
      trackId: this.identity.trackId,
      cosmetics: this.identity.cosmetics,
      authUid: this.identity.authUid,
      authProvider: this.identity.authProvider
    });

    if (!force && signature === this.lastIdentitySignature && this.identityReady) {
      return Promise.resolve(this.profile);
    }

    if (this.identitySyncPromise) {
      return this.identitySyncPromise;
    }

    this.identitySyncPromise = this.emitWithAck('profile:sync', this.identity)
      .then((response) => {
        this.lastIdentitySignature = signature;
        this.identityReady = true;
        this.connectionError = '';

        if (response?.profile) {
          this.profile = response.profile;
          this.dispatch('profile', response.profile);
        }

        this.requestLeaderboard();
        this.requestRankedLeaderboard();
        this.dispatch('state-change', this.getPublicState());
        return response?.profile ?? this.profile;
      })
      .catch((error) => {
        this.identityReady = false;
        this.connectionError = error?.message ?? 'Could not verify multiplayer identity.';
        this.dispatch('state-change', this.getPublicState());
        throw error;
      })
      .finally(() => {
        this.identitySyncPromise = null;
      });

    return this.identitySyncPromise;
  }

  getPublicState() {
    return {
      connected: this.connected,
      reconnecting: !this.connected && Boolean(this.room),
      connectionError: this.connectionError,
      room: this.room,
      leaderboard: this.leaderboard,
      rankedLeaderboard: this.rankedLeaderboard,
      rankedQueue: this.rankedQueue,
      profile: this.profile
    };
  }

  requestLeaderboard(friends = []) {
    if (!this.socket?.connected || !this.identityReady) {
      return;
    }

    this.socket.emit('leaderboard:request', {
      playerId: this.identity?.playerId,
      friends
    });
  }

  emitWithAck(event, payload, timeoutMs = 5000) {
    if (!this.socket) {
      return Promise.reject(new Error('Multiplayer socket is not ready.'));
    }

    return new Promise((resolve, reject) => {
      this.socket.timeout(timeoutMs).emit(event, payload, (error, response) => {
        if (error) {
          reject(new Error('Multiplayer server did not respond in time.'));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.message ?? 'Multiplayer request failed.'));
          return;
        }

        resolve(response);
      });
    });
  }

  async queueQuickMatch(identity) {
    await this.ensureConnection(identity);
    return this.emitWithAck('match:quick', identity);
  }

  async queueRanked(identity) {
    await this.ensureConnection(identity);
    return this.emitWithAck('ranked:queue', identity);
  }

  async cancelRankedQueue() {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Multiplayer is not connected.'));
    }

    return this.emitWithAck('ranked:cancel', {}).then((response) => {
      this.rankedQueue = {
        status: 'idle',
        message: response?.message ?? 'Ranked queue cancelled.'
      };
      this.dispatch('state-change', this.getPublicState());
      return response;
    });
  }

  requestRankedLeaderboard() {
    if (!this.socket?.connected || !this.identityReady) {
      return;
    }

    this.socket.emit('ranked:leaderboard', {
      playerId: this.identity?.playerId,
      friends: this.identity?.friends ?? []
    });
  }

  async createPrivateRoom(identity) {
    await this.ensureConnection(identity);
    return this.emitWithAck('room:create-private', identity);
  }

  async joinPrivateRoom(code, identity) {
    await this.ensureConnection(identity);
    return this.emitWithAck('room:join-private', {
      code,
      ...identity
    });
  }

  async createPrivateTournament(identity, { format = 4, botFill = true } = {}) {
    await this.ensureConnection(identity);
    return this.emitWithAck('tournament:create-private', {
      ...identity,
      format,
      botFill
    });
  }

  async joinPrivateTournament(code, identity) {
    await this.ensureConnection(identity);
    return this.emitWithAck('tournament:join-private', {
      code,
      ...identity
    });
  }

  startPrivateTournament() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Join a private tournament first.'));
    }

    return this.emitWithAck('tournament:start', {
      roomId: this.room.id
    });
  }

  startNextPrivateTournamentRound() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Join a private tournament first.'));
    }

    return this.emitWithAck('tournament:start-next-round', {
      roomId: this.room.id
    });
  }

  togglePrivateTournamentReady() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Join a private tournament first.'));
    }

    return this.emitWithAck('tournament:toggle-ready', {
      roomId: this.room.id
    });
  }

  requestPrivateTournamentRematch() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Open a private tournament before requesting a rematch.'));
    }

    return this.emitWithAck('tournament:rematch', {
      roomId: this.room.id
    });
  }

  startPrivateRoom() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Join a private room first.'));
    }

    return this.emitWithAck('room:start', {
      roomId: this.room.id
    });
  }

  toggleReady() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Join a private room first.'));
    }

    return this.emitWithAck('room:toggle-ready', {
      roomId: this.room.id
    });
  }

  transferHost(playerId) {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Open a private room before transferring the host.'));
    }

    return this.emitWithAck('room:transfer-host', {
      roomId: this.room.id,
      targetId: playerId
    });
  }

  requestRoomRematch() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Open a private room before requesting a rematch.'));
    }

    return this.emitWithAck('room:rematch', {
      roomId: this.room.id
    });
  }

  kickRoomPlayer(playerId) {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('Open a room before removing a pilot.'));
    }

    return this.emitWithAck('room:kick', {
      roomId: this.room.id,
      targetId: playerId
    });
  }

  discardRoom() {
    if (!this.socket?.connected || !this.room) {
      return Promise.reject(new Error('There is no active room to discard.'));
    }

    return this.emitWithAck('room:discard', {
      roomId: this.room.id
    });
  }

  leaveRoom() {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Multiplayer is not connected.'));
    }

    return this.emitWithAck('room:leave', {
      roomId: this.room?.id
    }).then((response) => {
      this.room = null;
      this.pendingRace = null;
      this.latestRaceState = null;
      this.dispatch('state-change', this.getPublicState());
      return response;
    });
  }

  sendSnapshot(snapshot) {
    if (!this.socket?.connected || !this.room) {
      return;
    }

    this.socket.emit('race:snapshot', {
      roomId: this.room.id,
      snapshot
    });
  }

  submitResult(result) {
    if (!this.socket?.connected || !this.room) {
      return;
    }

    this.socket.emit('race:finish', {
      roomId: this.room.id,
      result
    });
  }

  sendEmote(emote) {
    if (!this.socket?.connected || !this.room) {
      return;
    }

    this.socket.emit('social:emote', {
      roomId: this.room.id,
      emote
    });
  }

  dispose() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = null;
    this.identityReady = false;
    this.identitySyncPromise = null;
    this.lastIdentitySignature = '';
  }

  dispatch(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }
}
