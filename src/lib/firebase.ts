import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey:            "AIzaSyABmo8bEnkpr-zmL2cfTEDO2QTptK3FxRo",
  projectId:         "prophysical-6381f",
  appId:             "1:287253617903:web:284a34d8f031b199330f1a",
  authDomain:        "prophysical-6381f.firebaseapp.com",
  storageBucket:     "prophysical-6381f.firebasestorage.app",
  messagingSenderId: "287253617903",
};

const firestoreDatabaseId = "(default)";

const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without this line
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
