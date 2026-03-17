import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Default fallback for development if the config file is missing
const fallbackConfig = {
  apiKey: "AIzaSy...", // Placeholder
  authDomain: "controlfrota-dev.firebaseapp.com",
  projectId: "controlfrota-dev",
  storageBucket: "controlfrota-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let firebaseConfig = fallbackConfig;

const app = initializeApp(fallbackConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
