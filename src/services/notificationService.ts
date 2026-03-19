import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification } from '../types';

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: Notification['type'];
  link?: string;
}) {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}
