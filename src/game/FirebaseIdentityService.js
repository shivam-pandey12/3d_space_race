import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signOut,
  signInAnonymously,
  signInWithPopup
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  endAt,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  where,
  writeBatch
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigConfigured } from './firebaseConfig.js';

function waitForInitialUser(auth) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function formatProvider(user) {
  if (!user) {
    return 'anonymous';
  }

  if (user.isAnonymous) {
    return 'anonymous';
  }

  return user.providerData.some((entry) => entry.providerId === 'google.com')
    ? 'google'
    : 'anonymous';
}

function mapUserToAuthState(user, { shouldAdoptName = false } = {}) {
  if (!user) {
    return {
      uid: '',
      provider: 'anonymous',
      isAnonymous: true,
      email: '',
      displayName: '',
      preferredName: '',
      shouldAdoptName,
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
  }

  const creationTime = Date.parse(user.metadata?.creationTime ?? '') || Date.now();
  const lastLoginTime = Date.parse(user.metadata?.lastSignInTime ?? '') || creationTime;

  return {
    uid: user.uid,
    provider: formatProvider(user),
    isAnonymous: user.isAnonymous,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    preferredName: user.displayName ?? '',
    shouldAdoptName,
    createdAt: creationTime,
    lastLoginAt: lastLoginTime
  };
}

function createLocalGuestAuthState() {
  return {
    uid: '',
    provider: 'anonymous',
    isAnonymous: true,
    email: '',
    displayName: '',
    preferredName: '',
    shouldAdoptName: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    localOnly: true
  };
}

function formatDateLabel(value) {
  if (!value) {
    return 'Pending';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(value);
  } catch {
    return 'Pending';
  }
}

function formatDateTimeLabel(value) {
  if (!value) {
    return 'Waiting for sync';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(value);
  } catch {
    return 'Waiting for sync';
  }
}

function formatUidLabel(uid) {
  if (!uid) {
    return 'Connecting';
  }

  if (uid.length <= 12) {
    return uid;
  }

  return `${uid.slice(0, 6)}...${uid.slice(-4)}`;
}

function isPermissionError(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();

  return code.includes('permission-denied') || message.includes('insufficient permissions');
}

function isAnonymousAuthUnavailable(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();

  return (
    code.includes('operation-not-allowed') ||
    code.includes('admin-restricted-operation') ||
    message.includes('operation_not_allowed') ||
    message.includes('configuration_not_found') ||
    message.includes('anonymous')
  );
}

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  return Number(value) || 0;
}

function createPairId(userA, userB) {
  return [String(userA), String(userB)].sort().join('__');
}

function createNotificationId() {
  return `note_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function shortUid(uid) {
  if (!uid) {
    return '';
  }

  if (uid.length <= 14) {
    return uid;
  }

  return `${uid.slice(0, 8)}...${uid.slice(-4)}`;
}

export class FirebaseIdentityService extends EventTarget {
  constructor(profileStore) {
    super();
    this.profileStore = profileStore;
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentAuth = null;
    this.ready = false;
    this.initialized = false;
    this.lastSyncedAt = 0;
    this.saveTimer = 0;
    this.pendingProfile = null;
    this.lastProfile = null;
    this.socialUnsubscribers = [];
    this.social = {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      notifications: [],
      searchResults: [],
      searchTerm: '',
      searchStatus: '',
      requestLookup: new Map()
    };
    this.status = {
      phase: 'idle',
      message: 'Identity offline',
      error: ''
    };
  }

  async initialize() {
    if (!isFirebaseConfigConfigured()) {
      const authState = createLocalGuestAuthState();
      this.currentAuth = authState;
      this.ready = true;
      this.initialized = true;
      this.lastSyncedAt = 0;
      this.setStatus('ready', 'Local guest ready. Firebase web config is not set.');

      return {
        authState,
        cloudProfile: null,
        localOnly: true
      };
    }

    this.ensureFirebase();
    this.setStatus('authenticating', 'Connecting pilot profile');

    try {
      await setPersistence(this.auth, browserLocalPersistence);
    } catch (error) {
      this.setStatus('error', 'Could not enable persistent auth', error);
      throw error;
    }

    let user = await waitForInitialUser(this.auth);

    if (!user) {
      this.setStatus('authenticating', 'Creating guest identity');
      try {
        const credential = await signInAnonymously(this.auth);
        user = credential.user;
      } catch (error) {
        if (!isAnonymousAuthUnavailable(error)) {
          this.setStatus('error', 'Could not create guest identity', error);
          throw error;
        }

        const authState = createLocalGuestAuthState();
        this.currentAuth = authState;
        this.ready = true;
        this.initialized = true;
        this.lastSyncedAt = 0;
        this.setStatus('ready', 'Local guest ready. Firebase Anonymous Auth is disabled.');

        return {
          authState,
          cloudProfile: null,
          localOnly: true
        };
      }
    }

    const authState = mapUserToAuthState(user);
    this.currentAuth = authState;
    this.ready = true;
    this.initialized = true;
    this.setStatus('ready', authState.provider === 'google' ? 'Google identity linked' : 'Guest identity ready');
    const cloudProfile = await this.loadCloudProfile(authState.uid);
    this.stopSocialListeners();

    return {
      authState,
      cloudProfile
    };
  }

  async signInWithGoogle() {
    this.ensureFirebase();
    this.setStatus('authenticating', 'Opening Google sign-in');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    let user = null;

    try {
      if (this.auth.currentUser?.isAnonymous) {
        user = (await linkWithPopup(this.auth.currentUser, provider)).user;
      } else {
        user = (await signInWithPopup(this.auth, provider)).user;
      }
    } catch (error) {
      if (this.auth.currentUser?.isAnonymous && error?.code === 'auth/provider-already-linked') {
        user = (await signInWithPopup(this.auth, provider)).user;
      } else {
        this.setStatus('error', this.getErrorMessage(error), error);
        throw error;
      }
    }

    const authState = mapUserToAuthState(user, { shouldAdoptName: true });
    this.currentAuth = authState;
    this.ready = true;
    this.initialized = true;
    this.setStatus('ready', 'Google identity linked');
    const cloudProfile = await this.loadCloudProfile(authState.uid);
    this.stopSocialListeners();

    return {
      authState,
      cloudProfile
    };
  }

  async logoutToGuest() {
    this.ensureFirebase();
    this.setStatus('authenticating', 'Signing out');
    this.stopSocialListeners();

    try {
      if (this.auth.currentUser) {
        await signOut(this.auth);
      }

      let authState;
      let cloudProfile = null;
      let localOnly = false;

      try {
        const credential = await signInAnonymously(this.auth);
        authState = mapUserToAuthState(credential.user);
        cloudProfile = await this.loadCloudProfile(authState.uid);
      } catch (error) {
        if (!isAnonymousAuthUnavailable(error)) {
          throw error;
        }

        authState = createLocalGuestAuthState();
        localOnly = true;
        this.setStatus('ready', 'Logged out. Local guest mode is active because Anonymous Auth is disabled.');
      }

      this.currentAuth = authState;
      this.ready = true;
      this.initialized = true;
      this.lastSyncedAt = 0;

      if (!localOnly) {
        this.setStatus('ready', 'Guest identity ready');
      }

      return {
        authState,
        cloudProfile,
        localOnly
      };
    } catch (error) {
      this.setStatus('error', this.getErrorMessage(error), error);
      throw error;
    }
  }

  ensureFirebase() {
    if (!isFirebaseConfigConfigured()) {
      throw new Error('Firebase web config is not configured. Set VITE_FIREBASE_* env vars for Google sign-in and cloud profile sync.');
    }

    if (!this.app) {
      this.app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
    }

    return {
      app: this.app,
      auth: this.auth,
      db: this.db
    };
  }

  async getMultiplayerAuthPayload(forceRefresh = false) {
    if (!isFirebaseConfigConfigured()) {
      return {
        playerId: this.currentAuth?.uid ?? '',
        authUid: this.currentAuth?.uid ?? '',
        authProvider: this.currentAuth?.provider ?? 'anonymous',
        authToken: ''
      };
    }

    this.ensureFirebase();

    if (!this.auth?.currentUser) {
      return {
        playerId: this.currentAuth?.uid ?? '',
        authUid: this.currentAuth?.uid ?? '',
        authProvider: this.currentAuth?.provider ?? 'anonymous',
        authToken: ''
      };
    }

    const user = this.auth.currentUser;
    const authToken = await user.getIdToken(forceRefresh);
    const authState = mapUserToAuthState(user);
    this.currentAuth = authState;

    return {
      playerId: authState.uid,
      authUid: authState.uid,
      authProvider: authState.provider,
      authToken
    };
  }

  async loadCloudProfile(uid) {
    if (!uid) {
      return null;
    }

    this.setStatus('loading', 'Loading cloud profile');

    try {
      const snapshot = await getDoc(doc(this.db, 'players', uid));

      if (!snapshot.exists()) {
        this.setStatus('ready', 'No cloud save yet');
        return null;
      }

      this.setStatus('ready', 'Cloud profile loaded');
      return snapshot.data();
    } catch (error) {
      this.setStatus(
        'error',
        isPermissionError(error)
          ? 'Cloud sync blocked by Firestore rules'
          : 'Could not load cloud profile',
        error
      );
      return null;
    }
  }

  queueProfileSave(profile) {
    if (!this.ready || !this.currentAuth?.uid) {
      return;
    }

    this.lastProfile = profile;
    this.pendingProfile = profile;

    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = 0;
      void this.flushProfileSave();
    }, 280);
  }

  async flushProfileSave() {
    if (!this.pendingProfile || !this.currentAuth?.uid) {
      return;
    }

    const profile = this.pendingProfile;
    this.pendingProfile = null;
    const payload = this.profileStore.getCloudPayload(profile);
    const documentPayload = {
      ...payload,
      pilotId: this.currentAuth.uid,
      playerName: payload.playerName,
      usernameLower: String(payload.playerName ?? '').toLowerCase(),
      auth: {
        ...payload.auth,
        uid: this.currentAuth.uid,
        provider: this.currentAuth.provider,
        isAnonymous: this.currentAuth.isAnonymous,
        email: this.currentAuth.email,
        displayName: this.currentAuth.displayName || payload.playerName,
        createdAt: this.currentAuth.createdAt,
        lastLoginAt: this.currentAuth.lastLoginAt
      },
      meta: {
        clientUpdatedAt: Date.now(),
        savedAt: serverTimestamp(),
        version: 1
      }
    };

    this.setStatus('syncing', 'Syncing profile to Firebase');

    try {
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'players', this.currentAuth.uid), documentPayload, { merge: true });
      batch.set(doc(this.db, 'playerDirectory', this.currentAuth.uid), {
        uid: this.currentAuth.uid,
        playerName: payload.playerName,
        usernameLower: String(payload.playerName ?? '').toLowerCase(),
        email: this.currentAuth.email || '',
        level: this.profileStore.getLevelInfo(payload.xp ?? 0).level,
        rating: payload.multiplayer?.rating ?? 1000,
        shipId: payload.selectedShipId ?? 'starling',
        updatedAt: serverTimestamp(),
        createdAt: payload.createdAt ?? this.currentAuth.createdAt
      }, { merge: true });
      await batch.commit();
      this.lastSyncedAt = Date.now();
      this.setStatus('ready', 'Profile synced');
    } catch (error) {
      this.setStatus(
        'error',
        isPermissionError(error)
          ? 'Cloud sync blocked by Firestore rules'
          : 'Profile sync failed',
        error
      );
    }
  }

  startSocialListeners(uid) {
    this.stopSocialListeners();

    if (!uid) {
      return;
    }

    const friendsQuery = query(collection(this.db, 'players', uid, 'friends'), orderBy('playerName'), limit(24));
    const incomingQuery = query(
      collection(this.db, 'players', uid, 'incomingFriendRequests'),
      orderBy('updatedAt', 'desc'),
      limit(24)
    );
    const outgoingQuery = query(
      collection(this.db, 'players', uid, 'outgoingFriendRequests'),
      orderBy('updatedAt', 'desc'),
      limit(24)
    );
    const notificationsQuery = query(
      collection(this.db, 'players', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(12)
    );

    this.socialUnsubscribers = [
      onSnapshot(
        friendsQuery,
        (snapshot) => {
          this.social.friends = snapshot.docs.map((entry) => {
            const data = entry.data();
            return {
              uid: entry.id,
              playerName: data.playerName ?? 'Pilot',
              shortUid: shortUid(entry.id),
              sinceAt: timestampToMillis(data.acceptedAt ?? data.updatedAt)
            };
          });
          this.emitSocialChange();
        },
        (error) => this.handleSocialSnapshotError(error)
      ),
      onSnapshot(
        incomingQuery,
        (snapshot) => {
          this.social.incomingRequests = snapshot.docs
            .map((entry) => this.mapRequest(entry))
            .filter((entry) => entry.status === 'pending');
          this.social.incomingRequests = this.sortRequests(this.social.incomingRequests);
          this.refreshRequestLookup();
          this.emitSocialChange();
        },
        (error) => this.handleSocialSnapshotError(error)
      ),
      onSnapshot(
        outgoingQuery,
        (snapshot) => {
          this.social.outgoingRequests = snapshot.docs
            .map((entry) => this.mapRequest(entry))
            .filter((entry) => entry.status === 'pending');
          this.social.outgoingRequests = this.sortRequests(this.social.outgoingRequests);
          this.refreshRequestLookup();
          this.emitSocialChange();
        },
        (error) => this.handleSocialSnapshotError(error)
      ),
      onSnapshot(
        notificationsQuery,
        (snapshot) => {
          this.social.notifications = snapshot.docs.map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              type: data.type ?? 'notice',
              message: data.message ?? 'New update',
              requestId: data.requestId ?? '',
              actorId: data.actorId ?? '',
              createdAt: timestampToMillis(data.createdAt),
              read: Boolean(data.read)
            };
          });
          this.emitSocialChange();
        },
        (error) => this.handleSocialSnapshotError(error)
      )
    ];
  }

  stopSocialListeners() {
    for (const unsubscribe of this.socialUnsubscribers) {
      unsubscribe();
    }

    this.socialUnsubscribers = [];
    this.social = {
      ...this.social,
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      notifications: [],
      searchResults: [],
      searchStatus: '',
      requestLookup: new Map()
    };
  }

  refreshRequestLookup() {
    const lookup = new Map();

    for (const request of [...this.social.incomingRequests, ...this.social.outgoingRequests]) {
      lookup.set(request.id, request);
      lookup.set(createPairId(request.requesterId, request.targetId), request);
    }

    this.social.requestLookup = lookup;
  }

  handleSocialSnapshotError(error) {
    this.social.searchStatus = isPermissionError(error)
      ? 'Friend requests are blocked by Firestore rules. Recheck playerDirectory, friendRequests, and notifications permissions.'
      : this.getErrorMessage(error);
    this.emitSocialChange();
  }

  sortRequests(requests) {
    return [...requests]
      .sort((left, right) => {
        const rightTime = right.updatedAt || right.createdAt || 0;
        const leftTime = left.updatedAt || left.createdAt || 0;
        return rightTime - leftTime;
      })
      .slice(0, 24);
  }

  async commitMirrorWrites(operations) {
    if (!operations?.length) {
      return;
    }

    try {
      const batch = writeBatch(this.db);

      for (const operation of operations) {
        batch.set(
          doc(this.db, 'players', operation.userId, operation.collectionName, operation.requestId),
          operation.payload,
          { merge: true }
        );
      }

      await batch.commit();
    } catch {
      // Root request docs drive the live social UI now, so mirrored copies are best-effort only.
    }
  }

  async commitBestEffortWrites(operations) {
    if (!operations?.length) {
      return;
    }

    try {
      const batch = writeBatch(this.db);

      for (const operation of operations) {
        const target = doc(this.db, ...operation.pathSegments);

        if (operation.mode === 'delete') {
          batch.delete(target);
        } else {
          batch.set(target, operation.payload, { merge: true });
        }
      }

      await batch.commit();
    } catch {
      // Notifications and mirrored metadata should never block the core social action.
    }
  }

  mapRequest(entry) {
    const data = entry.data();
    const incoming = data.targetId === this.currentAuth?.uid;

    return {
      id: entry.id,
      requesterId: data.requesterId,
      requesterName: data.requesterName ?? 'Pilot',
      targetId: data.targetId,
      targetName: data.targetName ?? 'Pilot',
      status: data.status ?? 'pending',
      createdAt: timestampToMillis(data.createdAt),
      updatedAt: timestampToMillis(data.updatedAt),
      direction: incoming ? 'incoming' : 'outgoing',
      otherUid: incoming ? data.requesterId : data.targetId,
      otherName: incoming ? (data.requesterName ?? 'Pilot') : (data.targetName ?? 'Pilot'),
      otherShortUid: shortUid(incoming ? data.requesterId : data.targetId)
    };
  }

  emitSocialChange() {
    this.dispatchEvent(new CustomEvent('social-change', {
      detail: this.getSocialView()
    }));
  }

  getSocialView() {
    return {
      friends: this.social.friends.map((friend) => ({ ...friend })),
      incomingRequests: this.social.incomingRequests.map((entry) => ({ ...entry })),
      outgoingRequests: this.social.outgoingRequests.map((entry) => ({ ...entry })),
      notifications: this.social.notifications.map((entry) => ({ ...entry })),
      searchResults: this.social.searchResults.map((entry) => ({ ...entry })),
      searchTerm: this.social.searchTerm,
      searchStatus: this.social.searchStatus,
      friendIds: this.social.friends.map((friend) => friend.uid)
    };
  }

  async searchPlayers(rawTerm) {
    this.ensureFirebase();
    const term = String(rawTerm ?? '').trim();
    this.social.searchTerm = term;

    if (!this.currentAuth?.uid) {
      this.social.searchStatus = 'Sign in first to search for pilots.';
      this.social.searchResults = [];
      this.emitSocialChange();
      return this.getSocialView();
    }

    if (term.length < 2) {
      this.social.searchStatus = 'Type at least 2 characters or paste a pilot ID.';
      this.social.searchResults = [];
      this.emitSocialChange();
      return this.getSocialView();
    }

    const lowerTerm = term.toLowerCase();
    const resultMap = new Map();

    try {
      if (term.length >= 8) {
        const exactDoc = await getDoc(doc(this.db, 'playerDirectory', term));

        if (exactDoc.exists()) {
          resultMap.set(exactDoc.id, {
            uid: exactDoc.id,
            ...exactDoc.data()
          });
        }
      }

      const nameMatches = await getDocs(query(
        collection(this.db, 'playerDirectory'),
        orderBy('usernameLower'),
        startAt(lowerTerm),
        endAt(`${lowerTerm}\uf8ff`),
        limit(8)
      ));

      for (const entry of nameMatches.docs) {
        resultMap.set(entry.id, {
          uid: entry.id,
          ...entry.data()
        });
      }

      this.social.searchResults = [...resultMap.values()]
        .filter((entry) => entry.uid !== this.currentAuth.uid)
        .map((entry) => {
          const pairId = createPairId(this.currentAuth.uid, entry.uid);
          const request = this.social.requestLookup.get(pairId);
          const alreadyFriend = this.social.friends.some((friend) => friend.uid === entry.uid);

          return {
            uid: entry.uid,
            playerName: entry.playerName ?? 'Pilot',
            shortUid: shortUid(entry.uid),
            rating: entry.rating ?? 1000,
            level: entry.level ?? 1,
            isFriend: alreadyFriend,
            pendingDirection: request?.status === 'pending' ? request.direction : '',
            requestId: request?.id ?? ''
          };
        })
        .slice(0, 8);

      this.social.searchStatus = this.social.searchResults.length > 0
        ? ''
        : 'No pilot found with that name or ID yet.';
    } catch (error) {
      this.social.searchResults = [];
      this.social.searchStatus = isPermissionError(error)
        ? 'Search is blocked by Firestore rules for playerDirectory or friendRequests.'
        : this.getErrorMessage(error);
    }

    this.emitSocialChange();
    return this.getSocialView();
  }

  async sendFriendRequest(targetUid) {
    if (!this.currentAuth?.uid) {
      throw new Error('Sign in first to send a friend request.');
    }

    const cleanTargetId = String(targetUid ?? '').trim();

    if (!cleanTargetId || cleanTargetId === this.currentAuth.uid) {
      throw new Error('Choose another pilot to add.');
    }

    if (this.social.friends.some((friend) => friend.uid === cleanTargetId)) {
      throw new Error('That pilot is already in your friends list.');
    }

    const localName = this.lastProfile?.playerName || this.currentAuth.displayName || 'Pilot';
    const requestId = createPairId(this.currentAuth.uid, cleanTargetId);
    const targetDirectory = await getDoc(doc(this.db, 'playerDirectory', cleanTargetId));

    if (!targetDirectory.exists()) {
      throw new Error('That pilot was not found in the player directory.');
    }

    const targetData = targetDirectory.data();
    const existing = await getDoc(doc(this.db, 'friendRequests', requestId));
    const requestPayload = {
      requesterId: this.currentAuth.uid,
      requesterName: localName,
      targetId: cleanTargetId,
      targetName: targetData.playerName ?? 'Pilot',
      status: 'pending',
      createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const batch = writeBatch(this.db);
    batch.set(doc(this.db, 'friendRequests', requestId), requestPayload, { merge: true });
    batch.set(doc(this.db, 'players', this.currentAuth.uid, 'outgoingFriendRequests', requestId), requestPayload, { merge: true });
    batch.set(doc(this.db, 'players', cleanTargetId, 'incomingFriendRequests', requestId), requestPayload, { merge: true });
    await batch.commit();

    void this.commitBestEffortWrites([
      {
        pathSegments: ['players', cleanTargetId, 'notifications', createNotificationId()],
        payload: {
          type: 'friend-request',
          message: `${localName} sent you a friend request.`,
          actorId: this.currentAuth.uid,
          actorName: localName,
          createdAt: serverTimestamp(),
          read: false,
          requestId
        }
      }
    ]);

    const optimisticRequest = {
      id: requestId,
      requesterId: this.currentAuth.uid,
      requesterName: localName,
      targetId: cleanTargetId,
      targetName: targetData.playerName ?? 'Pilot',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      direction: 'outgoing',
      otherUid: cleanTargetId,
      otherName: targetData.playerName ?? 'Pilot',
      otherShortUid: shortUid(cleanTargetId)
    };

    this.social.outgoingRequests = this.sortRequests([
      optimisticRequest,
      ...this.social.outgoingRequests.filter((entry) => entry.id !== requestId)
    ]);
    this.refreshRequestLookup();
    this.social.searchResults = this.social.searchResults.map((entry) => (
      entry.uid === cleanTargetId
        ? { ...entry, pendingDirection: 'outgoing', requestId }
        : entry
    ));
    this.emitSocialChange();
  }

  async acceptFriendRequest(requestId) {
    const requestRef = doc(this.db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('That friend request no longer exists.');
    }

    const request = requestSnap.data();

    if (request.targetId !== this.currentAuth?.uid) {
      throw new Error('Only the receiving pilot can accept this request.');
    }

    const batch = writeBatch(this.db);
    batch.update(requestRef, {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
    batch.set(doc(this.db, 'players', request.requesterId, 'outgoingFriendRequests', requestId), {
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      targetId: request.targetId,
      targetName: request.targetName,
      status: 'accepted',
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(this.db, 'players', request.targetId, 'incomingFriendRequests', requestId), {
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      targetId: request.targetId,
      targetName: request.targetName,
      status: 'accepted',
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(this.db, 'players', request.requesterId, 'friends', request.targetId), {
      uid: request.targetId,
      playerName: request.targetName,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(doc(this.db, 'players', request.targetId, 'friends', request.requesterId), {
      uid: request.requesterId,
      playerName: request.requesterName,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await batch.commit();

    void this.commitBestEffortWrites([
      {
        pathSegments: ['players', request.requesterId, 'notifications', createNotificationId()],
        payload: {
          type: 'friend-accepted',
          message: `${request.targetName} accepted your friend request.`,
          actorId: request.targetId,
          actorName: request.targetName,
          createdAt: serverTimestamp(),
          read: false,
          requestId
        }
      },
      {
        pathSegments: ['players', request.targetId, 'notifications', createNotificationId()],
        payload: {
          type: 'friend-accepted',
          message: `You and ${request.requesterName} are now friends.`,
          actorId: request.requesterId,
          actorName: request.requesterName,
          createdAt: serverTimestamp(),
          read: false,
          requestId
        }
      }
    ]);

    this.social.incomingRequests = this.social.incomingRequests.filter((entry) => entry.id !== requestId);
    this.refreshRequestLookup();
    this.emitSocialChange();
  }

  async declineFriendRequest(requestId) {
    const requestRef = doc(this.db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('That friend request no longer exists.');
    }

    const request = requestSnap.data();

    if (request.targetId !== this.currentAuth?.uid) {
      throw new Error('Only the receiving pilot can decline this request.');
    }

    const batch = writeBatch(this.db);
    batch.set(requestRef, {
      status: 'declined',
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(this.db, 'players', request.requesterId, 'outgoingFriendRequests', requestId), {
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      targetId: request.targetId,
      targetName: request.targetName,
      status: 'declined',
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(this.db, 'players', request.targetId, 'incomingFriendRequests', requestId), {
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      targetId: request.targetId,
      targetName: request.targetName,
      status: 'declined',
      updatedAt: serverTimestamp()
    }, { merge: true });
    await batch.commit();

    void this.commitBestEffortWrites([
      {
        pathSegments: ['players', request.requesterId, 'notifications', createNotificationId()],
        payload: {
          type: 'friend-declined',
          message: `${request.targetName} declined your friend request.`,
          actorId: request.targetId,
          actorName: request.targetName,
          createdAt: serverTimestamp(),
          read: false,
          requestId
        }
      }
    ]);

    this.social.incomingRequests = this.social.incomingRequests.filter((entry) => entry.id !== requestId);
    this.refreshRequestLookup();
    this.emitSocialChange();
  }

  async removeFriend(friendUid) {
    const cleanFriendId = String(friendUid ?? '').trim();

    if (!cleanFriendId || !this.currentAuth?.uid) {
      throw new Error('Choose a valid friend to remove.');
    }

    const localName = this.lastProfile?.playerName || this.currentAuth.displayName || 'Pilot';
    const friend = this.social.friends.find((entry) => entry.uid === cleanFriendId);
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, 'players', this.currentAuth.uid, 'friends', cleanFriendId));
    batch.delete(doc(this.db, 'players', cleanFriendId, 'friends', this.currentAuth.uid));

    const pairId = createPairId(this.currentAuth.uid, cleanFriendId);
    const requestRef = doc(this.db, 'friendRequests', pairId);
    const existing = await getDoc(requestRef);

    if (existing.exists()) {
      batch.update(requestRef, {
        status: 'removed',
        updatedAt: serverTimestamp()
      });
      batch.set(doc(this.db, 'players', this.currentAuth.uid, 'outgoingFriendRequests', pairId), {
        status: 'removed',
        updatedAt: serverTimestamp()
      }, { merge: true });
      batch.set(doc(this.db, 'players', this.currentAuth.uid, 'incomingFriendRequests', pairId), {
        status: 'removed',
        updatedAt: serverTimestamp()
      }, { merge: true });
      batch.set(doc(this.db, 'players', cleanFriendId, 'outgoingFriendRequests', pairId), {
        status: 'removed',
        updatedAt: serverTimestamp()
      }, { merge: true });
      batch.set(doc(this.db, 'players', cleanFriendId, 'incomingFriendRequests', pairId), {
        status: 'removed',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();

    void this.commitBestEffortWrites([
      {
        pathSegments: ['players', cleanFriendId, 'notifications', createNotificationId()],
        payload: {
          type: 'friend-removed',
          message: `${localName} removed you from friends.`,
          actorId: this.currentAuth.uid,
          actorName: localName,
          createdAt: serverTimestamp(),
          read: false
        }
      }
    ]);

    if (friend) {
      this.social.friends = this.social.friends.filter((entry) => entry.uid !== cleanFriendId);
      this.social.notifications.unshift({
        id: createNotificationId(),
        type: 'friend-removed',
        message: `${friend.playerName} was removed from friends.`,
        createdAt: Date.now(),
        read: false
      });
      this.social.notifications = this.social.notifications.slice(0, 12);
    }

    this.emitSocialChange();
  }

  async dismissNotification(notificationId) {
    if (!this.currentAuth?.uid || !notificationId) {
      return;
    }

    await deleteDoc(doc(this.db, 'players', this.currentAuth.uid, 'notifications', notificationId));
  }

  getStatusView(profile) {
    const auth = profile?.auth?.uid ? profile.auth : (this.currentAuth ?? profile?.auth ?? {});
    const provider = auth.provider === 'google' ? 'Google' : 'Guest';
    const syncLabel = this.status.phase === 'error'
      ? this.status.error || 'Sync error'
      : this.status.phase === 'syncing'
        ? 'Syncing now'
        : !auth.uid && this.ready
          ? (this.status.message || 'Local guest mode')
        : this.lastSyncedAt
          ? `Last sync ${formatDateTimeLabel(this.lastSyncedAt)}`
          : this.ready
            ? 'Waiting for changes'
            : this.status.message;

    return {
      ready: this.ready,
      provider,
      providerKey: auth.provider === 'google' ? 'google' : 'anonymous',
      statusLabel: syncLabel,
      uid: auth.uid ?? '',
      uidLabel: auth.uid ? formatUidLabel(auth.uid) : 'Local only',
      email: auth.email ?? '',
      createdLabel: formatDateLabel(auth.createdAt ?? profile?.createdAt ?? 0),
      canUseGoogle: auth.provider !== 'google',
      googleLabel: auth.provider === 'google' ? 'Google Linked' : 'Continue With Google',
      canLogout: Boolean(auth.uid),
      logoutLabel: auth.provider === 'google' ? 'Log Out To Guest' : 'Reset Guest Session'
    };
  }

  getErrorMessage(error) {
    if (error?.code === 'auth/popup-closed-by-user') {
      return 'Google sign-in was closed before it finished.';
    }

    if (error?.code === 'auth/cancelled-popup-request') {
      return 'Another Google sign-in window is already open.';
    }

    if (error?.code === 'auth/popup-blocked') {
      return 'Your browser blocked the Google sign-in popup.';
    }

    if (error?.code === 'auth/operation-not-allowed' || error?.code === 'auth/admin-restricted-operation') {
      return 'Firebase Anonymous Auth is disabled for this project.';
    }

    if (isPermissionError(error)) {
      return 'Firestore rules are blocking this profile read/write.';
    }

    return error?.message ?? 'Firebase request failed.';
  }

  setStatus(phase, message, error = null) {
    this.status = {
      phase,
      message,
      error: error ? this.getErrorMessage(error) : ''
    };

    this.dispatchEvent(new CustomEvent('status-change', {
      detail: {
        ...this.status,
        ready: this.ready,
        lastSyncedAt: this.lastSyncedAt
      }
    }));
  }

  dispose() {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = 0;
    }

    this.stopSocialListeners();
  }
}
