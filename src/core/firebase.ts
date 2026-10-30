import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, onChildAdded, push, remove, update, off, serverTimestamp } from 'firebase/database';

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

// Initialize Realtime Database
export const rtdb = getDatabase(firebaseApp);

export { ref, set, get, onValue, onChildAdded, push, remove, update, off, serverTimestamp };
