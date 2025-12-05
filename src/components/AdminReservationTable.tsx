import { useState, useEffect } from "react";
import { Reservation } from "@/types/reservation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { EditReservationDialog } from "@/components/EditReservationDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Edit, UserPlus, UserX, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { WorkerUser } from "@/types/user";

const statusConfig = {
  nieprzypisane: { label: "Nieprzypisane", variant: "secondary" as const },
  przypisane: { label: "Przypisane", variant: "default" as const },
  "w trakcie": { label: "W trakcie", variant: "default" as const },
  zakończone: { label: "Zakończone", variant: "outline" as const },
  anulowane: { label: "Anulowane", variant: "destructive" as const },
};

type SortField = "reservationNumber" | "date" | "franchisee" | "worker" | "status";
type SortDirection = "asc" | "desc" | null;

interface AdminReservationTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

export const AdminReservationTable = ({ onRefreshRef }: AdminReservationTableProps = {}) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    loadReservations();
    loadWorkers();
  }, []);

  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = loadReservations;
    }
  }, [onRefreshRef]);

  // Automatycznie aktualizuj status przeterminowanych zleceń
  const updateExpiredReservations = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');

      // Znajdź wszystkie zlecenia z datą w przeszłości, które nie są zakończone ani anulowane
      const { data: expiredReservations, error: fetchError } = await supabase
        .from('reservations')
        .select('id')
        .lt('date', todayStr)
        .in('status', ['nieprzypisane', 'przypisane', 'w trakcie']);

      if (fetchError) throw fetchError;

      // Zaktualizuj status na "zakończone" dla wszystkich przeterminowanych zleceń
      if (expiredReservations && expiredReservations.length > 0) {
        const ids = expiredReservations.map(r => r.id);
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ status: 'zakończone' })
          .in('id', ids);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error updating expired reservations:', error);
      // Nie pokazujemy błędu użytkownikowi, tylko logujemy
    }
  };

  // Automatycznie aktualizuj status zleceń na "w trakcie" jeśli są aktualnie w trakcie
  // oraz na "zakończone" jeśli już się zakończyły
  const updateActiveReservations = async () => {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm:ss');
      const currentTimeShort = currentTime.substring(0, 5); // HH:MM

      // Pobierz wszystkie zlecenia z dzisiejszą datą, które mają przypisanego pracownika
      // i status "przypisane" lub "w trakcie"
      const { data: todayReservations, error: fetchError } = await supabase
        .from('reservations')
        .select('id, start_time, end_time, status')
        .eq('date', todayStr)
        .in('status', ['przypisane', 'w trakcie'])
        .not('worker_id', 'is', null);

      if (fetchError) throw fetchError;

      if (!todayReservations || todayReservations.length === 0) return;

      const activeReservationIds: string[] = []; // Zlecenia w trakcie
      const completedReservationIds: string[] = []; // Zlecenia zakończone
      
      for (const reservation of todayReservations) {
        const startTime = reservation.start_time.substring(0, 5); // HH:MM
        const endTime = reservation.end_time.substring(0, 5); // HH:MM

        // Sprawdź czy zlecenie jest aktualnie w trakcie (aktualna godzina jest między start_time a end_time)
        if (currentTimeShort >= startTime && currentTimeShort < endTime) {
          // Jeśli status to "przypisane", zmień na "w trakcie"
          if (reservation.status === 'przypisane') {
            activeReservationIds.push(reservation.id);
          }
        }
        // Sprawdź czy zlecenie już się zakończyło (aktualna godzina >= end_time)
        else if (currentTimeShort >= endTime) {
          // Zmień status na "zakończone"
          completedReservationIds.push(reservation.id);
        }
      }

      // Zaktualizuj status na "w trakcie" dla zleceń które są aktualnie w trakcie
      if (activeReservationIds.length > 0) {
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ status: 'w trakcie' })
          .in('id', activeReservationIds);

        if (updateError) throw updateError;
      }

      // Zaktualizuj status na "zakończone" dla zleceń które już się zakończyły
      if (completedReservationIds.length > 0) {
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ status: 'zakończone' })
          .in('id', completedReservationIds);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error updating active reservations:', error);
      // Nie pokazujemy błędu użytkownikowi, tylko logujemy
    }
  };

  const loadReservations = async () => {
    try {
      // Najpierw zaktualizuj przeterminowane zlecenia
      await updateExpiredReservations();
      // Następnie zaktualizuj zlecenia które są aktualnie w trakcie
      await updateActiveReservations();

      const { data, error } = await supabase
        .from('reservations_view')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedReservations: Reservation[] = (data || []).map((r: any) => ({
        id: r.id,
        reservationNumber: r.reservation_number,
        date: r.date,
        startTime: r.start_time.substring(0, 5), // HH:MM format
        endTime: r.end_time.substring(0, 5),
        hours: parseFloat(r.hours),
        status: r.status,
        worker: r.worker_id ? {
          id: r.worker_id,
          name: r.worker_name,
          phone: r.worker_phone,
        } : undefined,
        franchisee: {
          id: r.franchisee_id,
          name: r.franchisee_name,
          phone: r.franchisee_phone,
          mpkNumber: r.franchisee_mpk_number,
          storeAddress: r.franchisee_store_address,
        },
        createdAt: r.created_at,
      }));

      setReservations(mappedReservations);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Błąd ładowania zleceń');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .order('name');

      if (error) throw error;

      const mappedWorkers: WorkerUser[] = (data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        email: w.email,
        password: '', // Don't expose password
        role: 'worker' as const,
        status: w.status,
      }));

      setWorkers(mappedWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
      toast.error('Błąd ładowania pracowników');
    }
  };

  const handleAssignWorker = async (reservationId: string, workerId: string) => {
    try {
      const worker = workers.find(w => w.id === workerId);
      if (!worker) return;

      const { error } = await supabase
        .from('reservations')
        .update({
          worker_id: workerId,
          status: 'przypisane',
        })
        .eq('id', reservationId);

      if (error) throw error;

      await loadReservations();
      toast.success(`Przypisano pracownika: ${worker.name}`);
    } catch (error) {
      console.error('Error assigning worker:', error);
      toast.error('Błąd przypisywania pracownika');
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'anulowane' })
        .eq('id', reservationId);

      if (error) throw error;

      await loadReservations();
      toast.success("Zlecenie anulowane");
    } catch (error) {
      console.error('Error canceling reservation:', error);
      toast.error('Błąd anulowania zlecenia');
    }
  };

  const handleEditReservation = async (reservationId: string, updates: Partial<Reservation>) => {
    try {
      const updateData: any = {};
      
      if (updates.status) {
        updateData.status = updates.status;
        // If status is "nieprzypisane", set worker_id to null
        if (updates.status === 'nieprzypisane') {
          updateData.worker_id = null;
        }
      }
      if (updates.date) updateData.date = updates.date;
      if (updates.startTime) updateData.start_time = updates.startTime;
      if (updates.endTime) updateData.end_time = updates.endTime;
      if (updates.hours !== undefined) updateData.hours = updates.hours;
      if (updates.worker) {
        updateData.worker_id = updates.worker.id;
      }

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', reservationId);

      if (error) throw error;

      await loadReservations();
      toast.success("Zlecenie zaktualizowane");
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Błąd aktualizacji zlecenia');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4 ml-1" />;
    }
    return <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const filteredAndSortedReservations = reservations
    .filter((reservation) => {
      const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
      const matchesSearch = 
        searchQuery === "" ||
        reservation.franchisee.mpkNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.franchisee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.reservationNumber.includes(searchQuery) ||
        reservation.worker?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      let compareValue = 0;

      switch (sortField) {
        case "reservationNumber":
          compareValue = a.reservationNumber.localeCompare(b.reservationNumber);
          break;
        case "date":
          compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "franchisee":
          compareValue = a.franchisee.mpkNumber.localeCompare(b.franchisee.mpkNumber);
          break;
        case "worker":
          const aWorker = a.worker?.name || "";
          const bWorker = b.worker?.name || "";
          compareValue = aWorker.localeCompare(bWorker);
          break;
        case "status":
          compareValue = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });

  if (loading) {
    return <div className="text-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Szukaj"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtruj po statusie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="nieprzypisane">Nieprzypisane</SelectItem>
            <SelectItem value="przypisane">Przypisane</SelectItem>
            <SelectItem value="w trakcie">W trakcie</SelectItem>
            <SelectItem value="zakończone">Zakończone</SelectItem>
            <SelectItem value="anulowane">Anulowane</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("reservationNumber")}
            >
              <div className="flex items-center">
                Nr zlecenia
                {getSortIcon("reservationNumber")}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("date")}
            >
              <div className="flex items-center">
                Data
                {getSortIcon("date")}
              </div>
            </TableHead>
            <TableHead>Godziny</TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("franchisee")}
            >
              <div className="flex items-center">
                Franczyzobiorca
                {getSortIcon("franchisee")}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("worker")}
            >
              <div className="flex items-center">
                Pracownik
                {getSortIcon("worker")}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("status")}
            >
              <div className="flex items-center">
                Status
                {getSortIcon("status")}
              </div>
            </TableHead>
            <TableHead className="text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedReservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                Brak zleceń
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedReservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">#{reservation.reservationNumber}</TableCell>
                <TableCell>{new Date(reservation.date).toLocaleDateString("pl-PL")}</TableCell>
                <TableCell>
                  {reservation.startTime} - {reservation.endTime}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{reservation.franchisee.mpkNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {reservation.franchisee.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {reservation.worker ? (
                    <div className="text-sm">{reservation.worker.name}</div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Brak przypisania</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={statusConfig[reservation.status].variant}
                    className="pointer-events-none"
                  >
                    {statusConfig[reservation.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {reservation.status === "nieprzypisane" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Przypisz
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {workers.map((worker) => (
                            <DropdownMenuItem
                              key={worker.id}
                              onClick={() => handleAssignWorker(reservation.id, worker.id)}
                            >
                              {worker.name}
                            </DropdownMenuItem>
                          ))}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCancelReservation(reservation.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Anuluj zlecenie
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    <EditReservationDialog
                      reservation={reservation}
                      workers={workers}
                      onSave={handleEditReservation}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
