import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings } from '../types';

const SETTINGS_DOC_ID = 'global';

export const DEFAULT_SETTINGS: Settings = {
  minAdvanceHours: 2,
  maxAdvanceDays: 30,
  allowWeekendReservations: true,
  requireJustificationAboveHierarchy: true
};

export async function getSettings(): Promise<Settings> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as Settings;
  } else {
    // Initialize with defaults if not exists
    await setDoc(docRef, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

export function subscribeToSettings(callback: (settings: Settings) => void) {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Settings);
    } else {
      callback(DEFAULT_SETTINGS);
    }
  });
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(docRef, settings, { merge: true });
}
