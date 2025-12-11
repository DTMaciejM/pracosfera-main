import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format, addDays } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HourSelect } from "@/components/ui/hour-select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { sendReservationWebhook } from "@/lib/webhook";

interface NewReservationDialogProps {
  onReservationCreated?: () => void;
}

export const NewReservationDialog = ({ onReservationCreated }: NewReservationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const minDate = addDays(new Date(), 2); // 48h wyprzedzenie

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
    
    if (!date || !startTime || !endTime || !user) {
      toast.error("Proszę wypełnić wszystkie pola");
      return;
    }

    // Walidacja czasu
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

    if (hours < 2) {
      toast.error("Minimalna długość rezerwacji to 2 godziny");
      return;
    }

    if (hours > 8) {
      toast.error("Maksymalna długość rezerwacji to 8 godzin");
      return;
    }

    setLoading(true);

    try {
      const reservationNumber = await generateReservationNumber();
      const dateStr = format(date, 'yyyy-MM-dd');

      const { data: insertedReservation, error } = await supabase
        .from('reservations')
        .insert({
          reservation_number: reservationNumber,
          date: dateStr,
          start_time: startTime + ':00', // Add seconds for TIME type
          end_time: endTime + ':00',
          hours: hours,
          status: 'nieprzypisane',
          franchisee_id: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Wyślij webhook z danymi zlecenia
      if (insertedReservation) {
        try {
          // Pobierz dodatkowe dane franczyzobiorcy z tabeli franchisees
          const { data: franchiseeData } = await supabase
            .from('franchisees')
            .select('mpk_number, store_address')
            .eq('id', user.id)
            .single();

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
              id: user.id,
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              mpk_number: franchiseeData?.mpk_number,
              store_address: franchiseeData?.store_address,
            },
            worker: null,
          };

          await sendReservationWebhook(webhookData);
        } catch (webhookError) {
          console.error('Error sending webhook:', webhookError);
          // Nie przerywamy procesu jeśli webhook się nie powiedzie
        }
      }

      toast.success("Rezerwacja została utworzona", {
        description: `Data: ${format(date, "dd.MM.yyyy")} | Godziny: ${startTime} - ${endTime}`
      });
      
      setOpen(false);
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      
      if (onReservationCreated) {
        onReservationCreated();
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Błąd tworzenia rezerwacji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nowa rezerwacja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Utwórz nową rezerwację</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Data rezerwacji</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd MMMM yyyy", { locale: pl }) : "Wybierz datę"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date < minDate}
                  initialFocus
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Wymagane wyprzedzenie: 48 godzin
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Godzina rozpoczęcia</Label>
              <HourSelect
                value={startTime}
                onChange={setStartTime}
                minHour={6}
                maxHour={22}
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

          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            💡 Min. czas: 2h | Max. czas: 8h
          </p>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz rezerwację"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
