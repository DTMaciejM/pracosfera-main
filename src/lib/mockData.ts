import { Reservation } from "@/types/reservation";

export const mockReservations: Reservation[] = [
  {
    id: "1",
    reservationNumber: "0001",
    date: "2025-11-28",
    startTime: "08:00",
    endTime: "16:00",
    hours: 8,
    status: "przypisane",
    worker: {
      id: "w1",
      name: "Jan Kowalski",
      phone: "+48 123 456 789"
    },
    franchisee: {
      id: "f1",
      name: "Maria Kowalczyk",
      phone: "+48 111 222 333",
      mpkNumber: "MPK-001-2025",
      storeAddress: "ul. Główna 15, 00-001 Warszawa"
    },
    createdAt: "2025-11-24T10:00:00"
  },
  {
    id: "2",
    reservationNumber: "0002",
    date: "2025-11-29",
    startTime: "10:00",
    endTime: "18:00",
    hours: 8,
    status: "w trakcie",
    worker: {
      id: "w2",
      name: "Anna Nowak",
      phone: "+48 987 654 321"
    },
    franchisee: {
      id: "f2",
      name: "Piotr Nowicki",
      phone: "+48 444 555 666",
      mpkNumber: "MPK-002-2025",
      storeAddress: "ul. Puławska 120, 02-566 Warszawa"
    },
    createdAt: "2025-11-25T14:30:00"
  },
  {
    id: "3",
    reservationNumber: "0003",
    date: "2025-11-30",
    startTime: "09:00",
    endTime: "13:00",
    hours: 4,
    status: "nieprzypisane",
    franchisee: {
      id: "f3",
      name: "Katarzyna Wiśniewska",
      phone: "+48 777 888 999",
      mpkNumber: "MPK-003-2025",
      storeAddress: "ul. Targowa 56, 03-734 Warszawa"
    },
    createdAt: "2025-11-26T09:15:00"
  },
  {
    id: "4",
    reservationNumber: "0004",
    date: "2025-11-25",
    startTime: "07:00",
    endTime: "15:00",
    hours: 8,
    status: "zakończone",
    worker: {
      id: "w3",
      name: "Piotr Wiśniewski",
      phone: "+48 555 444 333"
    },
    franchisee: {
      id: "f1",
      name: "Maria Kowalczyk",
      phone: "+48 111 222 333",
      mpkNumber: "MPK-001-2025",
      storeAddress: "ul. Główna 15, 00-001 Warszawa"
    },
    createdAt: "2025-11-22T16:45:00"
  },
  {
    id: "5",
    reservationNumber: "0005",
    date: "2025-12-02",
    startTime: "12:00",
    endTime: "18:00",
    hours: 6,
    status: "nieprzypisane",
    franchisee: {
      id: "f4",
      name: "Tomasz Lewandowski",
      phone: "+48 666 777 888",
      mpkNumber: "MPK-004-2025",
      storeAddress: "ul. Komisji Edukacji Narodowej 45, 02-797 Warszawa"
    },
    createdAt: "2025-11-27T11:20:00"
  },
  {
    id: "6",
    reservationNumber: "0006",
    date: "2025-12-03",
    startTime: "08:00",
    endTime: "14:00",
    hours: 6,
    status: "nieprzypisane",
    franchisee: {
      id: "f5",
      name: "Magdalena Dąbrowska",
      phone: "+48 999 888 777",
      mpkNumber: "MPK-005-2025",
      storeAddress: "ul. Górczewska 200, 01-460 Warszawa"
    },
    createdAt: "2025-11-27T15:30:00"
  }
];
