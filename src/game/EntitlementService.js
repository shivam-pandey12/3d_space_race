import {
  ACCESS_STATE_LABELS,
  EDITION_CONFIG,
  EDITION_IDS,
  EDITION_ORDER,
  EDITION_RANK,
  EDITION_TO_PLAN,
  FEATURE_DEFINITIONS,
  FEATURE_KEYS,
  MULTIPLAYER_FAIR_PLAY_POLICY,
  PLAN_CONFIG,
  PREMIUM_PREVIEW_HUB,
  PREMIUM_ROADMAP,
  PRICING_REGIONS,
  normalizeEditionId,
  normalizePlanId
} from './editionConfig.js';
import { CAMPAIGN_CUP_LOOKUP } from './premiumCampaignContent.js';
import { TOURNAMENT_TYPE_LOOKUP } from './premiumTournamentContent.js';
import { ADVANCED_COSMETIC_LOOKUP } from './advancedGarageContent.js';
import { UPGRADE_MODULE_LOOKUP } from './shipUpgradeContent.js';
import { getTestAccountUnlock } from './testAccountUnlocks.js';
import {
  PREMIUM_CONTENT_PACK_LOOKUP,
  PREMIUM_CONTENT_PACKS,
  decorateContentPack,
  getContentPackForItem
} from './premiumContentPacks.js';

const DEMO_STORAGE_KEY = 'spaceship-race-demo-edition';
const DEMO_QUERY_PARAM = 'edition';
const DEFAULT_PURCHASE_MESSAGE = 'Sign in with Google to purchase and keep your premium access.';
const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function formatDateLabel(value) {
  const time = new Date(value ?? '').getTime();

  if (!Number.isFinite(time)) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(time));
}

function isExplicitDemoEnabled() {
  return String(import.meta.env.VITE_ENABLE_DEMO_ENTITLEMENT ?? '').toLowerCase() === 'true';
}

function isFrontendPaymentsEnabled() {
  return String(import.meta.env.VITE_ENABLE_PAYMENTS ?? '').toLowerCase() === 'true';
}

function getApiBaseUrl() {
  return String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

function getRazorpayKeyId() {
  return String(import.meta.env.VITE_RAZORPAY_KEY_ID ?? '').trim();
}

function getConfiguredBuildEdition() {
  return normalizeEditionId(
    import.meta.env.VITE_SPACESHIP_EDITION,
    EDITION_IDS.GAMEHUB_LITE
  );
}

function createPriceView(price, regionConfig) {
  if (!price) {
    return null;
  }

  return {
    region: regionConfig.id,
    regionLabel: regionConfig.label,
    currency: regionConfig.currency,
    display: price.display,
    amount: price.amount ?? null,
    minAmount: price.minAmount ?? null,
    maxAmount: price.maxAmount ?? null
  };
}

export class EntitlementService {
  constructor({ storage = window.localStorage, location = window.location } = {}) {
    this.storage = storage;
    this.location = location;
    this.accountContext = null;
    this.backendEntitlement = null;
    this.backendEntitlementError = '';
    this.backendPaymentStatus = {
      enabled: isFrontendPaymentsEnabled(),
      ready: false,
      environment: ''
    };
    this.purchaseState = {
      status: 'idle',
      message: ''
    };
    this.applyDemoQueryOverride();
  }

  setAccountContext(accountContext = null) {
    const previousUid = this.accountContext?.uid ?? '';
    this.accountContext = accountContext
      ? {
          uid: String(accountContext.uid ?? accountContext.authUid ?? ''),
          provider: String(accountContext.provider ?? accountContext.auth?.provider ?? ''),
          email: String(accountContext.email ?? accountContext.auth?.email ?? ''),
          displayName: String(accountContext.displayName ?? accountContext.auth?.displayName ?? ''),
          isAnonymous: Boolean(accountContext.isAnonymous ?? accountContext.auth?.isAnonymous)
        }
      : null;

    const nextUid = this.accountContext?.uid ?? '';

    if (previousUid && previousUid !== nextUid) {
      this.backendEntitlement = null;
      this.backendEntitlementError = '';
    }
  }

  isDemoOverrideEnabled() {
    return Boolean(import.meta.env.DEV || isExplicitDemoEnabled());
  }

  getBuildEdition() {
    return getConfiguredBuildEdition();
  }

  getDemoOverrideEdition() {
    if (!this.isDemoOverrideEnabled()) {
      return '';
    }

    return normalizeEditionId(this.storage.getItem(DEMO_STORAGE_KEY), '');
  }

  getAccountOverride() {
    if (!this.isDemoOverrideEnabled()) {
      return {
        active: false,
        email: '',
        edition: '',
        label: '',
        source: ''
      };
    }

    return getTestAccountUnlock(this.accountContext) ?? {
      active: false,
      email: '',
      edition: '',
      label: '',
      source: ''
    };
  }

  getBackendEdition() {
    const entitlement = this.backendEntitlement;

    if (!entitlement?.active || entitlement.status !== 'active') {
      return '';
    }

    return normalizeEditionId(entitlement.effectiveTier ?? entitlement.tier, '');
  }

  getPassStatus() {
    const entitlement = this.backendEntitlement ?? null;
    const rawTier = normalizeEditionId(entitlement?.rawTier ?? entitlement?.tier, '');
    const rawEdition = rawTier ? EDITION_CONFIG[rawTier] : null;
    const expiresAt = entitlement?.expiresAt ?? '';
    const expiresLabel = formatDateLabel(expiresAt);
    const daysRemaining = Number(entitlement?.daysRemaining ?? 0);
    const active = Boolean(entitlement?.active && entitlement.status === 'active');
    const expired = Boolean(entitlement?.status === 'expired' || entitlement?.expired);
    const planId = normalizePlanId(entitlement?.planId ?? rawTier);
    const plan = PLAN_CONFIG[planId] ?? null;

    return {
      active,
      expired,
      status: entitlement?.status ?? 'none',
      planId,
      planLabel: plan?.label ?? rawEdition?.label ?? 'GameHub Lite',
      rawTier,
      effectiveTier: normalizeEditionId(entitlement?.effectiveTier ?? entitlement?.tier, EDITION_IDS.GAMEHUB_LITE),
      startsAt: entitlement?.startsAt ?? '',
      startsAtLabel: formatDateLabel(entitlement?.startsAt),
      expiresAt,
      expiresAtLabel: expiresLabel,
      daysRemaining,
      daysRemainingLabel: active ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining` : '',
      statusLabel: active
        ? `Active until ${expiresLabel || 'pass expiry'}`
        : expired
          ? `Pass expired${expiresLabel ? ` on ${expiresLabel}` : ''}`
          : 'No active premium pass',
      renewLabel: expired ? 'Renew to continue premium access' : 'Renew Pass'
    };
  }

  getCurrentEdition() {
    const demoEdition = this.getDemoOverrideEdition();

    if (demoEdition) {
      return demoEdition;
    }

    const backendEdition = this.getBackendEdition();

    if (backendEdition) {
      return backendEdition;
    }

    return this.getAccountOverride().edition || this.getBuildEdition();
  }

  getCurrentEntitlement() {
    const edition = this.getCurrentEdition();
    const editionConfig = EDITION_CONFIG[edition] ?? EDITION_CONFIG[EDITION_IDS.GAMEHUB_LITE];
    const demoOverrideEdition = this.getDemoOverrideEdition();
    const accountOverride = this.getAccountOverride();

    return {
      edition,
      editionConfig,
      label: editionConfig.label,
      shortLabel: editionConfig.shortLabel,
      badge: this.getEditionBadge(edition),
      planId: EDITION_TO_PLAN[edition] ?? '',
      upgradeTarget: this.getUpgradeTarget(),
      isStandalone: editionConfig.isStandalone,
      account: accountOverride,
      backend: {
        entitlement: this.backendEntitlement,
        active: Boolean(this.getBackendEdition()),
        error: this.backendEntitlementError,
        payment: this.backendPaymentStatus,
        refreshStatus: this.purchaseState.status === 'refreshing' ? 'refreshing' : 'idle',
        pass: this.getPassStatus()
      },
      purchase: this.getPurchaseState(),
      demo: {
        enabled: this.isDemoOverrideEnabled(),
        active: Boolean(demoOverrideEdition),
        overrideEdition: demoOverrideEdition,
        storageKey: DEMO_STORAGE_KEY,
        source: demoOverrideEdition ? 'demo' : accountOverride.active ? accountOverride.source : 'build'
      }
    };
  }

  hasFeature(featureKey) {
    const feature = this.getFeatureDefinition(featureKey);

    if (!feature || feature.status !== 'active') {
      return false;
    }

    return this.canAccessTier(feature.requiredEdition);
  }

  getPlayableFeatureState(featureKey) {
    const feature = this.getFeaturePreview(featureKey);

    if (!feature) {
      return {
        key: featureKey,
        canPlay: false,
        accessState: 'unavailable',
        accessLabel: ACCESS_STATE_LABELS.unavailable
      };
    }

    return {
      ...feature,
      canPlay: feature.hasFeature,
      accessState: feature.hasFeature ? 'playable' : feature.accessState,
      accessLabel: feature.hasFeature ? 'Playable' : feature.accessLabel
    };
  }

  canPlayPremiumCampaign() {
    return this.hasFeature(FEATURE_KEYS.premiumCampaign);
  }

  canPlayTournamentMode() {
    return this.hasFeature(FEATURE_KEYS.tournamentMode);
  }

  canAccessCampaignCup(cupOrCupId) {
    const cup = typeof cupOrCupId === 'string'
      ? CAMPAIGN_CUP_LOOKUP[cupOrCupId]
      : cupOrCupId;

    if (!cup || !this.canPlayPremiumCampaign()) {
      return false;
    }

    return this.canAccessTier(cup.requiredEdition);
  }

  canAccessTournamentType(typeOrTypeId) {
    const tournamentType = typeof typeOrTypeId === 'string'
      ? TOURNAMENT_TYPE_LOOKUP[typeOrTypeId]
      : typeOrTypeId;

    if (!tournamentType || tournamentType.status !== 'active' || !this.canPlayTournamentMode()) {
      return false;
    }

    return this.canAccessTier(tournamentType.requiredEdition);
  }

  canUseAdvancedGarage() {
    return this.hasFeature(FEATURE_KEYS.advancedGarage);
  }

  canUsePremiumCosmetics() {
    return this.hasFeature(FEATURE_KEYS.premiumCosmetics);
  }

  canUseOfflineShipUpgrades() {
    return this.hasFeature(FEATURE_KEYS.offlineShipUpgrades);
  }

  canUseReplayPhotoMode() {
    return this.hasFeature(FEATURE_KEYS.replayPhotoMode);
  }

  canUseFullReplayPhotoMode() {
    return this.canUseReplayPhotoMode() && this.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM);
  }

  canUseCustomRaceLab() {
    return this.hasFeature(FEATURE_KEYS.customRaceLab);
  }

  canUseFullCustomRaceLab() {
    return this.canUseCustomRaceLab() && this.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM);
  }

  canUseRankedSeasons() {
    return this.hasFeature(FEATURE_KEYS.rankedSeasons);
  }

  canUseFullRankedSeasons() {
    return this.canUseRankedSeasons() && this.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM);
  }

  canUseLiveEvents() {
    return this.hasFeature(FEATURE_KEYS.liveEvents);
  }

  canUseFullLiveEvents() {
    return this.canUseLiveEvents() && this.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM);
  }

  canUseBossRaceEvents() {
    return this.hasFeature(FEATURE_KEYS.bossRaceEvents);
  }

  canUseFullBossRaceEvents() {
    return this.canUseBossRaceEvents() && this.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM);
  }

  canAccessLiveEvent(event = null) {
    if (!event || event.status === 'upcoming' || !this.canUseLiveEvents()) {
      return false;
    }

    return this.canAccessTier(event.requiredEdition);
  }

  canAccessBossEvent(event = null) {
    if (!event || event.status !== 'active' || !this.canUseBossRaceEvents()) {
      return false;
    }

    return this.canAccessTier(event.requiredEdition);
  }

  canAccessAdvancedCosmetic(itemOrItemId) {
    const item = typeof itemOrItemId === 'string'
      ? ADVANCED_COSMETIC_LOOKUP[itemOrItemId]
      : itemOrItemId;

    if (!item || !this.canUsePremiumCosmetics()) {
      return false;
    }

    return this.canAccessTier(item.requiredEdition);
  }

  canAccessUpgradeModule(moduleOrModuleId) {
    const module = typeof moduleOrModuleId === 'string'
      ? UPGRADE_MODULE_LOOKUP[moduleOrModuleId]
      : moduleOrModuleId;

    if (!module || !this.canUseOfflineShipUpgrades()) {
      return false;
    }

    return this.canAccessTier(module.requiredEdition);
  }

  canAccessContentPack(packOrPackId) {
    const pack = typeof packOrPackId === 'string'
      ? PREMIUM_CONTENT_PACK_LOOKUP[packOrPackId]
      : packOrPackId;

    if (!pack) {
      return false;
    }

    return this.canAccessTier(pack.requiredEdition);
  }

  canAccessPremiumShip(ship = null) {
    const pack = getContentPackForItem(ship);
    return !pack || this.canAccessContentPack(pack);
  }

  canAccessPremiumTrack(track = null) {
    const pack = getContentPackForItem(track);

    if (!pack) {
      return true;
    }

    return track?.playable !== false && this.canAccessContentPack(pack);
  }

  getContentPackModels() {
    return PREMIUM_CONTENT_PACKS.map((pack) => decorateContentPack(pack, this));
  }

  getAdvancedGarageAccessState() {
    return {
      advancedGarage: this.getPlayableFeatureState(FEATURE_KEYS.advancedGarage),
      premiumCosmetics: this.getPlayableFeatureState(FEATURE_KEYS.premiumCosmetics),
      offlineShipUpgrades: this.getPlayableFeatureState(FEATURE_KEYS.offlineShipUpgrades)
    };
  }

  getReplayAccessState() {
    return {
      replayPhotoMode: this.getPlayableFeatureState(FEATURE_KEYS.replayPhotoMode),
      basic: this.canUseReplayPhotoMode(),
      full: this.canUseFullReplayPhotoMode()
    };
  }

  getCustomRaceLabAccessState() {
    return {
      customRaceLab: this.getPlayableFeatureState(FEATURE_KEYS.customRaceLab),
      basic: this.canUseCustomRaceLab(),
      full: this.canUseFullCustomRaceLab()
    };
  }

  getRewardGalleryAccessState() {
    return {
      premiumCosmetics: this.getPlayableFeatureState(FEATURE_KEYS.premiumCosmetics),
      basic: this.canUsePremiumCosmetics(),
      full: this.canAccessTier(EDITION_IDS.STANDALONE_FULL_PREMIUM)
    };
  }

  getRankedSeasonAccessState() {
    return {
      rankedSeasons: this.getPlayableFeatureState(FEATURE_KEYS.rankedSeasons),
      basic: this.canUseRankedSeasons(),
      full: this.canUseFullRankedSeasons(),
      fairPlayNote: MULTIPLAYER_FAIR_PLAY_POLICY.find((line) => line.includes('normalized')) ?? MULTIPLAYER_FAIR_PLAY_POLICY[0]
    };
  }

  getLiveEventsAccessState() {
    return {
      liveEvents: this.getPlayableFeatureState(FEATURE_KEYS.liveEvents),
      basic: this.canUseLiveEvents(),
      full: this.canUseFullLiveEvents()
    };
  }

  getBossRaceEventsAccessState() {
    return {
      bossRaceEvents: this.getPlayableFeatureState(FEATURE_KEYS.bossRaceEvents),
      basic: this.canUseBossRaceEvents(),
      full: this.canUseFullBossRaceEvents()
    };
  }

  canAccessTier(tier) {
    const requiredEdition = normalizeEditionId(tier, EDITION_IDS.GAMEHUB_LITE);
    return EDITION_RANK[this.getCurrentEdition()] >= EDITION_RANK[requiredEdition];
  }

  getPlanPrice(plan, region = 'global') {
    const planId = normalizePlanId(plan);

    if (!planId) {
      return null;
    }

    const regionConfig = PRICING_REGIONS[region] ?? PRICING_REGIONS.global;
    return createPriceView(regionConfig.plans[planId], regionConfig);
  }

  getPlanPriceRows(plan) {
    const planId = normalizePlanId(plan);

    if (!planId) {
      return [];
    }

    return Object.keys(PRICING_REGIONS)
      .map((region) => this.getPlanPrice(planId, region))
      .filter(Boolean);
  }

  getUpgradeTarget() {
    const currentIndex = EDITION_ORDER.indexOf(this.getCurrentEdition());
    const nextEdition = EDITION_ORDER[currentIndex + 1] ?? '';

    return nextEdition
      ? {
          editionId: nextEdition,
          planId: EDITION_TO_PLAN[nextEdition] ?? '',
          label: EDITION_CONFIG[nextEdition].label
        }
      : null;
  }

  isStandaloneBuild() {
    return this.getCurrentEdition() !== EDITION_IDS.GAMEHUB_LITE;
  }

  isGameHubLite() {
    return this.getCurrentEdition() === EDITION_IDS.GAMEHUB_LITE;
  }

  isEarlyAccess() {
    return this.getCurrentEdition() === EDITION_IDS.STANDALONE_EARLY_ACCESS;
  }

  isFullPremium() {
    return this.getCurrentEdition() === EDITION_IDS.STANDALONE_FULL_PREMIUM;
  }

  getEditionBadge(editionId = this.getCurrentEdition()) {
    const normalizedEdition = normalizeEditionId(editionId, EDITION_IDS.GAMEHUB_LITE);
    const edition = EDITION_CONFIG[normalizedEdition] ?? EDITION_CONFIG[EDITION_IDS.GAMEHUB_LITE];

    return {
      id: edition.id,
      label: edition.badge,
      shortLabel: edition.shortLabel,
      fullLabel: edition.label,
      tone: edition.badgeTone,
      iconLabel: edition.iconLabel,
      deck: edition.deck,
      active: normalizedEdition === this.getCurrentEdition()
    };
  }

  getAvailablePlans() {
    const purchaseAccess = this.getPurchaseAccessState();
    const currentEdition = this.getCurrentEdition();
    const passStatus = this.getPassStatus();
    return Object.values(PLAN_CONFIG).map((plan) => ({
      ...plan,
      edition: EDITION_CONFIG[plan.editionId],
      editionBadge: this.getEditionBadge(plan.editionId),
      durationLabel: `${plan.durationDays ?? 120} days access`,
      purchaseLabel: this.getPlanPurchaseLabel(plan, currentEdition, passStatus),
      globalPrice: this.getPlanPrice(plan.id, 'global'),
      regionalPrices: Object.keys(PRICING_REGIONS)
        .filter((region) => region !== 'global')
        .map((region) => this.getPlanPrice(plan.id, region))
        .filter(Boolean),
      priceRows: this.getPlanPriceRows(plan.id),
      purchaseDisabled: !purchaseAccess.canPurchase,
      purchaseBlockedReason: purchaseAccess.reason,
      paymentEnabled: this.isPaymentsEnabled()
    }));
  }

  getPlanPurchaseLabel(plan, currentEdition = this.getCurrentEdition(), passStatus = this.getPassStatus()) {
    if (passStatus.active && passStatus.rawTier === plan.editionId) {
      return plan.renewLabel ?? 'Renew Pass';
    }

    if (passStatus.expired && passStatus.rawTier === plan.editionId) {
      return 'Renew Pass';
    }

    if (currentEdition === EDITION_IDS.STANDALONE_EARLY_ACCESS && plan.editionId === EDITION_IDS.STANDALONE_FULL_PREMIUM) {
      return plan.upgradeFromLowerLabel ?? 'Upgrade to Full Premium Pass';
    }

    return plan.upgradeLabel;
  }

  isPaymentsEnabled() {
    return isFrontendPaymentsEnabled();
  }

  getPurchaseAccessState() {
    if (!this.isPaymentsEnabled()) {
      return {
        canPurchase: false,
        reason: 'Payment checkout is disabled for this build.'
      };
    }

    if (!getRazorpayKeyId()) {
      return {
        canPurchase: false,
        reason: 'Payment checkout is not configured.'
      };
    }

    if (!this.accountContext || this.accountContext.provider !== 'google' || this.accountContext.isAnonymous) {
      return {
        canPurchase: false,
        reason: DEFAULT_PURCHASE_MESSAGE
      };
    }

    return {
      canPurchase: true,
      reason: ''
    };
  }

  getPurchaseState() {
    return {
      ...this.purchaseState,
      paymentsEnabled: this.isPaymentsEnabled(),
      access: this.getPurchaseAccessState(),
      backendPayment: this.backendPaymentStatus
    };
  }

  async fetchBackend(path, { method = 'GET', body = null, authToken = '' } = {}) {
    const url = `${getApiBaseUrl()}${path}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (!authToken && import.meta.env.DEV && this.accountContext?.uid) {
      headers['x-dev-user-id'] = this.accountContext.uid;
      headers['x-dev-provider'] = this.accountContext.provider || 'local-dev';
      headers['x-dev-email'] = this.accountContext.email || '';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || `Backend request failed (${response.status}).`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async refreshBackendEntitlement(authToken = '') {
    this.purchaseState = {
      status: 'refreshing',
      message: 'Refreshing backend entitlement...'
    };

    try {
      const payload = await this.fetchBackend('/api/entitlements/refresh', {
        method: 'POST',
        authToken
      });
      this.backendEntitlement = payload.entitlement ?? null;
      this.backendEntitlementError = '';
      this.backendPaymentStatus = {
        ...this.backendPaymentStatus,
        ...(payload.payment ?? {})
      };
      this.purchaseState = {
        status: 'idle',
        message: 'Backend entitlement refreshed.'
      };
      return {
        ok: true,
        entitlement: this.getCurrentEntitlement(),
        message: 'Backend entitlement refreshed.'
      };
    } catch (error) {
      if (error?.payload?.payment) {
        this.backendPaymentStatus = {
          ...this.backendPaymentStatus,
          ...error.payload.payment
        };
      }

      if (!import.meta.env.DEV && !this.isDemoOverrideEnabled()) {
        this.backendEntitlement = null;
      }

      this.backendEntitlementError = error?.message ?? 'Backend entitlement refresh failed.';
      this.purchaseState = {
        status: 'error',
        message: this.backendEntitlementError
      };
      return {
        ok: false,
        entitlement: this.getCurrentEntitlement(),
        message: this.backendEntitlementError
      };
    }
  }

  loadRazorpayCheckout() {
    if (window.Razorpay) {
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_URL}"]`);

      if (existing) {
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => reject(new Error('Razorpay Checkout could not load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT_URL;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Razorpay Checkout could not load.'));
      document.head.appendChild(script);
    });
  }

  async startPurchase(planId, { authToken = '' } = {}) {
    const normalizedPlanId = normalizePlanId(planId);
    const plan = PLAN_CONFIG[normalizedPlanId] ?? null;

    if (!plan) {
      return {
        ok: false,
        status: 'unknown-plan',
        planId: normalizedPlanId,
        plan,
        message: 'Unknown premium plan. No entitlement was changed.'
      };
    }

    const purchaseAccess = this.getPurchaseAccessState();

    if (!purchaseAccess.canPurchase) {
      this.purchaseState = {
        status: 'blocked',
        message: purchaseAccess.reason
      };
      return {
        ok: false,
        status: 'blocked',
        planId: normalizedPlanId,
        plan,
        message: purchaseAccess.reason
      };
    }

    if (!authToken && !import.meta.env.DEV) {
      const message = 'Sign in with Google to purchase and keep your premium access.';
      this.purchaseState = {
        status: 'blocked',
        message
      };
      return {
        ok: false,
        status: 'blocked',
        planId: normalizedPlanId,
        plan,
        message
      };
    }

    this.purchaseState = {
      status: 'creating-order',
      message: `Creating ${plan.label} payment order...`
    };

    try {
      const orderPayload = await this.fetchBackend('/api/payments/razorpay/create-order', {
        method: 'POST',
        authToken,
        body: {
          planId: normalizedPlanId
        }
      });
      this.backendPaymentStatus = {
        ...this.backendPaymentStatus,
        ...(orderPayload.payment ?? {})
      };

      await this.loadRazorpayCheckout();

      this.purchaseState = {
        status: 'checkout-open',
        message: 'Razorpay Checkout is open. Pass access starts only after backend verification.'
      };

      const verificationPayload = await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: orderPayload.order.keyId || getRazorpayKeyId(),
          amount: orderPayload.order.amount,
          currency: orderPayload.order.currency,
          name: '3D Spaceship Race',
          description: orderPayload.order.planLabel,
          order_id: orderPayload.order.id,
          prefill: {
            name: this.accountContext?.displayName || '',
            email: this.accountContext?.email || ''
          },
          theme: {
            color: '#68e8ff'
          },
          handler: resolve,
          modal: {
            ondismiss: () => reject(new Error('Checkout closed. No entitlement was granted.'))
          }
        });
        checkout.open();
      });

      this.purchaseState = {
        status: 'verifying',
        message: 'Verifying payment with backend...'
      };

      const verified = await this.fetchBackend('/api/payments/razorpay/verify', {
        method: 'POST',
        authToken,
        body: verificationPayload
      });
      this.backendEntitlement = verified.entitlement ?? null;
      this.backendEntitlementError = '';
      this.purchaseState = {
        status: 'verified',
        message: verified.message || `${plan.label} verified by backend.`
      };

      return {
        ok: true,
        status: 'verified',
        planId: normalizedPlanId,
        plan,
        entitlement: this.getCurrentEntitlement(),
        message: this.purchaseState.message
      };
    } catch (error) {
      if (error?.payload?.payment) {
        this.backendPaymentStatus = {
          ...this.backendPaymentStatus,
          ...error.payload.payment
        };
      }

      const message = error?.message ?? 'Payment could not be completed.';
      this.purchaseState = {
        status: 'error',
        message
      };
      return {
        ok: false,
        status: 'error',
        planId: normalizedPlanId,
        plan,
        message
      };
    }
  }

  async refreshEntitlement(authToken = '') {
    return this.refreshBackendEntitlement(authToken);
  }

  mockGrantEntitlement(planId) {
    if (!this.isDemoOverrideEnabled()) {
      return {
        ok: false,
        message: 'Demo entitlement override is disabled for this build.'
      };
    }

    const normalizedPlanId = normalizePlanId(planId);
    const plan = PLAN_CONFIG[normalizedPlanId] ?? null;

    if (!plan) {
      return {
        ok: false,
        message: 'Unknown demo plan.'
      };
    }

    return this.setDemoEdition(plan.editionId);
  }

  setDemoEdition(editionId) {
    if (!this.isDemoOverrideEnabled()) {
      return {
        ok: false,
        message: 'Demo entitlement override is disabled for this build.'
      };
    }

    const normalizedEdition = normalizeEditionId(editionId, '');

    if (!normalizedEdition || !EDITION_CONFIG[normalizedEdition]) {
      return {
        ok: false,
        message: 'Unknown demo edition.'
      };
    }

    this.storage.setItem(DEMO_STORAGE_KEY, normalizedEdition);
    return {
      ok: true,
      edition: normalizedEdition,
      entitlement: this.getCurrentEntitlement(),
      message: `Demo edition set to ${EDITION_CONFIG[normalizedEdition].label}. This is not a purchase.`
    };
  }

  clearDemoEdition() {
    if (!this.isDemoOverrideEnabled()) {
      return {
        ok: false,
        message: 'Demo entitlement override is disabled for this build.'
      };
    }

    this.storage.removeItem(DEMO_STORAGE_KEY);
    return {
      ok: true,
      entitlement: this.getCurrentEntitlement(),
      message: 'Demo entitlement override cleared. Using the configured build default.'
    };
  }

  getDemoState() {
    const entitlement = this.getCurrentEntitlement();
    const buildEdition = this.getBuildEdition();

    return {
      ...entitlement.demo,
      currentEdition: entitlement.edition,
      buildEdition,
      buildEditionLabel: EDITION_CONFIG[buildEdition].label,
      canClear: entitlement.demo.active,
      options: EDITION_ORDER.map((editionId) => ({
        id: editionId,
        label: EDITION_CONFIG[editionId].label,
        badge: this.getEditionBadge(editionId)
      }))
    };
  }

  getEditionComparison() {
    return EDITION_ORDER.map((editionId) => ({
      ...EDITION_CONFIG[editionId],
      badgeView: this.getEditionBadge(editionId),
      active: editionId === this.getCurrentEdition(),
      accessible: this.canAccessTier(editionId)
    }));
  }

  getFeatureDefinition(featureKey) {
    return FEATURE_DEFINITIONS.find((entry) => entry.key === featureKey) ?? null;
  }

  getFeaturePreview(featureKey) {
    const feature = this.getFeatureDefinition(featureKey);

    if (!feature) {
      return null;
    }

    return this.decorateFeature(feature);
  }

  getFeaturePreviews() {
    return FEATURE_DEFINITIONS.map((feature) => this.decorateFeature(feature));
  }

  getPreviewHubCards() {
    return PREMIUM_PREVIEW_HUB
      .map((entry) => {
        const feature = this.getFeatureDefinition(entry.featureKey);

        if (!feature) {
          return null;
        }

        return this.decorateFeature(feature, {
          hubId: entry.id,
          hubTitle: entry.title,
          hubSummary: entry.summary
        });
      })
      .filter(Boolean);
  }

  getPremiumRoadmap() {
    return Object.values(PREMIUM_ROADMAP).map((entry) => ({
      ...entry,
      edition: EDITION_CONFIG[entry.editionId],
      badge: this.getEditionBadge(entry.editionId),
      active: this.getCurrentEdition() === entry.editionId,
      accessible: this.canAccessTier(entry.editionId)
    }));
  }

  getSelectedPreview(previewId = '') {
    const requestedId = String(previewId ?? '').trim() || FEATURE_KEYS.premiumCampaign;
    const hubEntry = PREMIUM_PREVIEW_HUB.find((entry) => entry.id === requestedId);
    const featureKey = hubEntry?.featureKey ?? requestedId;
    const feature = this.getFeaturePreview(featureKey);

    if (feature) {
      return {
        type: 'feature',
        id: feature.key,
        key: feature.key,
        title: hubEntry?.title ?? feature.title,
        iconLabel: feature.iconLabel,
        description: hubEntry?.summary ?? feature.description,
        detail: feature.description,
        phaseLabel: feature.phaseLabel,
        requiredEditionLabel: feature.requiredEditionLabel,
        requiredEditionBadge: feature.requiredEditionBadge,
        accessLabel: feature.accessLabel,
        accessState: feature.accessState,
        upgradePlanId: feature.upgradePlanId,
        upgradeLabel: feature.upgradeLabel,
        priceRows: feature.priceRows,
        bullets: [
          `Required edition: ${feature.requiredEditionLabel}`,
          feature.accessLabel,
          feature.phaseLabel
        ]
      };
    }

    const planId = normalizePlanId(requestedId);

    if (planId) {
      return this.createPlanPreview(planId);
    }

    const editionId = normalizeEditionId(requestedId, '');

    if (editionId) {
      return this.createEditionPreview(editionId);
    }

    return {
      type: 'fallback',
      id: requestedId,
      key: requestedId,
      title: 'Premium Preview',
      iconLabel: 'SAFE',
      description: 'This preview target is not available yet. No unfinished gameplay screen was opened.',
      detail: 'Use the Premium tab previews to inspect planned standalone features safely.',
      phaseLabel: 'Safe preview',
      requiredEditionLabel: EDITION_CONFIG[EDITION_IDS.GAMEHUB_LITE].label,
      requiredEditionBadge: this.getEditionBadge(EDITION_IDS.GAMEHUB_LITE),
      accessLabel: ACCESS_STATE_LABELS.unavailable,
      accessState: 'unavailable',
      upgradePlanId: this.getUpgradeTarget()?.planId ?? '',
      upgradeLabel: this.getUpgradeTarget()?.planId
        ? this.getPlanPurchaseLabel(PLAN_CONFIG[this.getUpgradeTarget().planId])
        : 'Current Plan',
      priceRows: [],
      bullets: ['Safe fallback', 'No route opened', 'No entitlement changed']
    };
  }

  createPlanPreview(planId) {
    const normalizedPlanId = normalizePlanId(planId);
    const plan = PLAN_CONFIG[normalizedPlanId] ?? null;

    if (!plan) {
      return this.getSelectedPreview('');
    }

    const editionPreview = this.createEditionPreview(plan.editionId);

    return {
      ...editionPreview,
      type: 'plan',
      id: plan.id,
      key: plan.id,
      title: plan.label,
      description: plan.description,
      detail: 'Razorpay checkout opens through the backend. Pass access starts only after backend payment verification.',
      phaseLabel: `${plan.durationDays ?? 120}-day access pass`,
      upgradePlanId: plan.id,
      upgradeLabel: this.getPlanPurchaseLabel(plan)
    };
  }

  createEditionPreview(editionId) {
    const normalizedEdition = normalizeEditionId(editionId, EDITION_IDS.GAMEHUB_LITE);
    const edition = EDITION_CONFIG[normalizedEdition] ?? EDITION_CONFIG[EDITION_IDS.GAMEHUB_LITE];
    const planId = EDITION_TO_PLAN[normalizedEdition] ?? '';
    const active = normalizedEdition === this.getCurrentEdition();
    const included = this.canAccessTier(normalizedEdition);
    const accessState = active ? 'current' : included ? 'included' : 'locked';

    return {
      type: 'edition',
      id: normalizedEdition,
      key: normalizedEdition,
      title: edition.label,
      iconLabel: edition.iconLabel,
      description: edition.description,
      detail: edition.deck,
      phaseLabel: planId ? 'Standalone preview' : 'Available now',
      requiredEditionLabel: edition.label,
      requiredEditionBadge: this.getEditionBadge(normalizedEdition),
      accessLabel: active
        ? ACCESS_STATE_LABELS.current
        : included
          ? 'Included in current tier'
          : `Requires ${edition.label}`,
      accessState,
      upgradePlanId: active || included ? '' : planId,
      upgradeLabel: planId ? this.getPlanPurchaseLabel(PLAN_CONFIG[planId]) : 'Current Plan',
      priceRows: planId
        ? this.getPlanPriceRows(planId)
        : [{ region: 'global', regionLabel: 'Global', currency: '', display: 'Free' }],
      bullets: edition.comparisonFeatures
    };
  }

  getFairPlayPolicy() {
    return [...MULTIPLAYER_FAIR_PLAY_POLICY];
  }

  getSoftRegionHint() {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.toLowerCase().endsWith('-in') ? 'IN' : 'global';
  }

  applyDemoQueryOverride() {
    if (!this.isDemoOverrideEnabled()) {
      return;
    }

    const url = new URL(this.location.href);
    const requestedEdition = url.searchParams.get(DEMO_QUERY_PARAM);
    const normalizedEdition = normalizeEditionId(requestedEdition, '');

    if (normalizedEdition) {
      this.storage.setItem(DEMO_STORAGE_KEY, normalizedEdition);
    }
  }

  decorateFeature(feature, overrides = {}) {
    const requiredEdition = EDITION_CONFIG[feature.requiredEdition] ?? EDITION_CONFIG[EDITION_IDS.GAMEHUB_LITE];
    const upgradePlanId = EDITION_TO_PLAN[feature.requiredEdition] ?? '';
    const includedInCurrentTier = this.canAccessTier(feature.requiredEdition);
    const hasFeature = this.hasFeature(feature.key);
    const accessState = hasFeature
      ? 'active'
      : includedInCurrentTier
        ? 'included-future'
        : 'locked';

    return {
      ...feature,
      ...overrides,
      displayTitle: overrides.hubTitle ?? feature.title,
      displaySummary: overrides.hubSummary ?? feature.description,
      requiredEditionLabel: requiredEdition.label,
      requiredEditionBadge: this.getEditionBadge(feature.requiredEdition),
      hasFeature,
      includedInCurrentTier,
      accessState,
      accessLabel: hasFeature
        ? 'Playable'
        : includedInCurrentTier
          ? ACCESS_STATE_LABELS.includedFuture
          : `${ACCESS_STATE_LABELS.locked}: requires ${requiredEdition.shortLabel}`,
      upgradePlanId,
      upgradeLabel: upgradePlanId
        ? this.getPlanPurchaseLabel(PLAN_CONFIG[upgradePlanId])
        : 'Current Plan',
      priceRows: upgradePlanId ? this.getPlanPriceRows(upgradePlanId) : []
    };
  }
}
