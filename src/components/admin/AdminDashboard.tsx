import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { BarChart, Calendar, Users, CalendarIcon, Search, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Reservation } from "@/types/reservation";
import { WorkerUser } from "@/types/user";
import { FranchiseeUser } from "@/types/user";
import { toast } from "sonner";

export const AdminDashboard = () => {
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [workerSearch, setWorkerSearch] = useState<string>("");
  const [storeSearch, setStoreSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [franchisees, setFranchisees] = useState<FranchiseeUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadReservations(),
        loadWorkers(),
        loadFranchisees(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations_view')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedReservations: Reservation[] = (data || []).map((r: any) => ({
        id: r.id,
        reservationNumber: r.reservation_number,
        date: r.date,
        startTime: r.start_time.substring(0, 5),
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
        password: '',
        role: 'worker' as const,
        status: w.status,
      }));

      setWorkers(mappedWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
      toast.error('Błąd ładowania pracowników');
    }
  };

  const loadFranchisees = async () => {
    try {
      const { data, error } = await supabase
        .from('franchisees_view')
        .select('*')
        .order('name');

      if (error) throw error;

      const mappedFranchisees: FranchiseeUser[] = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        phone: f.phone,
        email: f.email,
        password: '',
        role: 'franchisee' as const,
        status: f.status,
        storeAddress: f.store_address,
        mpkNumber: f.mpk_number,
        termsAccepted: f.terms_accepted,
        registeredAt: f.registered_at,
      }));

      setFranchisees(mappedFranchisees);
    } catch (error) {
      console.error('Error loading franchisees:', error);
      toast.error('Błąd ładowania franczyzobiorców');
    }
  };

  // Filter reservations by date
  const dateFilteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const reservationDate = new Date(r.date);
      if (dateFrom && reservationDate < dateFrom) return false;
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (reservationDate > toDate) return false;
      }
      return true;
    });
  }, [reservations, dateFrom, dateTo]);

  // Calculate statistics
  const totalReservations = dateFilteredReservations.length;
  const activeReservations = dateFilteredReservations.filter(r => r.status === "w trakcie").length;
  const completedReservations = dateFilteredReservations.filter(r => r.status === "zakończone").length;
  
  // Filter workers by search
  const filteredWorkers = useMemo(() => {
    if (!workerSearch) return workers;
    const search = workerSearch.toLowerCase();
    return workers.filter(w => 
      w.name.toLowerCase().includes(search) ||
      w.phone.includes(search)
    );
  }, [workers, workerSearch]);

  // Filter franchisees by search
  const filteredFranchisees = useMemo(() => {
    if (!storeSearch) return franchisees;
    const search = storeSearch.toLowerCase();
    return franchisees.filter(f => 
      f.mpkNumber.toLowerCase().includes(search) ||
      f.name.toLowerCase().includes(search) ||
      f.storeAddress.toLowerCase().includes(search)
    );
  }, [franchisees, storeSearch]);
  
  // Filter reservations by worker
  const workerReservations = selectedWorker === "all" 
    ? dateFilteredReservations 
    : dateFilteredReservations.filter(r => r.worker?.id === selectedWorker);
  
  const workerHours = workerReservations.reduce((sum, r) => sum + r.hours, 0);
  
  // Filter reservations by store
  const storeReservations = selectedStore === "all"
    ? dateFilteredReservations
    : dateFilteredReservations.filter(r => r.franchisee.id === selectedStore);
  
  const storeHours = storeReservations.reduce((sum, r) => sum + r.hours, 0);
  const storeCount = storeReservations.length;

  // CSV Export functions
  const exportWorkerReport = () => {
    if (selectedWorker === "all") {
      toast.error("Wybierz pracownika do eksportu");
      return;
    }

    const worker = workers.find(w => w.id === selectedWorker);
    if (!worker) return;

    const workerReservationsForExport = dateFilteredReservations.filter(r => r.worker?.id === selectedWorker);
    
    const csvHeaders = ["Nr zlecenia", "Data", "Godzina rozpoczęcia", "Godzina zakończenia", "Liczba godzin", "Status", "Franczyzobiorca", "MPK"];
    const csvRows = workerReservationsForExport.map(r => [
      r.reservationNumber,
      format(new Date(r.date), "dd.MM.yyyy"),
      r.startTime,
      r.endTime,
      r.hours.toString(),
      r.status,
      r.franchisee.name,
      r.franchisee.mpkNumber,
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `raport_pracownik_${worker.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Raport wyeksportowany");
  };

  const exportFranchiseeReport = () => {
    if (selectedStore === "all") {
      toast.error("Wybierz sklep do eksportu");
      return;
    }

    const franchisee = franchisees.find(f => f.id === selectedStore);
    if (!franchisee) return;

    const storeReservationsForExport = dateFilteredReservations.filter(r => r.franchisee.id === selectedStore);
    
    const csvHeaders = ["Nr zlecenia", "Data", "Godzina rozpoczęcia", "Godzina zakończenia", "Liczba godzin", "Status", "Pracownik"];
    const csvRows = storeReservationsForExport.map(r => [
      r.reservationNumber,
      format(new Date(r.date), "dd.MM.yyyy"),
      r.startTime,
      r.endTime,
      r.hours.toString(),
      r.status,
      r.worker?.name || "Nieprzypisane",
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `raport_franczyzobiorca_${franchisee.mpkNumber}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Raport wyeksportowany");
  };

  if (loading) {
    return <div className="text-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Podsumowanie statystyk systemu
        </p>
      </div>

      {/* Date Filters */}
      <div className="flex items-center justify-end gap-2">
        <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "PPP", { locale: pl }) : "Data od"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                setDateFrom(date);
                setDateFromOpen(false);
              }}
              initialFocus
              className="pointer-events-auto"
              locale={pl}
            />
          </PopoverContent>
        </Popover>

        <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "PPP", { locale: pl }) : "Data do"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                setDateTo(date);
                setDateToOpen(false);
              }}
              initialFocus
              className="pointer-events-auto"
              locale={pl}
            />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
          >
            Wyczyść
          </Button>
        )}
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie zlecenia</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReservations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">W trakcie</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeReservations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zakończone</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReservations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pracownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Statistics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Statystyki pracownika</CardTitle>
            <CardDescription>Wyszukaj i wybierz pracownika aby zobaczyć szczegóły</CardDescription>
          </div>
          {selectedWorker !== "all" && (
            <Button onClick={exportWorkerReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Eksportuj CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedWorker} onValueChange={setSelectedWorker}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz pracownika" />
            </SelectTrigger>
            <SelectContent>
              <div className="flex items-center border-b px-3 pb-2">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <Input
                  placeholder="Szukaj"
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <SelectItem value="all">Wszyscy pracownicy</SelectItem>
              {filteredWorkers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Liczba zleceń</p>
              <p className="text-2xl font-bold">{workerReservations.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suma godzin</p>
              <p className="text-2xl font-bold">{workerHours.toFixed(1)}h</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Średnia na zlecenie</p>
              <p className="text-2xl font-bold">
                {workerReservations.length > 0 ? (workerHours / workerReservations.length).toFixed(1) : 0}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Statistics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Statystyki sklepu</CardTitle>
            <CardDescription>Wyszukaj i wybierz sklep aby zobaczyć szczegóły</CardDescription>
          </div>
          {selectedStore !== "all" && (
            <Button onClick={exportFranchiseeReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Eksportuj CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz sklep" />
            </SelectTrigger>
            <SelectContent>
              <div className="flex items-center border-b px-3 pb-2">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <Input
                  placeholder="Szukaj"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <SelectItem value="all">Wszystkie sklepy</SelectItem>
              {filteredFranchisees.map((franchisee) => (
                <SelectItem key={franchisee.id} value={franchisee.id}>
                  {franchisee.mpkNumber} - {franchisee.storeAddress}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Liczba zleceń</p>
              <p className="text-2xl font-bold">{storeCount}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suma godzin</p>
              <p className="text-2xl font-bold">{storeHours.toFixed(1)}h</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Średnia na zlecenie</p>
              <p className="text-2xl font-bold">
                {storeCount > 0 ? (storeHours / storeCount).toFixed(1) : 0}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
