import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without this line
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
