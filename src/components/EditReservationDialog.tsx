import { useState } from "react";
import { Reservation, ReservationStatus } from "@/types/reservation";
import { WorkerUser } from "@/types/user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HourSelect } from "@/components/ui/hour-select";
import { Edit } from "lucide-react";
import { toast } from "sonner";

interface EditReservationDialogProps {
  reservation: Reservation;
  workers: WorkerUser[];
  onSave: (reservationId: string, updates: Partial<Reservation>) => void;
}

const statusOptions: { value: ReservationStatus; label: string }[] = [
  { value: "nieprzypisane", label: "Nieprzypisane" },
  { value: "przypisane", label: "Przypisane" },
  { value: "w trakcie", label: "W trakcie" },
  { value: "do weryfikacji", label: "Do weryfikacji" },
  { value: "zakończone", label: "Zakończone" },
  { value: "anulowane", label: "Anulowane" },
];

export const EditReservationDialog = ({
  reservation,
  workers,
  onSave,
}: EditReservationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    workerId: reservation.worker?.id || "none",
    status: reservation.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    // Obliczanie godzin na podstawie czasu rozpoczęcia i zakończenia
    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const hours = (endMinutes - startMinutes) / 60;

    // Walidacja: godzina rozpoczęcia nie może być późniejsza niż godzina zakończenia
    if (startMinutes >= endMinutes) {
      toast.error("Godzina rozpoczęcia nie może być późniejsza lub równa godzinie zakończenia");
      return;
    }

    const selectedWorker = formData.workerId && formData.workerId !== "none"
      ? workers.find((w) => w.id === formData.workerId)
      : undefined;

    const updates: Partial<Reservation> = {
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hours: hours, // Dodajemy obliczone godziny
      status: formData.status,
      worker: selectedWorker
        ? {
            id: selectedWorker.id,
            name: selectedWorker.name,
            phone: selectedWorker.phone,
          }
        : undefined,
    };

    onSave(reservation.id, updates);
    toast.success("Zlecenie zaktualizowane");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edytuj zlecenie #{reservation.reservationNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Godzina rozpoczęcia *</Label>
              <HourSelect
                value={formData.startTime}
                onChange={(value) => setFormData({ ...formData, startTime: value })}
                minHour={6}
                maxHour={22}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Godzina zakończenia *</Label>
              <HourSelect
                value={formData.endTime}
                onChange={(value) => setFormData({ ...formData, endTime: value })}
                minHour={6}
                maxHour={23}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="worker">Przypisany pracownik</Label>
            <Select
              value={formData.workerId}
              onValueChange={(value) => {
                const newStatus = value !== "none" ? "przypisane" : formData.status;
                setFormData({ ...formData, workerId: value, status: newStatus });
              }}
            >
              <SelectTrigger id="worker">
                <SelectValue placeholder="Wybierz pracownika" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak przypisania</SelectItem>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => {
                const newWorkerId = value === "nieprzypisane" ? "none" : formData.workerId;
                setFormData({ ...formData, status: value as ReservationStatus, workerId: newWorkerId });
              }}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit">Zapisz zmiany</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
