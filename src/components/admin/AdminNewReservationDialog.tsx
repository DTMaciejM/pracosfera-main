import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sendReservationWebhook } from "@/lib/webhook";
import { HourSelect } from "@/components/ui/hour-select";
import { FranchiseeUser, WorkerUser } from "@/types/user";

interface AdminNewReservationDialogProps {
  onReservationCreated?: () => void;
}

export const AdminNewReservationDialog = ({ onReservationCreated }: AdminNewReservationDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [franchiseeId, setFranchiseeId] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [franchisees, setFranchisees] = useState<FranchiseeUser[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFranchisees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('franchisees_view')
        .select('*')
        .eq('status', 'aktywny')
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
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .eq('status', 'aktywny')
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
  }, []);

  useEffect(() => {
    if (open) {
      loadFranchisees().catch(console.error);
      loadWorkers().catch(console.error);
    }
  }, [open, loadFranchisees, loadWorkers]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFranchiseeId("");
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setWorkerId("");
    }
  }, [open]);

  const generateReservationNumber = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('reservation_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data?.reservation_number) {
        const lastNumber = parseInt(data.reservation_number);
        const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
        return nextNumber;
      }

      return '0001';
    } catch (error) {
      console.error('Error generating reservation number:', error);
      // Fallback: use timestamp-based number
      return Date.now().toString().slice(-4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!franchiseeId || !date || !startTime || !endTime) {
      toast.error("Proszę wypełnić wszystkie pola");
      return;
    }

    // Obliczanie godzin
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const hours = (endMinutes - startMinutes) / 60;

    // Walidacja: godzina rozpoczęcia nie może być późniejsza niż godzina zakończenia
    if (startMinutes >= endMinutes) {
      toast.error("Godzina rozpoczęcia nie może być późniejsza lub równa godzinie zakończenia");
      return;
    }

    setLoading(true);

    try {
      const reservationNumber = await generateReservationNumber();
      const dateStr = format(date, 'yyyy-MM-dd');
      const franchisee = franchisees.find(f => f.id === franchiseeId);

      // Sprawdź czy data jest w przeszłości
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reservationDate = new Date(date);
      reservationDate.setHours(0, 0, 0, 0);
      const isPastDate = reservationDate < today;

      const insertData: any = {
        reservation_number: reservationNumber,
        date: dateStr,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        hours: hours,
        franchisee_id: franchiseeId,
      };

      // Jeśli data jest w przeszłości, automatycznie ustaw status "zakończone"
      if (isPastDate) {
        insertData.status = 'zakończone';
        if (workerId) {
          insertData.worker_id = workerId;
        }
      } else if (workerId) {
        // Jeśli pracownik jest wybrany, przypisz go i ustaw status na "przypisane"
        insertData.worker_id = workerId;
        insertData.status = 'przypisane';
      } else {
        insertData.status = 'nieprzypisane';
      }

      const { data: insertedReservation, error } = await supabase
        .from('reservations')
        .insert(insertData)
        .select('*')
        .single();

      if (error) throw error;

      // Wyślij webhook z danymi zlecenia
      if (insertedReservation) {
        try {
          // Pobierz dane franczyzobiorcy
          const { data: franchiseeUserData } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .eq('id', franchiseeId)
            .single();

          const { data: franchiseeData } = await supabase
            .from('franchisees')
            .select('mpk_number, store_address')
            .eq('id', franchiseeId)
            .single();

          // Pobierz dane pracownika jeśli został przypisany
          let workerData = null;
          if (insertedReservation.worker_id) {
            const { data: workerUserData } = await supabase
              .from('users')
              .select('id, name, email, phone')
              .eq('id', insertedReservation.worker_id)
              .single();
            
            if (workerUserData) {
              workerData = {
                id: workerUserData.id,
                name: workerUserData.name,
                email: workerUserData.email,
                phone: workerUserData.phone,
              };
            }
          }

          const webhookData = {
            id: insertedReservation.id,
            reservation_number: insertedReservation.reservation_number,
            date: insertedReservation.date,
            start_time: insertedReservation.start_time,
            end_time: insertedReservation.end_time,
            hours: insertedReservation.hours,
            status: insertedReservation.status,
            worker_id: insertedReservation.worker_id,
            franchisee_id: insertedReservation.franchisee_id,
            created_at: insertedReservation.created_at,
            updated_at: insertedReservation.updated_at,
            franchisee: {
              id: franchiseeUserData?.id || franchiseeId,
              name: franchiseeUserData?.name || franchisee?.name || '',
              email: franchiseeUserData?.email || franchisee?.email || '',
              phone: franchiseeUserData?.phone || franchisee?.phone || '',
              mpk_number: franchiseeData?.mpk_number || franchisee?.mpkNumber,
              store_address: franchiseeData?.store_address || franchisee?.storeAddress,
            },
            worker: workerData,
          };

          await sendReservationWebhook(webhookData);
        } catch (webhookError) {
          console.error('Error sending webhook:', webhookError);
          // Nie przerywamy procesu jeśli webhook się nie powiedzie
        }
      }

      toast.success("Zlecenie zostało utworzone", {
        description: `${franchisee?.mpkNumber} ${franchisee?.name} | ${format(date, "dd.MM.yyyy")} | ${startTime} - ${endTime}`
      });

      setOpen(false);
      setFranchiseeId("");
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setWorkerId("");

      // Odśwież listę zleceń przez callback
      if (onReservationCreated) {
        onReservationCreated();
      }
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast.error(error.message || 'Błąd tworzenia zlecenia');
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nowe </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Utwórz nowe zlecenie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Franczyzobiorca</Label>
            <Select value={franchiseeId} onValueChange={setFranchiseeId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz franczyzobiorcę" />
              </SelectTrigger>
              <SelectContent>
                {franchisees.map(franchisee => (
                  <SelectItem key={franchisee.id} value={franchisee.id}>
                    {franchisee.mpkNumber} - {franchisee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data zlecenia</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd MMMM yyyy", {
                  locale: pl
                }) : "Wybierz datę"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={newDate => {
                setDate(newDate);
                setCalendarOpen(false);
              }} initialFocus locale={pl} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Godzina rozpoczęcia</Label>
              <HourSelect
                value={startTime}
                onChange={setStartTime}
                minHour={6}
                maxHour={23}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Godzina zakończenia</Label>
              <HourSelect
                value={endTime}
                onChange={setEndTime}
                minHour={6}
                maxHour={23}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pracownik (opcjonalnie)</Label>
            <Select value={workerId || "none"} onValueChange={(value) => setWorkerId(value === "none" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz pracownika (opcjonalnie)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak przypisania</SelectItem>
                {workers.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz zlecenie"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};