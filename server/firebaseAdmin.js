import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readServiceAccount() {
  const inlineJson = parseJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (inlineJson) {
    return inlineJson;
  }

  const base64Json = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    : '';

  return parseJson(base64Json);
}

let cachedAdminAuth = null;
let cachedAdminFirestore = null;
let cachedStatus = {
  enabled: false,
  mode: 'disabled',
  projectId: '',
  error: ''
};

export function initializeFirebaseAdmin() {
  if (cachedAdminAuth) {
    return cachedStatus;
  }

  try {
    const serviceAccount = readServiceAccount();
    const projectId = process.env.FIREBASE_PROJECT_ID
      || process.env.GOOGLE_CLOUD_PROJECT
      || process.env.GCLOUD_PROJECT
      || serviceAccount?.project_id
      || '';

    const existingApp = getApps()[0];
    const app = existingApp ?? initializeApp(serviceAccount
      ? {
          credential: cert(serviceAccount),
          projectId
        }
      : {
          credential: applicationDefault(),
          projectId: projectId || undefined
        });

    cachedAdminAuth = getAuth(app);
    cachedAdminFirestore = getFirestore(app);
    cachedStatus = {
      enabled: true,
      mode: serviceAccount ? 'service-account' : 'application-default',
      projectId: app.options.projectId ?? projectId ?? '',
      error: ''
    };
  } catch (error) {
    cachedAdminAuth = null;
    cachedAdminFirestore = null;
    cachedStatus = {
      enabled: false,
      mode: 'disabled',
      projectId: '',
      error: error?.message ?? 'Firebase Admin initialization failed.'
    };
  }

  return cachedStatus;
}

export function getFirebaseAdminStatus() {
  return cachedStatus;
}

export async function verifyPlayerToken(idToken) {
  if (!cachedAdminAuth) {
    initializeFirebaseAdmin();
  }

  if (!cachedAdminAuth) {
    throw new Error(cachedStatus.error || 'Firebase Admin auth is not configured.');
  }

  return cachedAdminAuth.verifyIdToken(idToken, true);
}

export function getAdminFirestore() {
  if (!cachedAdminFirestore) {
    initializeFirebaseAdmin();
  }

  return cachedAdminFirestore;
}
