import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReservationCard } from "@/components/ReservationCard";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { supabase } from "@/lib/supabase";
import { Reservation, ReservationStatus } from "@/types/reservation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Phone, LogOut, User, AlertTriangle } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { updateActiveReservations, updateVerificationReservations } from "@/lib/reservation-status-updates";

const Index = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [adminUser, setAdminUser] = useState<{ name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadReservations();
      loadAdmin();
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

  const loadReservations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reservations_view')
        .select('*')
        .eq('franchisee_id', user.id)
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
    } finally {
      setLoading(false);
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

  const filterByStatus = (status?: ReservationStatus) => {
    if (!status) {
      // Sortuj wszystkie zlecenia według daty (najnowsze na górze)
      return [...reservations].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
    }
    // Sortuj filtrowane zlecenia według daty (najnowsze na górze)
    return reservations
      .filter(r => r.status === status)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
  };

  // Calculate status counts for tabs
  const statusCounts = useMemo(() => {
    return {
      nieprzypisane: reservations.filter(r => r.status === "nieprzypisane").length,
      przypisane: reservations.filter(r => r.status === "przypisane").length,
      "w trakcie": reservations.filter(r => r.status === "w trakcie").length,
      "do weryfikacji": reservations.filter(r => r.status === "do weryfikacji").length,
      zakończone: reservations.filter(r => r.status === "zakończone").length,
      anulowane: reservations.filter(r => r.status === "anulowane").length,
    };
  }, [reservations]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-6 pb-6 border-b">
          <NewReservationDialog onReservationCreated={loadReservations} />
        </div>
        
        {loading ? (
          <div className="text-center py-12">Ładowanie...</div>
        ) : (
          <Tabs defaultValue="nieprzypisane" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 h-auto md:grid-cols-3 lg:inline-grid lg:grid-cols-6 bg-background p-1">
              <TabsTrigger value="nieprzypisane" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
                Nieprzypisane
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs pointer-events-none">
                  {statusCounts.nieprzypisane}
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
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs pointer-events-none">
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
                <span className={`rounded-full px-2 py-0.5 text-xs pointer-events-none ${
                  statusCounts["do weryfikacji"] > 0 
                    ? "bg-orange-200 text-orange-900" 
                    : "bg-muted"
                }`}>
                  {statusCounts["do weryfikacji"]}
                </span>
              </TabsTrigger>
              <TabsTrigger value="zakończone" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
                Zakończone
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs pointer-events-none">
                  {statusCounts.zakończone}
                </span>
              </TabsTrigger>
              <TabsTrigger value="anulowane" className="gap-2 border data-[state=active]:bg-muted data-[state=active]:text-foreground">
                Anulowane
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs pointer-events-none">
                  {statusCounts.anulowane}
                </span>
              </TabsTrigger>
            </TabsList>

            {(["nieprzypisane", "przypisane", "w trakcie", "do weryfikacji", "zakończone", "anulowane"] as ReservationStatus[]).map((status) => {
              const filtered = filterByStatus(status);
              return (
                <TabsContent key={status} value={status} className="space-y-4">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Brak zleceń o tym statusie
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filtered.map((reservation) => (
                        <ReservationCard
                          key={reservation.id}
                          reservation={reservation}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
