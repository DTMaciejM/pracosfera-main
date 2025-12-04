import { WorkerUser, FranchiseeUser, AdminUser, User } from "@/types/user";

export const mockAdmin: AdminUser = {
  id: "admin1",
  name: "Administrator Systemu",
  phone: "+48 500 600 700",
  role: "admin",
  email: "admin@pracosfera.pl",
  password: "admin123"
};

export const mockWorkers: WorkerUser[] = [
  {
    id: "w1",
    name: "Jan Kowalski",
    phone: "+48 123 456 789",
    role: "worker",
    email: "pracownik@pracosfera.pl",
    password: "pracownik123",
    status: "aktywny",
    shifts: {
      "2025-12-01": "Z-1",
      "2025-12-02": "Z-1",
      "2025-12-03": "Z-1",
      "2025-12-04": "Z-1",
      "2025-12-05": "Z-1",
    }
  },
  {
    id: "w2",
    name: "Anna Nowak",
    phone: "+48 987 654 321",
    role: "worker",
    email: "anowak@pracosfera.pl",
    password: "anowak123",
    status: "aktywny",
    shifts: {
      "2025-12-02": "Z-3",
      "2025-12-03": "Z-3",
      "2025-12-04": "Z-3",
      "2025-12-05": "Z-3",
      "2025-12-06": "Z-3",
    }
  },
  {
    id: "w3",
    name: "Piotr Wiśniewski",
    phone: "+48 555 444 333",
    role: "worker",
    email: "pwisniewski@pracosfera.pl",
    password: "pwisniewski123",
    status: "aktywny",
    shifts: {
      "2025-12-01": "Z-3",
      "2025-12-03": "Z-3",
      "2025-12-05": "Z-3",
      "2025-12-07": "Z-2",
    }
  }
];

export const mockFranchisees: FranchiseeUser[] = [
  {
    id: "f1",
    name: "Maria Kowalczyk",
    phone: "+48 111 222 333",
    role: "franchisee",
    status: "aktywny",
    storeAddress: "ul. Główna 15, 00-001 Warszawa",
    mpkNumber: "MPK-001-2025",
    termsAccepted: true,
    registeredAt: "2025-11-01T10:00:00",
    email: "franczyzobiorca@pracosfera.pl",
    password: "franczyzobiorca123"
  },
  {
    id: "f2",
    name: "Piotr Nowicki",
    phone: "+48 444 555 666",
    role: "franchisee",
    status: "aktywny",
    storeAddress: "ul. Puławska 120, 02-566 Warszawa",
    mpkNumber: "MPK-002-2025",
    termsAccepted: true,
    registeredAt: "2025-11-10T14:30:00",
    email: "pnowicki@pracosfera.pl",
    password: "pnowicki123"
  },
  {
    id: "f3",
    name: "Katarzyna Wiśniewska",
    phone: "+48 777 888 999",
    role: "franchisee",
    status: "aktywny",
    storeAddress: "ul. Targowa 56, 03-734 Warszawa",
    mpkNumber: "MPK-003-2025",
    termsAccepted: true,
    registeredAt: "2025-11-15T09:15:00",
    email: "kwisniewska@pracosfera.pl",
    password: "kwisniewska123"
  },
  {
    id: "f4",
    name: "Tomasz Lewandowski",
    phone: "+48 222 333 444",
    role: "franchisee",
    status: "oczekuje",
    storeAddress: "ul. Wolska 88, 01-126 Warszawa",
    mpkNumber: "MPK-004-2025",
    termsAccepted: true,
    registeredAt: "2025-11-26T11:20:00",
    email: "tlewandowski@pracosfera.pl",
    password: "tlewandowski123"
  }
];

export const mockUsers: User[] = [
  mockAdmin,
  ...mockWorkers,
  ...mockFranchisees
];
