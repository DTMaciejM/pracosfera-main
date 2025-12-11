import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Reservation } from "@/types/reservation";
import { WorkerReservationCard } from "@/components/WorkerReservationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationStatus } from "@/types/reservation";
import { Phone, LogOut, CalendarDays, CalendarIcon, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateActiveReservations, updateVerificationReservations } from "@/lib/reservation-status-updates";
import { formatTimeForDisplay } from "@/lib/utils";

const WorkerPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReservationStatus | "otwarte" | "historia">("otwarte");
  const [historyDateFrom, setHistoryDateFrom] = useState<Date | undefined>();
  const [historyDateTo, setHistoryDateTo] = useState<Date | undefined>();
  const [historyDateFromOpen, setHistoryDateFromOpen] = useState(false);
  const [historyDateToOpen, setHistoryDateToOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [workerShifts, setWorkerShifts] = useState<Record<string, string>>({}); // date -> shift_type
  const [customShiftHours, setCustomShiftHours] = useState<Record<string, { start: string; end: string }>>({}); // date -> {start, end}
  const [adminUser, setAdminUser] = useState<{ name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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


  // Automatyczna aktualizacja statusów co 5 minut
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Aktualizuj statusy w tle i odśwież listę
      updateExpiredReservations();
      updateActiveReservations();
      updateVerificationReservations();
      loadReservations(); // Odśwież listę po aktualizacji
    }, 5 * 60 * 1000); // 5 minut

    // Wyczyść interwał przy odmontowaniu komponentu
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Uruchom gdy użytkownik się zmieni

  const loadData = async () => {
    await Promise.all([
      loadReservations(),
      loadWorkerShifts(),
      loadAdmin(),
    ]);
    setLoading(false);
  };

  const loadReservations = async () => {
    if (!user) return;

    try {
      // Najpierw zaktualizuj przeterminowane zlecenia
      await updateExpiredReservations();
      // Następnie zaktualizuj zlecenia które są aktualnie w trakcie
      await updateActiveReservations();
      // Zaktualizuj zlecenia do weryfikacji (zmiana na zakończone po 24h)
      await updateVerificationReservations();
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

  const loadWorkerShifts = async () => {
    if (!user) return;

    try {
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('worker_shifts')
        .select('*')
        .eq('worker_id', user.id);

      if (shiftsError) throw shiftsError;

      const shiftsMap: Record<string, string> = {};
      const customHoursMap: Record<string, { start: string; end: string }> = {};

      if (shiftsData) {
        const shiftIds = shiftsData.map(s => s.id);
        
        // Load custom shift hours
        const { data: customHoursData, error: customHoursError } = shiftIds.length > 0
          ? await supabase
              .from('custom_shift_hours')
              .select('*')
              .in('worker_shift_id', shiftIds)
          : { data: [], error: null };

        if (customHoursError) throw customHoursError;

        shiftsData.forEach((shift: any) => {
          shiftsMap[shift.shift_date] = shift.shift_type;

          if (shift.shift_type === 'CUST') {
            const customHour = customHoursData?.find(ch => ch.worker_shift_id === shift.id);
            if (customHour) {
              customHoursMap[shift.shift_date] = {
                start: formatTimeForDisplay(customHour.start_time),
                end: formatTimeForDisplay(customHour.end_time),
              };
            }
          }
        });
      }

      setWorkerShifts(shiftsMap);
      setCustomShiftHours(customHoursMap);
    } catch (error) {
      console.error('Error loading worker shifts:', error);
      toast.error('Błąd ładowania harmonogramu');
    }
  };

  const loadAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, phone')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setAdminUser({ name: data.name, phone: data.phone });
      }
    } catch (error) {
      console.error('Error loading admin:', error);
    }
  };

  // Get shift hours for a specific date
  const getShiftHours = (date: string): { start: number; end: number } | null => {
    const shiftType = workerShifts[date];
    if (!shiftType || shiftType === 'WOLNY') return null;

    const shiftHours: Record<string, { start: number; end: number }> = {
      'Z-1': { start: 6, end: 14 },
      'Z-2': { start: 10, end: 18 },
      'Z-3': { start: 15, end: 23 },
    };

    if (shiftType === 'CUST') {
      const custom = customShiftHours[date];
      if (custom) {
        const [startH, startM] = custom.start.split(':').map(Number);
        const [endH, endM] = custom.end.split(':').map(Number);
        return {
          start: startH + startM / 60,
          end: endH + endM / 60,
        };
      }
      return null;
    }

    return shiftHours[shiftType] || null;
  };

  // Check if reservation time fits within worker's shift
  const reservationFitsInShift = (reservation: Reservation): boolean => {
    const shiftHours = getShiftHours(reservation.date);
    if (!shiftHours) return false;

    const [resStartH, resStartM] = reservation.startTime.split(':').map(Number);
    const [resEndH, resEndM] = reservation.endTime.split(':').map(Number);
    const resStart = resStartH + resStartM / 60;
    const resEnd = resEndH + resEndM / 60;

    // Handle night shift (spans midnight, e.g., 22-6)
    if (shiftHours.start > shiftHours.end) {
      // Night shift spans midnight
      return resStart >= shiftHours.start || resEnd <= shiftHours.end;
    }

    // Regular shift
    return resStart >= shiftHours.start && resEnd <= shiftHours.end;
  };

  // Filter reservations for current worker
  const myReservations = useMemo(() => {
    return reservations.filter(
      reservation => reservation.worker?.id === user?.id
    );
  }, [reservations, user]);

  // Get open (unassigned) reservations that fit worker's shift
  const openReservations = useMemo(() => {
    return reservations.filter(reservation => {
      if (reservation.status !== "nieprzypisane") return false;
      return reservationFitsInShift(reservation);
    });
  }, [reservations, workerShifts, customShiftHours, user]);

  const filteredReservations = useMemo(() => {
    let filtered = activeTab === "otwarte"
      ? openReservations
      : myReservations.filter(reservation => reservation.status === activeTab);
    
    // Sortuj według daty (najnowsze na górze)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [activeTab, openReservations, myReservations]);

  const statusCounts = {
    otwarte: openReservations.length,
    przypisane: myReservations.filter(r => r.status === "przypisane").length,
    "w trakcie": myReservations.filter(r => r.status === "w trakcie").length,
    "do weryfikacji": myReservations.filter(r => r.status === "do weryfikacji").length,
    zakończone: myReservations.filter(r => r.status === "zakończone").length,
  };

  // History tab - filter completed reservations by date
  const completedReservations = myReservations.filter(r => r.status === "zakończone");
  
  const filteredHistoryReservations = useMemo(() => {
    return completedReservations.filter(r => {
      const reservationDate = new Date(r.date);
      if (historyDateFrom) {
        const fromDate = new Date(historyDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (reservationDate < fromDate) return false;
      }
      if (historyDateTo) {
        const toDate = new Date(historyDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (reservationDate > toDate) return false;
      }
      return true;
    });
  }, [completedReservations, historyDateFrom, historyDateTo]);

  const historyStats = useMemo(() => {
    const totalHours = filteredHistoryReservations.reduce((sum, r) => sum + r.hours, 0);
    const count = filteredHistoryReservations.length;
    
    return {
      totalHours,
      count,
    };
  }, [filteredHistoryReservations]);

  const handleAcceptReservation = async (reservationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          worker_id: user.id,
          status: 'przypisane',
        })
        .eq('id', reservationId);

      if (error) throw error;

      await loadReservations();
      toast.success("Zlecenie zostało przypisane");
      setActiveTab("przypisane");
    } catch (error) {
      console.error('Error accepting reservation:', error);
      toast.error('Błąd przypisywania zlecenia');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="text-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Pracosfera</h1>
            </div>
            <div className="flex items-center gap-2">
              <UserProfileDialog />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Pomoc</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kontakt do administratora</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>W razie problemów lub pytań skontaktuj się z administratorem:</p>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="font-semibold">{adminUser?.name}</p>
                        <p className="text-lg mt-2">
                          <Phone className="h-4 w-4 inline mr-2" />
                          <a href={`tel:${adminUser?.phone}`} className="text-primary hover:underline">
                            {adminUser?.phone}
                          </a>
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={(e) => {
                      e.preventDefault();
                      const trigger = document.querySelector('[data-state="open"]');
                      if (trigger instanceof HTMLElement) trigger.click();
                    }}>
                      Zamknij
                    </Button>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Wyloguj</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReservationStatus | "otwarte" | "historia")} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full gap-2 h-auto md:inline-grid md:grid-cols-6 bg-background p-1">
            <TabsTrigger value="otwarte" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
              Otwarte
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {statusCounts.otwarte}
              </span>
            </TabsTrigger>
            <TabsTrigger value="przypisane" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
              Przypisane
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs pointer-events-none">
                {statusCounts.przypisane}
              </span>
            </TabsTrigger>
            <TabsTrigger value="w trakcie" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
              W trakcie
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {statusCounts["w trakcie"]}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="do weryfikacji" 
              className={`gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground ${
                statusCounts["do weryfikacji"] > 0 
                  ? "bg-orange-50 border-orange-300 text-orange-900 hover:bg-orange-100 data-[state=active]:bg-orange-100 data-[state=active]:border-orange-400" 
                  : ""
              }`}
            >
              {statusCounts["do weryfikacji"] > 0 && (
                <AlertTriangle className="h-4 w-4 text-orange-600 animate-pulse" />
              )}
              Do weryfikacji
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                statusCounts["do weryfikacji"] > 0 
                  ? "bg-orange-200 text-orange-900" 
                  : "bg-muted"
              }`}>
                {statusCounts["do weryfikacji"]}
              </span>
            </TabsTrigger>
            <TabsTrigger value="zakończone" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
              Zakończone
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {statusCounts.zakończone}
              </span>
            </TabsTrigger>
            <TabsTrigger value="historia" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
              Historia
            </TabsTrigger>
          </TabsList>

          {activeTab !== "historia" && (
            <TabsContent value={activeTab} className="space-y-4">
              {filteredReservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Brak zleceń w tej kategorii</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredReservations.map((reservation) => (
                    <WorkerReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      isOpenReservation={activeTab === "otwarte"}
                      onAccept={handleAcceptReservation}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="historia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Raport przepracowanych godzin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Popover open={historyDateFromOpen} onOpenChange={setHistoryDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !historyDateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyDateFrom ? format(historyDateFrom, "PPP", { locale: pl }) : "Data od"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={historyDateFrom}
                        onSelect={(date) => {
                          setHistoryDateFrom(date);
                          setHistoryDateFromOpen(false);
                        }}
                        initialFocus
                        className="pointer-events-auto"
                        locale={pl}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover open={historyDateToOpen} onOpenChange={setHistoryDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !historyDateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyDateTo ? format(historyDateTo, "PPP", { locale: pl }) : "Data do"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={historyDateTo}
                        onSelect={(date) => {
                          setHistoryDateTo(date);
                          setHistoryDateToOpen(false);
                        }}
                        initialFocus
                        className="pointer-events-auto"
                        locale={pl}
                      />
                    </PopoverContent>
                  </Popover>

                  {(historyDateFrom || historyDateTo) && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setHistoryDateFrom(undefined);
                        setHistoryDateTo(undefined);
                      }}
                    >
                      Wyczyść
                    </Button>
                  )}
                </div>

                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Liczba zleceń</CardTitle>
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{historyStats.count}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Suma godzin</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{historyStats.totalHours.toFixed(1)}h</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkerPanel;
