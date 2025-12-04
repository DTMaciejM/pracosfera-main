import { useState } from "react";
import { FranchiseeUser, FranchiseeStatus } from "@/types/user";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface FranchiseeManagementDialogProps {
  franchisee?: FranchiseeUser;
  onSave: (franchisee: Partial<FranchiseeUser>) => void;
  trigger?: React.ReactNode;
}

export const FranchiseeManagementDialog = ({
  franchisee,
  onSave,
  trigger,
}: FranchiseeManagementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: franchisee?.name || "",
    phone: franchisee?.phone || "",
    storeAddress: franchisee?.storeAddress || "",
    mpkNumber: franchisee?.mpkNumber || "",
    status: franchisee?.status || ("aktywny" as FranchiseeStatus),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.storeAddress || !formData.mpkNumber) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    onSave({
      ...franchisee,
      name: formData.name,
      phone: formData.phone,
      storeAddress: formData.storeAddress,
      mpkNumber: formData.mpkNumber,
      status: formData.status,
      role: "franchisee",
      termsAccepted: true,
      registeredAt: franchisee?.registeredAt || new Date().toISOString(),
    });

    toast.success(franchisee ? "Franczyzobiorca zaktualizowany" : "Franczyzobiorca dodany");
    setOpen(false);
    
    if (!franchisee) {
      setFormData({
        name: "",
        phone: "",
        storeAddress: "",
        mpkNumber: "",
        status: "aktywny",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj franczyzobiorcę
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {franchisee ? "Edytuj franczyzobiorcę" : "Dodaj franczyzobiorcę"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Imię i nazwisko *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Maria Kowalczyk"
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
            <Label htmlFor="mpkNumber">Numer MPK *</Label>
            <Input
              id="mpkNumber"
              value={formData.mpkNumber}
              onChange={(e) => setFormData({ ...formData, mpkNumber: e.target.value })}
              placeholder="XX-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeAddress">Adres *</Label>
            <Input
              id="storeAddress"
              value={formData.storeAddress}
              onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
              placeholder="ul. Główna 15, 00-001 Warszawa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as FranchiseeStatus })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktywny">Aktywny</SelectItem>
                <SelectItem value="nieaktywny">Nieaktywny</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit">
              {franchisee ? "Zapisz zmiany" : "Dodaj franczyzobiorcę"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
