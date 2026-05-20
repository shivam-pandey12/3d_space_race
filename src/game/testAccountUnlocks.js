import { EDITION_IDS } from './editionConfig.js';

function isDemoUnlockEnabled() {
  return Boolean(import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_DEMO_ENTITLEMENT ?? '').toLowerCase() === 'true');
}

export const TEST_ACCOUNT_UNLOCK_EMAILS = Object.freeze([
  'shivam63pandey@gmail.com'
]);

export const TEST_ACCOUNT_UNLOCK_EDITION = EDITION_IDS.STANDALONE_FULL_PREMIUM;
export const TEST_ACCOUNT_UNLOCK_CREDIT_FLOOR = 250000;
export const TEST_ACCOUNT_UNLOCK_XP_FLOOR = 25000;

export function normalizeTestAccountEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeAccountContext(account = {}) {
  return account && typeof account === 'object' ? account : {};
}

export function getTestAccountEmail(account = {}) {
  const safeAccount = normalizeAccountContext(account);
  return normalizeTestAccountEmail(safeAccount.auth?.email ?? safeAccount.email);
}

export function isTestUnlockAccount(account = {}) {
  if (!isDemoUnlockEnabled()) {
    return false;
  }

  const safeAccount = normalizeAccountContext(account);
  const provider = String(safeAccount.auth?.provider ?? safeAccount.provider ?? '').toLowerCase();
  const email = getTestAccountEmail(safeAccount);

  return provider === 'google' && TEST_ACCOUNT_UNLOCK_EMAILS.includes(email);
}

export function getTestAccountUnlock(account = {}) {
  const safeAccount = normalizeAccountContext(account);

  if (!isTestUnlockAccount(safeAccount)) {
    return null;
  }

  return {
    active: true,
    email: getTestAccountEmail(safeAccount),
    edition: TEST_ACCOUNT_UNLOCK_EDITION,
    label: 'Test account unlock',
    source: 'test-account'
  };
}
