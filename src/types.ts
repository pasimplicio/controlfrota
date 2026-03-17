export type UserRole = 'admin' | 'manager' | 'driver' | 'finance' | 'maintenance';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  unit: string;
  department?: string;
  status: 'active' | 'inactive' | 'blocked';
  cnh?: string;
  cnhCategory?: string;
  cnhExpiry?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuelType: string;
  currentKm: number;
  status: 'active' | 'maintenance' | 'inactive' | 'reserved';
  type: string;
  unit: string;
  hasGps: boolean;
  hasCamera: boolean;
}

export interface Reservation {
  id: string;
  vehicleId: string;
  driverId: string;
  reason: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  approvedBy?: string;
  startKm?: number;
  endKm?: number;
  startFuel?: number;
  endFuel?: number;
}
