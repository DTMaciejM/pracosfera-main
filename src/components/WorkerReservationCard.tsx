import { Reservation } from "@/types/reservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, MapPin, Phone, Store, Info } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useState } from "react";

interface WorkerReservationCardProps {
  reservation: Reservation;
  isOpenReservation?: boolean;
  onAccept?: (reservationId: string) => void;
}

const statusConfig = {
  nieprzypisane: { label: "Nieprzypisane", variant: "secondary" as const },
  przypisane: { label: "Przypisane", variant: "default" as const },
  "w trakcie": { label: "W trakcie", variant: "default" as const },
  "do weryfikacji": { label: "Do weryfikacji", variant: "default" as const },
  zakończone: { label: "Zakończone", variant: "outline" as const },
  anulowane: { label: "Anulowane", variant: "destructive" as const },
};

export const WorkerReservationCard = ({ reservation, isOpenReservation, onAccept }: WorkerReservationCardProps) => {
  const statusInfo = statusConfig[reservation.status];
  const [isVerified, setIsVerified] = useState(false);
  
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
  
  const handleAccept = () => {
    if (isVerified && onAccept) {
      onAccept(reservation.id);
    }
  };
  
  return (
    <Card className="transition-all hover:shadow-md">
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
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{reservation.startTime} - {reservation.endTime}</span>
          <span className="text-muted-foreground">({Math.round(displayHours)}h)</span>
        </div>
        
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Store className="h-4 w-4" />
            Lokal
          </h4>
          
          <div className="space-y-2 pl-6">
            <div>
              <p className="text-sm font-medium">{reservation.franchisee.mpkNumber}</p>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{reservation.franchisee.storeAddress}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-semibold">Kontakt do franczyzobiorcy</h4>
          
          <div className="space-y-2 pl-6">
            <div>
              <p className="text-sm font-medium">{reservation.franchisee.name}</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${reservation.franchisee.phone}`}
                className="text-primary hover:underline"
              >
                {reservation.franchisee.phone}
              </a>
            </div>
          </div>
        </div>

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

        {isOpenReservation && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox 
                id={`verify-${reservation.id}`}
                checked={isVerified}
                onCheckedChange={(checked) => setIsVerified(checked === true)}
              />
              <label 
                htmlFor={`verify-${reservation.id}`}
                className="text-sm leading-tight cursor-pointer"
              >
                Potwierdzam, że zapoznałem/am się ze szczegółami zlecenia i akceptuję warunki
              </label>
            </div>
            <Button 
              onClick={handleAccept}
              disabled={!isVerified}
              className="w-full"
            >
              Przyjmij zlecenie
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
