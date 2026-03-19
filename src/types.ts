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
  cpf?: string;
  role: UserRole;
  hierarchy: UserHierarchy;
  unit: string;
  department?: string;
  status: 'active' | 'inactive' | 'blocked' | 'pending';
  cnh?: string;
  cnhCategory?: string;
  cnhExpiry?: string;
  createdAt?: any;
  updatedAt?: any;
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
  checkOutId?: string;
  checkInId?: string;
}

export interface Inspection {
  id: string;
  reservationId?: string;
  maintenanceId?: string;
  vehicleId: string;
  driverId: string;
  type: 'check-out' | 'check-in';
  km: number;
  fuelLevel: number; // 0 to 100
  photos: string[];
  damages: {
    part: string;
    description: string;
    photo?: string;
  }[];
  checklist: {
    item: string;
    status: 'ok' | 'ruim' | 'na';
    comment?: string;
  }[];
  notes?: string;
  createdAt: any;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  type: 'preventive' | 'corrective' | 'cleaning' | 'other';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  kmAtMaintenance: number;
  checkOutId?: string;
  checkInId?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: any;
  link?: string;
}

export interface Settings {
  id?: string;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  allowWeekendReservations: boolean;
  requireJustificationAboveHierarchy: boolean;
}
