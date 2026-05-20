import fs from 'node:fs';
import path from 'node:path';
import { FieldPath } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebaseAdmin.js';

const PROFILE_COLLECTION = 'multiplayerProfiles';
const ROOM_COLLECTION = 'multiplayerRooms';
const ROOM_PLAYER_SUBCOLLECTION = 'players';
const QUICK_QUEUE_COLLECTION = 'multiplayerQuickQueue';
const RANKED_QUEUE_COLLECTION = 'multiplayerRankedQueue';
const RECENT_ROOM_COLLECTION = 'multiplayerRecentRooms';

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sanitizeId(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function sortPlayers(room, players) {
  const order = new Map((room.playerOrder ?? []).map((playerId, index) => [playerId, index]));
  return [...players].sort((playerA, playerB) => {
    const indexA = order.get(playerA.player.playerId) ?? Number.MAX_SAFE_INTEGER;
    const indexB = order.get(playerB.player.playerId) ?? Number.MAX_SAFE_INTEGER;

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    return (playerA.joinedAt ?? 0) - (playerB.joinedAt ?? 0);
  });
}

function composeRoom(roomDoc, playerDocs) {
  if (!roomDoc?.exists) {
    return null;
  }

  const room = {
    id: roomDoc.id,
    ...cloneValue(roomDoc.data())
  };

  room.players = sortPlayers(
    room,
    playerDocs.map((playerDoc) => ({
      player: {
        ...(playerDoc.data().player ?? {})
      },
      ...cloneValue(playerDoc.data())
    }))
  );

  return room;
}

function serializeRoomMeta(room) {
  return {
    id: room.id,
    code: room.code,
    type: room.type,
    trackId: room.trackId,
    maxPlayers: room.maxPlayers,
    minPlayers: room.minPlayers,
    hostId: room.hostId,
    status: room.status,
    createdAt: room.createdAt,
    startAt: room.startAt ?? null,
    raceConfig: cloneValue(room.raceConfig ?? null),
    tournament: cloneValue(room.tournament ?? null),
    lastResults: cloneValue(room.lastResults ?? null),
    feed: cloneValue(room.feed ?? []),
    playerOrder: room.players.map((entry) => entry.player.playerId),
    raceTimeoutAt: room.raceTimeoutAt ?? null,
    updatedAt: Date.now()
  };
}

function serializeRoomPlayer(entry) {
  return {
    player: cloneValue(entry.player),
    tournament: cloneValue(entry.tournament ?? null),
    snapshot: cloneValue(entry.snapshot ?? null),
    lastSnapshotAt: entry.lastSnapshotAt ?? 0,
    finishTime: Number.isFinite(entry.finishTime) ? entry.finishTime : null,
    place: Number.isFinite(entry.place) ? entry.place : null,
    result: cloneValue(entry.result ?? null),
    ready: Boolean(entry.ready),
    connected: entry.connected !== false,
    reconnectDeadline: entry.reconnectDeadline ?? 0,
    rating: Number(entry.rating ?? 1000),
    tier: String(entry.tier ?? 'Bronze'),
    ratingDelta: Number(entry.ratingDelta ?? 0),
    ratingAfter: Number(entry.ratingAfter ?? entry.rating ?? 1000),
    antiCheatFlags: Array.isArray(entry.antiCheatFlags) ? entry.antiCheatFlags.slice(-12) : [],
    joinedAt: entry.joinedAt ?? Date.now(),
    updatedAt: Date.now()
  };
}

class LocalMultiplayerStateStore {
  constructor({ stateFile, getTier }) {
    this.getTier = getTier;
    this.stateFile = stateFile;
    this.rooms = new Map();
    this.queues = {
      quick: [],
      ranked: []
    };
    this.roomListeners = new Map();
    this.persistentState = this.loadPersistentState();
    this.saveTimer = null;
    this.writeInFlight = false;
    this.pendingWrite = false;
    this.enabled = false;
    this.mode = 'local';
  }

  loadPersistentState() {
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);

      return {
        profiles: parsed.profiles ?? {},
        recentRooms: parsed.recentRooms ?? []
      };
    } catch {
      return {
        profiles: {},
        recentRooms: []
      };
    }
  }

  async flushPersistentState() {
    if (this.writeInFlight) {
      this.pendingWrite = true;
      return;
    }

    this.writeInFlight = true;

    try {
      await fs.promises.mkdir(path.dirname(this.stateFile), { recursive: true });
      const nextState = JSON.stringify(this.persistentState, null, 2);
      const tempFile = `${this.stateFile}.tmp`;
      await fs.promises.writeFile(tempFile, nextState, 'utf8');
      await fs.promises.rename(tempFile, this.stateFile);
    } catch (error) {
      console.error('Failed to persist multiplayer state:', error);
    } finally {
      this.writeInFlight = false;

      if (this.pendingWrite) {
        this.pendingWrite = false;
        void this.flushPersistentState();
      }
    }
  }

  queueSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flushPersistentState();
    }, 180);
  }

  getProfileSync(playerId, fallbackName = 'Pilot') {
    if (!this.persistentState.profiles[playerId]) {
      this.persistentState.profiles[playerId] = {
        playerId,
        name: fallbackName,
        rating: 1000,
        rankedRating: 1000,
        rankedRaces: 0,
        rankedWins: 0,
        rankedPodiums: 0,
        rankedBestStreak: 0,
        rankedCurrentStreak: 0,
        rankedHistory: [],
        races: 0,
        wins: 0,
        podiums: 0,
        privateWins: 0,
        tournamentWins: 0,
        lastSeenAt: Date.now()
      };
    }

    return this.persistentState.profiles[playerId];
  }

  async getProfile(playerId, fallbackName = 'Pilot') {
    return cloneValue(this.getProfileSync(playerId, fallbackName));
  }

  async upsertProfile(player) {
    const profile = this.getProfileSync(player.playerId, player.name);
    profile.name = player.name;
    profile.lastSeenAt = Date.now();
    this.queueSave();
    return cloneValue(profile);
  }

  async updateProfiles(updates) {
    for (const update of updates) {
      const profile = this.getProfileSync(update.playerId, update.name);
      Object.assign(profile, cloneValue(update));
      profile.lastSeenAt = Date.now();
    }

    this.queueSave();
  }

  async buildLeaderboard(request = {}) {
    const profiles = Object.values(this.persistentState.profiles);
    const rankedMode = request.scope === 'ranked';
    const global = profiles
      .sort((profileA, profileB) => {
        if (rankedMode) {
          return (profileB.rankedRating ?? 1000) - (profileA.rankedRating ?? 1000) ||
            (profileB.rankedWins ?? 0) - (profileA.rankedWins ?? 0);
        }

        return profileB.rating - profileA.rating || profileB.wins - profileA.wins;
      })
      .slice(0, 8)
      .map((profile, index) => ({
        position: index + 1,
        playerId: profile.playerId,
        name: profile.name,
        rating: rankedMode ? (profile.rankedRating ?? 1000) : profile.rating,
        tier: this.getTier(rankedMode ? (profile.rankedRating ?? 1000) : profile.rating),
        wins: rankedMode ? (profile.rankedWins ?? 0) : profile.wins,
        races: rankedMode ? (profile.rankedRaces ?? 0) : profile.races
      }));

    const requestedFriends = new Set((request.friends ?? []).map((entry) => String(entry).toLowerCase()));
    const subjectId = String(request.playerId ?? '');
    const friends = profiles
      .filter((profile) =>
        profile.playerId === subjectId ||
        requestedFriends.has(profile.playerId.toLowerCase()) ||
        requestedFriends.has(profile.name.toLowerCase())
      )
      .sort((profileA, profileB) => {
        if (rankedMode) {
          return (profileB.rankedRating ?? 1000) - (profileA.rankedRating ?? 1000) ||
            (profileB.rankedWins ?? 0) - (profileA.rankedWins ?? 0);
        }

        return profileB.rating - profileA.rating || profileB.wins - profileA.wins;
      })
      .slice(0, 8)
      .map((profile, index) => ({
        position: index + 1,
        playerId: profile.playerId,
        name: profile.name,
        rating: rankedMode ? (profile.rankedRating ?? 1000) : profile.rating,
        tier: this.getTier(rankedMode ? (profile.rankedRating ?? 1000) : profile.rating),
        wins: rankedMode ? (profile.rankedWins ?? 0) : profile.wins,
        races: rankedMode ? (profile.rankedRaces ?? 0) : profile.races
      }));

    return {
      updatedAt: Date.now(),
      global,
      friends
    };
  }

  async removeFromQueues(playerId) {
    for (const queue of Object.values(this.queues)) {
      const index = queue.findIndex((entry) => entry.playerId === playerId);

      if (index >= 0) {
        queue.splice(index, 1);
      }
    }
  }

  async enqueueQuick(player) {
    await this.removeFromQueues(player.playerId);
    this.queues.quick.push({
      playerId: player.playerId,
      enqueuedAt: Date.now(),
      player: cloneValue(player)
    });
  }

  async enqueueRanked(player, ranked = {}) {
    await this.removeFromQueues(player.playerId);
    this.queues.ranked.push({
      playerId: player.playerId,
      enqueuedAt: Date.now(),
      rating: Number(ranked.rating ?? 1000),
      tier: String(ranked.tier ?? this.getTier(ranked.rating ?? 1000)),
      player: cloneValue(player)
    });
  }

  async claimQuickQueueGroup({ minPlayers = 2, maxPlayers = 4 } = {}) {
    if (this.queues.quick.length < minPlayers) {
      return [];
    }

    const entries = this.queues.quick.splice(0, Math.min(maxPlayers, this.queues.quick.length));
    return entries.map((entry) => cloneValue(entry.player));
  }

  async claimRankedQueueGroup({ minPlayers = 2, maxPlayers = 4, now = Date.now() } = {}) {
    if (this.queues.ranked.length < minPlayers) {
      return [];
    }

    this.queues.ranked.sort((entryA, entryB) => entryA.enqueuedAt - entryB.enqueuedAt);
    const seed = this.queues.ranked[0];
    const waitMs = now - seed.enqueuedAt;
    const ratingWindow = 160 + Math.min(520, Math.floor(waitMs / 1000) * 18);
    const candidates = this.queues.ranked
      .filter((entry) => Math.abs(Number(entry.rating ?? 1000) - Number(seed.rating ?? 1000)) <= ratingWindow)
      .slice(0, maxPlayers);

    if (candidates.length < minPlayers) {
      return [];
    }

    const candidateIds = new Set(candidates.map((entry) => entry.playerId));
    this.queues.ranked = this.queues.ranked.filter((entry) => !candidateIds.has(entry.playerId));
    return candidates.map((entry) => cloneValue(entry.player));
  }

  async createRoom(room) {
    const nextRoom = cloneValue(room);
    this.rooms.set(nextRoom.id, nextRoom);
    this.notifyRoom(nextRoom.id);
    return cloneValue(nextRoom);
  }

  async getRoom(roomId) {
    const room = this.rooms.get(roomId);
    return room ? cloneValue(room) : null;
  }

  async getRoomByCode(code) {
    const normalizedCode = String(code ?? '').trim().toUpperCase();

    for (const room of this.rooms.values()) {
      if (room.code === normalizedCode) {
        return cloneValue(room);
      }
    }

    return null;
  }

  async findRoomByPlayer(playerId) {
    for (const room of this.rooms.values()) {
      if (room.players.some((entry) => entry.player.playerId === playerId)) {
        return cloneValue(room);
      }
    }

    return null;
  }

  async saveRoom(room) {
    const nextRoom = cloneValue(room);
    this.rooms.set(nextRoom.id, nextRoom);
    this.notifyRoom(nextRoom.id);
    return cloneValue(nextRoom);
  }

  async saveRoomPlayer(roomId, playerEntry) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    const index = room.players.findIndex((entry) => entry.player.playerId === playerEntry.player.playerId);

    if (index >= 0) {
      room.players[index] = cloneValue(playerEntry);
    } else {
      room.players.push(cloneValue(playerEntry));
    }

    room.playerOrder = room.players.map((entry) => entry.player.playerId);
    this.notifyRoom(roomId);
    return cloneValue(room.players.find((entry) => entry.player.playerId === playerEntry.player.playerId));
  }

  async deleteRoom(roomId) {
    this.rooms.delete(roomId);
    this.notifyRoom(roomId, true);
  }

  async recordRecentRoom(summary) {
    this.persistentState.recentRooms.unshift(cloneValue(summary));
    this.persistentState.recentRooms = this.persistentState.recentRooms.slice(0, 16);
    this.queueSave();
  }

  async getHealth() {
    return {
      rooms: this.rooms.size,
      queuedQuick: this.queues.quick.length,
      queuedRanked: this.queues.ranked.length,
      shared: false
    };
  }

  subscribeToRoom(roomId, callback) {
    const key = sanitizeId(roomId);

    if (!this.roomListeners.has(key)) {
      this.roomListeners.set(key, new Set());
    }

    const listeners = this.roomListeners.get(key);
    listeners.add(callback);
    callback(cloneValue(this.rooms.get(key) ?? null));

    return () => {
      listeners.delete(callback);

      if (listeners.size === 0) {
        this.roomListeners.delete(key);
      }
    };
  }

  notifyRoom(roomId, deleted = false) {
    const listeners = this.roomListeners.get(roomId);

    if (!listeners?.size) {
      return;
    }

    const payload = deleted ? null : cloneValue(this.rooms.get(roomId) ?? null);

    for (const listener of listeners) {
      listener(payload);
    }
  }
}

class FirestoreMultiplayerStateStore {
  constructor({ firestore, getTier }) {
    this.db = firestore;
    this.getTier = getTier;
    this.enabled = true;
    this.mode = 'firestore';
  }

  profilesCollection() {
    return this.db.collection(PROFILE_COLLECTION);
  }

  roomsCollection() {
    return this.db.collection(ROOM_COLLECTION);
  }

  roomRef(roomId) {
    return this.roomsCollection().doc(roomId);
  }

  roomPlayersCollection(roomId) {
    return this.roomRef(roomId).collection(ROOM_PLAYER_SUBCOLLECTION);
  }

  quickQueueCollection() {
    return this.db.collection(QUICK_QUEUE_COLLECTION);
  }

  rankedQueueCollection() {
    return this.db.collection(RANKED_QUEUE_COLLECTION);
  }

  recentRoomsCollection() {
    return this.db.collection(RECENT_ROOM_COLLECTION);
  }

  async getProfile(playerId, fallbackName = 'Pilot') {
    const profileRef = this.profilesCollection().doc(playerId);
    const snapshot = await profileRef.get();

    if (!snapshot.exists) {
      const profile = {
        playerId,
        name: fallbackName,
        rating: 1000,
        rankedRating: 1000,
        rankedRaces: 0,
        rankedWins: 0,
        rankedPodiums: 0,
        rankedBestStreak: 0,
        rankedCurrentStreak: 0,
        rankedHistory: [],
        races: 0,
        wins: 0,
        podiums: 0,
        privateWins: 0,
        tournamentWins: 0,
        lastSeenAt: Date.now()
      };
      await profileRef.set(profile, { merge: true });
      return profile;
    }

    return {
      playerId,
      ...cloneValue(snapshot.data())
    };
  }

  async upsertProfile(player) {
    const profileRef = this.profilesCollection().doc(player.playerId);
    const existing = await this.getProfile(player.playerId, player.name);
    const nextProfile = {
      ...existing,
      name: player.name,
      lastSeenAt: Date.now()
    };

    await profileRef.set(nextProfile, { merge: true });
    return nextProfile;
  }

  async updateProfiles(updates) {
    if (!updates.length) {
      return;
    }

    const batch = this.db.batch();

    for (const update of updates) {
      const profileRef = this.profilesCollection().doc(update.playerId);
      batch.set(profileRef, {
        ...cloneValue(update),
        lastSeenAt: Date.now()
      }, { merge: true });
    }

    await batch.commit();
  }

  async buildLeaderboard(request = {}) {
    const rankedMode = request.scope === 'ranked';
    const ratingField = rankedMode ? 'rankedRating' : 'rating';
    const globalSnapshot = await this.profilesCollection()
      .orderBy(ratingField, 'desc')
      .limit(24)
      .get();

    const global = globalSnapshot.docs
      .map((doc) => ({
        playerId: doc.id,
        ...doc.data()
      }))
      .sort((profileA, profileB) => {
        if (rankedMode) {
          return (profileB.rankedRating ?? 1000) - (profileA.rankedRating ?? 1000) ||
            (profileB.rankedWins ?? 0) - (profileA.rankedWins ?? 0);
        }

        return profileB.rating - profileA.rating || profileB.wins - profileA.wins;
      })
      .slice(0, 8)
      .map((profile, index) => ({
        position: index + 1,
        playerId: profile.playerId,
        name: profile.name,
        rating: rankedMode ? (profile.rankedRating ?? 1000) : profile.rating,
        tier: this.getTier(rankedMode ? (profile.rankedRating ?? 1000) : profile.rating),
        wins: rankedMode ? (profile.rankedWins ?? 0) : profile.wins,
        races: rankedMode ? (profile.rankedRaces ?? 0) : profile.races
      }));

    const requestedIds = [...new Set([request.playerId, ...(request.friends ?? [])].map((value) => sanitizeId(value)).filter(Boolean))];
    const friends = [];

    for (let index = 0; index < requestedIds.length; index += 10) {
      const chunk = requestedIds.slice(index, index + 10);

      if (!chunk.length) {
        continue;
      }

      const snapshot = await this.profilesCollection()
        .where(FieldPath.documentId(), 'in', chunk)
        .get();

      friends.push(...snapshot.docs.map((doc) => ({
        playerId: doc.id,
        ...doc.data()
      })));
    }

    const friendEntries = friends
      .sort((profileA, profileB) => {
        if (rankedMode) {
          return (profileB.rankedRating ?? 1000) - (profileA.rankedRating ?? 1000) ||
            (profileB.rankedWins ?? 0) - (profileA.rankedWins ?? 0);
        }

        return profileB.rating - profileA.rating || profileB.wins - profileA.wins;
      })
      .slice(0, 8)
      .map((profile, index) => ({
        position: index + 1,
        playerId: profile.playerId,
        name: profile.name,
        rating: rankedMode ? (profile.rankedRating ?? 1000) : profile.rating,
        tier: this.getTier(rankedMode ? (profile.rankedRating ?? 1000) : profile.rating),
        wins: rankedMode ? (profile.rankedWins ?? 0) : profile.wins,
        races: rankedMode ? (profile.rankedRaces ?? 0) : profile.races
      }));

    return {
      updatedAt: Date.now(),
      global,
      friends: friendEntries
    };
  }

  async removeFromQueues(playerId) {
    await this.quickQueueCollection().doc(playerId).delete().catch(() => {});
    await this.rankedQueueCollection().doc(playerId).delete().catch(() => {});
  }

  async enqueueQuick(player) {
    await this.quickQueueCollection().doc(player.playerId).set({
      player: cloneValue(player),
      enqueuedAt: Date.now()
    }, { merge: true });
  }

  async enqueueRanked(player, ranked = {}) {
    await this.removeFromQueues(player.playerId);
    await this.rankedQueueCollection().doc(player.playerId).set({
      player: cloneValue(player),
      rating: Number(ranked.rating ?? 1000),
      tier: String(ranked.tier ?? this.getTier(ranked.rating ?? 1000)),
      enqueuedAt: Date.now()
    }, { merge: true });
  }

  async claimQuickQueueGroup({ minPlayers = 2, maxPlayers = 4 } = {}) {
    const results = await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(
        this.quickQueueCollection()
          .orderBy('enqueuedAt', 'asc')
          .limit(maxPlayers)
      );

      if (snapshot.size < minPlayers) {
        return [];
      }

      const players = snapshot.docs.map((doc) => ({
        playerId: doc.id,
        ...cloneValue(doc.data().player ?? {})
      }));

      for (const doc of snapshot.docs) {
        transaction.delete(doc.ref);
      }

      return players;
    });

    return results;
  }

  async claimRankedQueueGroup({ minPlayers = 2, maxPlayers = 4, now = Date.now() } = {}) {
    const results = await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(
        this.rankedQueueCollection()
          .orderBy('enqueuedAt', 'asc')
          .limit(16)
      );

      if (snapshot.size < minPlayers) {
        return [];
      }

      const entries = snapshot.docs.map((doc) => ({
        playerId: doc.id,
        ...cloneValue(doc.data())
      }));
      const seed = entries[0];
      const waitMs = now - Number(seed.enqueuedAt ?? now);
      const ratingWindow = 160 + Math.min(520, Math.floor(waitMs / 1000) * 18);
      const candidates = entries
        .filter((entry) => Math.abs(Number(entry.rating ?? 1000) - Number(seed.rating ?? 1000)) <= ratingWindow)
        .slice(0, maxPlayers);

      if (candidates.length < minPlayers) {
        return [];
      }

      const candidateIds = new Set(candidates.map((entry) => entry.playerId));

      for (const doc of snapshot.docs) {
        if (candidateIds.has(doc.id)) {
          transaction.delete(doc.ref);
        }
      }

      return candidates.map((entry) => ({
        playerId: entry.playerId,
        ...cloneValue(entry.player ?? {})
      }));
    });

    return results;
  }

  async createRoom(room) {
    const roomRef = this.roomRef(room.id);
    const batch = this.db.batch();
    batch.set(roomRef, serializeRoomMeta(room));

    for (const entry of room.players) {
      batch.set(this.roomPlayersCollection(room.id).doc(entry.player.playerId), serializeRoomPlayer(entry));
    }

    await batch.commit();
    return cloneValue(room);
  }

  async getRoom(roomId) {
    const roomRef = this.roomRef(roomId);
    const [roomSnapshot, playerSnapshots] = await Promise.all([
      roomRef.get(),
      this.roomPlayersCollection(roomId).get()
    ]);

    return composeRoom(roomSnapshot, playerSnapshots.docs);
  }

  async getRoomByCode(code) {
    const normalizedCode = String(code ?? '').trim().toUpperCase();
    const snapshot = await this.roomsCollection()
      .where('code', '==', normalizedCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.getRoom(snapshot.docs[0].id);
  }

  async findRoomByPlayer(playerId) {
    const snapshot = await this.roomsCollection()
      .where('playerOrder', 'array-contains', playerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.getRoom(snapshot.docs[0].id);
  }

  async saveRoom(room) {
    const roomRef = this.roomRef(room.id);
    const playerCollection = this.roomPlayersCollection(room.id);
    const existingPlayers = await playerCollection.get();
    const existingIds = new Set(existingPlayers.docs.map((doc) => doc.id));
    const batch = this.db.batch();

    batch.set(roomRef, serializeRoomMeta(room), { merge: true });

    for (const entry of room.players) {
      const playerId = entry.player.playerId;
      existingIds.delete(playerId);
      batch.set(playerCollection.doc(playerId), serializeRoomPlayer(entry), { merge: true });
    }

    for (const staleId of existingIds) {
      batch.delete(playerCollection.doc(staleId));
    }

    await batch.commit();
    return cloneValue(room);
  }

  async saveRoomPlayer(roomId, playerEntry) {
    await this.roomPlayersCollection(roomId)
      .doc(playerEntry.player.playerId)
      .set(serializeRoomPlayer(playerEntry), { merge: true });
    return cloneValue(playerEntry);
  }

  async deleteRoom(roomId) {
    const playerCollection = this.roomPlayersCollection(roomId);
    const existingPlayers = await playerCollection.get();
    const batch = this.db.batch();

    for (const playerDoc of existingPlayers.docs) {
      batch.delete(playerDoc.ref);
    }

    batch.delete(this.roomRef(roomId));
    await batch.commit();
  }

  async recordRecentRoom(summary) {
    const roomRef = this.recentRoomsCollection().doc(summary.id);
    await roomRef.set({
      ...cloneValue(summary),
      updatedAt: Date.now()
    }, { merge: true });

    const snapshot = await this.recentRoomsCollection()
      .orderBy('completedAt', 'desc')
      .limit(32)
      .get();

    if (snapshot.size <= 16) {
      return;
    }

    const batch = this.db.batch();
    snapshot.docs.slice(16).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  async getHealth() {
    const [roomsSnapshot, queueSnapshot, rankedQueueSnapshot] = await Promise.all([
      this.roomsCollection().limit(64).get(),
      this.quickQueueCollection().limit(64).get(),
      this.rankedQueueCollection().limit(64).get()
    ]);

    return {
      rooms: roomsSnapshot.size,
      queuedQuick: queueSnapshot.size,
      queuedRanked: rankedQueueSnapshot.size,
      shared: true
    };
  }

  subscribeToRoom(roomId, callback) {
    const roomRef = this.roomRef(roomId);
    const playerCollection = this.roomPlayersCollection(roomId);
    let latestRoomSnapshot = null;
    let latestPlayerSnapshot = null;

    const maybeEmit = () => {
      if (!latestRoomSnapshot) {
        return;
      }

      if (!latestRoomSnapshot.exists) {
        callback(null);
        return;
      }

      if (!latestPlayerSnapshot) {
        return;
      }

      callback(composeRoom(latestRoomSnapshot, latestPlayerSnapshot.docs));
    };

    const unsubscribeRoom = roomRef.onSnapshot((snapshot) => {
      latestRoomSnapshot = snapshot;
      maybeEmit();
    }, (error) => {
      console.error(`Room subscription failed for ${roomId}:`, error);
    });

    const unsubscribePlayers = playerCollection.onSnapshot((snapshot) => {
      latestPlayerSnapshot = snapshot;
      maybeEmit();
    }, (error) => {
      console.error(`Room player subscription failed for ${roomId}:`, error);
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }
}

export function createMultiplayerStateStore({ stateFile, getTier }) {
  const firestore = getAdminFirestore();

  if (firestore) {
    return new FirestoreMultiplayerStateStore({
      firestore,
      getTier
    });
  }

  return new LocalMultiplayerStateStore({
    stateFile,
    getTier
  });
}
