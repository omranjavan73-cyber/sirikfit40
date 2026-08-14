import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApps()[0];

const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

const ids = [
  '04d53a5c5e350d898f35bec9ec845d57',
  '73b3bbe6e75f125eec4640e087a82e1d',
  '80262ff2206f42b3b9403443f9b6c5dc',
  '80a88b73c5b223ed918796666729757a',
  'adceb059fd9eb4176c2f73a1a0602d74'
];

async function run() {
  for (const id of ids) {
    try {
      const snap = await getDoc(doc(db, 'scraped_products_cache', id));
      if (snap.exists()) {
        const data = snap.data();
        console.log(id, '-> URL:', data.originalUrl);
      }
    } catch (err: any) {
      console.error(id, 'error:', err.message);
    }
  }
}

run();
