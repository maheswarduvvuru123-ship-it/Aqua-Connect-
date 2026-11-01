import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDPlWeOhCpAPQ2Y_kPga0LmgAyPs2H7CZU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "aqua-ec4f5.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "aqua-ec4f5",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "aqua-ec4f5.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "818962725324",
  appId: env.VITE_FIREBASE_APP_ID || "1:818962725324:android:d7d70d99fb20aa896d4569"
};

// Check if user has supplied actual credentials or using default demo setup
export const isLiveFirebaseConfigured = () => {
  const key = firebaseConfig.apiKey;
  return Boolean(key && key !== "your_api_key_here" && !key.includes("DummyKey"));
};

let app;
let auth;
let db;
let storage;
let messagingPromise = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (typeof window !== 'undefined') {
    messagingPromise = isSupported().then((supported) => {
      if (supported) {
        return getMessaging(app);
      }
      return null;
    }).catch(() => null);
  }
} catch (error) {
  console.warn("Firebase initialization warning (using local active fallback):", error.message);
}

export const getMessagingInstance = async () => {
  if (!messagingPromise) return null;
  return messagingPromise;
};

export { app, auth, db, storage, firebaseConfig };
