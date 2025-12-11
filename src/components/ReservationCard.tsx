import { Reservation } from "@/types/reservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Info } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface ReservationCardProps {
  reservation: Reservation;
  onClick?: () => void;
}

const statusConfig = {
  nieprzypisane: { label: "Nieprzypisane", variant: "secondary" as const },
  przypisane: { label: "Przypisane", variant: "default" as const },
  "w trakcie": { label: "W trakcie", variant: "default" as const },
  "do weryfikacji": { label: "Do weryfikacji", variant: "default" as const },
  zakończone: { label: "Zakończone", variant: "outline" as const },
  anulowane: { label: "Anulowane", variant: "destructive" as const },
};

export const ReservationCard = ({ reservation, onClick }: ReservationCardProps) => {
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
    <Card 
      className={onClick ? "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]" : ""}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              Zlecenie #{reservation.reservationNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(reservation.date), "dd MMMM yyyy", { locale: pl })}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{reservation.startTime} - {reservation.endTime}</span>
          <span className="text-muted-foreground">({Math.round(displayHours)}h)</span>
        </div>
        
        {reservation.worker && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{reservation.worker.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${reservation.worker.phone}`}
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {reservation.worker.phone}
              </a>
            </div>
          </div>
        )}
        
        {!reservation.worker && reservation.status === "nieprzypisane" && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground italic">
              Oczekuje na przypisanie pracownika
            </p>
          </div>
        )}

        {reservation.status === "do weryfikacji" && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-900">
                Zlecenie oczekuje na weryfikację. Masz 24h aby wnieść ewentualne zastrzeżenia do Administratora. W przypadku braku zastrzeżeń z żadnej ze stron, zlecenie zostanie uznane za wykonane.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
