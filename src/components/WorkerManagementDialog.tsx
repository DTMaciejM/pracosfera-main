import { useState } from "react";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface WorkerManagementDialogProps {
  worker?: WorkerUser;
  onSave: (worker: Partial<WorkerUser>) => void;
  trigger?: React.ReactNode;
}

export const WorkerManagementDialog = ({
  worker,
  onSave,
  trigger,
}: WorkerManagementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: worker?.name || "",
    phone: worker?.phone || "",
    email: worker?.email || "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    if (!worker && !formData.password) {
      toast.error("Hasło jest wymagane dla nowego pracownika");
      return;
    }

    onSave({
      ...worker,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      role: "worker",
    });

    toast.success(worker ? "Pracownik zaktualizowany" : "Pracownik dodany");
    setOpen(false);
    
    if (!worker) {
      setFormData({ name: "", phone: "", email: "", password: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj pracownika
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {worker ? "Edytuj pracownika" : "Dodaj pracownika"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Imię i nazwisko *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jan Kowalski"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Numer telefonu *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+48 123 456 789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="pracownik@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Hasło {!worker && "*"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={worker ? "Pozostaw puste aby nie zmieniać" : "••••••••"}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit">
              {worker ? "Zapisz zmiany" : "Dodaj pracownika"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
