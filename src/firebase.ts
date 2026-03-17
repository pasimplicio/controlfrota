import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Default fallback for development if the config file is missing
// Firebase configuration using environment variables
// These can be set in the AI Studio "Settings" menu
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy-PLACEHOLDER",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "controlfrota-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "controlfrota-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "controlfrota-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);

if (firebaseConfig.apiKey === "AIzaSy-PLACEHOLDER") {
  console.warn("Firebase está usando chaves temporárias. O login não funcionará até que as chaves reais sejam configuradas no menu Settings.");
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
