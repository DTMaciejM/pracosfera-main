import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReservationCard } from "@/components/ReservationCard";
import { ReservationDetails } from "@/components/ReservationDetails";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { supabase } from "@/lib/supabase";
import { Reservation, ReservationStatus } from "@/types/reservation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Phone, LogOut, User } from "lucide-react";
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

const Index = () => {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  const handleCardClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setDetailsOpen(true);
  };

  const filterByStatus = (status?: ReservationStatus) => {
    if (!status) return reservations;
    return reservations.filter(r => r.status === status);
  };

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
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 h-auto md:grid-cols-3 lg:inline-grid lg:grid-cols-6">
              <TabsTrigger value="all">Wszystkie</TabsTrigger>
              <TabsTrigger value="nieprzypisane" className="[&>span]:pointer-events-none">Nieprzypisane</TabsTrigger>
              <TabsTrigger value="przypisane" className="[&>span]:pointer-events-none">Przypisane</TabsTrigger>
              <TabsTrigger value="w trakcie" className="[&>span]:pointer-events-none">W trakcie</TabsTrigger>
              <TabsTrigger value="zakończone" className="[&>span]:pointer-events-none">Zakończone</TabsTrigger>
              <TabsTrigger value="anulowane" className="[&>span]:pointer-events-none">Anulowane</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {reservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Brak zleceń
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onClick={() => handleCardClick(reservation)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {(["nieprzypisane", "przypisane", "w trakcie", "zakończone", "anulowane"] as ReservationStatus[]).map((status) => {
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
                          onClick={() => handleCardClick(reservation)}
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

      <ReservationDetails
        reservation={selectedReservation}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

export default Index;
