export type UserRole = 'admin' | 'worker' | 'franchisee';
export type FranchiseeStatus = 'aktywny' | 'nieaktywny';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

export type ShiftType = 'Z-1' | 'Z-2' | 'Z-3' | 'CUST' | 'WOLNY';

export interface CustomShiftHours {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface WorkerUser extends User {
  role: 'worker';
  email: string;
  password: string;
  status?: 'aktywny' | 'nieaktywny';
  shifts?: Record<string, ShiftType>; // date (YYYY-MM-DD) -> shift type
  customShiftHours?: Record<string, CustomShiftHours>; // date (YYYY-MM-DD) -> custom hours for CUST shifts
}

export interface FranchiseeUser extends User {
  role: 'franchisee';
  status: FranchiseeStatus;
  storeAddress: string;
  mpkNumber: string;
  termsAccepted: boolean;
  registeredAt: string;
  email: string;
  password: string;
}

export interface AdminUser extends User {
  role: 'admin';
  email: string;
  password: string;
}
