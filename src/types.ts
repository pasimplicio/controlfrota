export type UserRole = 'admin' | 'manager' | 'driver' | 'finance' | 'maintenance' | 'pending';
export type UserHierarchy = 'diretoria' | 'gerencia' | 'supervisao' | 'operacional' | 'none';

export const HIERARCHY_PRIORITY: Record<UserHierarchy, number> = {
  diretoria: 4,
  gerencia: 3,
  supervisao: 2,
  operacional: 1,
  none: 0,
};

export interface Unit {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  costCenter?: string;
  managerId?: string;
  departments?: string[];
  status: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  cpf: string;
  role: UserRole;
  hierarchy: UserHierarchy;
  unit: string;
  department?: string;
  status: 'active' | 'inactive' | 'blocked' | 'pending';
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
  category?: string;
  hierarchyLevel?: UserHierarchy;
  unit: string;
  hasGps: boolean;
  hasCamera: boolean;
  photos?: string[];
  documents?: {
    crlv?: string;
    insurance?: string;
    licensing?: string;
  };
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
  justification?: string; // For exceptions
  priority: number; // Derived from user hierarchy
  unit: string; // Unit of the driver at the time of reservation
  approvalHistory?: {
    status: string;
    updatedBy: string;
    updatedAt: any;
    comment?: string;
  }[];
}
