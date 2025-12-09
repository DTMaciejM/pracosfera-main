import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FranchiseeUser } from "@/types/user";
import { supabase } from "@/lib/supabase";
import { createUserWithAuth } from "@/lib/auth-helpers";
import { UserManagementDialog } from "./UserManagementDialog";
import { Edit, Search } from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  aktywny: { label: "Aktywny", variant: "default" as const },
  nieaktywny: { label: "Nieaktywny", variant: "destructive" as const },
};

export const AdminFranchisees = () => {
  const [franchisees, setFranchisees] = useState<FranchiseeUser[]>([]);
  const [franchiseeSearch, setFranchiseeSearch] = useState("");
  const [franchiseeStatusFilter, setFranchiseeStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFranchisees();
  }, []);

  const loadFranchisees = async () => {
    try {
      const { data, error } = await supabase
        .from('franchisees_view')
        .select('*')
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFranchisee = async (franchiseeData: Partial<FranchiseeUser>) => {
    try {
      if (franchiseeData.id) {
        // Update existing franchisee
        const updateData: any = {
          name: franchiseeData.name,
          phone: franchiseeData.phone,
        };

        if ((franchiseeData as any).password) {
          // Password update requires Admin API - skip for now
          // Admin can reset password through Supabase dashboard or Edge Function
          // updateData.password_hash = await hashPassword((franchiseeData as any).password);
        }

        // Update user table
        const { error: userError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', franchiseeData.id);

        if (userError) throw userError;

        // Update franchisees table
        const { error: franchiseeError } = await supabase
          .from('franchisees')
          .update({
            store_address: (franchiseeData as any).storeAddress,
            mpk_number: (franchiseeData as any).mpkNumber,
            status: (franchiseeData as any).status,
          })
          .eq('id', franchiseeData.id);

        if (franchiseeError) throw franchiseeError;

        toast.success("Franczyzobiorca zaktualizowany");
      } else {
        // Create new franchisee using Supabase Auth
        const password = (franchiseeData as any).password || 'defaultpass123';
        const { userId, error: authError } = await createUserWithAuth(
          franchiseeData.email,
          password,
          {
            name: franchiseeData.name,
            phone: franchiseeData.phone,
            role: 'franchisee',
          }
        );

        if (authError) throw authError;

        const userData = { id: userId };

        // Insert into franchisees table
        const { error: franchiseeError } = await supabase
          .from('franchisees')
          .insert({
            id: userData.id,
            store_address: (franchiseeData as any).storeAddress,
            mpk_number: (franchiseeData as any).mpkNumber,
            status: (franchiseeData as any).status || 'aktywny',
            terms_accepted: true,
            registered_at: new Date().toISOString(),
          });

        if (franchiseeError) throw franchiseeError;

        toast.success("Franczyzobiorca dodany");
      }

      await loadFranchisees();
    } catch (error: any) {
      console.error('Error saving franchisee:', error);
      toast.error(error.message || 'Błąd zapisywania franczyzobiorcy');
    }
  };

  const filteredFranchisees = useMemo(() => {
    return franchisees.filter((franchisee) => {
      const matchesSearch = franchiseeSearch === "" || 
        franchisee.name.toLowerCase().includes(franchiseeSearch.toLowerCase()) ||
        franchisee.phone.includes(franchiseeSearch) ||
        franchisee.storeAddress.toLowerCase().includes(franchiseeSearch.toLowerCase()) ||
        franchisee.mpkNumber.includes(franchiseeSearch);
      
      const matchesStatus = franchiseeStatusFilter === "all" || franchisee.status === franchiseeStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [franchisees, franchiseeSearch, franchiseeStatusFilter]);

  if (loading) {
    return <div className="text-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Franczyzobiorcy</h2>
          <p className="text-muted-foreground">
            Akceptuj, edytuj lub blokuj konta franczyzobiorców
          </p>
        </div>
        <UserManagementDialog
          userType="franchisee"
          onSave={handleSaveFranchisee}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista franczyzobiorców</CardTitle>
          <CardDescription>
            Zarządzaj kontami franczyzobiorców
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="relative w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj"
                value={franchiseeSearch}
                onChange={(e) => setFranchiseeSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={franchiseeStatusFilter} onValueChange={setFranchiseeStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="aktywny">Aktywny</SelectItem>
                <SelectItem value="nieaktywny">Nieaktywny</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>MPK</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data rejestracji</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFranchisees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Brak franczyzobiorców
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFranchisees.map((franchisee) => (
                    <TableRow key={franchisee.id}>
                      <TableCell className="font-medium">{franchisee.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {franchisee.mpkNumber}
                      </TableCell>
                      <TableCell>{franchisee.storeAddress}</TableCell>
                      <TableCell>{franchisee.phone}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusConfig[franchisee.status].variant}
                          className="pointer-events-none"
                        >
                          {statusConfig[franchisee.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(franchisee.registeredAt).toLocaleDateString("pl-PL")}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserManagementDialog
                          user={franchisee}
                          userType="franchisee"
                          onSave={handleSaveFranchisee}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
