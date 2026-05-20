export const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim(),
  measurementId: String(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '').trim()
};

export function isFirebaseConfigConfigured(config = firebaseConfig) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}
