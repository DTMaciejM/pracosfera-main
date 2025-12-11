import { Reservation } from "@/types/reservation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Hash } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

interface ReservationDetailsProps {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  nieprzypisane: { label: "Nieprzypisane", variant: "secondary" as const },
  przypisane: { label: "Przypisane", variant: "default" as const },
  "w trakcie": { label: "W trakcie", variant: "default" as const },
  "do weryfikacji": { label: "Do weryfikacji", variant: "default" as const },
  zakończone: { label: "Zakończone", variant: "outline" as const },
  anulowane: { label: "Anulowane", variant: "destructive" as const },
};

export const ReservationDetails = ({ reservation, open, onOpenChange }: ReservationDetailsProps) => {
  if (!reservation) return null;

  const statusInfo = statusConfig[reservation.status];

  // Oblicz godziny dynamicznie na podstawie czasu rozpoczęcia i zakończenia
  const calculateHours = () => {
    const [startH, startM] = reservation.startTime.split(":").map(Number);
    const [endH, endM] = reservation.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);
    const hours = (endMinutes - startMinutes) / 60;
    return hours;
  };
  
  const displayHours = calculateHours();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle>Szczegóły zlecenia</DialogTitle>
            <Badge variant={statusInfo.variant} className="hover:bg-primary hover:bg-secondary hover:bg-destructive pointer-events-none">
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Numer zlecenia</p>
              <p className="text-lg font-semibold">{reservation.reservationNumber}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(new Date(reservation.date), "dd MMMM yyyy", { locale: pl })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Godziny pracy</p>
                <p className="font-medium">
                  {reservation.startTime} - {reservation.endTime} ({Math.round(displayHours)}h)
                </p>
              </div>
            </div>
          </div>

          {reservation.worker && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Przypisany pracownik
                </h3>
                
                <div className="space-y-2 pl-7">
                  <div>
                    <p className="text-sm text-muted-foreground">Imię i nazwisko</p>
                    <p className="font-medium">{reservation.worker.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {reservation.worker.phone}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!reservation.worker && reservation.status === "nieprzypisane" && (
            <>
              <Separator />
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  To zlecenie oczekuje na przypisanie pracownika przez administratora.
                </p>
              </div>
            </>
          )}

          <Separator />
          <div className="text-xs text-muted-foreground">
            Utworzono: {format(new Date(reservation.createdAt), "dd.MM.yyyy HH:mm")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
