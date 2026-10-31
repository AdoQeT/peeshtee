/**
 * Clean all database collections in Firebase Realtime Database
 * Usage: node scripts/cleanDatabase.mjs
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, remove, get } from 'firebase/database';

const config = {
  apiKey: 'AIzaSyCiw2jWuKVqtfUCULXXiqy1n3OUctEEt-o',
  databaseURL: 'https://project-peeshtee-default-rtdb.europe-west1.firebasedatabase.app'
};

async function main() {
  console.log('🚀 Connecting to Realtime Database...');
  const app = initializeApp(config);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  console.log('✅ Authenticated anonymously as:', auth.currentUser.uid);

  const db = getDatabase(app);
  const nodes = ['rooms', 'presence', 'profiles', 'invites', 'requests', 'notices'];

  for (const node of nodes) {
    try {
      await remove(ref(db, node));
      console.log(`🧹 Cleaned RTDB node: /${node}`);
    } catch (e) {
      console.error(`❌ Failed to clean /${node}:`, e.message);
    }
  }

  console.log('✨ Realtime Database is completely clean!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
