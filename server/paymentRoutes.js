import crypto from 'node:crypto';
import express from 'express';
import {
  EDITION_CONFIG,
  EDITION_IDS,
  PLAN_CONFIG,
  PREMIUM_PASS_DURATION_DAYS,
  PRICING_REGIONS,
  normalizePlanId
} from '../src/game/editionConfig.js';
import { verifyPlayerToken } from './firebaseAdmin.js';
import { createPaymentEntitlementStore } from './paymentEntitlementStore.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const LOCAL_DEV_USER_HEADER = 'x-dev-user-id';
const LOCAL_DEV_PROVIDER_HEADER = 'x-dev-provider';
const LOCAL_DEV_EMAIL_HEADER = 'x-dev-email';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function getPaymentEnv() {
  return String(process.env.PAYMENT_ENV ?? 'test').toLowerCase() === 'live' ? 'live' : 'test';
}

function isEnabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function getPaymentSetup({ production }) {
  const enablePayments = isEnabled(process.env.ENABLE_PAYMENTS);
  const enableBackendEntitlements = isEnabled(process.env.ENABLE_BACKEND_ENTITLEMENTS);
  const keyId = String(process.env.RAZORPAY_KEY_ID ?? '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET ?? '').trim();
  const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();
  const missingSecrets = [
    ['RAZORPAY_KEY_ID', keyId],
    ['RAZORPAY_KEY_SECRET', keySecret],
    ['RAZORPAY_WEBHOOK_SECRET', webhookSecret]
  ].filter(([, value]) => !value).map(([key]) => key);
  const ready = enablePayments && enableBackendEntitlements && missingSecrets.length === 0;

  return {
    enablePayments,
    enableBackendEntitlements,
    keyId,
    keySecret,
    webhookSecret,
    paymentEnv: getPaymentEnv(),
    legacyPassMigrationEnabled: isEnabled(process.env.ENABLE_LEGACY_PASS_MIGRATION),
    missingSecrets,
    ready,
    production,
    setupError: production && enablePayments && missingSecrets.length > 0
      ? `Payment setup error: missing ${missingSecrets.join(', ')}. Razorpay endpoints will fail safely.`
      : ''
  };
}

function safePaymentStatus(setup) {
  return {
    enabled: setup.enablePayments,
    backendEntitlements: setup.enableBackendEntitlements,
    ready: setup.ready,
    environment: setup.paymentEnv,
    missingPublicSetup: setup.missingSecrets.includes('RAZORPAY_KEY_ID'),
    setupError: setup.setupError ? 'Payment provider is not fully configured.' : ''
  };
}

function rejectPayment(response, status, message, extra = {}) {
  response.status(status).json({
    ok: false,
    message,
    ...extra
  });
}

function planToEdition(planId) {
  const plan = PLAN_CONFIG[planId] ?? null;
  return plan?.editionId && EDITION_CONFIG[plan.editionId] ? plan.editionId : '';
}

function getPlanAmount(planId) {
  const configuredPrice = PRICING_REGIONS.IN.plans[planId] ?? null;
  return Number(configuredPrice?.amount ?? 0);
}

function getPlanDurationDays(planId) {
  return Math.max(1, Math.floor(Number(PLAN_CONFIG[planId]?.durationDays ?? PREMIUM_PASS_DURATION_DAYS)));
}

function sanitizePlanId(value) {
  return normalizePlanId(value);
}

function getTierRank(tier) {
  if (tier === EDITION_IDS.STANDALONE_FULL_PREMIUM) {
    return 2;
  }

  if (tier === EDITION_IDS.STANDALONE_EARLY_ACCESS) {
    return 1;
  }

  return 0;
}

function isPaidTier(tier) {
  return getTierRank(tier) > 0;
}

function parseTime(value) {
  const time = new Date(value ?? '').getTime();
  return Number.isFinite(time) ? time : 0;
}

function addDaysIso(baseTime, days) {
  return new Date(baseTime + (Math.max(1, Math.floor(Number(days) || 1)) * MS_PER_DAY)).toISOString();
}

function daysRemaining(expiresAt, nowMs = Date.now()) {
  const expiresMs = parseTime(expiresAt);
  if (!expiresMs) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiresMs - nowMs) / MS_PER_DAY));
}

function createBasicAuth(keyId, keySecret) {
  return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

function createReceipt(userId, planId) {
  const userPart = String(userId ?? 'user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'user';
  return `sr_${planId.replace(/[^a-z0-9]/gi, '')}_${userPart}_${Date.now().toString(36)}`.slice(0, 40);
}

function verifySignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(String(signature), 'utf8');

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function readRazorpayPayment(paymentId, setup) {
  const response = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Basic ${createBasicAuth(setup.keyId, setup.keySecret)}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function createRazorpayOrder({ amountInRupees, currency, receipt, notes }, setup) {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${createBasicAuth(setup.keyId, setup.keySecret)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountInRupees * 100,
      currency,
      receipt,
      notes
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const description = payload?.error?.description || 'Razorpay order creation failed.';
    throw new Error(description);
  }

  return payload;
}

async function authenticateHttpRequest(request, { firebaseAdminStatus, production, allowLocalDevAuth = false }) {
  const authHeader = String(request.headers.authorization ?? '').trim();
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (firebaseAdminStatus.enabled) {
    if (!token) {
      return { ok: false, status: 401, message: 'Sign in with Google to purchase and keep your premium access.' };
    }

    const decoded = await verifyPlayerToken(token);
    const provider = decoded.firebase?.sign_in_provider ?? '';
    return {
      ok: true,
      user: {
        userId: decoded.uid,
        provider,
        email: decoded.email ?? '',
        isGoogle: provider === 'google.com',
        verified: true
      }
    };
  }

  if (production || !allowLocalDevAuth) {
    return { ok: false, status: 503, message: 'Backend entitlement verification is not configured.' };
  }

  const devUserId = String(request.headers[LOCAL_DEV_USER_HEADER] ?? request.body?.devUserId ?? '').trim();

  if (!devUserId) {
    return { ok: false, status: 401, message: 'Missing local development user identity.' };
  }

  return {
    ok: true,
    user: {
      userId: devUserId,
      provider: String(request.headers[LOCAL_DEV_PROVIDER_HEADER] ?? 'local-dev'),
      email: String(request.headers[LOCAL_DEV_EMAIL_HEADER] ?? ''),
      isGoogle: true,
      verified: false
    }
  };
}

function publicEntitlement(record = null, { nowMs = Date.now() } = {}) {
  if (!record) {
    return {
      tier: EDITION_IDS.GAMEHUB_LITE,
      effectiveTier: EDITION_IDS.GAMEHUB_LITE,
      rawTier: EDITION_IDS.GAMEHUB_LITE,
      status: 'none',
      source: '',
      planId: '',
      active: false,
      daysRemaining: 0
    };
  }

  const rawTier = record.tier && EDITION_CONFIG[record.tier]
    ? record.tier
    : EDITION_IDS.GAMEHUB_LITE;
  const status = String(record.status ?? '').trim() || 'none';
  const expiresMs = parseTime(record.expiresAt);
  const missingPassExpiry = isPaidTier(rawTier) && status === 'active' && !expiresMs;
  const expired = status === 'active' && expiresMs > 0 && expiresMs <= nowMs;
  const active = status === 'active' && isPaidTier(rawTier) && expiresMs > nowMs;
  const effectiveStatus = missingPassExpiry || expired ? 'expired' : status;
  const effectiveTier = active ? rawTier : EDITION_IDS.GAMEHUB_LITE;

  return {
    tier: effectiveTier,
    effectiveTier,
    rawTier,
    status: effectiveStatus,
    source: record.source ?? '',
    planId: record.planId ?? '',
    grantedAt: record.grantedAt ?? '',
    startsAt: record.startsAt ?? record.grantedAt ?? '',
    expiresAt: record.expiresAt ?? '',
    durationDays: Number(record.durationDays ?? PLAN_CONFIG[sanitizePlanId(record.planId)]?.durationDays ?? 0) || 0,
    updatedAt: record.updatedAt ?? '',
    paymentRecordId: record.paymentRecordId ?? '',
    active,
    expired: effectiveStatus === 'expired',
    daysRemaining: active ? daysRemaining(record.expiresAt, nowMs) : 0,
    legacyNeedsMigration: missingPassExpiry
  };
}

async function readEffectiveEntitlement({ store, userId, allowLegacyMigration = false }) {
  const existing = await store.getEntitlement(userId);

  if (
    allowLegacyMigration &&
    existing?.status === 'active' &&
    isPaidTier(existing.tier) &&
    !parseTime(existing.expiresAt)
  ) {
    const now = nowIso();
    const durationDays = getPlanDurationDays(existing.planId);
    const migrated = await store.saveEntitlement({
      ...existing,
      startsAt: now,
      expiresAt: addDaysIso(Date.parse(now), durationDays),
      durationDays,
      status: 'active',
      migrationSource: 'legacy-pass-migration',
      migratedAt: now
    });
    return {
      record: migrated,
      public: publicEntitlement(migrated)
    };
  }

  const view = publicEntitlement(existing);

  if (existing?.status === 'active' && view.status === 'expired' && parseTime(existing.expiresAt)) {
    const expired = await store.saveEntitlement({
      ...existing,
      status: 'expired',
      expiredAt: existing.expiredAt ?? nowIso()
    });
    return {
      record: expired,
      public: publicEntitlement(expired)
    };
  }

  return {
    record: existing,
    public: view
  };
}

export async function resolveEffectiveEntitlement(store, userId, { allowLegacyMigration = false } = {}) {
  if (!store || !userId) {
    return publicEntitlement(null);
  }

  const result = await readEffectiveEntitlement({
    store,
    userId,
    allowLegacyMigration
  });

  return result.public;
}

async function markEntitlementFromPayment({ store, paymentRecord, status }) {
  if (!paymentRecord?.userId) {
    return null;
  }

  const existing = await store.getEntitlement(paymentRecord.userId);

  if (existing?.paymentRecordId !== paymentRecord.id) {
    return existing;
  }

  return store.saveEntitlement({
    ...existing,
    status,
    updatedAt: nowIso(),
    lastSource: paymentRecord.source ?? existing.lastSource
  });
}

async function grantEntitlement({ store, paymentRecord, source }) {
  const alreadyApplied = Boolean(paymentRecord.entitlementAppliedAt);
  const existing = await store.getEntitlement(paymentRecord.userId);
  const normalizedPlanId = sanitizePlanId(paymentRecord.planId);
  const paymentTier = paymentRecord.tier && EDITION_CONFIG[paymentRecord.tier]
    ? paymentRecord.tier
    : planToEdition(normalizedPlanId);

  if (!normalizedPlanId || !paymentTier) {
    throw new Error('Cannot grant entitlement for an unknown premium pass plan.');
  }

  if (alreadyApplied && existing) {
    return existing;
  }

  if (existing?.paymentRecordId === paymentRecord.id) {
    return existing;
  }

  const existingView = publicEntitlement(existing);
  const nextRank = getTierRank(paymentTier);
  const existingRank = getTierRank(existingView.effectiveTier);

  if (existingView.active && existingRank > nextRank) {
    return existing;
  }

  const now = nowIso();
  const nowMs = Date.parse(now);
  const durationDays = Number(paymentRecord.durationDays ?? getPlanDurationDays(normalizedPlanId));
  const sameTierRenewal = existingView.active && existingView.rawTier === paymentTier;
  const startsAt = sameTierRenewal
    ? (existing?.startsAt ?? existing?.grantedAt ?? now)
    : now;
  const baseTime = sameTierRenewal
    ? Math.max(nowMs, parseTime(existing?.expiresAt))
    : nowMs;
  const entitlement = {
    userId: paymentRecord.userId,
    tier: paymentTier,
    source: 'razorpay',
    status: 'active',
    grantedAt: existing?.grantedAt ?? now,
    startsAt,
    expiresAt: addDaysIso(baseTime, durationDays),
    durationDays,
    updatedAt: now,
    paymentRecordId: paymentRecord.id,
    planId: normalizedPlanId,
    lastSource: source
  };
  const saved = await store.saveEntitlement(entitlement);

  await store.savePaymentRecord({
    ...paymentRecord,
    entitlementAppliedAt: paymentRecord.entitlementAppliedAt ?? now,
    entitlementExpiresAt: saved.expiresAt,
    entitlementTier: saved.tier
  });

  return saved;
}

export function installPaymentRoutes(app, {
  stateFile,
  firebaseAdminStatus,
  production = false,
  allowLocalDevAuth = false
} = {}) {
  const setup = getPaymentSetup({ production });
  const store = createPaymentEntitlementStore({ stateFile, production });

  if (production && !store.enabled) {
    setup.ready = false;
    setup.setupError = setup.setupError || 'Payment setup error: backend entitlement storage is not configured. Razorpay endpoints will fail safely.';
  }

  if (setup.setupError) {
    console.error(setup.setupError);
  }

  app.post('/api/payments/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (request, response) => {
    if (!setup.ready) {
      rejectPayment(response, 503, 'Payment provider is not configured.', { payment: safePaymentStatus(setup) });
      return;
    }

    const signature = String(request.headers['x-razorpay-signature'] ?? '');
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from('');

    if (!verifySignature(rawBody, signature, setup.webhookSecret)) {
      rejectPayment(response, 400, 'Invalid webhook signature.');
      return;
    }

    let event;

    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      rejectPayment(response, 400, 'Webhook payload is not valid JSON.');
      return;
    }
    const eventName = String(event?.event ?? '');
    const refund = event?.payload?.refund?.entity ?? null;
    const payment = event?.payload?.payment?.entity ?? null;
    const orderId = payment?.order_id ?? '';

    if (eventName.includes('refund') && refund?.payment_id) {
      const refundRecord = await store.getPaymentByPaymentId(refund.payment_id);

      if (!refundRecord) {
        response.json({ ok: true, reconciled: false });
        return;
      }

      const nextRecord = await store.savePaymentRecord({
        ...refundRecord,
        status: 'refunded',
        refundedAt: nowIso(),
        source: 'webhook',
        webhookEvent: eventName
      });
      await markEntitlementFromPayment({ store, paymentRecord: nextRecord, status: 'refunded' });
      response.json({ ok: true, reconciled: true });
      return;
    }

    if (!payment || !orderId) {
      response.json({ ok: true, ignored: true });
      return;
    }

    const record = await store.getPaymentByOrderId(orderId);

    if (!record) {
      await store.savePaymentRecord({
        id: orderId,
        userId: '',
        planId: '',
        tier: EDITION_IDS.GAMEHUB_LITE,
        amount: Number(payment.amount ?? 0) / 100,
        currency: payment.currency ?? 'INR',
        razorpayOrderId: orderId,
        razorpayPaymentId: payment.id ?? '',
        status: payment.status === 'captured' ? 'captured-unmatched' : payment.status,
        source: 'webhook',
        environment: setup.paymentEnv,
        createdAt: nowIso(),
        webhookEvent: event.event ?? ''
      });
      response.json({ ok: true, reconciled: false });
      return;
    }

    const nextRecord = await store.savePaymentRecord({
      ...record,
      razorpayPaymentId: payment.id ?? record.razorpayPaymentId,
      status: payment.status === 'captured' ? 'verified' : payment.status,
      verifiedAt: payment.status === 'captured' ? (record.verifiedAt ?? nowIso()) : record.verifiedAt,
      source: 'webhook',
      webhookEvent: eventName
    });

    if (payment.status === 'captured' && nextRecord.userId && nextRecord.planId) {
      await grantEntitlement({ store, paymentRecord: nextRecord, source: 'webhook' });
    } else if (['refunded', 'failed'].includes(payment.status)) {
      await markEntitlementFromPayment({
        store,
        paymentRecord: nextRecord,
        status: payment.status === 'refunded' ? 'refunded' : 'revoked'
      });
    }

    response.json({ ok: true, reconciled: true });
  });

  app.use(express.json({ limit: '1mb' }));

  async function respondWithCurrentEntitlement(request, response) {
    let auth;

    try {
      auth = await authenticateHttpRequest(request, { firebaseAdminStatus, production, allowLocalDevAuth });
    } catch {
      rejectPayment(response, 401, 'Could not verify identity.');
      return;
    }

    if (!auth.ok) {
      response.status(auth.status).json({
        ok: false,
        entitlement: publicEntitlement(null),
        message: auth.message,
        payment: safePaymentStatus(setup)
      });
      return;
    }

    if (production && !store.enabled) {
      response.json({
        ok: true,
        user: {
          userId: auth.user.userId,
          provider: auth.user.provider,
          email: auth.user.email,
          googleLinked: auth.user.isGoogle
        },
        entitlement: publicEntitlement(null),
        message: 'Backend entitlement storage is not configured. Paid access is unavailable.',
        payment: safePaymentStatus(setup)
      });
      return;
    }

    const entitlement = await readEffectiveEntitlement({
      store,
      userId: auth.user.userId,
      allowLegacyMigration: setup.legacyPassMigrationEnabled
    });
    response.json({
      ok: true,
      user: {
        userId: auth.user.userId,
        provider: auth.user.provider,
        email: auth.user.email,
        googleLinked: auth.user.isGoogle
      },
      entitlement: entitlement.public,
      payment: safePaymentStatus(setup)
    });
  }

  app.get('/api/entitlements/me', respondWithCurrentEntitlement);

  app.post('/api/entitlements/refresh', respondWithCurrentEntitlement);

  app.post('/api/payments/razorpay/create-order', async (request, response) => {
    if (!setup.ready) {
      rejectPayment(response, 503, setup.setupError || 'Payment provider is not configured.', { payment: safePaymentStatus(setup) });
      return;
    }

    let auth;

    try {
      auth = await authenticateHttpRequest(request, { firebaseAdminStatus, production, allowLocalDevAuth });
    } catch {
      rejectPayment(response, 401, 'Could not verify identity.');
      return;
    }

    if (!auth.ok) {
      rejectPayment(response, auth.status, auth.message);
      return;
    }

    if (!auth.user.isGoogle) {
      rejectPayment(response, 403, 'Sign in with Google to purchase and keep your premium access.');
      return;
    }

    const planId = sanitizePlanId(request.body?.planId);
    const tier = planToEdition(planId);
    const amount = getPlanAmount(planId);
    const durationDays = getPlanDurationDays(planId);

    if (!planId || !tier || !amount) {
      rejectPayment(response, 400, 'Unknown premium plan.');
      return;
    }

    const current = await readEffectiveEntitlement({
      store,
      userId: auth.user.userId,
      allowLegacyMigration: setup.legacyPassMigrationEnabled
    });

    if (current.public.active && getTierRank(current.public.effectiveTier) > getTierRank(tier)) {
      rejectPayment(response, 409, 'Full Premium Pass is already active. Renew the Full Premium Pass to keep premium access.');
      return;
    }

    const currency = PRICING_REGIONS.IN.currency;
    const receipt = createReceipt(auth.user.userId, planId);
    let order;

    try {
      order = await createRazorpayOrder({
        amountInRupees: amount,
        currency,
        receipt,
        notes: {
          userId: auth.user.userId,
          planId,
          tier,
          durationDays,
          app: 'spaceship-race'
        }
      }, setup);
    } catch (error) {
      rejectPayment(response, 502, error?.message ?? 'Could not create Razorpay order.');
      return;
    }

    const record = await store.savePaymentRecord({
      id: order.id,
      userId: auth.user.userId,
      planId,
      tier,
      durationDays,
      amount,
      currency,
      amountPaise: amount * 100,
      razorpayOrderId: order.id,
      razorpayPaymentId: '',
      status: 'created',
      createdAt: nowIso(),
      verifiedAt: '',
      source: 'checkout',
      environment: setup.paymentEnv
    });

    response.json({
      ok: true,
      order: {
        id: order.id,
        amount: record.amountPaise,
        currency,
        receipt,
        keyId: setup.keyId,
        planId,
        planLabel: PLAN_CONFIG[planId].label,
        durationDays
      }
    });
  });

  app.post('/api/payments/razorpay/verify', async (request, response) => {
    if (!setup.ready) {
      rejectPayment(response, 503, setup.setupError || 'Payment provider is not configured.', { payment: safePaymentStatus(setup) });
      return;
    }

    let auth;

    try {
      auth = await authenticateHttpRequest(request, { firebaseAdminStatus, production, allowLocalDevAuth });
    } catch {
      rejectPayment(response, 401, 'Could not verify identity.');
      return;
    }

    if (!auth.ok) {
      rejectPayment(response, auth.status, auth.message);
      return;
    }

    const orderId = String(request.body?.razorpay_order_id ?? '').trim();
    const paymentId = String(request.body?.razorpay_payment_id ?? '').trim();
    const signature = String(request.body?.razorpay_signature ?? '').trim();
    const record = await store.getPaymentByOrderId(orderId);

    if (!record || record.userId !== auth.user.userId) {
      rejectPayment(response, 404, 'Payment order was not found for this account.');
      return;
    }

    if (record.status === 'verified') {
      const entitlement = await grantEntitlement({ store, paymentRecord: record, source: 'checkout-repeat' });
      response.json({
        ok: true,
        message: 'Payment already verified.',
        entitlement: publicEntitlement(entitlement)
      });
      return;
    }

    const signaturePayload = `${orderId}|${paymentId}`;

    if (!verifySignature(signaturePayload, signature, setup.keySecret)) {
      await store.savePaymentRecord({
        ...record,
        razorpayPaymentId: paymentId,
        status: 'signature-failed',
        source: 'checkout'
      });
      rejectPayment(response, 400, 'Payment verification failed.');
      return;
    }

    const payment = await readRazorpayPayment(paymentId, setup);
    const expectedAmount = Number(record.amountPaise);

    if (!payment || payment.order_id !== orderId || Number(payment.amount) !== expectedAmount || payment.currency !== record.currency || payment.status !== 'captured') {
      await store.savePaymentRecord({
        ...record,
        razorpayPaymentId: paymentId,
        status: 'provider-check-failed',
        source: 'checkout'
      });
      rejectPayment(response, 400, 'Razorpay payment was not captured for the expected order.');
      return;
    }

    const verifiedRecord = await store.savePaymentRecord({
      ...record,
      razorpayPaymentId: paymentId,
      status: 'verified',
      verifiedAt: nowIso(),
      source: 'checkout'
    });
    const entitlement = await grantEntitlement({ store, paymentRecord: verifiedRecord, source: 'checkout' });
    const entitlementView = publicEntitlement(entitlement);

    response.json({
      ok: true,
      message: `${PLAN_CONFIG[sanitizePlanId(record.planId)]?.label ?? 'Premium Pass'} verified. Active for ${entitlementView.daysRemaining} days.`,
      entitlement: entitlementView
    });
  });

  return {
    setup: safePaymentStatus(setup),
    store
  };
}
