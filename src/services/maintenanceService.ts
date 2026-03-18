import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

export async function cleanupDuplicateData() {
  const results = {
    users: 0,
    vehicles: 0,
    units: 0
  };

  const batch = writeBatch(db);
  let operationCount = 0;

  // 1. Cleanup Users (by email)
  const usersSnap = await getDocs(collection(db, 'users'));
  const userEmails = new Set<string>();
  const userCpfs = new Set<string>();
  
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const email = data.email?.toLowerCase();
    const cpf = data.cpf?.replace(/\D/g, '');

    if (userEmails.has(email) || (cpf && userCpfs.has(cpf))) {
      batch.delete(doc(db, 'users', userDoc.id));
      operationCount++;
      results.users++;
    } else {
      if (email) userEmails.add(email);
      if (cpf) userCpfs.add(cpf);
    }

    if (operationCount >= 400) {
      await batch.commit();
      operationCount = 0;
    }
  }

  // 2. Cleanup Vehicles (by plate)
  const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
  const vehiclePlates = new Set<string>();

  for (const vehicleDoc of vehiclesSnap.docs) {
    const plate = vehicleDoc.data().plate?.toUpperCase();
    if (vehiclePlates.has(plate)) {
      batch.delete(doc(db, 'vehicles', vehicleDoc.id));
      operationCount++;
      results.vehicles++;
    } else {
      if (plate) vehiclePlates.add(plate);
    }

    if (operationCount >= 400) {
      await batch.commit();
      operationCount = 0;
    }
  }

  // 3. Cleanup Units (by name)
  const unitsSnap = await getDocs(collection(db, 'units'));
  const unitNames = new Set<string>();

  for (const unitDoc of unitsSnap.docs) {
    const name = unitDoc.data().name?.trim().toLowerCase();
    if (unitNames.has(name)) {
      batch.delete(doc(db, 'units', unitDoc.id));
      operationCount++;
      results.units++;
    } else {
      if (name) unitNames.add(name);
    }

    if (operationCount >= 400) {
      await batch.commit();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return results;
}
