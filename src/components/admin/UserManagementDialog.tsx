import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { WorkerUser, FranchiseeUser, ShiftType, CustomShiftHours } from "@/types/user";
import { Edit, KeyRound, Ban, CheckCircle, Calendar, Plus } from "lucide-react";
import { ShiftCalendar } from "./ShiftCalendar";
import { Separator } from "@/components/ui/separator";

interface UserManagementDialogProps {
  user?: WorkerUser | FranchiseeUser;
  userType: "worker" | "franchisee";
  onSave: (userData: Partial<WorkerUser | FranchiseeUser>) => void;
  trigger?: React.ReactNode;
}

export const UserManagementDialog = ({
  user,
  userType,
  onSave,
  trigger
}: UserManagementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showShiftCalendar, setShowShiftCalendar] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shifts, setShifts] = useState<Record<string, ShiftType>>(
    (userType === "worker" && user && (user as WorkerUser).shifts) 
      ? (user as WorkerUser).shifts! 
      : {}
  );
  const [customShiftHours, setCustomShiftHours] = useState<Record<string, CustomShiftHours>>(
    (userType === "worker" && user && (user as WorkerUser).customShiftHours) 
      ? (user as WorkerUser).customShiftHours! 
      : {}
  );
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    ...(userType === "franchisee" && user
      ? {
          storeAddress: (user as FranchiseeUser).storeAddress || "",
          mpkNumber: (user as FranchiseeUser).mpkNumber || "",
          status: (user as FranchiseeUser).status || "aktywny",
        }
      : {}),
    ...(userType === "worker" && user
      ? {
          status: (user as WorkerUser).status || "aktywny",
        }
      : { status: "aktywny" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    if (!user && !formData.email) {
      toast.error("E-mail jest wymagany");
      return;
    }

    if (!user) {
      if (!password || !confirmPassword) {
        toast.error("Hasło jest wymagane");
        return;
      }
      
      if (password.length < 6) {
        toast.error("Hasło musi mieć co najmniej 6 znaków");
        return;
      }
      
      if (password !== confirmPassword) {
        toast.error("Hasła nie są identyczne");
        return;
      }
    }

    const saveData: any = {
      ...formData,
      id: user?.id,
      ...((!user && password) && { password }),
    };
    
    if (userType === "worker") {
      saveData.shifts = shifts;
      saveData.customShiftHours = customShiftHours;
    }
    
    onSave(saveData);

    toast.success(user ? "Dane zaktualizowane" : "Użytkownik dodany");
    setOpen(false);
    
    if (!user) {
      setFormData({
        name: "",
        phone: "",
        email: "",
        status: "aktywny",
      });
      setPassword("");
      setConfirmPassword("");
      setShifts({});
      setCustomShiftHours({});
    }
  };

  const handlePasswordReset = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Hasło musi mieć co najmniej 6 znaków");
      return;
    }

    onSave({
      id: user?.id,
      password: newPassword,
    });

    toast.success("Hasło zostało zresetowane");
    setNewPassword("");
    setShowPasswordReset(false);
  };

  const handleToggleStatus = () => {
    const currentStatus = userType === "franchisee" 
      ? (formData as any).status 
      : (formData as any).status;
    
    const newStatus = currentStatus === "aktywny" ? "nieaktywny" : "aktywny";
    
    setFormData({ ...formData, status: newStatus });
    
    onSave({
      id: user?.id,
      status: newStatus as any,
    });

    toast.success(
      newStatus === "aktywny" 
        ? "Użytkownik został odblokowany" 
        : "Użytkownik został zablokowany"
    );
  };

  const isBlocked = userType === "franchisee"
    ? (formData as any).status === "nieaktywny"
    : (formData as any).status === "nieaktywny";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? "Edytuj użytkownika" : `Dodaj ${userType === "worker" ? "pracownika" : "franczyzobiorcę"}`}
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+48 123 456 789"
              required
            />
          </div>

          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pracownik@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Hasło *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 znaków"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Powtórz hasło *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Powtórz hasło"
                  required
                />
              </div>
            </>
          )}

          {userType === "franchisee" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mpkNumber">Numer MPK *</Label>
                <Input
                  id="mpkNumber"
                  value={(formData as any).mpkNumber}
                  onChange={(e) => setFormData({ ...formData, mpkNumber: e.target.value })}
                  placeholder="XX-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">Adres *</Label>
                <Input
                  id="storeAddress"
                  value={(formData as any).storeAddress}
                  onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                  placeholder="ul. Główna 15, 00-001 Warszawa"
                  required
                />
              </div>

              {user && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={(formData as any).status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
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
              )}
            </>
          )}

          {userType === "worker" && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Harmonogram zmian</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShiftCalendar(!showShiftCalendar)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {showShiftCalendar ? "Ukryj kalendarz" : "Pokaż kalendarz"}
                  </Button>
                </div>
                
                {showShiftCalendar && (
                  <div className="mt-4">
                    <ShiftCalendar 
                      shifts={shifts}
                      onChange={(newShifts, newCustomHours) => {
                        setShifts(newShifts);
                        if (newCustomHours) {
                          setCustomShiftHours(newCustomHours);
                        }
                      }}
                      customShiftHours={customShiftHours}
                    />
                  </div>
                )}
                
                {!showShiftCalendar && Object.keys(shifts).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Przypisanych zmian: {Object.keys(shifts).length}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {user ? "Zapisz zmiany" : "Dodaj użytkownika"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
          </div>

          {user && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">Dodatkowe akcje</h4>
              
              <div className="space-y-2">
                {!showPasswordReset ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPasswordReset(true)}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Resetuj hasło
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nowe hasło (min. 6 znaków)"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={handlePasswordReset}
                      >
                        Zatwierdź
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordReset(false);
                          setNewPassword("");
                        }}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant={isBlocked ? "default" : "destructive"}
                className="w-full"
                onClick={handleToggleStatus}
              >
                {isBlocked ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Odblokuj użytkownika
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Zablokuj użytkownika
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
