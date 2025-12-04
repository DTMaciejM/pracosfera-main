export type ReservationStatus = 
  | 'nieprzypisane' 
  | 'przypisane' 
  | 'w trakcie' 
  | 'zakończone' 
  | 'anulowane';

export interface Worker {
  id: string;
  name: string;
  phone: string;
}

export interface Franchisee {
  id: string;
  name: string;
  phone: string;
  mpkNumber: string;
  storeAddress: string;
}

export interface Reservation {
  id: string;
  reservationNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: ReservationStatus;
  worker?: Worker;
  franchisee: Franchisee;
  createdAt: string;
}
