import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseJson(value) {
  if (!value) {
    return { value: null, error: '' };
  }

  try {
    return { value: JSON.parse(value), error: '' };
  } catch (error) {
    return {
      value: null,
      error: `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error?.message ?? 'parse failed'}`
    };
  }
}

function readServiceAccount() {
  return parseJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function hasApplicationDefaultCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.K_SERVICE ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );
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
    const serviceAccountResult = readServiceAccount();
    const serviceAccount = serviceAccountResult.value;

    if (serviceAccountResult.error) {
      throw new Error(serviceAccountResult.error);
    }

    const projectId = process.env.FIREBASE_PROJECT_ID
      || process.env.GOOGLE_CLOUD_PROJECT
      || process.env.GCLOUD_PROJECT
      || serviceAccount?.project_id
      || '';
    const useApplicationDefault = !serviceAccount && hasApplicationDefaultCredentials();

    if (!serviceAccount && !useApplicationDefault) {
      throw new Error('Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON to the full service account JSON on the backend host.');
    }

    if (!projectId) {
      throw new Error('Firebase project id is not configured. Set FIREBASE_PROJECT_ID to your Firebase project id.');
    }

    const existingApp = getApps()[0];
    const app = existingApp ?? initializeApp(serviceAccount
      ? {
          credential: cert(serviceAccount),
          projectId
        }
      : {
          credential: applicationDefault(),
          projectId
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
