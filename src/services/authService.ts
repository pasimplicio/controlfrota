import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * Registers a new user in Firebase Auth without logging out the current user.
 * This is achieved by creating a temporary secondary Firebase app instance.
 */
export async function registerUserAuth(email: string, password: string): Promise<string> {
  const secondaryAppName = `secondary-app-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = result.user.uid;
    
    // Sign out from the secondary auth to ensure no session conflicts
    await signOut(secondaryAuth);
    
    return uid;
  } catch (error) {
    console.error('Error in secondary auth registration:', error);
    throw error;
  } finally {
    // Clean up the secondary app instance
    await deleteApp(secondaryApp);
  }
}
