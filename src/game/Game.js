import * as THREE from 'three';
import { AiPilot } from './AiPilot.js';
import { EntitlementService } from './EntitlementService.js';
import { EventService } from './EventService.js';
import { FirebaseIdentityService } from './FirebaseIdentityService.js';
import {
  CHALLENGE_LOOKUP,
  GLOW_COLORS,
  GLOW_LOOKUP,
  HULL_COLORS,
  HULL_LOOKUP,
  SHIP_DEFS,
  SHIP_LOOKUP,
  TRACK_DEFS,
  TRACK_LOOKUP,
  TRAIL_COLORS,
  TRAIL_LOOKUP
} from './gameContent.js';
import { GaragePreview } from './GaragePreview.js';
import { InputController } from './input.js';
import { MetaUI } from './MetaUI.js';
import { MultiplayerClient } from './MultiplayerClient.js';
import { PowerUpSystem } from './PowerUpSystem.js';
import { ProfileStore } from './ProfileStore.js';
import { RaceCamera } from './RaceCamera.js';
import { createAiNames, RaceCommentary } from './RaceCommentary.js';
import { RaceEffects } from './RaceEffects.js';
import { RaceHud } from './RaceHud.js';
import { RacingShip } from './RacingShip.js';
import { RaceTrack } from './RaceTrack.js';
import { ReplayCaptureService, sampleReplayFrame } from './ReplayCaptureService.js';
import { SoundSystem } from './SoundSystem.js';
import { SpeedLines } from './SpeedLines.js';
import { createStarfield } from './stars.js';
import { FEATURE_KEYS } from './editionConfig.js';
import { MULTIPLAYER_BALANCE_STATS } from './multiplayerContent.js';
import {
  ADVANCED_COSMETIC_CATEGORIES,
  ADVANCED_COSMETIC_ITEMS,
  ADVANCED_COSMETIC_LOOKUP,
  buildAdvancedVisualConfig,
  sanitizeNumberPlate
} from './advancedGarageContent.js';
import {
  CAMPAIGN_CUPS,
  createCampaignAiRoster,
  getCampaignCup,
  getCampaignRace,
  getCampaignRival
} from './premiumCampaignContent.js';
import {
  TOURNAMENT_PLAYER_ID,
  TOURNAMENT_TYPES,
  advanceTournamentBracket,
  createTournamentAiRoster,
  createTournamentBracket,
  getTournamentRaceSetup,
  getTournamentType
} from './premiumTournamentContent.js';
import { getEffectiveShipStats, summarizeShipUpgrades } from './ShipStatsResolver.js';
import { UPGRADE_MODULES, getModuleCost, getModuleMaxLevel } from './shipUpgradeContent.js';
import {
  CUSTOM_RACE_DENSITIES,
  CUSTOM_RACE_DIFFICULTIES,
  CUSTOM_RACE_SHORTCUTS,
  CUSTOM_RACE_STAT_MODES,
  CUSTOM_RACE_VISUAL_EFFECTS,
  buildCustomTrackDefinition,
  getCustomRaceLimits,
  randomizeCustomRaceConfig,
  sanitizeCustomRaceConfig
} from './customRaceLabContent.js';
import {
  getRewardIdsForCampaignCup,
  getRewardIdsForCustomRace,
  getRewardIdsForTournament
} from './premiumRewardContent.js';
import {
  RANKED_TIERS,
  getRankedSeason,
  getRankedTierProgress
} from './rankedSeasonContent.js';
import {
  buildLiveEventTrackDefinition,
  getLiveEvent,
  getLiveEventSet
} from './liveEventContent.js';
import {
  BOSS_EVENT_DEFS,
  buildBossTrackDefinition,
  createBossAiRoster,
  getBossEvent
} from './bossEventContent.js';
import {
  WORLD_LORE,
  getCupLore,
  getRivalLore,
  getShipLore,
  getTrackLore
} from './premiumLoreContent.js';
import {
  exportCustomRacePresetCode,
  parseCustomRacePresetCode,
  summarizeCustomRacePresetCode
} from './customRacePresetCodes.js';
import { getOnlineExpansionPrep } from './onlineExpansionPrepContent.js';

const AI_BLUEPRINTS = [
  {
    label: 'Rammer',
    shipId: 'atlas',
    hullId: 'sunfire',
    glowId: 'amber-core',
    trailId: 'flare-trail',
    pace: 1.02,
    lanePreference: -2.1,
    laneAmplitude: 1.6,
    laneFrequency: 0.36,
    caution: 0.9,
    aggression: 1.24,
    wobble: 0.06,
    personaLabel: 'Aggressive Rammer',
    boostAggression: 1.02,
    boostDiscipline: 0.92,
    shortcutBias: 0.94,
    driftBias: 0.88,
    contactBias: 1.34,
    precision: 0.9,
    preferredIdentity: 'hazard-chaos'
  },
  {
    label: 'Apex',
    shipId: 'velour',
    hullId: 'mint',
    glowId: 'emerald-core',
    trailId: 'echo-trail',
    pace: 1.04,
    lanePreference: 1.2,
    laneAmplitude: 1.1,
    laneFrequency: 0.22,
    caution: 1.02,
    aggression: 0.9,
    wobble: 0.03,
    personaLabel: 'Clean Fast Driver',
    boostAggression: 0.94,
    boostDiscipline: 1.08,
    shortcutBias: 0.86,
    driftBias: 0.94,
    contactBias: 0.74,
    precision: 1.28,
    preferredIdentity: 'crown-chicane'
  },
  {
    label: 'Vault',
    shipId: 'solstice',
    hullId: 'violet',
    glowId: 'violet-core',
    trailId: 'rift-trail',
    pace: 0.99,
    lanePreference: -0.6,
    laneAmplitude: 1.8,
    laneFrequency: 0.38,
    caution: 0.98,
    aggression: 1.06,
    wobble: 0.07,
    personaLabel: 'Boost Hoarder',
    boostAggression: 1.22,
    boostDiscipline: 1.18,
    shortcutBias: 0.96,
    driftBias: 0.96,
    contactBias: 0.92,
    precision: 1.04,
    preferredIdentity: 'prestige-flow'
  },
  {
    label: 'Vector',
    shipId: 'ghostwire',
    hullId: 'azure',
    glowId: 'cyan-core',
    trailId: 'ion-trail',
    pace: 0.98,
    lanePreference: 2.4,
    laneAmplitude: 2.4,
    laneFrequency: 0.56,
    caution: 1.04,
    aggression: 0.98,
    wobble: 0.08,
    personaLabel: 'Drift Specialist',
    boostAggression: 0.88,
    boostDiscipline: 1.02,
    shortcutBias: 1.18,
    driftBias: 1.3,
    contactBias: 0.82,
    precision: 1.1,
    preferredIdentity: 'technical-drift'
  },
  {
    label: 'Chaos',
    shipId: 'imperion',
    hullId: 'crimson',
    glowId: 'plasma-core',
    trailId: 'nova-trail',
    pace: 1.03,
    lanePreference: -3.1,
    laneAmplitude: 2.2,
    laneFrequency: 0.44,
    caution: 0.92,
    aggression: 1.12,
    wobble: 0.1,
    personaLabel: 'Chaos Opportunist',
    boostAggression: 1.08,
    boostDiscipline: 0.96,
    shortcutBias: 1.14,
    driftBias: 1.06,
    contactBias: 1.08,
    precision: 0.96,
    preferredIdentity: 'hazard-chaos'
  }
];

const PLACE_REWARDS = [
  { points: 620, currency: 520, xp: 320 },
  { points: 500, currency: 430, xp: 270 },
  { points: 410, currency: 350, xp: 230 },
  { points: 340, currency: 300, xp: 200 },
  { points: 290, currency: 255, xp: 175 },
  { points: 250, currency: 225, xp: 155 }
];

const MULTIPLAYER_SNAPSHOT_INTERVAL = 1 / 12;
const TIME_TRIAL_SAMPLE_INTERVAL = 1 / 14;

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

function toHex(value) {
  return value.toString(16).padStart(6, '0');
}

function rewardString(reward) {
  return `+${reward.xp} XP / +${reward.currency} CR / +${reward.points} PTS`;
}

function formatTimeMs(value, fallback = '--:--.---') {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  const totalMilliseconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalMilliseconds / 60000);
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function sumRewards(rewards) {
  return rewards.reduce(
    (total, reward) => ({
      points: total.points + reward.points,
      currency: total.currency + reward.currency,
      xp: total.xp + reward.xp
    }),
    { points: 0, currency: 0, xp: 0 }
  );
}

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x01030a);
    this.profileStore = new ProfileStore();
    this.profile = this.profileStore.load();
    this.entitlements = new EntitlementService();
    this.entitlements.setAccountContext(this.profile.auth);
    this.selectedPremiumPreviewKey = '';
    this.identityService = new FirebaseIdentityService(this.profileStore);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2500
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.input = new InputController(this.profile.settings.controls.bindings);
    this.hud = new RaceHud(this.container);
    this.sound = new SoundSystem();
    this.commentary = new RaceCommentary();
    this.applyTheme(this.profile.theme);
    this.identityReadyPromise = null;
    this.multiplayer = new MultiplayerClient();
    this.eventService = new EventService();
    this.cameraController = new RaceCamera(this.camera);
    this.speedLines = new SpeedLines();
    this.effects = new RaceEffects();
    this.garagePreview = new GaragePreview();
    this.metaUI = new MetaUI(this.container, {
      onHangarPageChange: () => this.syncGaragePreview(),
      onShipPreview: (shipId) => this.handleShipPreview(shipId),
      onTrackSelect: (trackId) => this.handleTrackSelect(trackId),
      onShipSelect: (shipId) => this.handleShipSelect(shipId),
      onShipPurchase: (shipId) => this.handleShipPurchase(shipId),
      onCosmeticSelect: (type, itemId) => this.handleCosmeticSelect(type, itemId),
      onPlayerNameChange: (playerName) => this.handlePlayerNameChange(playerName),
      onThemeChange: (theme) => this.handleThemeChange(theme),
      onGoogleLogin: () => this.handleGoogleLogin(),
      onLogout: () => this.handleLogout(),
      onQuickMatch: () => this.handleQuickMatch(),
      onCreatePrivateRoom: () => this.handleCreatePrivateRoom(),
      onJoinPrivateRoom: (code) => this.handleJoinPrivateRoom(code),
      onTournamentMatch: () => this.handleTournamentMatch(),
      onStartPrivateRoom: () => this.handleStartPrivateRoom(),
      onKickRoomPlayer: (playerId) => this.handleKickRoomPlayer(playerId),
      onDiscardRoom: () => this.handleDiscardRoom(),
      onLeaveRoom: () => this.handleLeaveRoom(),
      onSendEmote: (emote) => this.handleSendEmote(emote),
      onCopyIdentity: (value, label) => this.handleCopyIdentity(value, label),
      onToggleReady: () => this.handleToggleRoomReady(),
      onTransferHost: (playerId) => this.handleTransferRoomHost(playerId),
      onRoomRematch: () => this.handleRoomRematch(),
      onAudioSettingsChange: (settings) => this.handleAudioSettingsChange(settings),
      onGraphicsSettingsChange: (settings) => this.handleGraphicsSettingsChange(settings),
      onDifficultyChange: (difficulty) => this.handleDifficultyChange(difficulty),
      onStartRebind: (action) => this.handleStartRebind(action),
      onResumeRace: () => this.handleResumeRace(),
      onRestartRace: () => this.handleRestartRace(),
      onToggleTutorialSeen: () => this.handleToggleTutorialSeen(),
      onPremiumPurchase: (planId) => this.handlePremiumPurchase(planId),
      onRefreshEntitlement: () => this.handleRefreshEntitlement(),
      onPremiumPreview: (featureKey) => this.handlePremiumPreview(featureKey),
      onDemoEditionChange: (editionId) => this.handleDemoEditionChange(editionId),
      onDemoEditionClear: () => this.handleDemoEditionClear(),
      onCampaignSelect: (cupId) => this.handleCampaignSelect(cupId),
      onCampaignStart: (cupId, raceId) => this.handleCampaignStart(cupId, raceId),
      onTournamentSelect: (typeId) => this.handleTournamentSelect(typeId),
      onTournamentStart: (typeId) => this.handleTournamentStart(typeId),
      onTournamentContinue: () => this.handleTournamentContinue(),
      onCreatePrivateTournament: (format, botFill) => this.handleCreatePrivateTournament(format, botFill),
      onJoinPrivateTournament: (code) => this.handleJoinPrivateTournament(code),
      onPrivateTournamentReady: () => this.handlePrivateTournamentReady(),
      onStartPrivateTournament: () => this.handleStartPrivateTournament(),
      onStartNextPrivateTournament: () => this.handleStartNextPrivateTournament(),
      onPrivateTournamentRematch: () => this.handlePrivateTournamentRematch(),
      onResultAction: (actionId) => this.handleResultAction(actionId),
      onReplayControl: (actionId, value) => this.handleReplayControl(actionId, value),
      onReplayCapture: () => this.handleReplayCapture(),
      onCustomRaceUpdate: (field, value) => this.handleCustomRaceUpdate(field, value),
      onCustomRaceStart: () => this.handleCustomRaceStart(),
      onCustomRaceRandomize: () => this.handleCustomRaceRandomize(),
      onCustomRaceSavePreset: () => this.handleCustomRaceSavePreset(),
      onCustomRaceLoadPreset: (presetId) => this.handleCustomRaceLoadPreset(presetId),
      onCustomRaceDeletePreset: (presetId) => this.handleCustomRaceDeletePreset(presetId),
      onEquipRewardBadge: (rewardId) => this.handleEquipRewardBadge(rewardId),
      onRankedStart: () => this.handleRankedSeasonStart(),
      onRankedCancel: () => this.handleRankedSeasonCancel(),
      onLiveEventStart: (eventId) => this.handleLiveEventStart(eventId),
      onBossSelect: (eventId) => this.handleBossSelect(eventId),
      onBossStart: (eventId) => this.handleBossStart(eventId),
      onAdvancedGarageCategory: (categoryId) => this.handleAdvancedGarageCategory(categoryId),
      onAdvancedGarageFilter: (filterId) => this.handleAdvancedGarageFilter(filterId),
      onAdvancedGarageRarity: (rarityId) => this.handleAdvancedGarageRarity(rarityId),
      onAdvancedCosmeticPreview: (itemId) => this.handleAdvancedCosmeticPreview(itemId),
      onAdvancedCosmeticApply: (itemId) => this.handleAdvancedCosmeticApply(itemId),
      onAdvancedCosmeticResetPreview: () => this.handleAdvancedCosmeticResetPreview(),
      onNumberPlateChange: (value) => this.handleNumberPlateChange(value),
      onUpgradeModule: (moduleId) => this.handleUpgradeModule(moduleId),
      onResetShipUpgrades: () => this.handleResetShipUpgrades(),
      onShowcaseControl: (actionId) => this.handleShowcaseControl(actionId),
      onFavoriteShip: (shipId) => this.handleFavoriteShip(shipId),
      onCustomRaceExportCode: () => this.handleCustomRaceExportCode(),
      onCustomRaceCopyCode: () => this.handleCustomRaceCopyCode(),
      onCustomRaceImportCodeChange: (code) => this.handleCustomRaceImportCodeChange(code),
      onCustomRaceValidateCode: () => this.handleCustomRaceValidateCode(),
      onCustomRaceImportCode: (savePreset) => this.handleCustomRaceImportCode(savePreset),
      onStartRace: () => {
        this.sound.resume();
        this.sound.playUiConfirm();
        this.beginRaceSequence('career-race');
      },
      onStartTimeTrial: () => {
        this.sound.resume();
        this.sound.playUiConfirm();
        this.beginRaceSequence('time-trial');
      },
      onRaceAgain: () => {
        this.sound.resume();
        this.sound.playUiConfirm();
        if (['campaign', 'tournament', 'ranked-season', 'live-event', 'boss-event'].includes(this.runMode) && this.activePremiumRaceContext) {
          this.beginRaceSequence(this.runMode, { ...this.activePremiumRaceContext });
        } else if (this.runMode === 'custom-race') {
          this.beginRaceSequence('custom-race', this.createCustomRaceContext());
        } else {
          this.beginRaceSequence(this.runMode === 'time-trial' ? 'time-trial' : 'career-race');
        }
      },
      onBackToHangar: () => {
        this.sound.resume();
        this.sound.playUiSelect();
        this.showHangar();
      }
    });

    this.starfieldNear = createStarfield(3200, 1800);
    this.starfieldFar = createStarfield(2200, 3200);
    this.track = null;
    this.powerUps = null;
    this.playerShip = null;
    this.racers = [];
    this.aiEntries = [];
    this.standings = [];
    this.playerPosition = 1;
    this.activeChallengeIds = [];
    this.raceStats = null;
    this.lapTarget = 3;
    this.phase = 'hangar';
    this.phaseTimer = 0;
    this.goFlashTimer = 0;
    this.introDuration = 7.4;
    this.toastText = '';
    this.toastTimer = 0;
    this.animationFrame = 0;
    this.elapsedTime = 0;
    this.garagePreviewShipId = this.profile.selectedShipId;
    this.lastCountdownCue = null;
    this.lastPlayerLap = 1;
    this.racerLapMap = new Map();
    this.rankCommentaryTimer = 0;
    this.multiplayerMatch = null;
    this.multiplayerRemoteShips = new Map();
    this.multiplayerFeedTimeout = 0;
    this.autoJoinRoomCode = new URL(window.location.href).searchParams.get('room')?.trim().toUpperCase() || '';
    this.autoJoinTriggered = false;
    this.lastLeaderboardRequestAt = 0;
    this.lastLeaderboardSignature = '';
    this.lastEventRefreshAt = 0;
    this.eventRefreshInFlight = false;
    this.hangarRefreshHandle = 0;
    this.runMode = 'career-race';
    this.activePremiumRaceContext = null;
    this.selectedCampaignCupId = this.profile.premiumProgress?.campaign?.selectedCupId ?? 'rookie-league';
    this.selectedTournamentTypeId = this.profile.premiumProgress?.tournaments?.selectedTypeId ?? 'ai-knockout-4';
    this.selectedBossEventId = this.profile.premiumProgress?.bossEvents?.selectedBossEventId ?? 'solar-flare-escape';
    this.advancedGarageCategoryId = 'shipSkin';
    this.advancedGarageFilter = 'all';
    this.advancedGarageRarityFilter = 'all';
    this.advancedCosmeticPreview = {};
    this.customRacePresetCode = '';
    this.customRaceImportCode = '';
    this.customRaceImportResult = null;
    this.replayCapture = new ReplayCaptureService();
    this.latestReplay = null;
    this.replayShips = new Map();
    this.replayState = {
      timeMs: 0,
      playing: true,
      speed: 1,
      cameraMode: 'chase',
      photoMode: false,
      hudHidden: false,
      showName: true,
      showOverlay: true,
      zoom: 1,
      height: 0,
      angle: 0
    };
    this.trackTiming = null;
    this.timeTrialGhost = null;
    this.contactPairCooldowns = new Map();
    this.shipVfxState = new WeakMap();
    this.pendingFinishSlowmo = null;
    this.timeScale = 1;
    this.paused = false;
    this.hudRefreshTimer = 0;
    this.activeRebindAction = '';
    this.lastTutorialToastAt = 0;

    this.setupEnvironment();
    this.applyRuntimeSettings();
    this.sound.armUnlock(window);
    this.bindMultiplayerEvents();
    this.profileSubscription = this.profileStore.subscribe((profile) => {
      this.profile = profile;
      this.entitlements.setAccountContext(this.identityService.currentAuth);
      this.applyTheme(profile.theme);
      this.applyRuntimeSettings();
      this.identityService.queueProfileSave(profile);

      if (this.multiplayer.connected) {
        void this.syncMultiplayerIdentity().catch(() => {});
      }
    });
    this.identityService.addEventListener('status-change', () => {
      if (this.phase === 'hangar') {
        this.showHangar({ rebuildWorld: false });
      }
    });
    this.identityReadyPromise = this.initializeIdentity();
    this.showHangar();

    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  setupEnvironment() {
    this.ambientLight = new THREE.AmbientLight(0x93b8ff, 0.58);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xc4eeff, 1.9);
    this.directionalLight.position.set(28, 36, 18);
    this.scene.add(this.directionalLight);

    this.fillLight = new THREE.DirectionalLight(0x297fff, 0.55);
    this.fillLight.position.set(-35, 12, -18);
    this.scene.add(this.fillLight);

    this.starfieldFar.material.size = 2;
    this.starfieldFar.material.opacity = 0.58;
    this.starfieldNear.material.size = 3.4;

    this.scene.add(this.starfieldFar);
    this.scene.add(this.starfieldNear);
    this.scene.add(this.speedLines.group);
    this.scene.add(this.effects.group);
    this.hud.setControls(this.input.describeControls());
  }

  applyRuntimeSettings() {
    const { audio, graphics } = this.profile.settings;
    const dprCap = graphics.quality === 'performance'
      ? 1
      : graphics.quality === 'balanced'
        ? 1.4
        : 2;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
    this.renderer.shadowMap.enabled = graphics.quality === 'high';
    this.input.setBindings(this.profile.settings.controls.bindings);
    this.hud.setControls(this.input.describeControls());
    this.sound.applySettings(audio);
    this.cameraController.setGraphicsSettings(graphics);
    this.speedLines.group.visible = graphics.speedLines;

    if (!graphics.particles) {
      this.effects.clear();
    }

    if (this.track) {
      this.track.update(this.elapsedTime, graphics);
    }
  }

  applyTrackSceneTheme(trackDef = null) {
    const themeId = trackDef?.themeId ?? 'default';
    const themes = {
      default: {
        background: 0x01030a,
        ambient: 0x93b8ff,
        ambientIntensity: 0.58,
        directional: 0xc4eeff,
        directionalIntensity: 1.9,
        fill: 0x297fff,
        fillIntensity: 0.55
      },
      'megacity-orbit': {
        background: 0x020713,
        ambient: 0x91cfff,
        ambientIntensity: 0.64,
        directional: 0xe5f7ff,
        directionalIntensity: 2.1,
        fill: 0x2f8cff,
        fillIntensity: 0.62
      },
      'asteroid-refinery': {
        background: 0x0a0504,
        ambient: 0xffd1a6,
        ambientIntensity: 0.52,
        directional: 0xffcf9a,
        directionalIntensity: 1.82,
        fill: 0xff8f42,
        fillIntensity: 0.48
      },
      'shattered-ringworld': {
        background: 0x05030b,
        ambient: 0xd7b6ff,
        ambientIntensity: 0.56,
        directional: 0xf7d8ff,
        directionalIntensity: 1.96,
        fill: 0x8e5cff,
        fillIntensity: 0.52
      },
      'solar-storm-corridor': {
        background: 0x100604,
        ambient: 0xffd6a6,
        ambientIntensity: 0.66,
        directional: 0xfff0c8,
        directionalIntensity: 2.2,
        fill: 0xff8d3d,
        fillIntensity: 0.6
      }
    };
    const theme = themes[themeId] ?? themes.default;
    this.scene.background.setHex(theme.background);
    this.ambientLight.color.setHex(theme.ambient);
    this.ambientLight.intensity = theme.ambientIntensity;
    this.directionalLight.color.setHex(theme.directional);
    this.directionalLight.intensity = theme.directionalIntensity;
    this.fillLight.color.setHex(theme.fill);
    this.fillLight.intensity = theme.fillIntensity;
  }

  createPauseModel() {
    return {
      title: 'Race Paused',
      subtitle: this.multiplayerMatch
        ? 'The room is live. Jump back in when you are ready.'
        : this.runMode === 'time-trial'
          ? 'Pause the run, then restart if you want a cleaner ghost.'
          : 'Take a breath, then get back on the pace.',
      canRestart: this.phase === 'race',
      canRematch: this.phase === 'results' && Boolean(this.multiplayer.getPublicState().room)
    };
  }

  handleResumeRace() {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.metaUI.hidePause();
    this.sound.playUiSelect();
    this.setToast('Race resumed', 0.8);
  }

  handleRestartRace() {
    if (this.phase !== 'race') {
      return;
    }

    this.paused = false;
    this.metaUI.hidePause();
    this.sound.playUiConfirm();
    this.beginRaceSequence(this.runMode === 'time-trial' ? 'time-trial' : 'career-race');
  }

  handleAudioSettingsChange(settings) {
    this.profileStore.setAudioSettings(this.profile, settings);
    this.applyRuntimeSettings();
    this.sound.playUiSelect();
    this.setToast('Audio settings saved', 1);
    this.showHangar({ rebuildWorld: false });
  }

  handleGraphicsSettingsChange(settings) {
    this.profileStore.setGraphicsSettings(this.profile, settings);
    this.applyRuntimeSettings();
    this.sound.playUiSelect();
    this.setToast('Graphics settings saved', 1);
    this.showHangar({ rebuildWorld: false });
  }

  handleDifficultyChange(difficulty) {
    this.profileStore.setDifficulty(this.profile, difficulty);
    this.sound.playUiSelect();
    this.setToast(`Difficulty set to ${difficulty}`, 1);
    this.showHangar({ rebuildWorld: false });
  }

  async handleStartRebind(action) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.activeRebindAction = action;
    this.setToast(`Press a key for ${action}`, 1.8);

    try {
      const code = await this.input.waitForRebind(action);

      if (!code) {
        return;
      }

      this.profileStore.setControlBinding(this.profile, action, code);
      this.applyRuntimeSettings();
      this.sound.playUiConfirm();
      this.setToast(`${action} bound to ${this.input.getActionLabel(action)}`, 1.2);
      this.showHangar({ rebuildWorld: false });
    } finally {
      this.activeRebindAction = '';
    }
  }

  handleToggleTutorialSeen() {
    const nextValue = !this.profile.settings.gameplay.onboardingSeen;
    this.profileStore.setOnboardingSeen(this.profile, nextValue);
    this.sound.playUiSelect();
    this.setToast(nextValue ? 'Tutorial prompts disabled' : 'Tutorial prompts enabled', 1.1);
    this.showHangar({ rebuildWorld: false });
  }

  maybeShowTutorialHints() {
    if (this.profile.settings.gameplay.onboardingSeen || this.phase !== 'race' || !this.playerShip) {
      return;
    }

    if (this.elapsedTime - this.lastTutorialToastAt < 5.5) {
      return;
    }

    let hint = '';

    if (this.phaseTimer < 4.5) {
      hint = `Drift with ${this.input.getActionLabel('drift')} and exit with boost.`;
    } else if (!this.raceStats.usedManualBoost && this.playerShip.boostEnergy > 35) {
      hint = `Use ${this.input.getActionLabel('boost')} on straights for max gain.`;
    } else if (this.playerShip.heldItem) {
      hint = `Fire your pickup with ${this.input.getActionLabel('item')}.`;
    } else if (this.playerShip.draftStrength > 0.2) {
      hint = 'Stay tucked in the draft, then slingshot past.';
    }

    if (!hint) {
      return;
    }

    this.lastTutorialToastAt = this.elapsedTime;
    this.setToast(hint, 2);
  }

  syncShipEffects(deltaTime) {
    if (!this.profile.settings.graphics.particles) {
      return;
    }

    for (const ship of this.racers) {
      const state = this.shipVfxState.get(ship) ?? {
        boosting: false,
        launchTimer: 0,
        impactFlashTimer: 0,
        hazardFlashTimer: 0,
        shieldTimer: 0,
        empTimer: 0,
        gravityGlitchTimer: 0
      };

      const audible = ship === this.playerShip || this.isShipAudible(ship, 32);

      if (ship.launchTimer > 0.78 && state.launchTimer <= 0.01) {
        this.effects.spawnLaunchFlash(ship, ship.config.glow);
      }

      if (ship.boosting && !state.boosting) {
        this.effects.spawnBoostBurst(ship, ship.config.trailColor);

        if (ship === this.playerShip || audible) {
          this.cameraController.triggerPunch(0.08, 0.22);
        }
      }

      const edgeRatio = this.track ? Math.abs(ship.lateralOffset) / Math.max(1, this.track.halfWidth) : 0;

      if (ship.drifting && edgeRatio > 0.8 && ship.speed > 24 && Math.random() < deltaTime * 22) {
        this.effects.spawnDriftScrape(ship, THREE.MathUtils.clamp(edgeRatio, 0.8, 1.2), ship.config.glow);
      }

      if (ship.impactFlashTimer > state.impactFlashTimer + 0.12) {
        this.effects.spawnImpact(ship, 0xff8a9f, ship === this.playerShip ? 1.1 : 0.75);

        if (ship === this.playerShip || audible) {
          this.cameraController.triggerPunch(0.12, 0.3);
        }
      }

      if (ship.hazardFlashTimer > state.hazardFlashTimer + 0.12) {
        this.effects.spawnImpact(ship, 0xffa44a, ship === this.playerShip ? 0.95 : 0.65);

        if (ship === this.playerShip || audible) {
          this.cameraController.triggerPunch(0.08, 0.22);
        }
      }

      if (ship.shieldTimer > state.shieldTimer + 0.2) {
        this.effects.spawnShieldShell(ship, ship.config.glow);
      }

      if (ship.empTimer > state.empTimer + 0.2) {
        this.effects.spawnEmpWave(ship, 0x7fc2ff);
      }

      if (ship.gravityGlitchTimer > state.gravityGlitchTimer + 0.2) {
        this.effects.spawnGravityGlitch(ship, 0xd28bff);
      }

      this.shipVfxState.set(ship, {
        boosting: ship.boosting,
        launchTimer: ship.launchTimer,
        impactFlashTimer: ship.impactFlashTimer,
        hazardFlashTimer: ship.hazardFlashTimer,
        shieldTimer: ship.shieldTimer,
        empTimer: ship.empTimer,
        gravityGlitchTimer: ship.gravityGlitchTimer
      });
    }
  }

  bindMultiplayerEvents() {
    this.multiplayer.addEventListener('profile', (event) => {
      this.profileStore.setServerRating(this.profile, event.detail.rating);
      this.queueHangarRefresh();
    });

    this.multiplayer.addEventListener('state-change', () => {
      this.queueHangarRefresh();
    });

    this.multiplayer.addEventListener('social-emote', (event) => {
      if (this.phase === 'hangar') {
        this.queueHangarRefresh();
      } else if (this.phase === 'race' && this.multiplayerMatch) {
        this.commentary.push(`${event.detail.name} calls "${event.detail.emote}".`, 'neutral');
      }
    });

    this.multiplayer.addEventListener('error', (event) => {
      this.setToast(event.detail?.message ?? 'Multiplayer connection error', 1.5);

      if (this.phase === 'hangar') {
        this.queueHangarRefresh();
      }
    });

    this.multiplayer.addEventListener('race-countdown', (event) => {
      this.prepareMultiplayerRace(event.detail);
    });

    this.multiplayer.addEventListener('race-state', (event) => {
      this.handleMultiplayerRaceState(event.detail);
    });

    this.multiplayer.addEventListener('race-results', (event) => {
      this.handleMultiplayerRaceResults(event.detail);
    });
  }

  start() {
    this.clock.start();
    this.loop();
  }

  loop() {
    this.animationFrame = window.requestAnimationFrame(this.loop);

    const rawDeltaTime = Math.min(this.clock.getDelta(), 0.05);

    if (this.phase === 'race' && this.input.consumeActionPressed('pause')) {
      this.paused = !this.paused;

      if (this.paused) {
        this.sound.stopCommentarySpeech(true);
        this.metaUI.showPause(this.createPauseModel());
      } else {
        this.metaUI.hidePause();
      }
    }

    if (this.pendingFinishSlowmo) {
      this.pendingFinishSlowmo.timer = Math.max(0, this.pendingFinishSlowmo.timer - rawDeltaTime);
      const alpha = 1 - this.pendingFinishSlowmo.timer / this.pendingFinishSlowmo.total;
      this.timeScale = THREE.MathUtils.lerp(0.38, 1, alpha);

      if (this.pendingFinishSlowmo.timer <= 0) {
        this.pendingFinishSlowmo = null;
        this.timeScale = 1;
        this.finishRace(true);
      }
    } else if (!this.paused) {
      this.timeScale = 1;
    }

    const deltaTime = this.paused ? 0 : rawDeltaTime * this.timeScale;
    this.elapsedTime += deltaTime;

    this.update(deltaTime, rawDeltaTime);
    this.render();
  }

  update(deltaTime, rawDeltaTime = deltaTime) {
    this.phaseTimer += deltaTime;

    const racePace = this.phase === 'race'
      ? this.playerShip.speed * 0.00008 + (this.playerShip.boosting ? 0.01 : 0)
      : 0;

    this.starfieldFar.rotation.y += deltaTime * (0.004 + racePace * 0.2);
    this.starfieldNear.rotation.y += deltaTime * (0.012 + racePace);
    this.starfieldNear.rotation.x += deltaTime * (0.003 + racePace * 0.15);

    if (this.track) {
      this.track.update(this.elapsedTime, this.profile.settings.graphics);
    }

    if (this.powerUps) {
      this.powerUps.update(deltaTime, this.elapsedTime);
    }

    if (this.paused) {
      this.hudRefreshTimer = 0;
      this.updateHud();
      return;
    }

    if (this.phase === 'hangar') {
      this.updateShowcase(deltaTime);
    } else if (this.phase === 'intro') {
      this.updateIntro(deltaTime);
    } else if (this.phase === 'countdown') {
      this.updateCountdown(deltaTime);
    } else if (this.phase === 'race') {
      this.updateRace(deltaTime);
    } else if (this.phase === 'results') {
      this.updateResults(deltaTime);
    } else if (this.phase === 'replay') {
      this.updateReplay(deltaTime);
    }

    if (this.goFlashTimer > 0) {
      this.goFlashTimer = Math.max(0, this.goFlashTimer - deltaTime);
    }

    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - deltaTime);

      if (this.toastTimer === 0) {
        this.toastText = '';
      }
    }

    this.rankCommentaryTimer = Math.max(0, this.rankCommentaryTimer - deltaTime);

    if (this.racers.length > 0) {
      this.updateStandings();
    }

    this.commentary.update(deltaTime, {
      phase: this.phase,
      standings: this.standings,
      playerShip: this.playerShip,
      track: this.track
    });

    if (!this.paused) {
      this.sound.syncCommentary(this.commentary, this.phase);
    }

    this.sound.update(deltaTime, this.playerShip, this.phase);
    this.syncShipEffects(rawDeltaTime);

    if (this.profile.settings.graphics.speedLines) {
      this.speedLines.update(deltaTime, this.camera, this.playerShip, this.phase === 'race');
    } else {
      this.speedLines.update(deltaTime, this.camera, this.playerShip, false);
    }

    if (this.profile.settings.graphics.particles) {
      this.effects.update(deltaTime, this.elapsedTime, this.profile.settings.graphics);
    }

    this.maybeShowTutorialHints();
    this.hudRefreshTimer = Math.max(0, this.hudRefreshTimer - deltaTime);

    const shouldForceHud = this.phase !== 'race'
      || this.goFlashTimer > 0
      || Boolean(this.toastText)
      || Boolean(this.pendingFinishSlowmo);

    if (shouldForceHud || this.hudRefreshTimer <= 0) {
      this.updateHud();
      this.hudRefreshTimer = this.phase === 'race' ? 1 / 24 : 0;
    }
  }

  updateShowcase(deltaTime) {
    for (const racer of this.racers) {
      racer.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    if (this.timeTrialGhost?.ship) {
      this.timeTrialGhost.ship.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    this.cameraController.updateShowcase(
      deltaTime,
      this.elapsedTime,
      this.track,
      this.playerShip,
      0
    );
  }

  updateIntro(deltaTime) {
    for (const racer of this.racers) {
      racer.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    if (this.timeTrialGhost?.ship) {
      this.timeTrialGhost.ship.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    const introAlpha = Math.min(this.phaseTimer / this.introDuration, 1);
    this.cameraController.updateIntro(
      deltaTime,
      this.elapsedTime,
      this.track,
      this.playerShip,
      introAlpha
    );

    if (this.phaseTimer >= this.introDuration) {
      this.phase = 'countdown';
      this.phaseTimer = 0;
    }
  }

  updateCountdown(deltaTime) {
    for (const racer of this.racers) {
      racer.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    if (this.timeTrialGhost?.ship) {
      this.timeTrialGhost.ship.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    this.cameraController.updateCountdown(deltaTime, this.playerShip);

    if (this.multiplayerMatch) {
      const remaining = Math.max(0, this.multiplayerMatch.startAt - Date.now());
      const countdownNumber = Math.max(1, Math.ceil(remaining / 1000));

      if (countdownNumber !== this.lastCountdownCue) {
        this.lastCountdownCue = countdownNumber;
        this.sound.playCountdown(countdownNumber);
        this.commentary.announceCountdown(countdownNumber);
      }

      if (remaining <= 0) {
        this.startRace();
      }

      return;
    }

    const countdownNumber = Math.max(1, 3 - Math.floor(this.phaseTimer));

    if (countdownNumber !== this.lastCountdownCue) {
      this.lastCountdownCue = countdownNumber;
      this.sound.playCountdown(countdownNumber);
      this.commentary.announceCountdown(countdownNumber);
    }

    if (this.phaseTimer >= 3) {
      this.startRace();
    }
  }

  startRace() {
    this.phase = 'race';
    this.phaseTimer = 0;
    this.goFlashTimer = 1.1;
    this.paused = false;
    this.metaUI.hidePause();
    this.raceStats.previousPosition = this.playerPosition;
    this.raceStats.currentPosition = this.playerPosition;
    if (this.multiplayerMatch) {
      this.multiplayerMatch.snapshotTimer = 0;
      this.multiplayerMatch.submittedFinish = false;
      this.multiplayerMatch.waitingForResults = false;
    }
    this.sound.playGo();
    this.sound.playLaunch();
    this.commentary.announceGo(this.playerShip);
    this.effects.spawnLaunchFlash(this.playerShip, this.playerShip.config.glow);
    this.cameraController.triggerPunch(0.1, 0.22);

    for (const racer of this.racers) {
      racer.triggerLaunch();
    }

    this.replayCapture.addEvent('race-start', { label: 'Race Start' }, this.trackTiming?.elapsedMs ?? 0);
    this.replayCapture.sample(this.trackTiming?.elapsedMs ?? 0, this.racers);

    if (this.runMode === 'time-trial' && this.trackTiming) {
      this.trackTiming.ghostSampleTimer = 0;
      this.recordGhostFrame({ throttle: 0, steer: 0 });
    }
  }

  updateRace(deltaTime) {
    const previousLap = this.lastPlayerLap;
    const playerControls = {
      throttle: this.input.isActionPressed('accelerate') ? 1 : 0,
      steer:
        Number(this.input.isActionPressed('right')) -
        Number(this.input.isActionPressed('left')),
      drift: this.input.isActionPressed('drift'),
      boost: this.input.isActionPressed('boost')
    };

    if (this.multiplayerMatch) {
      if (!this.multiplayerMatch.submittedFinish) {
        const playerEvents = this.playerShip.updateRacing(
          deltaTime,
          this.elapsedTime,
          this.track,
          playerControls
        );

        if (playerEvents.driftRelease > 0) {
          this.raceStats.driftReleases += 1;
          this.setToast(`Drift Release +${playerEvents.driftRelease}`, 1);
          this.sound.playDriftRelease(playerEvents.driftRelease);
        }

        if (playerControls.boost && this.playerShip.boosting) {
          this.raceStats.usedManualBoost = true;
          this.raceStats.boostSeconds += deltaTime;
        }

        this.raceStats.topSpeed = Math.max(this.raceStats.topSpeed, this.playerShip.speed);
      } else {
        this.playerShip.updateAtRest(deltaTime, this.elapsedTime, this.track);
      }

      const currentLap = Math.min(this.lapTarget, this.playerShip.getLapNumber());

      if (currentLap > previousLap) {
        this.sound.playLap();
      }

      this.lastPlayerLap = currentLap;

      for (const remote of this.multiplayerRemoteShips.values()) {
        if (!remote.latestSnapshot) {
          remote.ship.updateAtRest(deltaTime, this.elapsedTime, this.track);
          continue;
        }

        remote.ship.applyNetworkState(this.track, remote.latestSnapshot, deltaTime, this.elapsedTime);
      }

      for (const entry of this.aiEntries) {
        const controls = entry.pilot.getControls({
          ship: entry.ship,
          racers: this.racers,
          track: this.track,
          time: this.elapsedTime,
          standings: this.standings
        });
        entry.ship.updateRacing(deltaTime, this.elapsedTime, this.track, {
          throttle: controls.throttle,
          steer: controls.steer,
          drift: controls.drift,
          boost: controls.boost
        });
      }

      this.updateContactCooldowns(deltaTime);
      this.updateSlipstream(deltaTime);
      this.handleShortcutLines(deltaTime);
      this.resolveCloseRacing(deltaTime);
      this.updateStandings();
      this.updateRacerLaps();

      if (!this.multiplayerMatch.submittedFinish) {
        this.updateTiming(deltaTime, playerControls);
      }

      this.updateRaceStats();
      this.cameraController.updateRace(deltaTime, this.playerShip);

      this.multiplayerMatch.snapshotTimer += deltaTime;

      if (this.multiplayerMatch.snapshotTimer >= MULTIPLAYER_SNAPSHOT_INTERVAL) {
        this.multiplayerMatch.snapshotTimer = 0;
        this.multiplayer.sendSnapshot({
          progress: this.playerShip.progress,
          distance: this.playerShip.distance,
          lateralOffset: this.playerShip.lateralOffset,
          speed: this.playerShip.speed,
          boosting: this.playerShip.boosting,
          drifting: this.playerShip.drifting,
          lap: Math.min(this.lapTarget, this.playerShip.getLapNumber()),
          throttle: playerControls.throttle,
          steer: playerControls.steer
        });
      }

      if (!this.multiplayerMatch.submittedFinish && this.playerShip.getTravelledDistance() >= this.lapTarget) {
        this.multiplayerMatch.submittedFinish = true;
        this.multiplayerMatch.waitingForResults = true;
        this.multiplayer.submitResult({
          finishTime: Math.max(0, Date.now() - this.multiplayerMatch.startAt),
          stats: { ...this.raceStats, hazardHits: 0, pickupsCollected: 0 }
        });
        this.setToast('Finish logged. Awaiting full classification.', 1.4);
      }

      return;
    }

    const playerEvents = this.playerShip.updateRacing(
      deltaTime,
      this.elapsedTime,
      this.track,
      playerControls
    );

    if (playerEvents.driftRelease > 0) {
      this.raceStats.driftReleases += 1;
      this.setToast(`Drift Release +${playerEvents.driftRelease}`, 1);
      this.sound.playDriftRelease(playerEvents.driftRelease);
      this.replayCapture.addEvent('drift-release', { label: 'Drift Release', shipId: this.playerShip.config.shipId }, this.trackTiming?.elapsedMs ?? 0);
    }

    if (playerControls.boost && this.playerShip.boosting) {
      this.raceStats.usedManualBoost = true;
      this.raceStats.boostSeconds += deltaTime;
      this.replayCapture.addEvent('boost', { label: 'Manual Boost', shipId: this.playerShip.config.shipId }, this.trackTiming?.elapsedMs ?? 0);
    }

    this.raceStats.topSpeed = Math.max(this.raceStats.topSpeed, this.playerShip.speed);
    const currentLap = Math.min(this.lapTarget, this.playerShip.getLapNumber());

    if (currentLap > previousLap) {
      this.sound.playLap();
    }

    this.lastPlayerLap = currentLap;

    for (const entry of this.aiEntries) {
      const controls = entry.pilot.getControls({
        ship: entry.ship,
        racers: this.racers,
        track: this.track,
        time: this.elapsedTime,
        standings: this.standings
      });

      entry.ship.updateRacing(deltaTime, this.elapsedTime, this.track, {
        throttle: controls.throttle,
        steer: controls.steer,
        drift: Boolean(controls.drift),
        boost: Boolean(controls.boost)
      });
    }

    this.updateContactCooldowns(deltaTime);
    this.updateSlipstream(deltaTime);
    this.handleTrackInteractions(deltaTime);

    if (this.powerUps) {
      this.handlePickupCollections();
      this.handlePlayerItemUse();
      this.handleAiItemUse();
    }

    this.resolveCloseRacing(deltaTime);
    this.handleNearMisses();

    this.updateStandings();
    this.updateRacerLaps();
    this.updateTiming(deltaTime, playerControls);
    this.updateRaceStats();
    this.updateTimeTrialGhost(deltaTime);
    this.cameraController.updateRace(deltaTime, this.playerShip);
    this.replayCapture.sample(this.trackTiming?.elapsedMs ?? 0, this.racers);

    if (this.playerShip.getTravelledDistance() >= this.lapTarget) {
      this.finishRace();
    }
  }

  updateResults(deltaTime) {
    for (let index = 0; index < this.racers.length; index += 1) {
      const racer = this.racers[index];
      racer.updateAtRest(deltaTime, this.elapsedTime, this.track);

      const standingIndex = this.standings.findIndex((ship) => ship === racer);
      const finishedPosition = standingIndex >= 0 ? standingIndex + 1 : index + 1;
      const flyAlpha = Math.max(0, 1 - Math.min(this.phaseTimer / 1.3, 1));
      const baseOffset = (finishedPosition - 1) * 3.4;

      if (finishedPosition === 1) {
        racer.root.position.y += Math.sin(this.elapsedTime * 4.2) * 0.28 + 0.65 * flyAlpha;
        racer.visual.rotation.z = THREE.MathUtils.lerp(racer.visual.rotation.z, 0.24 + Math.sin(this.elapsedTime * 3.4) * 0.08, 0.08);
      } else if (finishedPosition <= 3) {
        racer.root.position.y += 0.18 * flyAlpha;
        racer.visual.rotation.z = THREE.MathUtils.lerp(racer.visual.rotation.z, (finishedPosition === 2 ? -0.12 : 0.12), 0.06);
      } else {
        racer.root.position.addScaledVector(racer.frame.right, (finishedPosition % 2 === 0 ? 1 : -1) * 0.02 * baseOffset);
        racer.visual.rotation.z = THREE.MathUtils.lerp(racer.visual.rotation.z, (finishedPosition % 2 === 0 ? -0.1 : 0.1), 0.04);
      }
    }

    if (this.timeTrialGhost?.ship) {
      this.timeTrialGhost.ship.updateAtRest(deltaTime, this.elapsedTime, this.track);
    }

    this.cameraController.updateShowcase(
      deltaTime,
      this.elapsedTime,
      this.track,
      this.playerShip,
      0.16
    );
  }

  updateRaceStats() {
    const previousPosition = this.raceStats.previousPosition;
    this.raceStats.currentPosition = this.playerPosition;
    this.raceStats.bestPosition = Math.min(this.raceStats.bestPosition, this.playerPosition);

    if (this.playerPosition < previousPosition) {
      this.raceStats.overtakes += previousPosition - this.playerPosition;
      this.setToast(`Overtake x${previousPosition - this.playerPosition}`, 0.9);
      this.sound.playOvertake(previousPosition - this.playerPosition);
      this.replayCapture.addEvent('overtake', { label: `Overtake x${previousPosition - this.playerPosition}` }, this.trackTiming?.elapsedMs ?? 0);
    } else if (this.playerPosition > previousPosition) {
      this.sound.playPositionLost();
    }

    this.raceStats.previousPosition = this.playerPosition;
  }

  resolveRaceTrackDefinition(raceContext = null) {
    if (raceContext?.trackDefinition) {
      return raceContext.trackDefinition;
    }

    if (raceContext?.customRace?.trackDefinition) {
      return raceContext.customRace.trackDefinition;
    }

    return TRACK_LOOKUP[raceContext?.trackId ?? this.profile.selectedTrackId] ?? TRACK_DEFS[0];
  }

  getTrackUnlockLevel(trackDef = null) {
    const unlockLevel = Number(trackDef?.unlockLevel);
    return Number.isFinite(unlockLevel) && unlockLevel > 0 ? unlockLevel : 1;
  }

  buildWorldForSelections() {
    this.clearWorld();
    this.effects.clear();
    this.paused = false;
    this.timeScale = 1;

    const raceContext = this.activePremiumRaceContext;
    const trackDef = this.resolveRaceTrackDefinition(raceContext);
    this.applyTrackSceneTheme(trackDef);
    this.track = new RaceTrack(trackDef);
    this.powerUps = this.runMode === 'time-trial' || raceContext?.powerupsEnabled === false
      ? null
      : new PowerUpSystem(this.track, {
        onEvent: (type, payload) => this.handlePowerAudioEvent(type, payload)
      });
    this.playerShip = this.createPlayerShip();
    this.playerShip.premiumParticipantId = raceContext?.playerParticipantId ?? '';
    this.playerShip.premiumScoring = true;
    this.aiEntries = this.runMode === 'time-trial' ? [] : this.createAiEntries(trackDef, raceContext);
    this.lapTarget = Math.max(1, Math.floor(Number(raceContext?.laps ?? trackDef.laps)));
    this.introDuration = 6.6 + this.getTrackUnlockLevel(trackDef) * 0.45;
    this.trackTiming = this.createTimingState(trackDef);

    const gridAssignments = this.runMode === 'time-trial'
      ? [{ ship: this.playerShip, slot: 1 }]
      : [
        ...this.aiEntries.slice(0, 1).map((entry) => entry.ship),
        this.playerShip,
        ...this.aiEntries.slice(1).map((entry) => entry.ship)
      ].map((ship, slot) => ({ ship, slot }));

    this.racers = [];

    for (const assignment of gridAssignments) {
      assignment.ship.placeOnGrid(this.track, this.track.getGridSlot(assignment.slot));
      this.racers.push(assignment.ship);
      this.scene.add(assignment.ship.root);
    }

    this.racerLapMap = new Map(this.racers.map((ship) => [ship, 1]));

    this.scene.add(this.track.group);

    if (this.powerUps) {
      this.scene.add(this.powerUps.group);
    }

    this.setupTimeTrialGhost();

    this.updateStandings();
    this.cameraController.snapShowcase(this.track, this.playerShip, 0);
  }

  clearWorld() {
    if (this.track) {
      this.scene.remove(this.track.group);
    }

    if (this.powerUps) {
      this.scene.remove(this.powerUps.group);
    }

    for (const racer of this.racers) {
      this.scene.remove(racer.root);
    }

    if (this.timeTrialGhost?.ship) {
      this.scene.remove(this.timeTrialGhost.ship.root);
    }

    this.track = null;
    this.powerUps = null;
    this.playerShip = null;
    this.racers = [];
    this.aiEntries = [];
    this.standings = [];
    this.multiplayerRemoteShips = new Map();
    this.replayShips = new Map();
    this.trackTiming = null;
    this.timeTrialGhost = null;
    this.contactPairCooldowns = new Map();
    this.shipVfxState = new WeakMap();
  }

  getSelectedCosmetics() {
    return {
      hullId: this.profile.cosmetics.hullId,
      glowId: this.profile.cosmetics.glowId,
      trailId: this.profile.cosmetics.trailId
    };
  }

  getAppliedAdvancedCosmeticSelection() {
    return Object.fromEntries(
      Object.entries(this.profile.advancedCosmetics?.selected ?? {})
        .filter(([, itemId]) => {
          const item = ADVANCED_COSMETIC_LOOKUP[itemId];
          return item && this.canUseAdvancedCosmeticItem(item);
        })
    );
  }

  isRewardCosmeticOwned(item) {
    if (item?.unlockType !== 'reward-placeholder') {
      return true;
    }

    return Boolean(this.profile.premiumProgress?.rewards?.unlockedCosmeticIds?.includes(item.id));
  }

  canUseAdvancedCosmeticItem(item) {
    return Boolean(item && this.entitlements.canAccessAdvancedCosmetic(item) && this.isRewardCosmeticOwned(item));
  }

  getPreviewAdvancedCosmeticSelection() {
    return {
      ...this.getAppliedAdvancedCosmeticSelection(),
      ...this.advancedCosmeticPreview
    };
  }

  getAdvancedVisualConfig({ includePreview = false } = {}) {
    const selection = includePreview
      ? this.getPreviewAdvancedCosmeticSelection()
      : this.getAppliedAdvancedCosmeticSelection();

    const visualConfig = buildAdvancedVisualConfig(
      selection,
      this.profile.advancedCosmetics?.numberPlate
    );

    return Object.keys(visualConfig).length > 0 ? visualConfig : null;
  }

  getCurrentPlayerId() {
    return this.profile.auth?.uid || this.profile.pilotId;
  }

  async syncMultiplayerIdentity(forceRefresh = false) {
    const identity = await this.getMultiplayerIdentity(forceRefresh);
    await this.multiplayer.ensureConnection(identity);
    return identity;
  }

  async initializeIdentity() {
    try {
      const { authState, cloudProfile } = await this.identityService.initialize();
      this.profile = this.profileStore.mergeCloudProfile(this.profile, cloudProfile, authState);
      this.entitlements.setAccountContext(authState);
      this.refreshBackendEntitlementForCurrentUser();
      this.applyTheme(this.profile.theme);
      this.applyRuntimeSettings();
      this.identityService.queueProfileSave(this.profile);
      await this.identityService.flushProfileSave();

      if (this.multiplayer.connected) {
        await this.syncMultiplayerIdentity(true);
      }

      if (this.phase === 'hangar') {
        this.showHangar({ rebuildWorld: false });
      }
    } catch (error) {
      this.setToast(this.identityService.getErrorMessage(error), 2.2);

      if (this.phase === 'hangar') {
        this.showHangar({ rebuildWorld: false });
      }
    }
  }

  async ensureIdentityReady() {
    if (this.identityReadyPromise) {
      await this.identityReadyPromise;
    }
  }

  refreshBackendEntitlementForCurrentUser() {
    if (!this.entitlements.isPaymentsEnabled()) {
      return;
    }

    const authState = this.identityService.currentAuth;

    if (!authState || authState.isAnonymous || authState.provider !== 'google') {
      return;
    }

    void this.identityService.getMultiplayerAuthPayload(true)
      .then((authPayload) => this.entitlements.refreshBackendEntitlement(authPayload.authToken ?? ''))
      .then(() => {
        if (this.phase === 'hangar') {
          this.showHangar({ rebuildWorld: false });
        }
      })
      .catch(() => {});
  }

  async maybeAutoJoinRoom() {
    if (
      this.autoJoinTriggered ||
      !this.autoJoinRoomCode ||
      this.phase !== 'hangar' ||
      this.multiplayer.getPublicState().room
    ) {
      return;
    }

    this.autoJoinTriggered = true;
    await this.handleJoinPrivateRoom(this.autoJoinRoomCode);
  }

  extractRoomCode(value) {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return '';
    }

    try {
      const parsed = new URL(raw);
      return parsed.searchParams.get('room')?.trim().toUpperCase() ?? raw.toUpperCase();
    } catch {
      return raw.toUpperCase();
    }
  }

  async getMultiplayerIdentity(forceRefresh = false, overrides = {}) {
    const authPayload = await this.identityService.getMultiplayerAuthPayload(forceRefresh);

    return {
      playerId: this.getCurrentPlayerId(),
      name: this.profile.playerName,
      shipId: this.profile.selectedShipId,
      trackId: this.profile.selectedTrackId,
      cosmetics: this.getSelectedCosmetics(),
      ...authPayload,
      ...overrides
    };
  }

  getGaragePreviewConfig() {
    const shipDef = SHIP_LOOKUP[this.getActiveGaragePreviewShipId()] ?? SHIP_DEFS[0];
    const hull = HULL_LOOKUP[this.profile.cosmetics.hullId] ?? HULL_COLORS[0];
    const glow = GLOW_LOOKUP[this.profile.cosmetics.glowId] ?? GLOW_COLORS[0];
    const trail = TRAIL_LOOKUP[this.profile.cosmetics.trailId] ?? TRAIL_COLORS[0];
    const advancedVisuals = this.getAdvancedVisualConfig({ includePreview: true });

    return {
      signature: JSON.stringify({
        shipId: shipDef.id,
        hullId: hull.id,
        glowId: glow.id,
        trailId: trail.id,
        advancedVisuals
      }),
      config: {
        shipId: shipDef.id,
        shipName: shipDef.name,
        manufacturer: shipDef.manufacturer,
        manufacturerStyle: shipDef.manufacturerStyle,
        label: this.profile.playerName,
        color: hull.color,
        emissive: hull.emissive,
        glow: glow.color,
        trailColor: trail.color,
        advancedVisuals,
        premiumVisuals: true,
        visuals: shipDef.visuals,
        ...shipDef.stats
      }
    };
  }

  getActiveGaragePreviewShipId() {
    if (this.garagePreviewShipId && SHIP_LOOKUP[this.garagePreviewShipId]) {
      return this.garagePreviewShipId;
    }

    return this.profile.selectedShipId;
  }

  syncGaragePreview() {
    const host = this.metaUI.getGaragePreviewHost();

    if (this.phase !== 'hangar' || !host) {
      this.garagePreview.unmount();
      return;
    }

    const preview = this.getGaragePreviewConfig();
    this.garagePreview.mount(host);
    this.garagePreview.setShip(preview.config, preview.signature);
  }

  createShipFromSelection({
    shipId,
    cosmetics,
    label,
    premiumVisuals = true,
    idlePhase = 0,
    statsOverride = null,
    advancedVisuals = null
  }) {
    const shipDef = SHIP_LOOKUP[shipId] ?? SHIP_DEFS[0];
    const hull = HULL_LOOKUP[cosmetics?.hullId] ?? HULL_COLORS[0];
    const glow = GLOW_LOOKUP[cosmetics?.glowId] ?? GLOW_COLORS[0];
    const trail = TRAIL_LOOKUP[cosmetics?.trailId] ?? TRAIL_COLORS[0];

    return new RacingShip({
      shipId: shipDef.id,
      shipName: shipDef.name,
      manufacturer: shipDef.manufacturer,
      manufacturerStyle: shipDef.manufacturerStyle,
      label,
      color: hull.color,
      emissive: hull.emissive,
      glow: glow.color,
      trailColor: trail.color,
      advancedVisuals,
      premiumVisuals,
      visuals: shipDef.visuals,
      idlePhase,
      ...(statsOverride ?? shipDef.stats)
    });
  }

  createPlayerShip() {
    const raceContext = this.activePremiumRaceContext;
    const shipId = raceContext?.selectedShipId ?? this.profile.selectedShipId;
    const statsOverride = getEffectiveShipStats(
      shipId,
      {
        mode: this.runMode,
        statMode: raceContext?.statMode ?? 'base',
        multiplayer: Boolean(this.multiplayerMatch),
        competitive: Boolean(this.multiplayerMatch) || this.runMode === 'ranked-season'
      },
      this.profile,
      this.entitlements
    );

    return this.createShipFromSelection({
      shipId,
      cosmetics: this.profile.cosmetics,
      label: this.profile.playerName,
      premiumVisuals: true,
      idlePhase: 0.2,
      statsOverride,
      advancedVisuals: this.getAdvancedVisualConfig({ includePreview: false })
    });
  }

  createAiEntries(trackDef, raceContext = null) {
    const levelInfo = this.profileStore.getLevelInfo(this.profile.xp);
    const trackPressure = 1 + (this.getTrackUnlockLevel(trackDef) - 1) * 0.028;
    const careerPressure = 1 + Math.min(levelInfo.level - 1, 6) * 0.008;
    const difficulty = raceContext?.difficulty ?? this.profile.settings.gameplay.difficulty;
    const difficultyTuning = {
      casual: { pace: 0.95, aggression: 0.88, caution: 1.08, boost: 0.86 },
      standard: { pace: 1, aggression: 1, caution: 1, boost: 1 },
      elite: { pace: 1.06, aggression: 1.08, caution: 0.94, boost: 1.1 }
    }[difficulty] ?? { pace: 1, aggression: 1, caution: 1, boost: 1 };
    const customAiCount = Number.isFinite(Number(raceContext?.aiCount))
      ? Math.max(1, Math.min(7, Math.floor(Number(raceContext.aiCount))))
      : 0;
    const aiBlueprints = raceContext?.aiRoster?.length
      ? raceContext.aiRoster
      : customAiCount > 0
        ? Array.from({ length: customAiCount }, (_, index) => AI_BLUEPRINTS[index % AI_BLUEPRINTS.length])
        : AI_BLUEPRINTS;
    const aiNames = createAiNames(aiBlueprints.length, [this.profile.playerName]);

    return aiBlueprints.map((blueprint, index) => {
      const fallbackBlueprint = AI_BLUEPRINTS[index % AI_BLUEPRINTS.length];
      const shipDef = SHIP_LOOKUP[blueprint.shipId] ?? SHIP_LOOKUP[fallbackBlueprint.shipId] ?? SHIP_DEFS[0];
      const hull = HULL_LOOKUP[blueprint.hullId] ?? HULL_LOOKUP[fallbackBlueprint.hullId] ?? HULL_COLORS[0];
      const glow = GLOW_LOOKUP[blueprint.glowId] ?? GLOW_LOOKUP[fallbackBlueprint.glowId] ?? GLOW_COLORS[0];
      const trail = TRAIL_LOOKUP[blueprint.trailId] ?? TRAIL_LOOKUP[fallbackBlueprint.trailId] ?? TRAIL_COLORS[0];
      const raceVariance = (Math.random() - 0.5) * 0.08;
      const maxSpeedModifier = 1 + raceVariance * 0.5;
      const accelerationModifier = 1 + raceVariance * 0.38;

      const ship = new RacingShip({
        shipId: shipDef.id,
        shipName: shipDef.name,
        manufacturer: shipDef.manufacturer,
        manufacturerStyle: shipDef.manufacturerStyle,
        label: blueprint.name ?? blueprint.label ?? aiNames[index] ?? fallbackBlueprint.label,
        color: hull.color,
        emissive: hull.emissive,
        glow: glow.color,
        trailColor: trail.color,
        premiumVisuals: true,
        visuals: shipDef.visuals,
        idlePhase: index * 0.7 + 1.1,
        maxSpeed: shipDef.stats.maxSpeed * maxSpeedModifier,
        acceleration: shipDef.stats.acceleration * accelerationModifier,
        friction: shipDef.stats.friction,
        lateralAcceleration: shipDef.stats.lateralAcceleration,
        lateralDamping: shipDef.stats.lateralDamping,
        startBoostEnergy: shipDef.stats.startBoostEnergy
      });
      ship.persona = {
        label: blueprint.personaLabel,
        contactBias: blueprint.contactBias,
        driftBias: blueprint.driftBias,
        boostAggression: blueprint.boostAggression,
        shortcutBias: blueprint.shortcutBias
      };
      ship.premiumParticipantId = blueprint.participantId ?? '';
      ship.premiumScoring = blueprint.scoring !== false;

      const targetCruise = ship.config.maxSpeed
        * (blueprint.pace ?? fallbackBlueprint.pace)
        * trackPressure
        * careerPressure
        * difficultyTuning.pace;

      return {
        ship,
        pilot: new AiPilot({
          cruiseSpeed: targetCruise,
          lanePreference: blueprint.lanePreference ?? fallbackBlueprint.lanePreference,
          laneAmplitude: (blueprint.laneAmplitude ?? fallbackBlueprint.laneAmplitude) + Math.random() * 0.5,
          laneFrequency: (blueprint.laneFrequency ?? fallbackBlueprint.laneFrequency) + Math.random() * 0.06,
          caution: ((blueprint.caution ?? fallbackBlueprint.caution) + this.getTrackUnlockLevel(trackDef) * 0.04) * difficultyTuning.caution,
          aggression: ((blueprint.aggression ?? fallbackBlueprint.aggression) + Math.random() * 0.08) * difficultyTuning.aggression,
          wobble: (blueprint.wobble ?? fallbackBlueprint.wobble) + Math.random() * 0.02,
          boostDiscipline: (blueprint.boostDiscipline ?? fallbackBlueprint.boostDiscipline) * difficultyTuning.boost,
          boostAggression: (blueprint.boostAggression ?? fallbackBlueprint.boostAggression) * difficultyTuning.boost,
          shortcutBias: blueprint.shortcutBias ?? fallbackBlueprint.shortcutBias,
          driftBias: blueprint.driftBias ?? fallbackBlueprint.driftBias,
          contactBias: blueprint.contactBias ?? fallbackBlueprint.contactBias,
          precision: blueprint.precision ?? fallbackBlueprint.precision,
          preferredIdentity: blueprint.preferredIdentity ?? fallbackBlueprint.preferredIdentity,
          personaLabel: blueprint.personaLabel ?? fallbackBlueprint.personaLabel,
          phase: Math.random() * Math.PI * 2
        })
      };
    });
  }

  createRemoteShip(playerEntry, index) {
    return this.createShipFromSelection({
      shipId: playerEntry.shipId,
      cosmetics: playerEntry.cosmetics,
      label: playerEntry.name,
      premiumVisuals: true,
      idlePhase: index * 0.77 + 0.5,
      statsOverride: MULTIPLAYER_BALANCE_STATS
    });
  }

  createRaceStats() {
    return {
      overtakes: 0,
      driftReleases: 0,
      pickupsCollected: 0,
      hazardHits: 0,
      usedManualBoost: false,
      boostSeconds: 0,
      draftSeconds: 0,
      contactMoments: 0,
      nearMisses: 0,
      currentPosition: this.playerPosition,
      previousPosition: this.playerPosition,
      bestPosition: this.playerPosition,
      topSpeed: 0,
      lastLapTimeMs: null,
      bestLapTimeMs: null,
      totalTimeMs: 0
    };
  }

  createTimingState(trackDef) {
    const record = this.profileStore.getTimeTrialRecord(this.profile, trackDef.id);

    return {
      trackId: trackDef.id,
      sectorSplits: [...(trackDef.sectorSplits ?? [1 / 3, 2 / 3])],
      elapsedMs: 0,
      lapIndex: 1,
      lapStartMs: 0,
      currentSectorStartMs: 0,
      nextSectorIndex: 0,
      currentSectorTimes: [],
      lastSectorTimes: [],
      completedLapTimes: [],
      bestLapMs: record?.bestLapMs ?? null,
      bestRunMs: record?.bestRunMs ?? null,
      bestSectors: [...(record?.bestSectors ?? [])],
      lastLapMs: null,
      lastLapDeltaMs: null,
      lastSectorIndex: null,
      lastSectorDeltaMs: null,
      currentLapFrames: [],
      bestLapFrames: null,
      ghostSampleTimer: 0,
      bestRecord: record,
      activeDraftStrength: 0
    };
  }

  setupTimeTrialGhost() {
    if (this.runMode !== 'time-trial' || !this.trackTiming?.bestRecord?.ghostFrames?.length) {
      this.timeTrialGhost = null;
      return;
    }

    const record = this.trackTiming.bestRecord;
    const ghostShip = this.createShipFromSelection({
      shipId: record.shipId,
      cosmetics: record.cosmetics,
      label: 'Ghost',
      premiumVisuals: true,
      idlePhase: 2.2
    });
    ghostShip.config.ghost = true;
    ghostShip.applyGhostStyle();
    ghostShip.placeOnGrid(this.track, this.track.getGridSlot(1));
    ghostShip.root.visible = true;
    this.scene.add(ghostShip.root);
    this.timeTrialGhost = {
      ship: ghostShip,
      frames: record.ghostFrames,
      durationMs: Math.max(1, record.ghostDurationMs ?? record.bestLapMs ?? 1)
    };
  }

  interpolateGhostSnapshot(frameA, frameB, alpha, lapBase = 0) {
    const blend = THREE.MathUtils.clamp(alpha, 0, 1);
    const progressDelta = THREE.MathUtils.euclideanModulo(frameB.progress - frameA.progress, 1);

    return {
      progress: THREE.MathUtils.euclideanModulo(frameA.progress + progressDelta * blend, 1),
      distance: lapBase + THREE.MathUtils.lerp(frameA.distance, frameB.distance, blend),
      lateralOffset: THREE.MathUtils.lerp(frameA.lateralOffset, frameB.lateralOffset, blend),
      speed: THREE.MathUtils.lerp(frameA.speed, frameB.speed, blend),
      boosting: blend < 0.5 ? frameA.boosting : frameB.boosting,
      drifting: blend < 0.5 ? frameA.drifting : frameB.drifting,
      throttle: THREE.MathUtils.lerp(frameA.throttle, frameB.throttle, blend),
      steer: THREE.MathUtils.lerp(frameA.steer, frameB.steer, blend)
    };
  }

  sampleGhostSnapshot(localTimeMs) {
    if (!this.timeTrialGhost?.frames?.length) {
      return null;
    }

    const { frames, durationMs } = this.timeTrialGhost;
    const wrappedTime = THREE.MathUtils.euclideanModulo(localTimeMs, durationMs);
    const lapBase = Math.floor(localTimeMs / durationMs);

    for (let index = 0; index < frames.length - 1; index += 1) {
      const current = frames[index];
      const next = frames[index + 1];

      if (wrappedTime >= current.timeMs && wrappedTime <= next.timeMs) {
        const span = Math.max(1, next.timeMs - current.timeMs);
        return this.interpolateGhostSnapshot(current, next, (wrappedTime - current.timeMs) / span, lapBase);
      }
    }

    const last = frames[frames.length - 1];
    return {
      progress: last.progress,
      distance: lapBase + last.distance,
      lateralOffset: last.lateralOffset,
      speed: last.speed,
      boosting: last.boosting,
      drifting: last.drifting,
      throttle: last.throttle,
      steer: last.steer
    };
  }

  recordGhostFrame(playerControls, options = {}) {
    if (this.runMode !== 'time-trial' || !this.trackTiming) {
      return;
    }

    const lapLocalTimeMs = this.trackTiming.elapsedMs - this.trackTiming.lapStartMs;
    this.trackTiming.currentLapFrames.push({
      timeMs: lapLocalTimeMs,
      progress: options.forceLapEnd ? 1 : this.playerShip.progress,
      distance: options.forceLapEnd
        ? 1
        : this.playerShip.getTravelledDistance() - Math.floor(this.playerShip.getTravelledDistance()),
      lateralOffset: this.playerShip.lateralOffset,
      speed: this.playerShip.speed,
      boosting: this.playerShip.boosting,
      drifting: this.playerShip.drifting,
      throttle: playerControls.throttle,
      steer: playerControls.steer
    });
  }

  completeSectorTiming(sectorIndex) {
    if (!this.trackTiming) {
      return;
    }

    const sectorTime = this.trackTiming.elapsedMs - this.trackTiming.currentSectorStartMs;
    const existingBest = this.trackTiming.bestSectors[sectorIndex];
    this.trackTiming.lastSectorIndex = sectorIndex;
    this.trackTiming.lastSectorDeltaMs = Number.isFinite(existingBest)
      ? sectorTime - existingBest
      : null;
    this.trackTiming.currentSectorTimes[sectorIndex] = sectorTime;
    this.trackTiming.lastSectorTimes[sectorIndex] = sectorTime;

    if (!Number.isFinite(existingBest) || sectorTime < existingBest) {
      this.trackTiming.bestSectors[sectorIndex] = sectorTime;
    }

    this.trackTiming.currentSectorStartMs = this.trackTiming.elapsedMs;
  }

  finalizeCurrentLapTiming() {
    if (!this.trackTiming) {
      return null;
    }

    const finalSectorIndex = this.trackTiming.sectorSplits.length;
    this.completeSectorTiming(finalSectorIndex);
    const lapTimeMs = this.trackTiming.elapsedMs - this.trackTiming.lapStartMs;
    const previousBestLap = this.trackTiming.bestLapMs;

    this.trackTiming.lastLapMs = lapTimeMs;
    this.trackTiming.lastLapDeltaMs = Number.isFinite(previousBestLap)
      ? lapTimeMs - previousBestLap
      : null;
    this.trackTiming.completedLapTimes.push(lapTimeMs);

    if (!Number.isFinite(previousBestLap) || lapTimeMs < previousBestLap) {
      this.trackTiming.bestLapMs = lapTimeMs;
      this.trackTiming.bestLapFrames = [...this.trackTiming.currentLapFrames];
    }

    this.trackTiming.lapIndex += 1;
    this.trackTiming.lapStartMs = this.trackTiming.elapsedMs;
    this.trackTiming.currentSectorStartMs = this.trackTiming.elapsedMs;
    this.trackTiming.nextSectorIndex = 0;
    this.trackTiming.currentSectorTimes = [];
    this.trackTiming.currentLapFrames = [];

    return lapTimeMs;
  }

  updateTiming(deltaTime, playerControls) {
    if (!this.trackTiming || !this.playerShip) {
      return;
    }

    this.trackTiming.elapsedMs += deltaTime * 1000;
    this.trackTiming.ghostSampleTimer += deltaTime;
    this.trackTiming.activeDraftStrength = this.playerShip.draftStrength;

    if (this.trackTiming.ghostSampleTimer >= TIME_TRIAL_SAMPLE_INTERVAL) {
      this.trackTiming.ghostSampleTimer = 0;
      this.recordGhostFrame(playerControls);
    }

    const travelledDistance = this.playerShip.getTravelledDistance();
    const lapProgress = THREE.MathUtils.euclideanModulo(travelledDistance, 1);
    const currentLapNumber = Math.floor(travelledDistance) + 1;

    while (
      this.trackTiming.nextSectorIndex < this.trackTiming.sectorSplits.length &&
      lapProgress >= this.trackTiming.sectorSplits[this.trackTiming.nextSectorIndex]
    ) {
      const sectorIndex = this.trackTiming.nextSectorIndex;
      this.completeSectorTiming(sectorIndex);
      this.trackTiming.nextSectorIndex += 1;

      const deltaLabel = Number.isFinite(this.trackTiming.lastSectorDeltaMs)
        ? `${this.trackTiming.lastSectorDeltaMs <= 0 ? '-' : '+'}${(Math.abs(this.trackTiming.lastSectorDeltaMs) / 1000).toFixed(2)}`
        : formatTimeMs(this.trackTiming.lastSectorTimes[sectorIndex], '--');
      this.setToast(`Sector ${sectorIndex + 1} ${deltaLabel}`, 0.9);
    }

    while (currentLapNumber > this.trackTiming.lapIndex) {
      if (this.runMode === 'time-trial') {
        this.recordGhostFrame(playerControls, { forceLapEnd: true });
      }

      const lapTimeMs = this.finalizeCurrentLapTiming();
      this.replayCapture.addEvent('lap-complete', { label: `Lap ${currentLapNumber - 1} Complete` }, this.trackTiming?.elapsedMs ?? 0);

      if (this.raceStats) {
        this.raceStats.lastLapTimeMs = lapTimeMs;
        this.raceStats.bestLapTimeMs = this.trackTiming.bestLapMs;
      }
    }

    if (this.raceStats) {
      this.raceStats.totalTimeMs = this.trackTiming.elapsedMs;
    }
  }

  updateTimeTrialGhost(deltaTime) {
    if (!this.timeTrialGhost || !this.trackTiming || this.phase !== 'race') {
      return;
    }

    const snapshot = this.sampleGhostSnapshot(this.trackTiming.elapsedMs);

    if (!snapshot) {
      this.timeTrialGhost.ship.updateAtRest(deltaTime, this.elapsedTime, this.track);
      return;
    }

    this.timeTrialGhost.ship.applyNetworkState(this.track, snapshot, deltaTime, this.elapsedTime);
  }

  prepareMultiplayerRace(payload) {
    const { room, raceConfig, startAt } = payload;

    if (!room || !raceConfig) {
      return;
    }

    this.sound.resume();
    this.sound.stopCommentarySpeech(true);
    this.clearWorld();
    this.effects.clear();
    this.paused = false;
    this.timeScale = 1;
    this.pendingFinishSlowmo = null;
    this.metaUI.hidePause();
    this.runMode = 'multiplayer';
    this.multiplayerMatch = {
      roomId: room.id,
      roomType: room.type,
      roomCode: room.code,
      startAt,
      snapshotTimer: 0,
      submittedFinish: false,
      waitingForResults: false
    };
    const trackDef = TRACK_LOOKUP[raceConfig.trackId] ?? TRACK_DEFS[0];
    this.applyTrackSceneTheme(trackDef);
    this.track = new RaceTrack(trackDef);
    this.powerUps = null;
    this.playerShip = this.createPlayerShip();
    this.racers = [];
    this.aiEntries = [];
    this.lapTarget = raceConfig.laps;
    this.trackTiming = this.createTimingState(this.track.definition);

    const entrantIds = new Set(raceConfig.tournament?.entrantIds ?? room.players.map((player) => player.playerId));
    const racePlayers = room.players.filter((player) => entrantIds.has(player.playerId));

    for (let index = 0; index < racePlayers.length; index += 1) {
      const playerEntry = racePlayers[index];
      const isLocal = playerEntry.playerId === this.getCurrentPlayerId();
      const ship = isLocal ? this.playerShip : this.createRemoteShip(playerEntry, index);
      ship.placeOnGrid(this.track, this.track.getGridSlot(index));
      this.racers.push(ship);
      this.scene.add(ship.root);

      if (playerEntry.bot) {
        this.aiEntries.push({
          ship,
          pilot: new AiPilot({
            cruiseSpeed: ship.config.maxSpeed * 0.94,
            lanePreference: (index % 3 - 1) * 2.2,
            laneAmplitude: 1.8,
            laneFrequency: 0.35,
            caution: 1,
            aggression: 0.95,
            wobble: 0.04,
            boostDiscipline: 0.9,
            boostAggression: 0.88,
            shortcutBias: 0.4,
            driftBias: 0.7,
            contactBias: 0.2,
            precision: 0.8,
            phase: index * 0.8
          })
        });
      } else if (!isLocal) {
        this.multiplayerRemoteShips.set(playerEntry.playerId, {
          ship,
          latestSnapshot: playerEntry.snapshot ?? null
        });
      }
    }

    this.racerLapMap = new Map(this.racers.map((ship) => [ship, 1]));
    this.scene.add(this.track.group);
    this.updateStandings();
    this.garagePreview.unmount();
    this.metaUI.hide();
    this.phase = 'countdown';
    this.phaseTimer = 0;
    this.goFlashTimer = 0;
    this.toastText = '';
    this.toastTimer = 0;
    this.raceStats = this.createRaceStats();
    this.lastCountdownCue = null;
    this.lastPlayerLap = 1;
    this.rankCommentaryTimer = 0;
    this.commentary.reset({
      trackName: this.track.definition.name,
      racers: this.racers,
      playerShip: this.playerShip
    });
    this.cameraController.snapShowcase(this.track, this.playerShip, 0);
  }

  handleMultiplayerRaceState(payload) {
    if (!this.multiplayerMatch || payload.roomId !== this.multiplayerMatch.roomId) {
      return;
    }

    for (const racer of payload.racers ?? []) {
      const remote = this.multiplayerRemoteShips.get(racer.playerId);

      if (remote) {
        remote.latestSnapshot = racer.snapshot;
      }
    }
  }

  handleMultiplayerRaceResults(payload) {
    if (!payload?.standings) {
      return;
    }

    const localResult = payload.standings.find((entry) => entry.playerId === this.getCurrentPlayerId());

    if (!localResult) {
      return;
    }

    this.sound.playFinish(localResult.place);
    this.sound.stopCommentarySpeech(true);
    this.commentary.finalizeResults(payload.standings);
    this.phase = 'results';
    this.phaseTimer = 0;
    this.multiplayerMatch = null;
    const progress = this.profileStore.applyMultiplayerResults(this.profile, {
      roomType: payload.room?.type ?? 'quick',
      standings: payload.standings,
      localResult,
      highlights: payload.highlights ?? [],
      closeFinish: (payload.highlights ?? []).some((entry) => entry.toLowerCase().includes('close finish'))
    });
    const resultSummary = {
      position: localResult.place,
      totalRacers: payload.standings.length,
      trackId: this.track?.definition?.id ?? this.profile.selectedTrackId,
      shipId: this.profile.selectedShipId,
      stats: {
        ...this.raceStats
      },
      timing: this.buildTimingSummary(),
      standings: this.buildResultsStandings(payload.standings),
      challengeResults: [],
      rewards: progress.rewards,
      rewardBreakdown: [
        { label: 'Ranked Placement', reward: progress.rewards }
      ],
      multiplayer: {
        roomType: payload.room?.type ?? 'quick',
        roomCode: payload.room?.code ?? '',
        standings: payload.standings,
        highlights: payload.highlights ?? [],
        localResult,
        completedGoals: progress.completedGoals,
        rank: progress.rank
      }
    };

    this.metaUI.showResults(this.createResultsModel(resultSummary, progress));
    this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
  }

  beginRaceSequence(mode = 'career-race', raceContext = null) {
    this.phase = 'launching';
    this.runMode = mode;
    this.activePremiumRaceContext = ['campaign', 'tournament', 'custom-race', 'ranked-season', 'live-event', 'boss-event'].includes(mode)
      ? raceContext
      : null;
    this.sound.resume();
    this.sound.stopCommentarySpeech(true);
    this.paused = false;
    this.timeScale = 1;
    this.pendingFinishSlowmo = null;
    this.metaUI.hidePause();
    void this.multiplayer.leaveRoom().catch(() => {});
    this.multiplayerMatch = null;
    this.activeChallengeIds = mode === 'career-race'
      ? this.profileStore.createRaceChallenges(this.profile)
      : [];
    this.buildWorldForSelections();
    if (!this.multiplayerMatch) {
      this.racers.forEach((ship, index) => {
        ship.replayParticipantId = ship === this.playerShip
          ? 'player'
          : String(ship.premiumParticipantId || `ai-${index}`);
      });
      this.replayCapture.start({
        mode,
        trackId: this.track.definition.id,
        trackName: this.track.definition.name,
        trackDefinition: this.track.definition,
        lapTarget: this.lapTarget,
        graphicsQuality: this.profile.settings.graphics.quality,
        participants: this.racers.map((ship, index) => ({
          id: String(ship.replayParticipantId || ship.premiumParticipantId || `ship-${index}`),
          label: String(ship.label ?? ship.config?.label ?? `Pilot ${index + 1}`),
          shipId: String(ship.config?.shipId ?? 'starling'),
          scoring: ship.premiumScoring !== false,
          advancedVisuals: ship.config?.advancedVisuals ?? null,
          cosmetics: index === 1 || ship === this.playerShip
            ? { ...this.profile.cosmetics }
            : { hullId: 'azure', glowId: 'cyan-core', trailId: 'ion-trail' }
        }))
      });
    } else {
      this.replayCapture.cancel();
    }
    this.garagePreview.unmount();
    this.metaUI.hide();
    this.phase = 'intro';
    this.phaseTimer = 0;
    this.goFlashTimer = 0;
    this.toastText = '';
    this.toastTimer = 0;
    this.raceStats = this.createRaceStats();
    this.lastCountdownCue = null;
    this.lastPlayerLap = 1;
    this.rankCommentaryTimer = 0;
    this.commentary.reset({
      trackName: this.track.definition.name,
      racers: this.racers,
      playerShip: this.playerShip
    });
  }

  buildTimingSummary() {
    return {
      totalTimeMs: this.trackTiming?.elapsedMs ?? this.raceStats?.totalTimeMs ?? 0,
      bestLapMs: this.trackTiming?.bestLapMs ?? this.raceStats?.bestLapTimeMs ?? null,
      lastLapMs: this.trackTiming?.lastLapMs ?? this.raceStats?.lastLapTimeMs ?? null,
      sectorTimes: [...(this.trackTiming?.lastSectorTimes ?? [])],
      bestSectorTimes: [...(this.trackTiming?.bestSectors ?? [])],
      lapTimes: [...(this.trackTiming?.completedLapTimes ?? [])]
    };
  }

  finishReplayCapture(raceSummary) {
    if (this.multiplayerMatch) {
      return null;
    }

    this.replayCapture.addEvent('finish', { label: 'Finish' }, this.trackTiming?.elapsedMs ?? raceSummary.timing?.totalTimeMs ?? 0);
    this.replayCapture.sample(this.trackTiming?.elapsedMs ?? raceSummary.timing?.totalTimeMs ?? 0, this.racers);
    this.latestReplay = this.replayCapture.finish({
      durationMs: raceSummary.timing?.totalTimeMs ?? this.trackTiming?.elapsedMs ?? 1,
      position: raceSummary.position,
      totalRacers: raceSummary.totalRacers,
      resultLabel: raceSummary.timeTrial ? 'Time Trial' : `${formatOrdinal(raceSummary.position)} Place`
    });

    return this.latestReplay;
  }

  buildReplayWorld(replay) {
    this.clearWorld();
    this.effects.clear();
    this.powerUps = null;
    const trackDef = replay?.trackDefinition ?? TRACK_LOOKUP[replay?.trackId] ?? TRACK_DEFS[0];
    this.applyTrackSceneTheme(trackDef);
    this.track = new RaceTrack(trackDef);
    this.lapTarget = Math.max(1, Math.floor(Number(replay?.lapTarget ?? trackDef.laps ?? 1)));
    this.racers = [];
    this.replayShips = new Map();

    const participants = replay?.participants?.length
      ? replay.participants
      : [{
          id: 'player',
          label: this.profile.playerName,
          shipId: this.profile.selectedShipId,
          cosmetics: { ...this.profile.cosmetics },
          scoring: true
        }];

    participants.forEach((participant, index) => {
      const ship = this.createShipFromSelection({
        shipId: participant.shipId,
        cosmetics: participant.cosmetics ?? this.profile.cosmetics,
        label: participant.label,
        premiumVisuals: true,
        idlePhase: index * 0.6,
        advancedVisuals: participant.advancedVisuals ?? null
      });
      ship.replayParticipantId = participant.id;
      ship.premiumParticipantId = participant.id;
      ship.premiumScoring = participant.scoring !== false;
      ship.placeOnGrid(this.track, this.track.getGridSlot(index));
      this.replayShips.set(participant.id, ship);
      this.racers.push(ship);
      this.scene.add(ship.root);
    });

    this.playerShip = this.replayShips.get('player') ?? this.racers[0] ?? null;
    this.racerLapMap = new Map(this.racers.map((ship) => [ship, 1]));
    this.trackTiming = null;
    this.scene.add(this.track.group);
    this.updateStandings();

    if (this.playerShip) {
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.12);
    }
  }

  startReplayViewer() {
    if (!this.entitlements.canUseReplayPhotoMode()) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.replayPhotoMode;
      this.metaUI.hangarPage = 'premium';
      this.setToast('Replay & Photo Mode requires standalone premium access.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.stopCommentarySpeech(true);
    this.paused = false;
    this.timeScale = 1;
    this.pendingFinishSlowmo = null;
    this.multiplayerMatch = null;
    this.metaUI.hidePause();
    this.phase = 'replay';
    this.phaseTimer = 0;
    this.replayState = {
      ...this.replayState,
      timeMs: 0,
      playing: Boolean(this.latestReplay?.frames?.length),
      speed: 1,
      cameraMode: 'chase',
      photoMode: false,
      hudHidden: false,
      showName: true,
      showOverlay: true
    };

    if (this.latestReplay?.frames?.length) {
      this.buildReplayWorld(this.latestReplay);
      this.setToast('Replay viewer ready. Photo Mode can pause the run.', 1.8);
    } else {
      this.setToast('No runtime replay is available yet. Finish an offline race first.', 2);
    }

    this.metaUI.showReplay(this.createReplayModel());
  }

  updateReplay(deltaTime) {
    const replay = this.latestReplay;

    if (!replay?.frames?.length || !this.track || !this.playerShip) {
      return;
    }

    if (this.replayState.playing && !this.replayState.photoMode) {
      this.replayState.timeMs += deltaTime * 1000 * this.replayState.speed;

      if (this.replayState.timeMs >= replay.durationMs) {
        this.replayState.timeMs = replay.durationMs;
        this.replayState.playing = false;
        this.metaUI.showReplay(this.createReplayModel());
      }
    }

    const frame = sampleReplayFrame(replay, this.replayState.timeMs);

    if (!frame) {
      return;
    }

    for (const snapshot of frame.ships) {
      const ship = this.replayShips.get(snapshot.id);

      if (!ship) {
        continue;
      }

      ship.applyNetworkState(this.track, snapshot, deltaTime, this.elapsedTime);
    }

    this.updateReplayCamera(deltaTime);
  }

  updateReplayCamera(deltaTime) {
    if (!this.track || !this.playerShip) {
      return;
    }

    const mode = this.replayState.cameraMode;

    if (mode === 'chase') {
      this.cameraController.updateRace(deltaTime, this.playerShip);
      return;
    }

    if (mode === 'orbit') {
      this.cameraController.updateShowcase(
        deltaTime,
        this.elapsedTime,
        this.track,
        this.playerShip,
        this.replayState.angle
      );
      return;
    }

    const frame = {
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3()
    };
    const progress = mode === 'finish'
      ? 0.985
      : THREE.MathUtils.euclideanModulo(this.playerShip.progress + (mode === 'drone' ? 0.05 : 0.025), 1);
    this.track.getFrame(progress, frame);

    const zoom = THREE.MathUtils.clamp(Number(this.replayState.zoom ?? 1), 0.65, 1.45);
    const height = Number(this.replayState.height ?? 0);
    const orbitAngle = Number(this.replayState.angle ?? 0) + this.elapsedTime * (mode === 'cinematic' ? 0.24 : 0);
    const lateral = Math.sin(orbitAngle) * (mode === 'drone' ? 26 : 16) * zoom;
    const trailing = mode === 'finish' ? -18 : -22 * zoom;
    const altitude = (mode === 'drone' ? 18 : 9) + height * 8;
    const targetPosition = frame.point.clone()
      .addScaledVector(frame.right, lateral)
      .addScaledVector(frame.tangent, trailing)
      .addScaledVector(frame.up, altitude);
    const targetLookAt = this.playerShip.root.position.clone().addScaledVector(frame.up, 2);
    const smooth = 1 - Math.exp(-deltaTime * 4.6);

    this.camera.position.lerp(targetPosition, smooth);
    this.camera.lookAt(targetLookAt);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, mode === 'drone' ? 66 : 58, smooth);
    this.camera.updateProjectionMatrix();
  }

  createReplayModel() {
    const access = this.entitlements.getReplayAccessState();
    const replay = this.latestReplay;
    const hasReplay = Boolean(replay?.frames?.length);
    const durationMs = Math.max(1, replay?.durationMs ?? 1);
    const currentMs = THREE.MathUtils.clamp(this.replayState.timeMs ?? 0, 0, durationMs);
    const full = access.full;
    const cameraOptions = [
      { id: 'chase', label: 'Chase', locked: false },
      { id: 'orbit', label: 'Orbit', locked: false },
      { id: 'drone', label: 'Drone', locked: !full },
      { id: 'finish', label: 'Finish Line', locked: !full },
      { id: 'cinematic', label: 'Cinematic', locked: !full }
    ];
    const currentFrame = hasReplay ? sampleReplayFrame(replay, currentMs) : null;
    const snapshotsById = new Map((currentFrame?.ships ?? []).map((snapshot) => [snapshot.id, snapshot]));
    const positionsById = new Map(
      [...(currentFrame?.ships ?? [])]
        .sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0))
        .map((snapshot, index) => [snapshot.id, index + 1])
    );

    return {
      access,
      hasReplay,
      title: hasReplay ? `${replay.trackName} Replay` : 'Replay Empty',
      subtitle: hasReplay
        ? `${replay.summary?.resultLabel ?? 'Race replay'} | Runtime-only highlight capture`
        : 'Finish an offline race, campaign race, tournament race, or custom race to capture a lightweight replay.',
      durationLabel: formatTimeMs(durationMs),
      currentLabel: formatTimeMs(currentMs),
      progressPercent: currentMs / durationMs,
      timeMs: currentMs,
      durationMs,
      playing: Boolean(this.replayState.playing),
      speed: this.replayState.speed,
      photoMode: Boolean(this.replayState.photoMode),
      hudHidden: Boolean(this.replayState.hudHidden),
      showName: Boolean(this.replayState.showName),
      showOverlay: Boolean(this.replayState.showOverlay),
      zoom: Number(this.replayState.zoom ?? 1),
      height: Number(this.replayState.height ?? 0),
      angle: Number(this.replayState.angle ?? 0),
      speedOptions: [
        { id: '0.5', label: '0.5x', locked: !full },
        { id: '1', label: '1x', locked: false },
        { id: '2', label: '2x', locked: !full }
      ],
      cameraOptions,
      cameraMode: cameraOptions.some((option) => option.id === this.replayState.cameraMode && !option.locked)
        ? this.replayState.cameraMode
        : 'chase',
      events: (replay?.events ?? []).map((event) => ({
        ...event,
        label: event.label,
        timeLabel: formatTimeMs(event.timeMs)
      })),
      participants: (replay?.participants ?? []).map((participant) => {
        const snapshot = snapshotsById.get(participant.id) ?? {};
        return {
          ...participant,
          name: participant.label,
          position: positionsById.get(participant.id) ?? 0,
          speed: Math.round(snapshot.speed ?? 0),
          lap: snapshot.lap ?? 1
        };
      })
    };
  }

  handleReplayControl(actionId, value = '') {
    if (this.phase !== 'replay') {
      return;
    }

    const full = this.entitlements.canUseFullReplayPhotoMode();
    const replay = this.latestReplay;

    if (actionId === 'back-hangar') {
      this.showHangar();
      return;
    }

    if (actionId === 'toggle-play') {
      this.replayState.playing = !this.replayState.playing;
      this.replayState.photoMode = false;
    } else if (actionId === 'restart') {
      this.replayState.timeMs = 0;
      this.replayState.playing = Boolean(replay?.frames?.length);
      this.replayState.photoMode = false;
    } else if (actionId === 'speed') {
      const nextSpeed = Number(value);
      this.replayState.speed = full && [0.5, 1, 2].includes(nextSpeed) ? nextSpeed : 1;
    } else if (actionId === 'camera') {
      const fullCameras = ['drone', 'finish', 'cinematic'];
      this.replayState.cameraMode = fullCameras.includes(value) && !full ? 'chase' : (value || 'chase');
    } else if (actionId === 'photo') {
      this.replayState.photoMode = !this.replayState.photoMode;
      this.replayState.playing = !this.replayState.photoMode;
    } else if (actionId === 'hud') {
      this.replayState.hudHidden = !this.replayState.hudHidden;
    } else if (actionId === 'name') {
      this.replayState.showName = !this.replayState.showName;
    } else if (actionId === 'overlay') {
      this.replayState.showOverlay = !this.replayState.showOverlay;
    } else if (actionId === 'scrub') {
      this.replayState.timeMs = THREE.MathUtils.clamp(Number(value), 0, replay?.durationMs ?? 1);
      this.replayState.playing = false;
    } else if (actionId === 'zoom') {
      this.replayState.zoom = THREE.MathUtils.clamp(Number(value), 0.65, 1.45);
    } else if (actionId === 'height') {
      this.replayState.height = THREE.MathUtils.clamp(Number(value), -0.5, 1);
    } else if (actionId === 'angle') {
      this.replayState.angle = Number(value);
    }

    if (!full && ['speed', 'camera'].includes(actionId)) {
      this.setToast('Full replay controls require Full Premium.', 1.5);
    }

    this.sound.playUiSelect();
    this.metaUI.showReplay(this.createReplayModel());
  }

  handleReplayCapture() {
    if (this.phase !== 'replay') {
      return;
    }

    try {
      const url = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `spaceship-replay-${Date.now()}.png`;
      link.click();
      this.sound.playUiConfirm();
      this.setToast('Screenshot captured from the canvas.', 1.6);
    } catch {
      this.sound.playUiSelect();
      this.setToast('Canvas export was blocked. Hide UI and use your device screenshot.', 2.2);
    }

    this.metaUI.showReplay(this.createReplayModel());
  }

  finishRace(force = false) {
    if (this.phase !== 'race') {
      return;
    }

    const rival = this.standings[1];
    const closeFinishGap = rival
      ? Math.abs((rival.distance ?? 0) - (this.playerShip.distance ?? 0))
      : Number.POSITIVE_INFINITY;

    if (!force && !this.pendingFinishSlowmo && closeFinishGap < 0.035) {
      this.pendingFinishSlowmo = {
        timer: 0.34,
        total: 0.34
      };
      this.setToast('Photo Finish', 0.55);
      return;
    }

    this.phase = 'results';
    this.phaseTimer = 0;
    this.paused = false;
    this.timeScale = 1;
    this.pendingFinishSlowmo = null;
    this.sound.playFinish(this.playerPosition);
    this.sound.stopCommentarySpeech(true);
    this.commentary.finalizeResults(this.standings);

    const timing = this.buildTimingSummary();

    if (this.runMode === 'time-trial') {
      const saveState = this.profileStore.saveTimeTrialRecord(this.profile, this.profile.selectedTrackId, {
        bestLapMs: timing.bestLapMs,
        totalTimeMs: timing.totalTimeMs,
        bestSectors: timing.bestSectorTimes,
        ghostDurationMs: timing.bestLapMs,
        ghostFrames: this.trackTiming?.bestLapFrames ?? [],
        shipId: this.profile.selectedShipId,
        cosmetics: this.profile.cosmetics
      });
      const raceSummary = {
        position: 1,
        totalRacers: 1,
        trackId: this.track?.definition?.id ?? this.profile.selectedTrackId,
        shipId: this.profile.selectedShipId,
        stats: { ...this.raceStats },
        standings: this.buildResultsStandings([{ position: 1, name: this.profile.playerName, finishTime: timing.totalTimeMs }]),
        challengeResults: [],
        rewards: { points: 0, currency: 0, xp: 0 },
        rewardBreakdown: [
          {
            label: 'Time Trial Session',
            reward: { points: 0, currency: 0, xp: 0 }
          }
        ],
        timing,
        timeTrial: {
          improvedLap: saveState.improvedLap,
          improvedRun: saveState.improvedRun,
          ghostSaved: saveState.improvedLap
        }
      };
      const progressModel = {
        unlocks: [],
        achievements: [],
        levelUp: false
      };

      raceSummary.replay = this.finishReplayCapture(raceSummary);
      this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    const result = {
      position: this.playerPosition,
      totalRacers: this.racers.length,
      trackId: this.track?.definition?.id ?? this.activePremiumRaceContext?.trackId ?? this.profile.selectedTrackId,
      shipId: this.profile.selectedShipId,
      stats: { ...this.raceStats },
      standings: this.buildResultsStandings(this.standings),
      timing
    };

    const rewardPackages = this.createRewardBreakdown(result);
    const challengeResults = this.profileStore.evaluateChallenges(
      this.activeChallengeIds,
      result.stats,
      result
    );
    const challengeBonus = challengeResults.reduce(
      (total, challenge) => ({
        points: total.points + (challenge.completed ? challenge.rewardXp + challenge.rewardCurrency : 0),
        currency: total.currency + (challenge.completed ? challenge.rewardCurrency : 0),
        xp: total.xp + (challenge.completed ? challenge.rewardXp : 0)
      }),
      { points: 0, currency: 0, xp: 0 }
    );

    if (challengeBonus.points > 0 || challengeBonus.currency > 0 || challengeBonus.xp > 0) {
      rewardPackages.push({
        label: 'Challenge Bonus',
        reward: challengeBonus
      });
    }

    const totalRewards = sumRewards(rewardPackages.map((entry) => entry.reward));
    const raceSummary = {
      ...result,
      challengeResults,
      rewards: totalRewards,
      rewardBreakdown: rewardPackages
    };
    raceSummary.replay = this.finishReplayCapture(raceSummary);

    if (this.runMode === 'campaign') {
      this.finishCampaignRace(raceSummary);
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    if (this.runMode === 'tournament') {
      this.finishTournamentRace(raceSummary);
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    if (this.runMode === 'custom-race') {
      this.finishCustomRace(raceSummary);
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    if (this.runMode === 'ranked-season') {
      this.finishRankedSeasonRace(raceSummary);
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    if (this.runMode === 'live-event') {
      this.finishLiveEventRace(raceSummary);
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    if (this.runMode === 'boss-event') {
      this.finishBossEventRace(raceSummary);
      this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
      return;
    }

    const careerProgress = this.profileStore.applyRaceRewards(this.profile, raceSummary);
    this.metaUI.showResults(this.createResultsModel(raceSummary, careerProgress));
    this.cameraController.snapShowcase(this.track, this.playerShip, 0.16);
  }

  getCampaignCupProgress(cupId) {
    if (!this.profile.premiumProgress) {
      this.profile.premiumProgress = this.profileStore.normalizeProfile(this.profile).premiumProgress;
    }

    const campaign = this.profile.premiumProgress.campaign;

    if (!campaign.cups[cupId]) {
      campaign.cups[cupId] = {
        unlockedRaceIndex: 0,
        completedRaceIds: [],
        bestPositions: {},
        completed: false,
        trophyEarned: false,
        trophyKey: '',
        updatedAt: 0
      };
    }

    return campaign.cups[cupId];
  }

  finishCampaignRace(raceSummary) {
    const context = this.activePremiumRaceContext?.campaign;
    const cup = getCampaignCup(context?.cupId);
    const race = getCampaignRace(cup.id, context?.raceId);
    const cupProgress = this.getCampaignCupProgress(cup.id);
    const raceIndex = cup.races.findIndex((entry) => entry.id === race.id);
    const alreadyCompleted = cupProgress.completedRaceIds.includes(race.id);
    const wasCupComplete = Boolean(cupProgress.completed);
    const progressModel = this.profileStore.applyPremiumRaceRewards(this.profile, raceSummary, { save: false });

    if (!alreadyCompleted) {
      cupProgress.completedRaceIds.push(race.id);
    }

    cupProgress.bestPositions[race.id] = Math.min(
      cupProgress.bestPositions[race.id] ?? Number.POSITIVE_INFINITY,
      raceSummary.position
    );
    cupProgress.unlockedRaceIndex = Math.max(cupProgress.unlockedRaceIndex, raceIndex + 1);
    cupProgress.completed = cup.races.every((entry) => cupProgress.completedRaceIds.includes(entry.id));
    cupProgress.updatedAt = Date.now();

    this.profile.premiumProgress.campaign.selectedCupId = cup.id;
    this.profile.premiumProgress.campaign.stats.races += 1;
    this.profile.premiumProgress.campaign.stats.wins += raceSummary.position === 1 ? 1 : 0;

    if (cupProgress.completed && !wasCupComplete) {
      cupProgress.trophyEarned = true;
      cupProgress.trophyKey = cup.trophyKey;
      this.profile.premiumProgress.campaign.stats.cupsCompleted += 1;

      if (!this.profile.premiumProgress.campaign.trophies.includes(cup.trophyKey)) {
        this.profile.premiumProgress.campaign.trophies.push(cup.trophyKey);
      }

      progressModel.premiumUnlocks = this.profileStore.grantPremiumRewards(
        this.profile,
        getRewardIdsForCampaignCup(cup.id),
        { save: false }
      ).unlocked;
    }

    const nextRace = cup.races.find((entry) => !cupProgress.completedRaceIds.includes(entry.id)) ?? null;
    const rival = getCampaignRival(race.spotlightRivalId);

    this.profileStore.save(this.profile);
    raceSummary.campaign = {
      cupId: cup.id,
      cupTitle: cup.title,
      raceId: race.id,
      raceTitle: race.title,
      requiredEdition: cup.requiredEdition,
      progressLabel: `${cupProgress.completedRaceIds.length}/${cup.races.length} races complete`,
      completed: cupProgress.completed,
      trophyEarned: cupProgress.completed && !wasCupComplete,
      trophyLabel: cup.rewardPreview,
      nextRaceId: nextRace?.id ?? '',
      nextRaceTitle: nextRace?.title ?? '',
      rivalName: rival.name,
      rivalLine: raceSummary.position === 1 ? rival.postRaceLine : rival.preRaceLine
    };

    this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
  }

  finishCustomRace(raceSummary) {
    const progressModel = this.profileStore.recordCustomRaceResult(this.profile, raceSummary, this.entitlements);
    const config = this.profile.premiumProgress?.customRaceLab?.activeConfig ?? {};

    raceSummary.customRace = {
      name: config.name ?? 'Custom Race',
      statMode: config.statMode ?? 'base',
      modifiersLabel: `${config.aiCount ?? 0} AI | ${config.lapCount ?? this.lapTarget} laps`,
      leaderboardSafe: 'Offline custom result. No leaderboard, ghost, rating, or multiplayer stats changed.'
    };
    raceSummary.rewards = progressModel.rewards;
    raceSummary.rewardBreakdown = [
      { label: 'Custom Race Lab', reward: progressModel.rewards }
    ];

    this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
  }

  finishRankedSeasonRace(raceSummary) {
    const season = getRankedSeason(new Date());
    const progressModel = this.profileStore.recordRankedSeasonResult(this.profile, raceSummary, this.entitlements);
    const rankedResult = progressModel.rankedResult;

    raceSummary.rankedSeason = {
      seasonId: season.seasonId,
      seasonName: season.seasonName,
      trackId: season.trackId,
      fairPlayNote: season.fairPlayNote,
      ratingBefore: rankedResult.previousRating,
      ratingAfter: rankedResult.nextRating,
      ratingDelta: rankedResult.ratingDelta,
      previousTier: rankedResult.previousTier.label,
      tier: rankedResult.nextTier.label,
      tierChanged: rankedResult.tierChanged,
      resultLabel: `${rankedResult.ratingDelta >= 0 ? '+' : ''}${rankedResult.ratingDelta} rating | ${rankedResult.nextTier.label}`,
      normalizedNote: 'Ranked used normalized ship stats. Offline upgrades were ignored.'
    };
    raceSummary.rewards = progressModel.rewards;
    raceSummary.rewardBreakdown = [
      { label: 'Ranked Season', reward: progressModel.rewards }
    ];

    this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
  }

  finishLiveEventRace(raceSummary) {
    const eventId = this.activePremiumRaceContext?.liveEvent?.eventId;
    const event = this.eventService.getBackendEvent(eventId) ?? getLiveEvent(eventId);
    const progressModel = this.profileStore.recordLiveEventResult(this.profile, event, raceSummary, this.entitlements);
    const result = progressModel.liveEventResult;

    raceSummary.liveEvent = {
      eventId: event.id,
      title: event.title,
      type: event.type,
      backendScheduled: Boolean(event.backendScheduled || event.source?.startsWith?.('backend')),
      leaderboardEnabled: Boolean(event.leaderboardEnabled),
      goalLabel: result.goalLabel,
      goalDescription: result.goalDescription,
      completed: result.completed,
      firstCompletion: result.firstCompletion,
      resultLabel: result.firstCompletion
        ? 'Event complete. Reward granted.'
        : result.completed
          ? 'Event already completed today. Reward was not duplicated.'
          : 'Event goal missed. Try again from Events.',
      rewardPreview: event.rewardPreview,
      fairnessNote: event.fairPlayNote
    };
    raceSummary.rewards = progressModel.rewards;
    raceSummary.rewardBreakdown = [
      { label: 'Live Event', reward: progressModel.rewards }
    ];

    this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));

    if (event.leaderboardEnabled && this.eventService.isLeaderboardEnabled()) {
      void this.submitLiveEventLeaderboardScore(event, raceSummary);
    }
  }

  async submitLiveEventLeaderboardScore(event, raceSummary) {
    try {
      const authPayload = await this.getMultiplayerIdentity(true);
      const payload = await this.eventService.submitScore(event, raceSummary, authPayload);
      this.setToast(payload?.message ?? 'Event leaderboard updated.', 1.8);
    } catch (error) {
      this.setToast(error?.message ?? 'Event leaderboard submission failed safely.', 2.2);
    }
  }

  finishBossEventRace(raceSummary) {
    const event = getBossEvent(this.activePremiumRaceContext?.bossEvent?.bossEventId ?? this.selectedBossEventId);
    const progressModel = this.profileStore.recordBossEventResult(this.profile, event, raceSummary, this.entitlements);
    const result = progressModel.bossResult;

    raceSummary.bossEvent = {
      bossEventId: event.id,
      title: event.title,
      bossName: event.bossName,
      objective: result.objective,
      completed: result.completed,
      firstCompletion: result.firstCompletion,
      resultLabel: result.firstCompletion
        ? 'Boss objective complete. Trophy unlocked.'
        : result.completed
          ? 'Boss objective already cleared. Trophy was not duplicated.'
          : 'Boss objective missed. Return to Boss Races for another run.',
      rewardPreview: event.rewardPreview,
      replayHighlight: Boolean(event.replayHighlight),
      fairnessNote: event.fairPlayNote
    };
    raceSummary.rewards = progressModel.rewards;
    raceSummary.rewardBreakdown = [
      { label: 'Boss Event', reward: progressModel.rewards }
    ];

    this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
  }

  finishTournamentRace(raceSummary) {
    const bracket = this.profile.premiumProgress?.tournaments?.activeBracket;
    const setup = getTournamentRaceSetup(bracket);

    if (!bracket || !setup) {
      const progressModel = this.profileStore.applyPremiumRaceRewards(this.profile, raceSummary);
      raceSummary.tournament = {
        typeTitle: 'Tournament',
        roundLabel: 'Race',
        resultLabel: 'Tournament state was unavailable. Progress was not advanced.',
        canContinue: false,
        championName: '',
        eliminated: false
      };
      this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
      return;
    }

    const progressModel = this.profileStore.applyPremiumRaceRewards(this.profile, raceSummary, { save: false });
    const advancement = advanceTournamentBracket(bracket, raceSummary.standings);
    const previousStatus = bracket.status;
    const nextBracket = advancement.bracket;
    const tournaments = this.profile.premiumProgress.tournaments;
    const type = advancement.type;

    tournaments.activeBracket = nextBracket;
    tournaments.selectedTypeId = type.id;

    if (nextBracket.status !== 'active' && previousStatus === 'active') {
      tournaments.stats.completed += 1;

      if (nextBracket.status === 'completed' && nextBracket.championId === TOURNAMENT_PLAYER_ID) {
        tournaments.stats.wins += 1;

        if (type.trophyKey && !tournaments.trophies.includes(type.trophyKey)) {
          tournaments.trophies.push(type.trophyKey);
        }
      } else if (nextBracket.status === 'eliminated') {
        tournaments.stats.eliminations += 1;
      }

      tournaments.history.unshift({
        ...nextBracket,
        archivedAt: Date.now()
      });
      tournaments.history = tournaments.history.slice(0, 10);
    }

    const reachedFinal = setup.round.id === 'final'
      || nextBracket.currentRoundIndex >= Math.max(0, nextBracket.rounds.length - 1);
    const champion = nextBracket.status === 'completed' && nextBracket.championId === TOURNAMENT_PLAYER_ID;
    progressModel.premiumUnlocks = this.profileStore.grantPremiumRewards(
      this.profile,
      getRewardIdsForTournament(type.id, { reachedFinal, champion }),
      { save: false }
    ).unlocked;

    this.profileStore.save(this.profile);

    const championName = advancement.champion?.name ?? '';
    const resultLabel = nextBracket.status === 'active'
      ? advancement.playerAdvanced
        ? `${advancement.advancingIds.length} pilots advance. You are still alive.`
        : 'You were eliminated.'
      : nextBracket.status === 'completed'
        ? 'Champion secured.'
        : `Eliminated. ${championName ? `${championName} is still in control.` : 'The bracket continues without you.'}`;

    raceSummary.tournament = {
      typeId: type.id,
      typeTitle: type.title,
      roundLabel: setup.round.label,
      resultLabel,
      canContinue: nextBracket.status === 'active',
      completed: nextBracket.status === 'completed',
      eliminated: nextBracket.status === 'eliminated',
      championName,
      advancingCount: advancement.advancingIds.length,
      eliminatedCount: advancement.eliminatedIds.length,
      trophyLabel: type.rewardPreview
    };

    this.metaUI.showResults(this.createResultsModel(raceSummary, progressModel));
  }

  createRewardBreakdown(result) {
    const placement = PLACE_REWARDS[result.position - 1] ?? PLACE_REWARDS[PLACE_REWARDS.length - 1];
    const overtakeReward = {
      points: result.stats.overtakes * 34,
      currency: result.stats.overtakes * 18,
      xp: result.stats.overtakes * 22
    };
    const driftReward = {
      points: result.stats.driftReleases * 42,
      currency: result.stats.driftReleases * 18,
      xp: result.stats.driftReleases * 26
    };
    const boostReward = {
      points: Math.round(result.stats.boostSeconds * 14),
      currency: Math.round(result.stats.boostSeconds * 8),
      xp: Math.round(result.stats.boostSeconds * 10)
    };
    const pickupReward = {
      points: result.stats.pickupsCollected * 24,
      currency: result.stats.pickupsCollected * 14,
      xp: result.stats.pickupsCollected * 16
    };
    const cleanReward = result.stats.hazardHits === 0
      ? { points: 120, currency: 88, xp: 100 }
      : {
        points: Math.max(24, 100 - result.stats.hazardHits * 28),
        currency: Math.max(18, 76 - result.stats.hazardHits * 16),
        xp: Math.max(20, 84 - result.stats.hazardHits * 20)
      };

    return [
      { label: 'Placement Bonus', reward: placement },
      { label: `Overtakes x${result.stats.overtakes}`, reward: overtakeReward },
      { label: `Drift Releases x${result.stats.driftReleases}`, reward: driftReward },
      { label: `Boost Control ${result.stats.boostSeconds.toFixed(1)}s`, reward: boostReward },
      { label: `Pickups Collected x${result.stats.pickupsCollected}`, reward: pickupReward },
      { label: result.stats.hazardHits === 0 ? 'Clean Racing' : `Hazard Pressure x${result.stats.hazardHits}`, reward: cleanReward }
    ];
  }

  createMultiplayerModel() {
    const networkState = this.multiplayer.getPublicState();
    const multiplayerView = this.profileStore.getMultiplayerView(this.profile);
    const currentPlayerId = this.getCurrentPlayerId();
    const room = networkState.room
      ? {
        ...networkState.room,
        typeLabel: networkState.room.type === 'quick'
          ? 'Quick Match Lobby'
          : networkState.room.type === 'private-tournament'
            ? 'Private Tournament Room'
            : 'Private Room Lobby',
        statusLabel: networkState.room.status === 'lobby'
          ? 'Waiting for pilots'
          : networkState.room.status === 'countdown'
            ? 'Launch countdown active'
            : networkState.room.status === 'race'
              ? 'Race in progress'
              : networkState.room.status === 'between_rounds'
                ? 'Between tournament rounds'
                : 'Results posted',
        trackName: TRACK_LOOKUP[networkState.room.trackId]?.name ?? 'Track Locked',
        slotsLabel: `${networkState.room.players.length}/${networkState.room.maxPlayers} pilots`,
        joinLink: `${window.location.origin}${window.location.pathname}?room=${networkState.room.code}`,
        isPrivateTournament: networkState.room.type === 'private-tournament',
        canToggleReady:
          networkState.room.type === 'private'
            ? networkState.room.status === 'lobby'
            : networkState.room.type === 'private-tournament' && ['lobby', 'between_rounds'].includes(networkState.room.status),
        canStart:
          networkState.room.type === 'private' &&
          networkState.room.hostId === currentPlayerId &&
          networkState.room.status === 'lobby' &&
          networkState.room.players.length >= 2 &&
          networkState.room.players.every((player) => player.ready || player.playerId === currentPlayerId),
        canStartTournament:
          networkState.room.type === 'private-tournament' &&
          networkState.room.hostId === currentPlayerId &&
          networkState.room.status === 'lobby' &&
          networkState.room.players.length >= 2 &&
          networkState.room.players.every((player) => player.bot || player.ready || player.playerId === currentPlayerId),
        canStartNextTournament:
          networkState.room.type === 'private-tournament' &&
          networkState.room.hostId === currentPlayerId &&
          networkState.room.status === 'between_rounds' &&
          networkState.room.players
            .filter((player) => player.activeEntrant)
            .every((player) => player.bot || player.ready || player.playerId === currentPlayerId),
        canDiscard:
          ['private', 'private-tournament'].includes(networkState.room.type) &&
          networkState.room.hostId === currentPlayerId &&
          networkState.room.status === 'lobby',
        canRematch:
          ['private', 'private-tournament'].includes(networkState.room.type) &&
          networkState.room.hostId === currentPlayerId &&
          networkState.room.status === 'finished',
        players: networkState.room.players.map((player) => ({
          ...player,
          isSelf: player.playerId === currentPlayerId,
          canKick:
            ['private', 'private-tournament'].includes(networkState.room.type) &&
            networkState.room.hostId === currentPlayerId &&
            networkState.room.status === 'lobby' &&
            player.playerId !== currentPlayerId,
          canTransferHost:
            ['private', 'private-tournament'].includes(networkState.room.type) &&
            networkState.room.hostId === currentPlayerId &&
            networkState.room.status === 'lobby' &&
            player.playerId !== currentPlayerId &&
            !player.bot
        }))
      }
      : null;

    return {
      connected: networkState.connected,
      reconnecting: networkState.reconnecting,
      connectionError: networkState.connectionError,
      rank: multiplayerView.rank,
      dailyGoals: multiplayerView.dailyGoals,
      weeklyGoals: multiplayerView.weeklyGoals,
      recentHighlights: multiplayerView.recentHighlights,
      lastRoomLeaderboard: multiplayerView.lastRoomLeaderboard,
      leaderboard: networkState.leaderboard,
      room
    };
  }

  createPremiumModel() {
    this.entitlements.setAccountContext(this.identityService.currentAuth);
    const entitlement = this.entitlements.getCurrentEntitlement();
    const currentEdition = entitlement.edition;

    return {
      entitlement,
      currentEdition: {
        ...entitlement.editionConfig,
        id: currentEdition,
        badgeView: entitlement.badge
      },
      plans: this.entitlements.getAvailablePlans().map((plan) => ({
        ...plan,
        active: currentEdition === plan.editionId,
        accessible: this.entitlements.canAccessTier(plan.editionId)
      })),
      editions: this.entitlements.getEditionComparison(),
      lockedFeatures: this.entitlements.getFeaturePreviews(),
      previewHub: this.entitlements.getPreviewHubCards(),
      contentPacks: this.entitlements.getContentPackModels(),
      selectedPreview: this.entitlements.getSelectedPreview(this.selectedPremiumPreviewKey),
      roadmap: this.entitlements.getPremiumRoadmap(),
      fairnessPolicy: this.entitlements.getFairPlayPolicy(),
      lore: {
        world: WORLD_LORE,
        selectedShip: getShipLore(this.getActiveGaragePreviewShipId()),
        selectedTrack: getTrackLore(this.profile.selectedTrackId)
      },
      onlinePrep: getOnlineExpansionPrep(),
      demo: this.entitlements.getDemoState(),
      upgradeTarget: this.entitlements.getUpgradeTarget(),
      regionHint: this.entitlements.getSoftRegionHint()
    };
  }

  createCampaignModel() {
    const featureState = this.entitlements.getPlayableFeatureState(FEATURE_KEYS.premiumCampaign);
    const selectedCupId = this.selectedCampaignCupId || this.profile.premiumProgress?.campaign?.selectedCupId || CAMPAIGN_CUPS[0].id;
    const cupModels = CAMPAIGN_CUPS.map((cup) => {
      const progress = this.getCampaignCupProgress(cup.id);
      const accessible = this.entitlements.canAccessCampaignCup(cup);
      const completedCount = progress.completedRaceIds.length;
      const nextRaceIndex = Math.min(progress.unlockedRaceIndex, cup.races.length - 1);
      const nextRace = cup.races.find((race) => !progress.completedRaceIds.includes(race.id)) ?? cup.races[nextRaceIndex] ?? cup.races[0];
      const selected = cup.id === selectedCupId;

      return {
        id: cup.id,
        title: cup.title,
        description: cup.description,
        requiredEdition: cup.requiredEdition,
        requiredEditionBadge: this.entitlements.getEditionBadge(cup.requiredEdition),
        recommendedDifficulty: cup.recommendedDifficulty,
        rewardPreview: cup.rewardPreview,
        accessible,
        selected,
        completed: progress.completed,
        trophyEarned: progress.trophyEarned,
        statusLabel: !featureState.canPlay
          ? featureState.accessLabel
          : !accessible
            ? `Requires ${this.entitlements.getEditionBadge(cup.requiredEdition).shortLabel}`
            : progress.completed
              ? 'Completed'
              : 'Included in your plan',
        progressLabel: `${completedCount}/${cup.races.length} complete`,
        progressPercent: cup.races.length > 0 ? completedCount / cup.races.length : 0,
        nextRaceId: nextRace?.id ?? '',
        races: cup.races.map((race, index) => {
          const rival = getCampaignRival(race.spotlightRivalId);
          const track = TRACK_LOOKUP[race.trackId] ?? TRACK_DEFS[0];
          const unlocked = accessible && index <= progress.unlockedRaceIndex;
          const completed = progress.completedRaceIds.includes(race.id);

          return {
            id: race.id,
            title: race.title,
            trackName: track.name,
            trackTheme: track.themeName ?? track.identity ?? 'Track',
            laps: race.laps ?? track.laps,
            rivalName: rival.name,
            rivalCallSign: rival.callSign,
            rewardPreview: race.rewardPreview,
            completed,
            unlocked,
            current: accessible && !completed && index === Math.min(progress.unlockedRaceIndex, cup.races.length - 1),
            statusLabel: completed ? 'Complete' : unlocked ? 'Ready' : 'Locked'
          };
        })
      };
    });
    const selectedCup = cupModels.find((cup) => cup.selected) ?? cupModels[0];
    const selectedRace = selectedCup?.races.find((race) => race.current) ?? selectedCup?.races.find((race) => !race.completed) ?? selectedCup?.races[0] ?? null;
    const selectedRaceDef = selectedRace ? getCampaignRace(selectedCup.id, selectedRace.id) : null;
    const rival = selectedRaceDef ? getCampaignRival(selectedRaceDef.spotlightRivalId) : null;
    const cupLore = selectedCup ? getCupLore(selectedCup.id) : null;
    const rivalLore = rival ? getRivalLore(rival.id) : null;

    return {
      featureState,
      navBadge: featureState.canPlay ? 'Play' : 'Lock',
      cups: cupModels,
      selectedCup,
      lore: cupLore,
      selectedRace,
      selectedRival: rival
        ? {
            name: rival.name,
            callSign: rival.callSign,
            bio: rival.bio,
            personality: rival.personality,
            hint: rival.hint,
            preRaceLine: rival.preRaceLine,
            postRaceLine: rival.postRaceLine,
            lore: rivalLore
          }
        : null
    };
  }

  createTournamentModel() {
    const featureState = this.entitlements.getPlayableFeatureState(FEATURE_KEYS.tournamentMode);
    const tournamentProgress = this.profile.premiumProgress?.tournaments ?? {};
    const activeBracket = tournamentProgress.activeBracket ?? null;
    const selectedTypeId = this.selectedTournamentTypeId || tournamentProgress.selectedTypeId || TOURNAMENT_TYPES[0].id;
    const types = TOURNAMENT_TYPES.map((type) => {
      const accessible = this.entitlements.canAccessTournamentType(type);
      return {
        id: type.id,
        title: type.title,
        shortTitle: type.shortTitle,
        description: type.description,
        requiredEdition: type.requiredEdition,
        requiredEditionBadge: this.entitlements.getEditionBadge(type.requiredEdition),
        participantCount: type.participantCount,
        rewardPreview: type.rewardPreview,
        status: type.status,
        selected: selectedTypeId === type.id,
        active: activeBracket?.typeId === type.id && activeBracket?.status === 'active',
        accessible,
        statusLabel: type.status !== 'active'
          ? 'Coming later'
          : !featureState.canPlay
            ? featureState.accessLabel
            : accessible
              ? 'Playable'
              : `Requires ${this.entitlements.getEditionBadge(type.requiredEdition).shortLabel}`
      };
    });
    const selectedType = types.find((type) => type.selected) ?? types[0];
    const activeType = activeBracket ? getTournamentType(activeBracket.typeId) : null;
    const activeRound = activeBracket?.rounds?.[activeBracket.currentRoundIndex] ?? null;
    const multiplayerState = this.createMultiplayerModel();
    const onlineRoom = multiplayerState.room?.isPrivateTournament ? multiplayerState.room : null;
    const privateTournamentEnabled = String(import.meta.env.VITE_ENABLE_PRIVATE_TOURNAMENTS ?? '').toLowerCase() === 'true';
    const canUseOnline4 = privateTournamentEnabled && this.entitlements.canPlayTournamentMode();
    const canUseOnline8 = privateTournamentEnabled && this.entitlements.canAccessTier('STANDALONE_FULL_PREMIUM');

    return {
      featureState,
      navBadge: featureState.canPlay ? 'Play' : 'Lock',
      types,
      selectedType,
      activeBracket: activeBracket
        ? {
            id: activeBracket.id,
            typeId: activeBracket.typeId,
            typeTitle: activeType?.title ?? 'Tournament',
            status: activeBracket.status,
            currentRace: activeBracket.currentRace,
            currentRoundLabel: activeRound?.label ?? 'Bracket',
            participants: activeBracket.participants ?? [],
            rounds: activeBracket.rounds ?? [],
            championName: activeBracket.participants?.find((participant) => participant.id === activeBracket.championId)?.name ?? '',
            canContinue: activeBracket.status === 'active'
          }
        : null,
      history: (tournamentProgress.history ?? []).slice(0, 6).map((entry) => {
        const type = getTournamentType(entry.typeId);
        const champion = entry.participants?.find((participant) => participant.id === entry.championId);
        return {
          id: entry.id,
          typeTitle: type?.shortTitle ?? type?.title ?? 'Tournament',
          status: entry.status,
          championName: champion?.name ?? 'No champion',
          completedAt: entry.completedAt ? new Date(entry.completedAt).toLocaleDateString() : 'Recent'
        };
      }),
      stats: tournamentProgress.stats ?? { started: 0, completed: 0, wins: 0, eliminations: 0 },
      onlinePrep: getOnlineExpansionPrep().privateTournament,
      onlinePrivate: {
        enabled: privateTournamentEnabled,
        connected: multiplayerState.connected,
        connectionError: multiplayerState.connectionError,
        room: onlineRoom,
        canCreate4: canUseOnline4,
        canCreate8: canUseOnline8,
        statusLabel: !privateTournamentEnabled
          ? 'Disabled by build flag'
          : !featureState.canPlay
            ? 'Locked in Lite'
            : 'Private online tournaments available',
        fairPlayNote: 'Private online tournaments use normalized stats. Offline upgrades and paid ship stats are ignored.'
      }
    };
  }

  createCustomRaceModel() {
    const access = this.entitlements.getCustomRaceLabAccessState();
    const limits = getCustomRaceLimits(this.entitlements);
    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    const activeConfig = sanitizeCustomRaceConfig(
      premiumProgress.customRaceLab.activeConfig,
      this.entitlements,
      this.profile
    );
    const selectedTrack = TRACK_LOOKUP[activeConfig.trackId] ?? TRACK_DEFS[0];
    const selectedShip = SHIP_LOOKUP[activeConfig.selectedShipId] ?? SHIP_LOOKUP[this.profile.selectedShipId] ?? SHIP_DEFS[0];
    const importSummary = this.customRaceImportResult?.ok
      ? summarizeCustomRacePresetCode(this.customRaceImportResult.config)
      : null;

    return {
      access,
      navBadge: access.basic ? 'Lab' : 'Lock',
      config: activeConfig,
      limits,
      selectedTrackName: selectedTrack.name,
      selectedShipName: selectedShip.name,
      tracks: TRACK_DEFS.map((track) => ({
        id: track.id,
        name: track.name,
        themeName: track.themeName ?? track.identity ?? 'Circuit',
        unlocked: track.contentPackId ? this.entitlements.canAccessPremiumTrack(track) : this.profile.unlockedTracks.includes(track.id),
        selected: track.id === activeConfig.trackId
      })),
      ships: SHIP_DEFS.map((ship) => ({
        id: ship.id,
        name: ship.name,
        unlocked: ship.contentPackId ? this.entitlements.canAccessPremiumShip(ship) : this.profile.unlockedShips.includes(ship.id),
        selected: ship.id === activeConfig.selectedShipId
      })),
      difficulties: CUSTOM_RACE_DIFFICULTIES,
      densities: CUSTOM_RACE_DENSITIES,
      shortcuts: CUSTOM_RACE_SHORTCUTS,
      visualEffects: CUSTOM_RACE_VISUAL_EFFECTS,
      statModes: CUSTOM_RACE_STAT_MODES,
      presets: (premiumProgress.customRaceLab.presets ?? []).slice(0, limits.maxPresets),
      presetCountLabel: `${(premiumProgress.customRaceLab.presets ?? []).length}/${limits.maxPresets} presets`,
      stats: premiumProgress.customRaceLab.stats ?? { races: 0, wins: 0, presetsSaved: 0 },
      presetCode: {
        exportCode: this.customRacePresetCode,
        importCode: this.customRaceImportCode,
        importResult: this.customRaceImportResult,
        importSummary
      },
      fairnessNote: 'Custom Race Lab is offline-only. It does not touch multiplayer rating, leaderboards, or time-trial ghosts.'
    };
  }

  createRewardsModel() {
    const access = this.entitlements.getRewardGalleryAccessState();
    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    const gallery = this.profileStore.getRewardGallery(this.profile, this.entitlements);
    const equippedBadgeId = premiumProgress.rewards.equippedBadgeId ?? '';
    const unlockedCount = gallery.filter((reward) => reward.unlocked).length;

    return {
      access,
      navBadge: unlockedCount > 0 ? String(unlockedCount) : 'Gallery',
      equippedBadgeId,
      equippedBadgeLabel: gallery.find((reward) => reward.rewardId === equippedBadgeId)?.title ?? 'None equipped',
      unlockedCount,
      totalCount: gallery.length,
      rewards: gallery.map((reward) => ({
        ...reward,
        requiredEditionBadge: this.entitlements.getEditionBadge(reward.requiredEdition),
        equipped: reward.rewardId === equippedBadgeId,
        canEquip: reward.unlocked && reward.usable && ['badge', 'title'].includes(reward.type),
        stateLabel: reward.unlocked
          ? reward.usable ? 'Unlocked' : 'Edition Locked'
          : reward.lockedByEdition ? 'Requires Plan' : 'Locked'
      }))
    };
  }

  createReplaySummaryModel() {
    const access = this.entitlements.getReplayAccessState();
    const replay = this.latestReplay;

    return {
      access,
      navBadge: replay?.frames?.length ? 'Ready' : 'Empty',
      hasReplay: Boolean(replay?.frames?.length),
      latestLabel: replay?.summary?.createdAt ? new Date(replay.summary.createdAt).toLocaleTimeString() : 'No replay captured',
      trackName: replay?.trackName ?? 'No replay',
      resultLabel: replay?.summary?.resultLabel ?? 'Run an offline race to capture a replay.'
    };
  }

  createRankedSeasonModel() {
    const access = this.entitlements.getRankedSeasonAccessState();
    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    const season = getRankedSeason(new Date());
    const ranked = premiumProgress.rankedSeasons;
    const multiplayerState = this.multiplayer.getPublicState();
    const onlineProfile = multiplayerState.profile ?? {};
    const rating = Number(onlineProfile.rankedRating ?? (ranked.currentSeasonId === season.seasonId
      ? ranked.seasonRating
      : 1000));
    const tierProgress = getRankedTierProgress(rating);

    return {
      access,
      navBadge: access.basic ? tierProgress.tier.label : 'Lock',
      season: {
        ...season,
        endLabel: new Date(season.endDate).toLocaleDateString(),
        timeRemainingLabel: `${Math.max(0, Math.ceil((new Date(season.endDate) - Date.now()) / (24 * 60 * 60 * 1000)))} days left`
      },
      rating,
      tier: tierProgress.tier,
      tierProgress: Math.round(tierProgress.progress * 100),
      tiers: RANKED_TIERS.map((tier) => ({
        ...tier,
        active: tier.id === tierProgress.tier.id,
        earned: rating >= tier.minRating,
        requiredEditionBadge: this.entitlements.getEditionBadge(tier.id === 'bronze' || tier.id === 'silver'
          ? 'STANDALONE_EARLY_ACCESS'
          : 'STANDALONE_FULL_PREMIUM')
      })),
      stats: {
        races: ranked.currentSeasonId === season.seasonId ? ranked.seasonRaces : 0,
        wins: ranked.currentSeasonId === season.seasonId ? ranked.seasonWins : 0,
        podiums: ranked.currentSeasonId === season.seasonId ? ranked.seasonPodiums : 0,
        bestStreak: ranked.currentSeasonId === season.seasonId ? ranked.seasonBestStreak : 0
      },
      history: (ranked.seasonHistory ?? []).slice(0, 6),
      canStart: access.basic && season.status === 'active',
      online: {
        connected: multiplayerState.connected,
        queue: multiplayerState.rankedQueue ?? { status: 'idle', message: '' },
        leaderboard: multiplayerState.rankedLeaderboard ?? { global: [], friends: [] },
        profile: onlineProfile,
        modeLabel: 'Online ranked matchmaking',
        antiCheatNote: 'Server finalizes ranked results. Suspicious lag spikes are clamped/flagged before rating changes.'
      },
      fairPlayNote: season.fairPlayNote
    };
  }

  createLiveEventsModel() {
    const access = this.entitlements.getLiveEventsAccessState();
    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    const liveProgress = premiumProgress.liveEvents;
    const backendState = this.eventService.getCurrentState();
    const usingBackendEvents = this.eventService.isBackendEnabled() && backendState.events.length > 0;
    const rawEvents = usingBackendEvents ? backendState.events : getLiveEventSet(new Date());
    const events = rawEvents.map((event) => {
      const accessible = this.entitlements.canAccessLiveEvent(event);
      const completed = liveProgress.completedEventIds.includes(event.id);
      const requiredEditionBadge = this.entitlements.getEditionBadge(event.requiredEdition);
      const leaderboard = backendState.leaderboards[event.eventId ?? event.id] ?? null;
      return {
        ...event,
        accessible,
        completed,
        backendScheduled: usingBackendEvents,
        leaderboard,
        leaderboardLabel: leaderboard?.sourceLabel ?? (event.leaderboardEnabled ? 'Leaderboard not loaded' : 'No leaderboard'),
        requiredEditionBadge,
        stateLabel: event.status === 'upcoming'
          ? 'Weekend only'
          : completed
            ? 'Complete'
            : accessible
              ? 'Ready'
            : `Requires ${requiredEditionBadge.shortLabel}`,
        canStart: accessible,
        endLabel: new Date(event.endsAt ?? event.endAt).toLocaleString()
      };
    });

    return {
      access,
      navBadge: access.basic ? 'Live' : 'Lock',
      events,
      recentCompletions: liveProgress.recentCompletions ?? [],
      completedCount: liveProgress.completedEventIds.length,
      backend: {
        enabled: this.eventService.isBackendEnabled(),
        source: usingBackendEvents ? backendState.source : 'local-fallback',
        sourceLabel: usingBackendEvents ? backendState.sourceLabel : 'Local Offline Fallback',
        message: backendState.message,
        upcoming: backendState.upcoming ?? [],
        leaderboardsEnabled: this.eventService.isLeaderboardEnabled()
      },
      leaderboardPrep: getOnlineExpansionPrep().eventLeaderboard,
      fairPlayNote: usingBackendEvents
        ? 'Live Events are backend scheduled. Official leaderboards validate scores server-side and do not affect ranked rating.'
        : 'Live Events are local date-seeded challenges in this build. No fake global leaderboard claims.'
    };
  }

  createBossEventsModel() {
    const access = this.entitlements.getBossRaceEventsAccessState();
    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    const bossProgress = premiumProgress.bossEvents;
    const selectedEvent = getBossEvent(this.selectedBossEventId);
    const events = BOSS_EVENT_DEFS.map((event) => {
      const accessible = this.entitlements.canAccessBossEvent(event);
      const completed = bossProgress.completedBossIds.includes(event.id);
      const requiredEditionBadge = this.entitlements.getEditionBadge(event.requiredEdition);
      return {
        ...event,
        selected: event.id === selectedEvent.id,
        accessible,
        completed,
        requiredEditionBadge,
        bestResult: bossProgress.bestResults[event.id] ?? null,
        stateLabel: completed
          ? 'Cleared'
          : accessible
            ? 'Ready'
            : `Requires ${requiredEditionBadge.shortLabel}`,
        canStart: accessible
      };
    });

    return {
      access,
      navBadge: access.basic ? 'Boss' : 'Lock',
      events,
      selectedEvent: events.find((event) => event.selected) ?? events[0],
      completedCount: bossProgress.completedBossIds.length,
      trophyCount: bossProgress.trophies.length,
      fairPlayNote: 'Boss races are offline premium events. No online advantage, no real-money prize, no multiplayer stat changes.'
    };
  }

  createAdvancedGarageModel() {
    const access = this.entitlements.getAdvancedGarageAccessState();
    const selectedCategory = ADVANCED_COSMETIC_CATEGORIES.find((category) => category.id === this.advancedGarageCategoryId)
      ?? ADVANCED_COSMETIC_CATEGORIES[0];
    const appliedSelection = this.getAppliedAdvancedCosmeticSelection();
    const previewSelection = this.getPreviewAdvancedCosmeticSelection();
    const items = ADVANCED_COSMETIC_ITEMS
      .filter((item) => item.category === selectedCategory.id)
      .map((item) => {
        const tierAccessible = this.entitlements.canAccessAdvancedCosmetic(item);
        const rewardOwned = this.isRewardCosmeticOwned(item);
        const accessible = tierAccessible && rewardOwned;
        const applied = appliedSelection[item.category] === item.id;
        const previewed = previewSelection[item.category] === item.id && !applied;
        const premium = item.requiredEdition !== 'GAMEHUB_LITE';
        const lockedByReward = tierAccessible && !rewardOwned;

        return {
          ...item,
          accessible,
          applied,
          previewed,
          owned: accessible,
          premium,
          lockedByReward,
          requiredEditionBadge: this.entitlements.getEditionBadge(item.requiredEdition),
          statusLabel: accessible
            ? applied ? 'Applied' : previewed ? 'Previewing' : 'Available'
            : lockedByReward
              ? 'Reward Locked'
              : 'Locked Preview',
          actionLabel: accessible ? applied ? 'Applied' : 'Apply' : lockedByReward ? 'View Rewards' : 'Upgrade Required'
        };
      })
      .filter((item) => {
        if (this.advancedGarageFilter === 'owned') {
          return item.owned;
        }

        if (this.advancedGarageFilter === 'locked') {
          return !item.owned;
        }

        if (this.advancedGarageFilter === 'premium') {
          return item.premium;
        }

        return true;
      })
      .filter((item) => this.advancedGarageRarityFilter === 'all' || item.rarity === this.advancedGarageRarityFilter);

    return {
      access,
      categories: ADVANCED_COSMETIC_CATEGORIES.map((category) => ({
        ...category,
        selected: category.id === selectedCategory.id
      })),
      selectedCategory,
      filter: this.advancedGarageFilter,
      rarityFilter: this.advancedGarageRarityFilter,
      filters: [
        { id: 'all', label: 'All' },
        { id: 'owned', label: 'Owned' },
        { id: 'locked', label: 'Locked' },
        { id: 'premium', label: 'Premium' }
      ],
      rarityFilters: ['all', 'rare', 'epic', 'legendary'].map((id) => ({
        id,
        label: id === 'all' ? 'All Rarity' : id[0].toUpperCase() + id.slice(1)
      })),
      items,
      previewActive: Object.keys(this.advancedCosmeticPreview).length > 0,
      numberPlate: sanitizeNumberPlate(this.profile.advancedCosmetics?.numberPlate),
      fairnessNote: 'Online competitive races use normalized ship stats. Premium upgrades are offline-only.'
    };
  }

  createShipUpgradeModel() {
    const shipId = this.getActiveGaragePreviewShipId();
    const ship = SHIP_LOOKUP[shipId] ?? SHIP_DEFS[0];
    const moduleSummaries = summarizeShipUpgrades(ship.id, this.profile, this.entitlements);
    const baseStats = SHIP_LOOKUP[ship.id]?.stats ?? SHIP_DEFS[0].stats;
    const careerStats = getEffectiveShipStats(
      ship.id,
      { mode: 'career-race', multiplayer: false, competitive: false },
      this.profile,
      this.entitlements
    );

    return {
      access: this.entitlements.getPlayableFeatureState(FEATURE_KEYS.offlineShipUpgrades),
      selectedShipId: ship.id,
      selectedShipName: ship.name,
      credits: this.profile.currency,
      fairnessNote: 'Online competitive races use normalized ship stats. Premium upgrades are offline-only.',
      appliedOnlyTo: 'Normal offline career races and Custom Race Lab upgraded-stat races can use upgrades. Time Trial, multiplayer, ranked, campaign, and tournament use base/normalized stats.',
      summary: [
        { label: 'Base Speed', value: Math.round(baseStats.maxSpeed) },
        { label: 'Career Speed', value: Math.round(careerStats.maxSpeed) },
        { label: 'Base Boost', value: Math.round(baseStats.startBoostEnergy) },
        { label: 'Career Boost', value: Math.round(careerStats.startBoostEnergy) }
      ],
      modules: moduleSummaries.map(({ module, level, maxLevel, locked, capped }) => {
        const nextCost = getModuleCost(module, level);
        return {
          id: module.id,
          name: module.name,
          description: module.description,
          shortUi: module.shortUi,
          unlockText: module.unlockText,
          requiredEditionBadge: this.entitlements.getEditionBadge(module.requiredEdition),
          level,
          maxLevel,
          locked,
          capped,
          nextCost,
          canAfford: Number.isFinite(nextCost) && this.profile.currency >= nextCost,
          statusLabel: locked ? 'Locked Preview' : capped ? 'Max Level' : `Level ${level}/${maxLevel}`
        };
      })
    };
  }

  createShipShowcaseModel() {
    const shipId = this.getActiveGaragePreviewShipId();
    const ship = SHIP_LOOKUP[shipId] ?? SHIP_DEFS[0];
    const lore = getShipLore(ship.id);
    const appliedAdvanced = this.getAppliedAdvancedCosmeticSelection();
    const lightingItem = ADVANCED_COSMETIC_LOOKUP[appliedAdvanced.garageLightingPreset] ?? null;
    const moduleSummaries = summarizeShipUpgrades(ship.id, this.profile, this.entitlements)
      .filter((entry) => entry.level > 0)
      .slice(0, 4);

    return {
      shipId: ship.id,
      favorite: this.profile.favoriteShipId === ship.id,
      favoriteLabel: this.profile.favoriteShipId === ship.id ? 'Favorite Ship' : 'Mark Favorite',
      rarity: ship.rarity ?? 'common',
      manufacturer: ship.manufacturer ?? 'Manufacturer',
      lore,
      controls: [
        { id: 'orbit-left', label: 'Orbit Left' },
        { id: 'orbit-right', label: 'Orbit Right' },
        { id: 'zoom-in', label: 'Zoom In' },
        { id: 'zoom-out', label: 'Zoom Out' },
        { id: 'reset', label: 'Reset View' }
      ],
      cosmetics: [
        { label: 'Hull', value: HULL_LOOKUP[this.profile.cosmetics.hullId]?.name ?? 'Default' },
        { label: 'Glow', value: GLOW_LOOKUP[this.profile.cosmetics.glowId]?.name ?? 'Default' },
        { label: 'Trail', value: TRAIL_LOOKUP[this.profile.cosmetics.trailId]?.name ?? 'Default' },
        { label: 'Lighting', value: lightingItem?.name ?? 'Hangar Classic' }
      ],
      upgrades: moduleSummaries.length
        ? moduleSummaries.map((entry) => ({ label: entry.module.name, value: `Level ${entry.level}` }))
        : [{ label: 'Offline Upgrades', value: 'No modules installed' }],
      fairnessNote: 'Cosmetics are visual only. Offline upgrades never affect online, ranked, or Time Trial runs.'
    };
  }

  createHangarModel() {
    const levelInfo = this.profileStore.getLevelInfo(this.profile.xp);
    const profileView = this.profileStore.getProfileView(this.profile);
    const challengeIds = this.profileStore.createRaceChallenges(this.profile);
    const previewShipId = this.getActiveGaragePreviewShipId();

    return {
      profile: profileView,
      identity: this.identityService.getStatusView(this.profile),
      premium: this.createPremiumModel(),
      campaign: this.createCampaignModel(),
      tournament: this.createTournamentModel(),
      customRaceLab: this.createCustomRaceModel(),
      rewards: this.createRewardsModel(),
      replay: this.createReplaySummaryModel(),
      rankedSeason: this.createRankedSeasonModel(),
      liveEvents: this.createLiveEventsModel(),
      bossEvents: this.createBossEventsModel(),
      advancedGarage: this.createAdvancedGarageModel(),
      shipUpgrades: this.createShipUpgradeModel(),
      shipShowcase: this.createShipShowcaseModel(),
      lore: {
        world: WORLD_LORE,
        selectedTrack: getTrackLore(this.profile.selectedTrackId),
        selectedShip: getShipLore(previewShipId)
      },
      onlinePrep: getOnlineExpansionPrep(),
      nextUnlock: this.profileStore.getNextUnlock(this.profile),
      tracks: TRACK_DEFS.map((track) => {
        const premiumTrack = Boolean(track.contentPackId);
        const premiumAccess = this.entitlements.canAccessPremiumTrack(track);
        return {
          id: track.id,
          name: track.name,
          description: track.description,
          identity: track.identity ?? 'Circuit',
          themeName: track.themeName ?? track.identity ?? 'Track Theme',
          rarity: track.rarity ?? 'common',
          difficulty: track.difficulty,
          unlockLevel: track.unlockLevel,
          contentPackId: track.contentPackId ?? '',
          unlockSource: track.unlockSource ?? '',
          previewOnly: premiumTrack && track.playable === false,
          unlocked: premiumTrack ? premiumAccess : this.profile.unlockedTracks.includes(track.id),
          selected: this.profile.selectedTrackId === track.id,
          bestLapLabel: formatTimeMs(profileView.timeTrials?.[track.id]?.bestLapMs, 'No ghost yet'),
          lore: getTrackLore(track.id)
        };
      }),
      ships: SHIP_DEFS.map((ship) => {
        const premiumShip = Boolean(ship.contentPackId);
        const premiumAccess = this.entitlements.canAccessPremiumShip(ship);
        const unlocked = premiumShip ? premiumAccess : this.profile.unlockedShips.includes(ship.id);
        const canAfford = !ship.cost || this.profile.currency >= ship.cost;
        const purchaseable = !premiumShip && this.profileStore.canPurchaseShip(this.profile, ship.id) && canAfford;
        let unlockLabel = unlocked ? 'Unlocked' : 'Locked';
        let unlockReason = 'Locked';

        if (premiumShip) {
          unlockLabel = unlocked ? 'Premium Pack' : 'Premium Locked';
          unlockReason = ship.unlockSource ?? 'Requires standalone entitlement';
        } else if (ship.unlockAchievement) {
          unlockLabel = 'Challenge Unlock';
          unlockReason = 'Earn the matching achievement';
        } else if (ship.cost && ship.cost > 0 && levelInfo.level >= (ship.unlockLevel ?? 1)) {
          unlockLabel = 'For Sale';
          unlockReason = canAfford ? `Buy for ${ship.cost} CR` : `Need ${ship.cost} CR`;
        } else if (ship.unlockLevel) {
          unlockLabel = `Level ${ship.unlockLevel}`;
          unlockReason = `Reach Level ${ship.unlockLevel}`;
        }

        return {
          id: ship.id,
          name: ship.name,
          tagline: ship.tagline,
          cost: ship.cost,
          manufacturer: ship.manufacturer ?? 'Manufacturer',
          rarity: ship.rarity ?? 'common',
          contentPackId: ship.contentPackId ?? '',
          unlockSource: ship.unlockSource ?? '',
          unlocked,
          purchaseable,
          previewed: previewShipId === ship.id,
          selected: this.profile.selectedShipId === ship.id,
          favorite: this.profile.favoriteShipId === ship.id,
          unlockLabel,
          unlockReason,
          lore: getShipLore(ship.id),
          statLine: `SPD ${Math.round(ship.stats.maxSpeed)} | HND ${Math.round(ship.stats.lateralAcceleration)} | BST ${Math.round(ship.stats.startBoostEnergy)}`
        };
      }),
      cosmetics: {
        hulls: HULL_COLORS.map((item) => ({
          id: item.id,
          name: item.name,
          rarity: item.rarity ?? 'common',
          unlockLevel: item.unlockLevel,
          unlocked: this.profile.unlockedHullColors.includes(item.id),
          hex: toHex(item.color)
        })),
        glows: GLOW_COLORS.map((item) => ({
          id: item.id,
          name: item.name,
          rarity: item.rarity ?? 'common',
          unlockLevel: item.unlockLevel,
          unlocked: this.profile.unlockedGlowColors.includes(item.id),
          hex: toHex(item.color)
        })),
        trails: TRAIL_COLORS.map((item) => ({
          id: item.id,
          name: item.name,
          rarity: item.rarity ?? 'common',
          unlockLevel: item.unlockLevel,
          unlocked: this.profile.unlockedTrailColors.includes(item.id),
          hex: toHex(item.color)
        })),
        selectedHullId: this.profile.cosmetics.hullId,
        selectedGlowId: this.profile.cosmetics.glowId,
        selectedTrailId: this.profile.cosmetics.trailId
      },
      challenges: challengeIds.map((challengeId) => {
        const challenge = CHALLENGE_LOOKUP[challengeId];
        return {
          id: challenge.id,
          label: challenge.label,
          rewardXp: challenge.rewardXp,
          rewardCurrency: challenge.rewardCurrency
        };
      }),
      multiplayer: this.createMultiplayerModel(),
      settings: {
        audio: profileView.settings.audio,
        graphics: profileView.settings.graphics,
        gameplay: profileView.settings.gameplay,
        controls: [
          { id: 'accelerate', label: 'Accelerate', value: this.input.getActionLabel('accelerate') },
          { id: 'left', label: 'Steer Left', value: this.input.getActionLabel('left') },
          { id: 'right', label: 'Steer Right', value: this.input.getActionLabel('right') },
          { id: 'drift', label: 'Drift', value: this.input.getActionLabel('drift') },
          { id: 'boost', label: 'Boost', value: this.input.getActionLabel('boost') },
          { id: 'item', label: 'Power-Up', value: this.input.getActionLabel('item') },
          { id: 'pause', label: 'Pause', value: this.input.getActionLabel('pause') }
        ],
        tutorialTips: [
          `Hold ${this.input.getActionLabel('accelerate')} to build speed.`,
          `Tap ${this.input.getActionLabel('drift')} in turns to charge drift energy.`,
          `Fire boost with ${this.input.getActionLabel('boost')} on straights for the cleanest gain.`,
          `Use held power-ups with ${this.input.getActionLabel('item')} when the moment is right.`
        ]
      },
      timeTrial: {
        selectedTrackBestLap: formatTimeMs(profileView.timeTrials?.[this.profile.selectedTrackId]?.bestLapMs, 'No ghost yet'),
        selectedTrackBestRun: formatTimeMs(profileView.timeTrials?.[this.profile.selectedTrackId]?.bestRunMs, 'No clean run yet'),
        ghostReady: Boolean(profileView.timeTrials?.[this.profile.selectedTrackId]?.ghostReady)
      }
    };
  }

  createResultsModel(raceSummary, careerProgress) {
    const track = TRACK_LOOKUP[raceSummary.trackId];
    const ship = SHIP_LOOKUP[raceSummary.shipId];
    const summaryLine = raceSummary.timeTrial
      ? `${track.name} time trial complete in the ${ship.name}. Best lap ${formatTimeMs(raceSummary.timing?.bestLapMs)}${raceSummary.timeTrial.improvedLap ? ' and a new ghost locked in.' : '.'}`
      : raceSummary.multiplayer
      ? `${track.name} online race complete in the ${ship.name}. ${raceSummary.multiplayer.localResult.ratingDelta >= 0 ? 'Rating gained' : 'Rating lost'} ${raceSummary.multiplayer.localResult.ratingDelta}. ${raceSummary.stats.overtakes} overtakes on the run.`
      : raceSummary.campaign
      ? `${raceSummary.campaign.cupTitle} race complete: ${raceSummary.campaign.raceTitle}. ${raceSummary.campaign.progressLabel}`
      : raceSummary.tournament
      ? `${raceSummary.tournament.typeTitle} ${raceSummary.tournament.roundLabel} complete. ${raceSummary.tournament.resultLabel}`
      : raceSummary.customRace
      ? `${raceSummary.customRace.name} complete. ${raceSummary.customRace.leaderboardSafe}`
      : raceSummary.rankedSeason
      ? `${raceSummary.rankedSeason.seasonName} ranked race complete. ${raceSummary.rankedSeason.resultLabel}`
      : raceSummary.liveEvent
      ? `${raceSummary.liveEvent.title} complete. ${raceSummary.liveEvent.resultLabel}`
      : raceSummary.bossEvent
      ? `${raceSummary.bossEvent.title} complete. ${raceSummary.bossEvent.resultLabel}`
      : `${track.name} complete in the ${ship.name}. ${raceSummary.stats.overtakes} overtakes, ${raceSummary.stats.driftReleases} drift releases, ${raceSummary.stats.pickupsCollected} pickups.`;
    let nextActions = raceSummary.campaign
      ? [
          raceSummary.campaign.nextRaceId
            ? { id: 'campaign-next', label: 'Continue Cup', primary: true }
            : { id: 'campaign-page', label: 'Back To Campaign', primary: true },
          { id: 'back-hangar', label: 'Back To Hangar' }
        ]
      : raceSummary.tournament
      ? [
          raceSummary.tournament.canContinue
            ? { id: 'tournament-next', label: 'Next Round', primary: true }
            : { id: 'tournament-page', label: 'Back To Tournament', primary: true },
          { id: 'back-hangar', label: 'Back To Hangar' }
        ]
      : raceSummary.customRace
      ? [
          { id: 'race-lab-page', label: 'Back To Race Lab', primary: true },
          { id: 'race-again', label: 'Race Again' },
          { id: 'back-hangar', label: 'Back To Hangar' }
        ]
      : raceSummary.rankedSeason
      ? [
          { id: 'ranked-page', label: 'Back To Ranked', primary: true },
          { id: 'race-again', label: 'Rank Again' },
          { id: 'back-hangar', label: 'Back To Hangar' }
        ]
      : raceSummary.liveEvent
      ? [
          { id: 'events-page', label: 'Back To Events', primary: true },
          { id: 'race-again', label: 'Try Again' },
          { id: 'back-hangar', label: 'Back To Hangar' }
        ]
      : raceSummary.bossEvent
      ? [
          { id: 'boss-page', label: 'Back To Boss Races', primary: true },
          { id: 'race-again', label: 'Rematch' },
          { id: 'back-hangar', label: 'Back To Hangar' }
        ]
      : null;

    const replayAvailable = Boolean(raceSummary.replay?.frames?.length) && this.entitlements.canUseReplayPhotoMode();

    if (replayAvailable) {
      nextActions = [
        { id: 'replay-view', label: 'Replay / Photo', primary: !nextActions?.some((action) => action.primary) },
        ...(nextActions ?? [
          { id: 'race-again', label: 'Race Again', primary: false },
          { id: 'back-hangar', label: 'Back To Hangar', primary: false }
        ])
      ];
    }

    return {
      positionLabel: raceSummary.timeTrial ? 'Time Trial Complete' : `${formatOrdinal(raceSummary.position)} Place`,
      summaryLine,
      trackTheme: track.themeName ?? track.identity ?? 'Track Theme',
      rewards: raceSummary.timeTrial
        ? [
          {
            label: 'Best Lap',
            value: formatTimeMs(raceSummary.timing?.bestLapMs)
          },
          {
            label: 'Total Run',
            value: formatTimeMs(raceSummary.timing?.totalTimeMs)
          },
          {
            label: 'Ghost Replay',
            value: raceSummary.timeTrial.ghostSaved ? 'Updated' : 'No Change'
          }
        ]
        : [
          ...raceSummary.rewardBreakdown.map((entry) => ({
            label: entry.label,
            value: rewardString(entry.reward)
          })),
          {
            label: 'Total Earned',
            value: rewardString(raceSummary.rewards)
          }
        ],
      challengeResults: raceSummary.challengeResults,
      standings: raceSummary.standings ?? [],
      podium: (raceSummary.standings ?? []).slice(0, 3).map((entry, index) => ({
        position: entry.position ?? index + 1,
        name: entry.name ?? entry.playerName ?? 'Pilot',
        shipName: entry.shipName ?? SHIP_LOOKUP[entry.shipId]?.name ?? 'Racecraft',
        manufacturer: entry.manufacturer ?? SHIP_LOOKUP[entry.shipId]?.manufacturer ?? 'Circuit Division',
        rarity: entry.rarity ?? SHIP_LOOKUP[entry.shipId]?.rarity ?? 'common',
        finishTimeLabel: entry.finishTime ? `${(entry.finishTime / 1000).toFixed(2)}s` : 'Finished',
        accentColor: entry.color ?? `#${toHex(HULL_LOOKUP[this.profile.cosmetics.hullId]?.color ?? 0x7fdfff)}`
      })),
      unlocks: careerProgress.unlocks,
      achievements: careerProgress.achievements,
      levelUp: careerProgress.levelUp,
      nextUnlock: this.profileStore.getNextUnlock(this.profile),
      profile: this.profileStore.getProfileView(this.profile),
      timing: raceSummary.timing
        ? {
          totalTimeLabel: formatTimeMs(raceSummary.timing.totalTimeMs),
          bestLapLabel: formatTimeMs(raceSummary.timing.bestLapMs),
          lastLapLabel: formatTimeMs(raceSummary.timing.lastLapMs),
          lapTimes: (raceSummary.timing.lapTimes ?? []).map((value, index) => ({
            label: `Lap ${index + 1}`,
            value: formatTimeMs(value)
          })),
          sectors: (raceSummary.timing.sectorTimes ?? []).map((value, index) => ({
            label: `Sector ${index + 1}`,
            value: formatTimeMs(value),
            best: formatTimeMs(raceSummary.timing.bestSectorTimes?.[index])
          }))
        }
        : null,
      timeTrial: raceSummary.timeTrial
        ? {
          improvedLap: raceSummary.timeTrial.improvedLap,
          improvedRun: raceSummary.timeTrial.improvedRun,
          ghostSaved: raceSummary.timeTrial.ghostSaved
        }
        : null,
      multiplayer: raceSummary.multiplayer
        ? {
          roomTypeLabel: raceSummary.multiplayer.roomType === 'quick'
            ? 'Quick Match Result'
            : raceSummary.multiplayer.roomType === 'private-tournament'
              ? 'Private Tournament Result'
              : 'Private Room Result',
          roomCodeLabel: raceSummary.multiplayer.roomCode
            ? `Room ${raceSummary.multiplayer.roomCode}`
            : 'Competitive Classification',
          ratingAfter: raceSummary.multiplayer.localResult.ratingAfter,
          ratingDeltaLabel: `${raceSummary.multiplayer.localResult.ratingDelta >= 0 ? '+' : ''}${raceSummary.multiplayer.localResult.ratingDelta} rating`,
          rankName: raceSummary.multiplayer.rank.tier.name,
          standings: raceSummary.multiplayer.standings,
          highlights: raceSummary.multiplayer.highlights,
          completedGoals: raceSummary.multiplayer.completedGoals
        }
        : null,
      campaign: raceSummary.campaign ?? null,
      tournament: raceSummary.tournament ?? null,
      customRace: raceSummary.customRace ?? null,
      rankedSeason: raceSummary.rankedSeason ?? null,
      liveEvent: raceSummary.liveEvent ?? null,
      bossEvent: raceSummary.bossEvent ?? null,
      replay: {
        available: replayAvailable,
        accessLabel: this.entitlements.getReplayAccessState().replayPhotoMode.accessLabel
      },
      resultHighlights: this.createResultHighlights(raceSummary, careerProgress),
      shareText: `${raceSummary.position ? formatOrdinal(raceSummary.position) : 'Finished'} on ${track.name} with ${ship.name}. ${summaryLine}`,
      premiumUnlocks: (careerProgress.premiumUnlocks ?? []).map((reward) => ({
        ...reward,
        requiredEditionBadge: this.entitlements.getEditionBadge(reward.requiredEdition)
      })),
      nextActions
    };
  }

  buildResultsStandings(entries) {
    return (entries ?? []).map((entry, index) => {
      const shipId = entry.shipId ?? entry.config?.shipId ?? entry.shipId ?? entry.id ?? '';
      const shipDef = SHIP_LOOKUP[shipId] ?? null;

      return {
        position: entry.position ?? entry.place ?? index + 1,
        name: entry.name ?? entry.playerName ?? entry.label ?? 'Pilot',
        finishTime: entry.finishTime,
        shipId,
        shipName: entry.shipName ?? entry.config?.shipName ?? shipDef?.name ?? 'Racecraft',
        manufacturer: entry.manufacturer ?? entry.config?.manufacturer ?? shipDef?.manufacturer ?? 'Circuit Division',
        rarity: entry.rarity ?? shipDef?.rarity ?? 'common',
        color: `#${toHex(entry.config?.color ?? 0x7fdfff)}`,
        participantId: entry.premiumParticipantId ?? entry.participantId ?? '',
        scoring: entry.premiumScoring !== false && entry.scoring !== false
      };
    });
  }

  showHangar({ rebuildWorld = true } = {}) {
    this.sound.stopCommentarySpeech(true);
    this.paused = false;
    this.timeScale = 1;
    this.pendingFinishSlowmo = null;
    this.metaUI.hidePause();
    this.refreshLeaderboard();
    this.refreshBackendEvents();
    this.phase = 'hangar';
    this.phaseTimer = 0;
    this.runMode = 'career-race';
    this.activePremiumRaceContext = null;
    this.goFlashTimer = 0;
    this.toastText = '';
    this.toastTimer = 0;
    this.activeChallengeIds = this.profileStore.createRaceChallenges(this.profile);
    const selectedShip = SHIP_LOOKUP[this.profile.selectedShipId];
    const selectedTrack = TRACK_LOOKUP[this.profile.selectedTrackId];

    if (selectedShip?.contentPackId && !this.entitlements.canAccessPremiumShip(selectedShip)) {
      this.profile.selectedShipId = 'starling';
      this.garagePreviewShipId = 'starling';
    }

    if (selectedTrack?.contentPackId && !this.entitlements.canAccessPremiumTrack(selectedTrack)) {
      this.profile.selectedTrackId = 'night-circuit';
    }

    if (!SHIP_LOOKUP[this.garagePreviewShipId]) {
      this.garagePreviewShipId = this.profile.selectedShipId;
    }
    if (rebuildWorld) {
      this.buildWorldForSelections();
    }
    this.metaUI.showHangar(this.createHangarModel());
    this.syncGaragePreview();
    void this.maybeAutoJoinRoom();
  }

  refreshLeaderboard(force = false) {
    if (!this.multiplayer.connected) {
      return;
    }

    const signature = 'global';
    const now = Date.now();

    if (!force && signature === this.lastLeaderboardSignature && now - this.lastLeaderboardRequestAt < 4000) {
      return;
    }

    this.lastLeaderboardSignature = signature;
    this.lastLeaderboardRequestAt = now;
    this.multiplayer.requestLeaderboard();
  }

  refreshBackendEvents(force = false) {
    if (!this.eventService.isBackendEnabled()) {
      return;
    }

    const now = Date.now();

    if (!force && (this.eventRefreshInFlight || now - this.lastEventRefreshAt < 45000)) {
      return;
    }

    this.eventRefreshInFlight = true;
    this.lastEventRefreshAt = now;
    void this.eventService.refreshCurrentEvents()
      .then((state) => {
        if (this.eventService.isLeaderboardEnabled()) {
          for (const event of state.events ?? []) {
            if (event.leaderboardEnabled) {
              void this.eventService.fetchLeaderboard(event.eventId ?? event.id, this.getCurrentPlayerId()).catch(() => {});
            }
          }
        }

        if (this.phase === 'hangar' && this.metaUI.hangarPage === 'events') {
          this.metaUI.showHangar(this.createHangarModel());
        }
      })
      .catch(() => {})
      .finally(() => {
        this.eventRefreshInFlight = false;
      });
  }

  queueHangarRefresh() {
    if (this.phase !== 'hangar' || this.hangarRefreshHandle) {
      return;
    }

    this.hangarRefreshHandle = window.requestAnimationFrame(() => {
      this.hangarRefreshHandle = 0;

      if (this.phase === 'hangar') {
        this.showHangar({ rebuildWorld: false });
      }
    });
  }

  async handlePremiumPurchase(planId) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.sound.playUiSelect();
    this.setToast('Preparing secure checkout...', 1.6);

    let authPayload = null;

    try {
      authPayload = await this.identityService.getMultiplayerAuthPayload(true);
      this.entitlements.setAccountContext(this.identityService.currentAuth);
    } catch {
      authPayload = null;
    }

    const result = await this.entitlements.startPurchase(planId, {
      authToken: authPayload?.authToken ?? ''
    });
    this.setToast(result.message, 2.4);
    this.showHangar({ rebuildWorld: false });
  }

  async handleRefreshEntitlement() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.sound.playUiSelect();
    this.setToast('Refreshing premium entitlement...', 1.4);

    let authPayload = null;

    try {
      authPayload = await this.identityService.getMultiplayerAuthPayload(true);
      this.entitlements.setAccountContext(this.identityService.currentAuth);
    } catch {
      authPayload = null;
    }

    const result = await this.entitlements.refreshEntitlement(authPayload?.authToken ?? '');
    this.setToast(result.message, result.ok ? 1.8 : 2.6);
    this.showHangar({ rebuildWorld: false });
  }

  handlePremiumPreview(featureKey) {
    if (this.phase !== 'hangar') {
      return;
    }

    if (featureKey === FEATURE_KEYS.premiumCampaign && this.entitlements.canPlayPremiumCampaign()) {
      this.metaUI.hangarPage = 'campaign';
      this.sound.playUiSelect();
      this.setToast('Premium Campaign opened.', 1.5);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (featureKey === FEATURE_KEYS.tournamentMode && this.entitlements.canPlayTournamentMode()) {
      this.metaUI.hangarPage = 'tournament';
      this.sound.playUiSelect();
      this.setToast('Tournament Mode opened.', 1.5);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (featureKey === FEATURE_KEYS.customRaceLab && this.entitlements.canUseCustomRaceLab()) {
      this.metaUI.hangarPage = 'race-lab';
      this.sound.playUiSelect();
      this.setToast('Custom Race Lab opened.', 1.5);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (featureKey === FEATURE_KEYS.rankedSeasons && this.entitlements.canUseRankedSeasons()) {
      this.metaUI.hangarPage = 'ranked';
      this.sound.playUiSelect();
      this.setToast('Ranked Seasons opened.', 1.5);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (featureKey === FEATURE_KEYS.liveEvents && this.entitlements.canUseLiveEvents()) {
      this.metaUI.hangarPage = 'events';
      this.sound.playUiSelect();
      this.setToast('Live Events opened.', 1.5);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (featureKey === FEATURE_KEYS.bossRaceEvents && this.entitlements.canUseBossRaceEvents()) {
      this.metaUI.hangarPage = 'boss';
      this.sound.playUiSelect();
      this.setToast('Boss Race Events opened.', 1.5);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (featureKey === FEATURE_KEYS.replayPhotoMode && this.entitlements.canUseReplayPhotoMode()) {
      this.sound.playUiSelect();
      this.startReplayViewer();
      return;
    }

    const preview = this.entitlements.getSelectedPreview(featureKey);
    this.selectedPremiumPreviewKey = featureKey || preview.key || '';
    this.metaUI.hangarPage = 'premium';
    this.sound.playUiSelect();
    this.setToast(`${preview.title} preview opened safely.`, 1.8);
    this.showHangar({ rebuildWorld: false });
  }

  handleCampaignSelect(cupId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const cup = getCampaignCup(cupId);
    this.selectedCampaignCupId = cup.id;
    this.profile.premiumProgress.campaign.selectedCupId = cup.id;
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  createCampaignRaceContext(cup, race) {
    return {
      type: 'campaign',
      trackId: race.trackId,
      laps: race.laps,
      difficulty: race.difficulty,
      aiRoster: createCampaignAiRoster(race),
      playerParticipantId: '',
      campaign: {
        cupId: cup.id,
        raceId: race.id,
        trophyKey: cup.trophyKey,
        rewardPreview: race.rewardPreview
      }
    };
  }

  handleCampaignStart(cupId, raceId = '') {
    if (this.phase !== 'hangar') {
      return;
    }

    const cup = getCampaignCup(cupId || this.selectedCampaignCupId);

    if (!this.entitlements.canAccessCampaignCup(cup)) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.premiumCampaign;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast('Premium Campaign requires a standalone edition.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    const progress = this.getCampaignCupProgress(cup.id);
    const requestedRace = raceId ? getCampaignRace(cup.id, raceId) : null;
    const nextRace = cup.races.find((race) => !progress.completedRaceIds.includes(race.id)) ?? cup.races[0];
    const race = requestedRace ?? nextRace;
    const raceIndex = cup.races.findIndex((entry) => entry.id === race.id);

    if (raceIndex > progress.unlockedRaceIndex) {
      this.sound.playUiSelect();
      this.setToast('Complete the earlier campaign race first.', 1.6);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.resume();
    this.sound.playUiConfirm();
    this.beginRaceSequence('campaign', this.createCampaignRaceContext(cup, race));
  }

  handleTournamentSelect(typeId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const type = getTournamentType(typeId);
    this.selectedTournamentTypeId = type.id;
    this.profile.premiumProgress.tournaments.selectedTypeId = type.id;
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  createTournamentRaceContext(bracket) {
    const setup = getTournamentRaceSetup(bracket);

    if (!setup) {
      return null;
    }

    return {
      type: 'tournament',
      trackId: setup.trackId,
      laps: setup.laps,
      difficulty: setup.difficulty,
      aiRoster: createTournamentAiRoster(setup),
      playerParticipantId: TOURNAMENT_PLAYER_ID,
      tournament: {
        bracketId: bracket.id,
        typeId: bracket.typeId,
        roundId: setup.round.id,
        roundLabel: setup.round.label,
        scoringParticipantIds: setup.scoringParticipants.map((participant) => participant.id)
      }
    };
  }

  launchTournamentBracket(bracket) {
    const raceContext = this.createTournamentRaceContext(bracket);

    if (!raceContext) {
      this.setToast('Tournament bracket is not ready.', 1.6);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.resume();
    this.sound.playUiConfirm();
    this.beginRaceSequence('tournament', raceContext);
  }

  handleTournamentStart(typeId = '') {
    if (this.phase !== 'hangar') {
      return;
    }

    const type = getTournamentType(typeId || this.selectedTournamentTypeId);

    if (!this.entitlements.canAccessTournamentType(type)) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.tournamentMode;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast(type.status === 'active' ? 'Tournament Mode requires a standalone edition.' : 'Online tournaments are coming later.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    const bracket = createTournamentBracket(type.id, this.profile);

    if (!bracket) {
      this.setToast('That tournament is not playable yet.', 1.6);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.profile.premiumProgress.tournaments.activeBracket = bracket;
    this.profile.premiumProgress.tournaments.selectedTypeId = type.id;
    this.profile.premiumProgress.tournaments.stats.started += 1;
    this.profileStore.save(this.profile);
    this.launchTournamentBracket(bracket);
  }

  handleTournamentContinue() {
    if (this.phase !== 'hangar') {
      return;
    }

    const bracket = this.profile.premiumProgress?.tournaments?.activeBracket;

    if (!bracket || bracket.status !== 'active') {
      this.handleTournamentStart(this.selectedTournamentTypeId);
      return;
    }

    this.launchTournamentBracket(bracket);
  }

  createCustomRaceContext() {
    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    const config = sanitizeCustomRaceConfig(
      premiumProgress.customRaceLab.activeConfig,
      this.entitlements,
      this.profile
    );
    const baseTrack = TRACK_LOOKUP[config.trackId] ?? TRACK_DEFS[0];
    const trackDefinition = buildCustomTrackDefinition(baseTrack, config);

    premiumProgress.customRaceLab.activeConfig = config;

    return {
      type: 'custom-race',
      trackId: config.trackId,
      selectedShipId: config.selectedShipId,
      laps: config.lapCount,
      aiCount: config.aiCount,
      difficulty: config.aiDifficulty,
      powerupsEnabled: config.pickupsEnabled && config.powerupsEnabled,
      statMode: config.statMode,
      customRace: {
        config,
        trackDefinition
      }
    };
  }

  getPremiumIntroCopy() {
    const context = this.activePremiumRaceContext;

    if (this.runMode === 'campaign' && context?.campaign?.cupId === 'final-rival-championship') {
      const race = getCampaignRace(context.campaign.cupId, context.campaign.raceId);
      const rival = getCampaignRival(race?.spotlightRivalId ?? 'zane-eclipse');
      return {
        status: 'FINAL CHAMPIONSHIP',
        title: 'ZANE ECLIPSE',
        subtitle: `${rival.callSign} versus ${this.profile.playerName}. Cutscene is lightweight and skippable from pause.`
      };
    }

    if (this.runMode === 'boss-event' && context?.bossEvent?.bossEventId === 'final-rival-duel') {
      return {
        status: 'FINAL DUEL',
        title: 'FINAL RIVAL DUEL',
        subtitle: 'A clean premium showdown. Existing camera and VFX systems only.'
      };
    }

    return null;
  }

  createResultHighlights(raceSummary, progressModel = {}) {
    const highlights = [];

    if (raceSummary.campaign?.trophyEarned) {
      highlights.push({
        label: raceSummary.campaign.cupId === 'final-rival-championship' ? 'Final Champion' : 'Cup Complete',
        title: raceSummary.campaign.cupTitle,
        copy: raceSummary.campaign.cupId === 'final-rival-championship'
          ? 'Zane Eclipse has been beaten. The premium championship is yours.'
          : `${raceSummary.campaign.trophyLabel} unlocked.`
      });
    }

    if (raceSummary.tournament?.completed) {
      highlights.push({
        label: 'Tournament Champion',
        title: raceSummary.tournament.typeTitle,
        copy: raceSummary.tournament.championName
          ? `Champion: ${raceSummary.tournament.championName}`
          : raceSummary.tournament.trophyLabel
      });
    }

    if (raceSummary.rankedSeason?.tierChanged) {
      highlights.push({
        label: 'Tier Up',
        title: raceSummary.rankedSeason.tier,
        copy: `Rank moved from ${raceSummary.rankedSeason.previousTier} to ${raceSummary.rankedSeason.tier}.`
      });
    }

    if (raceSummary.liveEvent?.firstCompletion) {
      highlights.push({
        label: 'Event Clear',
        title: raceSummary.liveEvent.title,
        copy: raceSummary.liveEvent.rewardPreview
      });
    }

    if (raceSummary.bossEvent?.firstCompletion) {
      highlights.push({
        label: raceSummary.bossEvent.bossEventId === 'final-rival-duel' ? 'Final Duel Clear' : 'Boss Clear',
        title: raceSummary.bossEvent.title,
        copy: raceSummary.bossEvent.rewardPreview
      });
    }

    for (const reward of progressModel.premiumUnlocks ?? []) {
      highlights.push({
        label: 'New Unlock',
        title: reward.title,
        copy: reward.description
      });
    }

    return highlights.slice(0, 5);
  }

  handleCustomRaceUpdate(field, value) {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.entitlements.canUseCustomRaceLab()) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.customRaceLab;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast('Custom Race Lab requires standalone premium access.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    const nextValue = ['lapCount', 'aiCount'].includes(field)
      ? Number(value)
      : ['hazardsEnabled', 'pickupsEnabled', 'powerupsEnabled'].includes(field)
        ? Boolean(value)
        : value;

    this.profileStore.setCustomRaceConfig(this.profile, { [field]: nextValue }, this.entitlements);
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceRandomize() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.entitlements.canUseFullCustomRaceLab()) {
      this.sound.playUiSelect();
      this.setToast('Randomized Race Lab presets require Full Premium.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.profileStore.randomizeCustomRaceConfig(this.profile, randomizeCustomRaceConfig(this.entitlements, this.profile), this.entitlements);
    this.sound.playUiConfirm();
    this.setToast('Race Lab setup randomized.', 1.3);
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceSavePreset() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.entitlements.canUseCustomRaceLab()) {
      this.setToast('Race Lab presets require standalone premium access.', 1.8);
      return;
    }

    const result = this.profileStore.saveCustomRacePreset(
      this.profile,
      this.entitlements,
      getCustomRaceLimits(this.entitlements).maxPresets
    );
    this.sound.playUiSelect();
    this.setToast(result.ok ? `Preset saved. ${result.presets.length} stored.` : result.reason, 1.8);
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceLoadPreset(presetId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const result = this.profileStore.loadCustomRacePreset(this.profile, presetId, this.entitlements);
    this.sound.playUiSelect();
    this.setToast(result.ok ? 'Preset loaded into Race Lab.' : result.reason, 1.6);
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceDeletePreset(presetId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const result = this.profileStore.deleteCustomRacePreset(this.profile, presetId);
    this.sound.playUiSelect();
    this.setToast(result.ok ? 'Preset deleted.' : result.reason, 1.5);
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceStart() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.entitlements.canUseCustomRaceLab()) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.customRaceLab;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast('Custom Race Lab is locked in GameHub Lite.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.resume();
    this.sound.playUiConfirm();
    this.beginRaceSequence('custom-race', this.createCustomRaceContext());
  }

  createRankedRaceContext() {
    const season = getRankedSeason(new Date());
    return {
      type: 'ranked-season',
      trackId: season.trackId,
      laps: season.laps,
      aiCount: season.aiCount,
      difficulty: season.difficulty,
      powerupsEnabled: true,
      statMode: 'base',
      rankedSeason: {
        seasonId: season.seasonId,
        seasonName: season.seasonName,
        fairPlayNote: season.fairPlayNote
      }
    };
  }

  async handleRankedSeasonStart() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.entitlements.canUseRankedSeasons()) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.rankedSeasons;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast('Ranked Seasons are locked in GameHub Lite.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.resume();
    this.sound.playUiConfirm();
    this.setToast('Joining ranked online queue...', 1.6);

    try {
      const identity = await this.getMultiplayerIdentity(true, {
        trackId: this.createRankedRaceContext().trackId
      });
      const result = await this.multiplayer.queueRanked(identity);
      this.setToast(result?.message ?? 'Queued for ranked online.', 1.8);
      this.showHangar({ rebuildWorld: false });
    } catch (error) {
      this.setToast(error?.message ?? 'Could not join ranked queue.', 2.4);
      this.showHangar({ rebuildWorld: false });
    }
  }

  async handleRankedSeasonCancel() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.sound.playUiSelect();

    try {
      const result = await this.multiplayer.cancelRankedQueue();
      this.setToast(result?.message ?? 'Ranked queue cancelled.', 1.6);
    } catch (error) {
      this.setToast(error?.message ?? 'Could not cancel ranked queue.', 2.2);
    }

    this.showHangar({ rebuildWorld: false });
  }

  createLiveEventRaceContext(event) {
    const trackDefinition = buildLiveEventTrackDefinition(event);
    return {
      type: 'live-event',
      trackId: event.trackId,
      selectedShipId: event.shipId,
      laps: event.laps,
      aiCount: event.aiCount,
      difficulty: event.difficulty,
      powerupsEnabled: event.pickupsEnabled && event.powerupsEnabled,
      statMode: 'base',
      trackDefinition,
      liveEvent: {
        eventId: event.id,
        title: event.title,
        goalLabel: event.goal?.label ?? ''
      }
    };
  }

  handleLiveEventStart(eventId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const event = this.eventService.getBackendEvent(eventId) ?? getLiveEvent(eventId);

    if (!this.entitlements.canAccessLiveEvent(event)) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.liveEvents;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast(event.status === 'upcoming' ? 'Weekend event opens on the weekend.' : 'Live Events require standalone premium access.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.resume();
    this.sound.playUiConfirm();
    this.beginRaceSequence('live-event', this.createLiveEventRaceContext(event));
  }

  handleBossSelect(eventId) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.selectedBossEventId = getBossEvent(eventId).id;
    this.profile.premiumProgress.bossEvents.selectedBossEventId = this.selectedBossEventId;
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  createBossRaceContext(event) {
    const bossEvent = getBossEvent(event?.id ?? event);
    return {
      type: 'boss-event',
      trackId: bossEvent.trackId,
      laps: bossEvent.laps,
      difficulty: bossEvent.difficulty,
      aiRoster: createBossAiRoster(bossEvent),
      powerupsEnabled: true,
      statMode: 'base',
      trackDefinition: buildBossTrackDefinition(bossEvent),
      bossEvent: {
        bossEventId: bossEvent.id,
        title: bossEvent.title,
        bossName: bossEvent.bossName,
        objective: bossEvent.objective,
        hazardScript: bossEvent.hazardScript,
        vfxScript: bossEvent.vfxScript
      }
    };
  }

  handleBossStart(eventId = '') {
    if (this.phase !== 'hangar') {
      return;
    }

    const event = getBossEvent(eventId || this.selectedBossEventId);
    this.selectedBossEventId = event.id;
    this.profile.premiumProgress.bossEvents.selectedBossEventId = event.id;

    if (!this.entitlements.canAccessBossEvent(event)) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.bossRaceEvents;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast('Boss Race Events require the matching standalone edition.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.sound.resume();
    this.sound.playUiConfirm();
    this.beginRaceSequence('boss-event', this.createBossRaceContext(event));
  }

  handleEquipRewardBadge(rewardId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const reward = this.profileStore.getRewardGallery(this.profile, this.entitlements)
      .find((entry) => entry.rewardId === rewardId);

    if (!reward || !reward.unlocked || !reward.usable || !['badge', 'title'].includes(reward.type)) {
      this.sound.playUiSelect();
      this.setToast('That badge or title is not available yet.', 1.6);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    premiumProgress.rewards.equippedBadgeId = reward.rewardId;
    this.profileStore.save(this.profile);
    this.sound.playUiConfirm();
    this.setToast(`${reward.title} equipped.`, 1.5);
    this.showHangar({ rebuildWorld: false });
  }

  handleResultAction(actionId) {
    this.sound.resume();
    this.sound.playUiSelect();

    if (actionId === 'replay-view') {
      this.startReplayViewer();
      return;
    }

    if (actionId === 'race-again') {
      if (['campaign', 'tournament', 'ranked-season', 'live-event', 'boss-event'].includes(this.runMode) && this.activePremiumRaceContext) {
        this.beginRaceSequence(this.runMode, { ...this.activePremiumRaceContext });
      } else if (this.runMode === 'custom-race') {
        this.beginRaceSequence('custom-race', this.createCustomRaceContext());
      } else {
        this.beginRaceSequence(this.runMode === 'time-trial' ? 'time-trial' : 'career-race');
      }
      return;
    }

    if (actionId === 'race-lab-page') {
      this.metaUI.hangarPage = 'race-lab';
      this.showHangar();
      return;
    }

    if (actionId === 'rewards-page') {
      this.metaUI.hangarPage = 'rewards';
      this.showHangar();
      return;
    }

    if (actionId === 'ranked-page') {
      this.metaUI.hangarPage = 'ranked';
      this.showHangar();
      return;
    }

    if (actionId === 'events-page') {
      this.metaUI.hangarPage = 'events';
      this.showHangar();
      return;
    }

    if (actionId === 'boss-page') {
      this.metaUI.hangarPage = 'boss';
      this.showHangar();
      return;
    }

    if (actionId === 'campaign-next') {
      const context = this.activePremiumRaceContext?.campaign;
      const cup = getCampaignCup(context?.cupId ?? this.selectedCampaignCupId);
      const progress = this.getCampaignCupProgress(cup.id);
      const nextRace = cup.races.find((race) => !progress.completedRaceIds.includes(race.id));

      if (nextRace) {
        this.beginRaceSequence('campaign', this.createCampaignRaceContext(cup, nextRace));
        return;
      }

      this.metaUI.hangarPage = 'campaign';
      this.showHangar();
      return;
    }

    if (actionId === 'campaign-page') {
      this.metaUI.hangarPage = 'campaign';
      this.showHangar();
      return;
    }

    if (actionId === 'tournament-next') {
      const bracket = this.profile.premiumProgress?.tournaments?.activeBracket;

      if (bracket?.status === 'active') {
        this.launchTournamentBracket(bracket);
        return;
      }

      this.metaUI.hangarPage = 'tournament';
      this.showHangar();
      return;
    }

    if (actionId === 'tournament-page') {
      this.metaUI.hangarPage = 'tournament';
      this.showHangar();
      return;
    }

    this.showHangar();
  }

  handleDemoEditionChange(editionId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const result = this.entitlements.setDemoEdition(editionId);

    if (result.ok) {
      this.sound.playUiConfirm();
    } else {
      this.sound.playUiSelect();
    }

    this.setToast(result.message, 2.2);
    this.showHangar({ rebuildWorld: false });
  }

  handleDemoEditionClear() {
    if (this.phase !== 'hangar') {
      return;
    }

    const result = this.entitlements.clearDemoEdition();

    if (result.ok) {
      this.sound.playUiConfirm();
    } else {
      this.sound.playUiSelect();
    }

    this.setToast(result.message, 2.2);
    this.showHangar({ rebuildWorld: false });
  }

  handleTrackSelect(trackId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const track = TRACK_LOOKUP[trackId];

    if (track?.contentPackId) {
      if (!this.entitlements.canAccessPremiumTrack(track)) {
        this.selectedPremiumPreviewKey = 'premiumTracks';
        this.metaUI.hangarPage = 'premium';
        this.sound.playUiSelect();
        this.setToast(track.playable === false ? 'This premium track is preview-only.' : 'Premium track requires standalone entitlement.', 1.8);
        this.showHangar({ rebuildWorld: false });
        return;
      }

      if (!this.profile.unlockedTracks.includes(trackId)) {
        this.profile.unlockedTracks.push(trackId);
      }
    }

    if (this.profileStore.setSelectedTrack(this.profile, trackId)) {
      this.sound.playUiSelect();
      this.showHangar({ rebuildWorld: true });
    }
  }

  handleShipSelect(shipId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const ship = SHIP_LOOKUP[shipId];

    if (ship?.contentPackId) {
      if (!this.entitlements.canAccessPremiumShip(ship)) {
        this.selectedPremiumPreviewKey = 'premiumShips';
        this.metaUI.hangarPage = 'premium';
        this.sound.playUiSelect();
        this.setToast('Premium ship requires standalone entitlement. Online modes still use normalized stats.', 1.9);
        this.showHangar({ rebuildWorld: false });
        return;
      }

      if (!this.profile.unlockedShips.includes(shipId)) {
        this.profile.unlockedShips.push(shipId);
      }
    }

    if (this.profileStore.setSelectedShip(this.profile, shipId)) {
      this.garagePreviewShipId = shipId;
      this.sound.playUiSelect();
      this.showHangar({ rebuildWorld: true });
    }
  }

  handleShipPreview(shipId) {
    if (this.phase !== 'hangar' || !SHIP_LOOKUP[shipId]) {
      return;
    }

    this.garagePreviewShipId = shipId;
    this.sound.playUiSelect();
    this.metaUI.showHangar(this.createHangarModel());
    this.syncGaragePreview();
  }

  handleShipPurchase(shipId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const result = this.profileStore.purchaseShip(this.profile, shipId);

    if (result.ok) {
      this.garagePreviewShipId = shipId;
      this.sound.playUiConfirm();
      this.showHangar({ rebuildWorld: true });
    }
  }

  handleCosmeticSelect(type, itemId) {
    if (this.phase !== 'hangar') {
      return;
    }

    if (this.profileStore.setCosmetic(this.profile, type, itemId)) {
      this.sound.playUiSelect();
      this.showHangar({ rebuildWorld: true });
    }
  }

  handleAdvancedGarageCategory(categoryId) {
    if (this.phase !== 'hangar') {
      return;
    }

    if (ADVANCED_COSMETIC_CATEGORIES.some((category) => category.id === categoryId)) {
      this.advancedGarageCategoryId = categoryId;
      this.sound.playUiSelect();
      this.showHangar({ rebuildWorld: false });
    }
  }

  handleAdvancedGarageFilter(filterId) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.advancedGarageFilter = ['all', 'owned', 'locked', 'premium'].includes(filterId) ? filterId : 'all';
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  handleAdvancedGarageRarity(rarityId) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.advancedGarageRarityFilter = ['all', 'rare', 'epic', 'legendary'].includes(rarityId) ? rarityId : 'all';
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  handleAdvancedCosmeticPreview(itemId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const item = ADVANCED_COSMETIC_LOOKUP[itemId];

    if (!item) {
      this.setToast('Unknown cosmetic preview.', 1.4);
      return;
    }

    this.advancedCosmeticPreview[item.category] = item.id;
    this.advancedGarageCategoryId = item.category;
    this.sound.playUiSelect();
    this.setToast(`${item.name} previewing. Not applied yet.`, 1.5);
    this.showHangar({ rebuildWorld: false });
  }

  handleAdvancedCosmeticApply(itemId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const item = ADVANCED_COSMETIC_LOOKUP[itemId];

    if (!item) {
      this.setToast('Unknown cosmetic.', 1.4);
      return;
    }

    if (!this.canUseAdvancedCosmeticItem(item)) {
      this.sound.playUiSelect();

      if (this.entitlements.canAccessAdvancedCosmetic(item) && !this.isRewardCosmeticOwned(item)) {
        this.metaUI.hangarPage = 'rewards';
        this.setToast(`${item.name} unlocks through premium rewards.`, 1.8);
      } else {
        this.selectedPremiumPreviewKey = FEATURE_KEYS.premiumCosmetics;
        this.metaUI.hangarPage = 'premium';
        this.setToast(`${item.name} is locked for this edition.`, 1.8);
      }

      this.showHangar({ rebuildWorld: false });
      return;
    }

    if (this.profileStore.setAdvancedCosmetic(this.profile, item.id)) {
      delete this.advancedCosmeticPreview[item.category];
      this.sound.playUiConfirm();
      this.setToast(`${item.name} applied. Cosmetic only.`, 1.5);
      this.showHangar({ rebuildWorld: false });
    }
  }

  handleAdvancedCosmeticResetPreview() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.advancedCosmeticPreview = {};
    this.sound.playUiSelect();
    this.setToast('Garage preview reset to applied cosmetics.', 1.3);
    this.showHangar({ rebuildWorld: false });
  }

  handleNumberPlateChange(value) {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.entitlements.canUsePremiumCosmetics()) {
      this.setToast('Number plates require standalone premium access.', 1.6);
      return;
    }

    const plate = this.profileStore.setNumberPlate(this.profile, value);
    this.sound.playUiConfirm();
    this.setToast(`Number plate set to ${plate.tag}-${plate.digits}.`, 1.5);
    this.showHangar({ rebuildWorld: false });
  }

  handleUpgradeModule(moduleId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const module = UPGRADE_MODULES.find((entry) => entry.id === moduleId);

    if (!module || !this.entitlements.canAccessUpgradeModule(module)) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.offlineShipUpgrades;
      this.metaUI.hangarPage = 'premium';
      this.sound.playUiSelect();
      this.setToast('That upgrade module is locked for this edition.', 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    const maxLevel = getModuleMaxLevel(module, this.entitlements);
    const result = this.profileStore.upgradeShipModule(this.profile, this.getActiveGaragePreviewShipId(), module.id, maxLevel);

    if (result.ok) {
      this.sound.playUiConfirm();
      this.setToast(`${module.name} upgraded to level ${result.level}.`, 1.5);
    } else {
      this.sound.playUiSelect();
      this.setToast(result.reason, 1.7);
    }

    this.showHangar({ rebuildWorld: false });
  }

  handleResetShipUpgrades() {
    if (this.phase !== 'hangar') {
      return;
    }

    const result = this.profileStore.resetShipUpgrades(this.profile, this.getActiveGaragePreviewShipId());
    this.sound.playUiSelect();
    this.setToast(result.ok ? 'Ship upgrades reset. No credits refunded.' : result.reason, 1.8);
    this.showHangar({ rebuildWorld: false });
  }

  handleShowcaseControl(actionId) {
    if (this.phase !== 'hangar') {
      return;
    }

    if (actionId === 'orbit-left') {
      this.garagePreview.nudgeOrbit(-1);
    } else if (actionId === 'orbit-right') {
      this.garagePreview.nudgeOrbit(1);
    } else if (actionId === 'zoom-in') {
      this.garagePreview.nudgeZoom(-1);
    } else if (actionId === 'zoom-out') {
      this.garagePreview.nudgeZoom(1);
    } else {
      this.garagePreview.resetView();
    }

    this.sound.playUiSelect();
    this.setToast('Showcase camera adjusted.', 1.1);
  }

  handleFavoriteShip(shipId) {
    if (this.phase !== 'hangar') {
      return;
    }

    const ship = SHIP_LOOKUP[shipId] ?? SHIP_LOOKUP[this.getActiveGaragePreviewShipId()];

    if (!ship || !this.profile.unlockedShips.includes(ship.id)) {
      this.setToast('Unlock this ship before marking it favorite.', 1.5);
      return;
    }

    this.profile.favoriteShipId = this.profile.favoriteShipId === ship.id ? '' : ship.id;
    this.profileStore.save(this.profile);
    this.sound.playUiConfirm();
    this.setToast(this.profile.favoriteShipId ? `${ship.name} marked as favorite.` : 'Favorite ship cleared.', 1.4);
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceExportCode() {
    if (this.phase !== 'hangar') {
      return;
    }

    const premiumProgress = this.profileStore.ensurePremiumState(this.profile);
    this.customRacePresetCode = exportCustomRacePresetCode(
      premiumProgress.customRaceLab.activeConfig,
      this.entitlements,
      this.profile
    );
    this.sound.playUiSelect();
    this.setToast('Race Lab preset code generated.', 1.4);
    this.showHangar({ rebuildWorld: false });
  }

  async handleCustomRaceCopyCode() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (!this.customRacePresetCode) {
      this.handleCustomRaceExportCode();
    }

    await this.handleCopyIdentity(this.customRacePresetCode, 'Race Lab preset code');
  }

  handleCustomRaceImportCodeChange(code) {
    this.customRaceImportCode = String(code ?? '').trim();
    this.customRaceImportResult = null;
  }

  handleCustomRaceValidateCode() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.customRaceImportResult = parseCustomRacePresetCode(
      this.customRaceImportCode,
      this.entitlements,
      this.profile
    );
    this.sound.playUiSelect();
    this.setToast(this.customRaceImportResult.ok ? 'Preset code validated.' : this.customRaceImportResult.reason, 1.8);
    this.showHangar({ rebuildWorld: false });
  }

  handleCustomRaceImportCode(savePreset = false) {
    if (this.phase !== 'hangar') {
      return;
    }

    const parsed = parseCustomRacePresetCode(this.customRaceImportCode, this.entitlements, this.profile);
    this.customRaceImportResult = parsed;

    if (!parsed.ok) {
      this.sound.playUiSelect();
      this.setToast(parsed.reason, 1.8);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    this.profileStore.setCustomRaceConfig(this.profile, parsed.config, this.entitlements);

    if (savePreset) {
      const limits = getCustomRaceLimits(this.entitlements);
      const result = this.profileStore.saveCustomRacePreset(this.profile, this.entitlements, limits.maxPresets);
      this.setToast(result.ok ? 'Imported preset saved.' : result.reason, 1.8);
    } else {
      this.setToast('Imported preset loaded into Race Lab.', 1.6);
    }

    this.sound.playUiConfirm();
    this.customRacePresetCode = '';
    this.showHangar({ rebuildWorld: false });
  }

  handlePlayerNameChange(playerName) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.profileStore.setPlayerName(this.profile, playerName);
    if (this.multiplayer.connected) {
      void this.syncMultiplayerIdentity().catch(() => {});
    }
    this.sound.playUiConfirm();
    this.showHangar({ rebuildWorld: false });
  }

  handleThemeChange(theme) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.profileStore.setTheme(this.profile, theme);
    this.applyTheme(this.profile.theme);
    this.sound.playUiSelect();
    this.showHangar({ rebuildWorld: false });
  }

  async handleGoogleLogin() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.sound.resume();

    try {
      const { authState, cloudProfile } = await this.identityService.signInWithGoogle();
      this.profile = this.profileStore.mergeCloudProfile(this.profile, cloudProfile, authState);
      this.entitlements.setAccountContext(authState);
      this.refreshBackendEntitlementForCurrentUser();
      this.applyTheme(this.profile.theme);
      this.identityService.queueProfileSave(this.profile);
      await this.identityService.flushProfileSave();

      if (this.multiplayer.connected) {
        await this.syncMultiplayerIdentity(true);
      }

      this.sound.playUiConfirm();
      this.setToast('Google identity linked', 1.5);
    } catch (error) {
      this.setToast(this.identityService.getErrorMessage(error), 2.2);
    }

    this.showHangar({ rebuildWorld: false });
  }

  async handleLogout() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.sound.resume();

    try {
      await this.identityService.flushProfileSave();

      if (this.multiplayer.getPublicState().room) {
        await this.multiplayer.leaveRoom().catch(() => {});
      }

      const { authState, cloudProfile, localOnly } = await this.identityService.logoutToGuest();
      const freshProfile = this.profileStore.createFreshProfile(authState, this.profile);
      this.profile = this.profileStore.mergeCloudProfile(freshProfile, cloudProfile, authState);
      this.entitlements.setAccountContext(authState);
      this.refreshBackendEntitlementForCurrentUser();
      this.applyTheme(this.profile.theme);
      this.applyRuntimeSettings();
      this.identityService.queueProfileSave(this.profile);
      await this.identityService.flushProfileSave();

      if (this.multiplayer.connected) {
        await this.syncMultiplayerIdentity(true);
      }

      this.sound.playUiConfirm();
      this.setToast(
        localOnly
          ? 'Logged out. Local guest mode is active because Anonymous Auth is disabled.'
          : 'Logged out. Guest session ready.',
        2.2
      );
    } catch (error) {
      this.setToast(this.identityService.getErrorMessage(error), 2.2);
    }

    this.showHangar({ rebuildWorld: false });
  }

  async handleQuickMatch() {
    if (this.phase !== 'hangar') {
      return;
    }

    try {
      await this.ensureIdentityReady();
      const response = await this.multiplayer.queueQuickMatch(await this.getMultiplayerIdentity());
      this.sound.playUiConfirm();
      this.setToast(response?.message ?? 'Quick match queued', 1.2);
    } catch (error) {
      this.setToast(error?.message ?? 'Could not queue quick match.', 1.8);
    }

    this.showHangar({ rebuildWorld: false });
  }

  async handleCreatePrivateRoom() {
    if (this.phase !== 'hangar') {
      return;
    }

    try {
      await this.ensureIdentityReady();
      const response = await this.multiplayer.createPrivateRoom(await this.getMultiplayerIdentity());
      this.sound.playUiConfirm();
      this.setToast(response?.message ?? 'Private room created', 1.3);
    } catch (error) {
      this.setToast(error?.message ?? 'Could not create a private room.', 1.8);
    }

    this.showHangar({ rebuildWorld: false });
  }

  async handleJoinPrivateRoom(code) {
    if (this.phase !== 'hangar') {
      return;
    }

    const trimmedCode = this.extractRoomCode(code);

    if (!trimmedCode) {
      this.setToast('Enter a room code first.', 1);
      return;
    }

    try {
      await this.ensureIdentityReady();
      const response = await this.multiplayer.joinPrivateRoom(trimmedCode, await this.getMultiplayerIdentity());
      this.sound.playUiConfirm();
      this.setToast(response?.message ?? `Joined room ${trimmedCode}`, 1.3);
    } catch (error) {
      this.setToast(error?.message ?? 'Could not join that room.', 1.8);
    }

    this.showHangar({ rebuildWorld: false });
  }

  async handleTournamentMatch() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.metaUI.hangarPage = this.entitlements.canPlayTournamentMode() ? 'tournament' : 'premium';
    this.selectedPremiumPreviewKey = FEATURE_KEYS.tournamentMode;
    this.sound.playUiSelect();
    this.setToast(this.entitlements.canPlayTournamentMode() ? 'Tournament Mode opened.' : 'Tournament Mode is locked in Lite.', 1.6);
    this.showHangar({ rebuildWorld: false });
  }

  async handleCreatePrivateTournament(format = 4, botFill = true) {
    if (this.phase !== 'hangar') {
      return;
    }

    const normalizedFormat = Number(format) === 8 ? 8 : 4;

    if (!this.entitlements.canPlayTournamentMode() || (normalizedFormat === 8 && !this.entitlements.canAccessTier('STANDALONE_FULL_PREMIUM'))) {
      this.selectedPremiumPreviewKey = FEATURE_KEYS.tournamentMode;
      this.metaUI.hangarPage = 'premium';
      this.setToast(normalizedFormat === 8 ? '8-player private tournaments require Full Premium.' : 'Private tournaments require standalone premium access.', 2);
      this.showHangar({ rebuildWorld: false });
      return;
    }

    try {
      await this.ensureIdentityReady();
      const response = await this.multiplayer.createPrivateTournament(await this.getMultiplayerIdentity(), {
        format: normalizedFormat,
        botFill
      });
      this.sound.playUiConfirm();
      this.setToast(response?.message ?? 'Private tournament created.', 1.5);
    } catch (error) {
      this.setToast(error?.message ?? 'Could not create private tournament.', 2.2);
    }

    this.showHangar({ rebuildWorld: false });
  }

  async handleJoinPrivateTournament(code) {
    if (this.phase !== 'hangar') {
      return;
    }

    const trimmedCode = this.extractRoomCode(code);

    if (!trimmedCode) {
      this.setToast('Enter a tournament room code first.', 1.4);
      return;
    }

    try {
      await this.ensureIdentityReady();
      const response = await this.multiplayer.joinPrivateTournament(trimmedCode, await this.getMultiplayerIdentity());
      this.sound.playUiConfirm();
      this.setToast(response?.message ?? `Joined tournament ${trimmedCode}.`, 1.5);
    } catch (error) {
      this.setToast(error?.message ?? 'Could not join private tournament.', 2.2);
    }

    this.showHangar({ rebuildWorld: false });
  }

  handlePrivateTournamentReady() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.togglePrivateTournamentReady()
      .then((response) => {
        this.sound.playUiSelect();
        this.setToast(response?.message ?? 'Tournament ready state updated.', 1.4);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not update tournament ready state.', 2);
      });
  }

  handleStartPrivateTournament() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.startPrivateTournament()
      .then((response) => {
        this.sound.playUiConfirm();
        this.setToast(response?.message ?? 'Private tournament launch started.', 1.4);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not start private tournament.', 2.2);
      });
  }

  handleStartNextPrivateTournament() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.startNextPrivateTournamentRound()
      .then((response) => {
        this.sound.playUiConfirm();
        this.setToast(response?.message ?? 'Next tournament round launch started.', 1.4);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not start next tournament round.', 2.2);
      });
  }

  handlePrivateTournamentRematch() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.requestPrivateTournamentRematch()
      .then((response) => {
        this.sound.playUiConfirm();
        this.setToast(response?.message ?? 'Private tournament rematch staged.', 1.4);
        this.showHangar({ rebuildWorld: false });
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not stage tournament rematch.', 2.2);
      });
  }

  handleToggleRoomReady() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (this.multiplayer.getPublicState().room?.type === 'private-tournament') {
      this.handlePrivateTournamentReady();
      return;
    }

    this.multiplayer.toggleReady()
      .then((response) => {
        this.sound.playUiSelect();
        this.setToast(response?.message ?? 'Ready state updated', 1.2);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not update ready state.', 1.8);
      });
  }

  handleTransferRoomHost(playerId) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.transferHost(playerId)
      .then((response) => {
        this.sound.playUiConfirm();
        this.setToast(response?.message ?? 'Host transferred', 1.2);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not transfer the host.', 1.8);
      });
  }

  handleRoomRematch() {
    if (this.phase !== 'hangar') {
      return;
    }

    if (this.multiplayer.getPublicState().room?.type === 'private-tournament') {
      this.handlePrivateTournamentRematch();
      return;
    }

    this.multiplayer.requestRoomRematch()
      .then((response) => {
        this.sound.playUiConfirm();
        this.setToast(response?.message ?? 'Rematch requested', 1.2);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not queue a rematch.', 1.8);
      });
  }

  handleStartPrivateRoom() {
    if (this.phase !== 'hangar') {
      return;
    }

    const room = this.multiplayer.getPublicState().room;

    if (room?.type === 'private-tournament') {
      if (room.status === 'between_rounds') {
        this.handleStartNextPrivateTournament();
      } else {
        this.handleStartPrivateTournament();
      }
      return;
    }

    this.multiplayer.startPrivateRoom()
      .then((response) => {
        this.sound.playUiConfirm();
        this.setToast(response?.message ?? 'Race start sent to lobby', 1.2);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not start that room.', 1.8);
      });
  }

  handleKickRoomPlayer(playerId) {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.kickRoomPlayer(playerId)
      .then((response) => {
        this.sound.playUiSelect();
        this.setToast(response?.message ?? 'Removal sent to lobby', 1.2);
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not remove that pilot.', 1.8);
      });
  }

  handleDiscardRoom() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.discardRoom()
      .then((response) => {
        this.sound.playUiSelect();
        this.setToast(response?.message ?? 'Room discarded', 1.2);
        this.showHangar({ rebuildWorld: false });
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not discard that room.', 1.8);
      });
  }

  handleLeaveRoom() {
    if (this.phase !== 'hangar') {
      return;
    }

    this.multiplayer.leaveRoom()
      .then((response) => {
        this.sound.playUiSelect();
        this.setToast(response?.message ?? 'Left room', 1.2);
        this.showHangar({ rebuildWorld: false });
      })
      .catch((error) => {
        this.setToast(error?.message ?? 'Could not leave that room.', 1.8);
      });
  }

  handleSendEmote(emote) {
    this.multiplayer.sendEmote(emote);
    this.sound.playUiSelect();
  }

  async handleCopyIdentity(value, label = 'ID') {
    const text = String(value ?? '').trim();

    if (!text) {
      this.setToast('Nothing to copy yet.', 1.2);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.sound.playUiSelect();
      this.setToast(`${label} copied`, 1.2);
    } catch {
      this.setToast(`Could not copy ${label.toLowerCase()}.`, 1.6);
    }
  }

  getPairCooldownKey(shipA, shipB) {
    return shipA.root.uuid < shipB.root.uuid
      ? `${shipA.root.uuid}:${shipB.root.uuid}`
      : `${shipB.root.uuid}:${shipA.root.uuid}`;
  }

  updateContactCooldowns(deltaTime) {
    for (const [key, value] of this.contactPairCooldowns.entries()) {
      const nextValue = value - deltaTime;

      if (nextValue <= 0) {
        this.contactPairCooldowns.delete(key);
      } else {
        this.contactPairCooldowns.set(key, nextValue);
      }
    }
  }

  updateSlipstream(deltaTime) {
    if (!this.track || this.racers.length < 2) {
      return;
    }

    let playerDraftStrength = 0;

    for (const trailingShip of this.racers) {
      for (const leadShip of this.racers) {
        if (leadShip === trailingShip) {
          continue;
        }

        const aheadDistance = this.track.getSignedProgressDelta(leadShip.progress, trailingShip.progress) * this.track.length;

        if (aheadDistance <= 0 || aheadDistance > 28) {
          continue;
        }

        const laneGap = Math.abs(trailingShip.lateralOffset - leadShip.lateralOffset);

        if (laneGap > 4.6) {
          continue;
        }

        const distanceFactor = THREE.MathUtils.clamp(1 - aheadDistance / 28, 0, 1);
        const laneFactor = THREE.MathUtils.clamp(1 - laneGap / 4.6, 0, 1);
        const speedFactor = THREE.MathUtils.clamp(leadShip.speed / Math.max(1, leadShip.config.maxSpeed), 0.5, 1.2);
        const intensity = distanceFactor * laneFactor * speedFactor;

        trailingShip.setSlipstream(intensity);

        if (trailingShip === this.playerShip) {
          playerDraftStrength = Math.max(playerDraftStrength, intensity);
        }
      }
    }

    if (playerDraftStrength > 0.12) {
      this.raceStats.draftSeconds += deltaTime;
    }

    if (this.trackTiming) {
      this.trackTiming.activeDraftStrength = playerDraftStrength;
    }
  }

  handleShortcutLines(deltaTime) {
    if (!this.track?.shortcutZones?.length) {
      return;
    }

    for (const ship of this.racers) {
      for (const shortcut of this.track.shortcutZones) {
        const shortcutState = this.track.getShortcutState(ship, shortcut);

        if (!shortcutState) {
          continue;
        }

        const laneFactor = THREE.MathUtils.clamp(1 - shortcutState.lateralGap / Math.max(0.5, shortcut.width), 0, 1);
        const speedFactor = THREE.MathUtils.clamp(ship.speed / Math.max(1, shortcut.recommendedSpeed ?? ship.config.maxSpeed), 0.75, 1.3);
        const intensity = laneFactor * speedFactor;
        const isFreshShortcutLine = ship.shortcutLabel !== shortcut.label;

        ship.setShortcutAssist(shortcut, intensity);

        if (ship === this.playerShip && intensity > 0.65 && isFreshShortcutLine) {
          this.setToast(`${shortcut.label} Live`, 0.5);
        }

        if (ship.speed > (shortcut.recommendedSpeed ?? ship.config.maxSpeed) * 1.16 && Math.random() < deltaTime * 2.4 * (shortcut.risk ?? 1)) {
          const hazardHit = ship.applyHazard(this.elapsedTime, shortcut.risk ?? 1);

          if (hazardHit && ship === this.playerShip) {
            this.raceStats.hazardHits += 1;
            this.setToast(`${shortcut.label} Missed`, 0.9);
            this.sound.playHazard();
          }
        }
      }
    }
  }

  handleTrackInteractions(deltaTime) {
    this.handleShortcutLines(deltaTime);

    for (const ship of this.racers) {
      for (const pad of this.track.boostPads) {
        if (this.track.isShipInsideZone(ship, pad) && ship.triggerBoostPad()) {
          this.effects.spawnBoostBurst(ship, ship.config.trailColor);

          if (ship === this.playerShip) {
            this.setToast('Boost Pad', 0.8);
            this.sound.playBoostPad();
            this.replayCapture.addEvent('boost-pad', { label: 'Boost Pad', shipId: ship.config.shipId }, this.trackTiming?.elapsedMs ?? 0);
          }

          if (ship === this.playerShip || ship === this.standings[0]) {
            this.commentary.announceBoost(ship);
          }
        }
      }

      for (const zone of this.track.slowZones) {
        if (this.track.isShipInsideZone(ship, zone)) {
          const fresh = ship.activateTrackSlow(0.2, 0.82);

          if (fresh && ship === this.playerShip) {
            this.setToast('Slow Zone', 0.8);
            this.sound.playSlowZone();
          }
        }
      }

      for (const zone of this.track.hazardZones) {
        const hazardScale = this.track.definition.identityId === 'hazard-chaos' ? 1.18 : 1;

        if (this.track.isShipInsideZone(ship, zone) && ship.applyHazard(this.elapsedTime, hazardScale)) {
          this.effects.spawnImpact(ship, 0xff9a52, ship === this.playerShip ? 0.95 : 0.68);

          if (ship === this.playerShip) {
            this.raceStats.hazardHits += 1;
            this.setToast('Hazard Hit', 0.95);
            this.sound.playHazard();
            this.replayCapture.addEvent('hazard-hit', { label: 'Hazard Hit', shipId: ship.config.shipId }, this.trackTiming?.elapsedMs ?? 0);
            this.cameraController.triggerPunch(0.08, 0.18);
          }

          if (ship === this.playerShip || ship === this.standings[0]) {
            this.commentary.announceHazard(ship);
          }
        }
      }
    }
  }

  handlePickupCollections() {
    for (const ship of this.racers) {
      const result = this.powerUps.checkPickupCollection(ship);

      if (!result) {
        continue;
      }

      if (ship === this.playerShip) {
        this.raceStats.pickupsCollected += 1;
        this.replayCapture.addEvent('pickup', { label: result.type === 'item' ? result.label : 'Boost Energy' }, this.trackTiming?.elapsedMs ?? 0);

        if (result.type === 'item') {
          this.setToast(`Picked Up ${result.label}`, 1.2);
        } else {
          this.setToast('Boost Energy +12', 1);
        }
      }

      if (ship === this.playerShip || ship === this.standings[0]) {
        this.commentary.announcePickup(ship, result.label);
      }
    }
  }

  handlePlayerItemUse() {
    if (!this.input.consumeActionPressed('item')) {
      return;
    }

    if (!this.playerShip.heldItem) {
      this.setToast('No Power-Up', 0.8);
      this.sound.playNoTarget();
      return;
    }

    const heldItem = this.playerShip.heldItem;
    const result = this.powerUps.useItem(this.playerShip, this.racers);

    if (result) {
      this.playerShip.itemCooldown = 0.8;
      this.setToast(result.message, 1.1);
      this.replayCapture.addEvent('powerup-use', { label: this.powerUps.getItemLabel(heldItem), detail: result.message }, this.trackTiming?.elapsedMs ?? 0);
      this.commentary.announceItemUse(this.playerShip, this.powerUps.getItemLabel(heldItem));
    } else if (heldItem === 'missile' || heldItem === 'gravity-glitch') {
      this.setToast('No Target', 0.85);
      this.sound.playNoTarget();
    }
  }

  handleAiItemUse() {
    for (const entry of this.aiEntries) {
      const ship = entry.ship;

      if (!ship.heldItem || ship.itemCooldown > 0) {
        continue;
      }

      const nearbyOpponents = this.racers.filter(
        (racer) => racer !== ship && racer.root.position.distanceTo(ship.root.position) < 26
      );
      const targetAhead = this.powerUps.findTargetAhead(ship, this.racers, 0.18);
      const targetGap = targetAhead
        ? this.track.getSignedProgressDelta(targetAhead.progress, ship.progress) * this.track.length
        : Number.POSITIVE_INFINITY;
      const turnSeverity = THREE.MathUtils.clamp(
        this.track.getCurvature(ship.progress + 0.016, 0.006) * 0.24 +
        this.track.getCurvature(ship.progress + 0.04, 0.01) * 0.17,
        0,
        1
      );
      const straightAhead = turnSeverity < 0.34;
      const shipRank = this.standings ? this.standings.findIndex((racer) => racer === ship) + 1 : 3;
      const comebackPressure = THREE.MathUtils.clamp((shipRank - 1) / Math.max(1, this.racers.length - 1), 0, 1);
      let shouldUse = false;

      if (ship.heldItem === 'speed-burst') {
        shouldUse =
          straightAhead &&
          ship.speed > ship.config.maxSpeed * 0.46 &&
          (comebackPressure > 0.2 || targetGap < 110 || ship.boostEnergy < 26);
      } else if (ship.heldItem === 'shield') {
        shouldUse =
          nearbyOpponents.length > 1 ||
          shipRank > 3 ||
          ship.empTimer > 0 ||
          ship.gravityGlitchTimer > 0;
      } else if (ship.heldItem === 'emp') {
        shouldUse =
          nearbyOpponents.length > 0 &&
          (comebackPressure > 0.1 || nearbyOpponents.length > 1 || targetGap < 70);
      } else if (ship.heldItem === 'missile') {
        shouldUse = Boolean(targetAhead) && targetGap < 180;
      } else if (ship.heldItem === 'gravity-glitch') {
        shouldUse = Boolean(targetAhead) && (targetGap < 120 || comebackPressure > 0.18);
      }

      if (shouldUse) {
        const heldItem = ship.heldItem;
        const result = this.powerUps.useItem(ship, this.racers);

        if (result) {
          ship.itemCooldown = 1.15 + Math.random() * 0.45;
          this.commentary.announceItemUse(ship, this.powerUps.getItemLabel(heldItem));
        }
      }
    }
  }

  handleNearMisses() {
    for (const rival of this.racers) {
      if (rival === this.playerShip) {
        continue;
      }

      const separation = this.playerShip.root.position.distanceTo(rival.root.position);
      const progressGap = Math.abs(this.playerShip.distance - rival.distance);

      if (separation > 6.2 && separation < 9.5 && progressGap < 0.028) {
        if (this.playerShip.registerNearMiss()) {
          this.raceStats.nearMisses += 1;
          this.setToast('Near Miss +6 Boost', 0.95);
          this.sound.playNearMiss();
          this.commentary.announceNearMiss(this.playerShip);
        }

        break;
      }
    }
  }

  resolveCloseRacing(deltaTime) {
    for (let index = 0; index < this.racers.length; index += 1) {
      const shipA = this.racers[index];

      for (let otherIndex = index + 1; otherIndex < this.racers.length; otherIndex += 1) {
        const shipB = this.racers[otherIndex];
        const pairKey = this.getPairCooldownKey(shipA, shipB);
        const pairCooldown = this.contactPairCooldowns.get(pairKey) ?? 0;
        const signedGap = this.track.getSignedProgressDelta(shipB.progress, shipA.progress) * this.track.length;
        const forwardGap = Math.abs(signedGap);

        if (forwardGap > 7.5 || pairCooldown > 0) {
          continue;
        }

        const lateralGap = shipA.lateralOffset - shipB.lateralOffset;
        const sideOverlap = 4.8 - Math.abs(lateralGap);

        if (sideOverlap <= 0) {
          continue;
        }

        const shipALeads = signedGap < 0;
        const leader = shipALeads ? shipA : shipB;
        const trailing = shipALeads ? shipB : shipA;
        const direction = Math.sign(lateralGap) || (index % 2 === 0 ? 1 : -1);
        const lateralStrength = THREE.MathUtils.clamp(sideOverlap * 0.18, 0.16, 0.92);
        const speedDelta = Math.max(0, trailing.speed - leader.speed);
        const rearTap = forwardGap > 1.1 && speedDelta > 3.2;
        const contactBias = trailing.persona?.contactBias ?? 1;
        const trailingLoss = rearTap
          ? THREE.MathUtils.clamp(1.2 + speedDelta * 0.11 * contactBias, 0.9, 6.2)
          : THREE.MathUtils.clamp(0.7 + sideOverlap * 0.4, 0.5, 2.6);
        const leaderLoss = rearTap ? trailingLoss * 0.26 : trailingLoss * 0.5;

        shipA.applyContactImpulse({
          lateralDirection: direction,
          lateralStrength: lateralStrength * (shipA === trailing ? 1.05 : 0.92),
          speedLoss: shipA === trailing ? trailingLoss : leaderLoss,
          impactFlash: rearTap ? 0.42 : 0.28
        });
        shipB.applyContactImpulse({
          lateralDirection: -direction,
          lateralStrength: lateralStrength * (shipB === trailing ? 1.05 : 0.92),
          speedLoss: shipB === trailing ? trailingLoss : leaderLoss,
          impactFlash: rearTap ? 0.42 : 0.28
        });

        this.contactPairCooldowns.set(pairKey, rearTap ? 0.22 : 0.16);
        this.effects.spawnImpact(trailing, rearTap ? 0xff8f8f : 0x8fd7ff, rearTap ? 0.92 : 0.65);

        if (shipA === this.playerShip || shipB === this.playerShip) {
          this.raceStats.contactMoments += 1;
          this.cameraController.triggerPunch(rearTap ? 0.1 : 0.07, rearTap ? 0.22 : 0.16);

          if (rearTap) {
            this.setToast('Heavy Contact', 0.65);
          } else {
            this.setToast('Side Contact', 0.55);
          }
        }
      }
    }
  }

  setToast(text, duration = 1.2) {
    this.toastText = text;
    this.toastTimer = duration;
  }

  updateStandings() {
    const previousStandings = this.standings;
    const previousLeader = previousStandings[0] ?? null;
    const standings = [...this.racers].sort((shipA, shipB) => shipB.distance - shipA.distance);
    this.playerPosition = standings.findIndex((ship) => ship === this.playerShip) + 1;
    this.standings = standings;

    if (this.phase !== 'race' || previousStandings.length !== standings.length || this.rankCommentaryTimer > 0) {
      return;
    }

    const previousRanks = new Map(previousStandings.map((ship, index) => [ship, index + 1]));
    let bestGainShip = null;
    let bestGain = 0;
    let bestNewRank = 0;

    for (let index = 0; index < standings.length; index += 1) {
      const ship = standings[index];
      const previousRank = previousRanks.get(ship);

      if (!previousRank) {
        continue;
      }

      const gain = previousRank - (index + 1);

      if (gain > bestGain) {
        bestGain = gain;
        bestGainShip = ship;
        bestNewRank = index + 1;
      }
    }

    if (bestGainShip && bestGain > 0) {
      const defender =
        previousStandings[bestNewRank - 1] === bestGainShip
          ? previousStandings[bestNewRank]
          : previousStandings[bestNewRank - 1];

      if (defender) {
        this.commentary.announceOvertake(
          bestGainShip,
          defender,
          bestNewRank,
          standings[0] === bestGainShip && previousLeader !== bestGainShip
        );
        this.rankCommentaryTimer = 0.55;
      }
    } else if (previousLeader && standings[0] !== previousLeader) {
      this.commentary.announceOvertake(standings[0], previousLeader, 1, true);
      this.rankCommentaryTimer = 0.55;
    }
  }

  getChallengeTelemetry() {
    if (!this.raceStats || this.phase !== 'race') {
      return [];
    }

    if (this.runMode === 'time-trial') {
      return [
        {
          label: 'Track Identity',
          progress: this.track?.definition?.identity ?? 'Circuit'
        },
        {
          label: 'Best Lap',
          progress: formatTimeMs(this.trackTiming?.bestLapMs, '--:--.---')
        },
        {
          label: 'Ghost Replay',
          progress: this.timeTrialGhost ? 'Loaded' : 'None'
        }
      ];
    }

    if (this.multiplayerMatch) {
      return this.profileStore.getMultiplayerView(this.profile).dailyGoals.slice(0, 3).map((goal) => ({
        label: goal.label,
        progress: goal.progress
      }));
    }

    return this.activeChallengeIds.map((challengeId) => {
      const challenge = CHALLENGE_LOOKUP[challengeId];
      return {
        label: challenge.label,
        progress: challenge.getProgressText(this.raceStats)
      };
    });
  }

  handlePowerAudioEvent(type, payload) {
    if (!this.playerShip) {
      return;
    }

    const isPlayerEvent =
      payload.ship === this.playerShip ||
      payload.user === this.playerShip ||
      payload.target === this.playerShip;
    const nearbyUser = payload.user && this.isShipAudible(payload.user);
    const nearbyTarget = payload.target && this.isShipAudible(payload.target);

    if (isPlayerEvent || nearbyUser || nearbyTarget) {
      this.sound.handlePowerEvent(type, payload);
    }

    if (!this.profile.settings.graphics.particles) {
      return;
    }

    if (type === 'use-item') {
      if (payload.itemType === 'shield') {
        this.effects.spawnShieldShell(payload.user, payload.user.config.glow);
      } else if (payload.itemType === 'emp') {
        this.effects.spawnEmpWave(payload.user, 0x7dc8ff);

        if (payload.user === this.playerShip || nearbyUser) {
          this.cameraController.triggerPunch(0.09, 0.2);
        }
      } else if (payload.itemType === 'gravity-glitch') {
        this.effects.spawnGravityGlitch(payload.target ?? payload.user, 0xca7cff);
      } else if (payload.itemType === 'missile') {
        this.effects.spawnMissileLock(payload.target ?? payload.user, 0xff7e98);
      } else if (payload.itemType === 'speed-burst') {
        this.effects.spawnBoostBurst(payload.user, payload.user.config.trailColor);
      }
    } else if (type === 'missile-impact') {
      this.effects.spawnImpact(payload.target, 0xff6c6c, payload.target === this.playerShip ? 1.2 : 0.85);

      if (payload.target === this.playerShip || nearbyTarget) {
        this.cameraController.triggerPunch(0.12, 0.3);
      }
    }
  }

  isShipAudible(ship, radius = 26) {
    if (!ship || !this.playerShip) {
      return false;
    }

    if (ship === this.playerShip) {
      return true;
    }

    return ship.root.position.distanceTo(this.playerShip.root.position) < radius;
  }

  updateRacerLaps() {
    for (const ship of this.racers) {
      const previousLap = this.racerLapMap.get(ship) ?? 1;
      const currentLap = Math.min(this.lapTarget, ship.getLapNumber());

      if (currentLap > previousLap) {
        const leader = this.standings[0];

        if (ship === this.playerShip || ship === leader || currentLap >= this.lapTarget) {
          this.commentary.announceLap(ship, currentLap, this.lapTarget);
        }
      }

      this.racerLapMap.set(ship, currentLap);
    }
  }

  buildTrackMapModel() {
    if (!this.track || this.standings.length === 0) {
      return null;
    }

    const markers = this.standings.map((ship, index) => {
      const point = this.track.getMapPoint(ship.progress);

      return {
        key: ship.shipId ?? ship.label,
        x: point.x,
        y: point.y,
        label: ship.label,
        color: `#${toHex(ship.config.color)}`,
        isPlayer: ship === this.playerShip,
        isLeader: index === 0,
        isGhost: false,
        position: index + 1
      };
    });

    if (this.timeTrialGhost?.ship) {
      const ghostPoint = this.track.getMapPoint(this.timeTrialGhost.ship.progress);
      markers.push({
        key: 'ghost',
        x: ghostPoint.x,
        y: ghostPoint.y,
        label: 'Ghost',
        color: '#f7f1b2',
        isPlayer: false,
        isLeader: false,
        isGhost: true,
        position: 0
      });
    }

    return {
      id: this.track.definition.id,
      points: this.track.mapPoints,
      markers
    };
  }

  updateHud() {
    if (!this.playerShip || !this.track) {
      return;
    }

    let centerText = '';
    let centerSubtext = '';
    let status = 'PIT LINK';
    const showTelemetry = this.phase === 'intro' || this.phase === 'countdown' || this.phase === 'race';

    if (this.phase === 'intro') {
      const premiumIntro = this.getPremiumIntroCopy();
      centerText = premiumIntro?.title ?? this.track.definition.name.toUpperCase();
      centerSubtext = premiumIntro?.subtitle ?? 'Track scan in progress';
      status = premiumIntro?.status ?? 'COURSE PREVIEW';
    } else if (this.phase === 'countdown') {
      const countdownValue = this.multiplayerMatch
        ? Math.max(1, Math.ceil(Math.max(0, this.multiplayerMatch.startAt - Date.now()) / 1000))
        : Math.max(1, 3 - Math.floor(this.phaseTimer));
      centerText = String(countdownValue);
      centerSubtext = this.multiplayerMatch ? 'Live room launch. Hold your line.' : 'Engines locked. Hold your line.';
      status = this.multiplayerMatch ? 'ROOM LAUNCH' : 'GRID LOCKED';
    } else if (this.phase === 'race') {
      centerText = this.goFlashTimer > 0 ? 'GO' : '';
      centerSubtext = this.goFlashTimer > 0
        ? (this.multiplayerMatch ? 'Real pilots, real pressure' : this.runMode === 'time-trial' ? 'Chase the ghost and own the sectors' : 'Break through the field')
        : this.multiplayerMatch && this.multiplayerMatch.waitingForResults
          ? 'Waiting for room classification'
          : '';

      if (this.multiplayerMatch && this.multiplayerMatch.waitingForResults) {
        status = 'CLASSIFIED';
      } else if (this.multiplayerMatch) {
        status = 'ONLINE RACE';
      } else if (this.playerShip.boosting) {
        status = 'OVERDRIVE';
      } else if (this.playerShip.drifting) {
        status = 'DRIFTING';
      } else if (this.runMode === 'time-trial' && this.playerShip.draftStrength > 0.24) {
        status = 'IN DRAFT';
      } else if (this.runMode === 'time-trial') {
        status = 'TIME TRIAL';
      } else if (this.playerShip.draftStrength > 0.24) {
        status = 'SLIPSTREAM';
      } else if (this.playerShip.shieldTimer > 0) {
        status = 'SHIELDED';
      } else if (this.playerShip.empTimer > 0) {
        status = 'SYSTEM JAMMED';
      } else {
        status = 'RACE LIVE';
      }
    }

    const timingModel = this.trackTiming
      ? {
        lapTimeLabel: formatTimeMs(this.trackTiming.elapsedMs - this.trackTiming.lapStartMs),
        bestLapLabel: formatTimeMs(this.trackTiming.bestLapMs),
        splitLabel: this.trackTiming.lastSectorIndex != null
          ? `S${this.trackTiming.lastSectorIndex + 1} ${this.trackTiming.lastSectorDeltaMs != null ? `${this.trackTiming.lastSectorDeltaMs <= 0 ? '-' : '+'}${(Math.abs(this.trackTiming.lastSectorDeltaMs) / 1000).toFixed(2)}` : formatTimeMs(this.trackTiming.lastSectorTimes?.[this.trackTiming.lastSectorIndex], '--')}`
          : 'SPLIT --',
        draftLabel: this.playerShip.draftStrength > 0.12
          ? `DRAFT ${(this.playerShip.draftStrength * 100).toFixed(0)}%`
          : this.runMode === 'time-trial'
            ? `GHOST ${this.timeTrialGhost ? 'ON' : 'OFF'}`
            : `TRACK ${this.track.definition.identity ?? 'LIVE'}`
      }
      : null;

    this.hud.update({
      status,
      position: this.playerPosition,
      totalRacers: this.racers.length,
      lap: Math.min(this.lapTarget, this.playerShip.getLapNumber()),
      lapsTotal: this.lapTarget,
      speed: this.playerShip.speed,
      boostEnergy: this.playerShip.boostEnergy,
      boostActive: this.playerShip.boosting,
      itemLabel: this.powerUps
        ? this.powerUps.getItemLabel(this.playerShip.heldItem)
        : this.multiplayerMatch
          ? 'Ranked Loadout'
          : this.runMode === 'time-trial'
            ? 'No Items'
            : 'Empty',
      centerText,
      centerSubtext,
      toastText: this.toastText,
      showTelemetry,
      timing: timingModel,
      challenges: this.getChallengeTelemetry(),
      commentary: this.commentary.getHudModel(this.standings, this.playerShip, this.track),
      trackMap: this.buildTrackMapModel()
    });
  }

  applyTheme(theme) {
    const resolvedTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = resolvedTheme;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    window.cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.handleResize);
    this.profileSubscription?.();
    this.input.dispose();
    this.hud.dispose();
    this.speedLines.dispose();
    this.sound.dispose();
    this.identityService.dispose();
    this.multiplayer.dispose();
    this.metaUI.root.remove();
    this.renderer.dispose();
  }
}
