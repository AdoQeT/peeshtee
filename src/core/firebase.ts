import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  onChildAdded,
  onChildRemoved,
  push,
  remove,
  update,
  off,
  onDisconnect,
  serverTimestamp
} from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyCiw2jWuKVqtfUCULXXiqy1n3OUctEEt-o",
  authDomain: "project-peeshtee.firebaseapp.com",
  databaseURL: "https://project-peeshtee-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "project-peeshtee",
  storageBucket: "project-peeshtee.firebasestorage.app",
  messagingSenderId: "959046397704",
  appId: "1:959046397704:web:58470fb4d7fce3c3ee06bd",
  measurementId: "G-M1EK470E35"
};

// Initialize Firebase App singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Realtime Database
export const auth = getAuth(firebaseApp);
export const rtdb = getDatabase(firebaseApp);

let authInitPromise: Promise<User | null> | null = null;
export function ensureFirebaseAuth(): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (authInitPromise) return authInitPromise;

  authInitPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch((err) => {
            console.warn('Firebase anonymous auth warning:', err);
            resolve(null);
          });
      }
    });
  });
  return authInitPromise;
}

// Auto-trigger anonymous auth in browser environments
if (typeof window !== 'undefined') {
  ensureFirebaseAuth().catch(() => {});
}

export {
  signInAnonymously,
  ref,
  set,
  get,
  onValue,
  onChildAdded,
  onChildRemoved,
  push,
  remove,
  update,
  off,
  onDisconnect,
  serverTimestamp
};
