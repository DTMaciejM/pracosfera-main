import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerUser } from "@/types/user";
import { supabase } from "@/lib/supabase";
import { createUserWithAuth } from "@/lib/auth-helpers";
import { UserManagementDialog } from "./UserManagementDialog";
import { Edit, Search } from "lucide-react";
import { toast } from "sonner";

export const AdminWorkers = () => {
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerStatusFilter, setWorkerStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .order('name');

      if (usersError) throw usersError;

      // Load shifts for all workers
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('worker_shifts')
        .select('*, custom_shift_hours(*)')
        .in('worker_id', usersData.map(u => u.id));

      if (shiftsError) throw shiftsError;

      // Load custom shift hours
      const shiftIds = shiftsData?.map(s => s.id) || [];
      const { data: customHoursData, error: customHoursError } = shiftIds.length > 0
        ? await supabase
            .from('custom_shift_hours')
            .select('*')
            .in('worker_shift_id', shiftIds)
        : { data: [], error: null };

      if (customHoursError) throw customHoursError;

      // Map shifts and custom hours
      const shiftsMap: Record<string, Record<string, any>> = {};
      const customHoursMap: Record<string, Record<string, any>> = {};

      shiftsData?.forEach((shift: any) => {
        if (!shiftsMap[shift.worker_id]) {
          shiftsMap[shift.worker_id] = {};
        }
        shiftsMap[shift.worker_id][shift.shift_date] = shift.shift_type;

        if (shift.shift_type === 'CUST') {
          const customHour = customHoursData?.find(ch => ch.worker_shift_id === shift.id);
          if (customHour) {
            if (!customHoursMap[shift.worker_id]) {
              customHoursMap[shift.worker_id] = {};
            }
            customHoursMap[shift.worker_id][shift.shift_date] = {
              start: customHour.start_time.substring(0, 5),
              end: customHour.end_time.substring(0, 5),
            };
          }
        }
      });

      const mappedWorkers: WorkerUser[] = (usersData || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        email: w.email,
        password: '',
        role: 'worker' as const,
        status: w.status,
        shifts: shiftsMap[w.id] || {},
        customShiftHours: customHoursMap[w.id] || {},
      }));

      setWorkers(mappedWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
      toast.error('Błąd ładowania pracowników');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorker = async (workerData: Partial<WorkerUser>) => {
    try {
      if (workerData.id) {
        // Update existing worker
        const updateData: any = {
          name: workerData.name,
          phone: workerData.phone,
          status: (workerData as any).status,
        };

        if ((workerData as any).password) {
          // Password update requires Admin API - skip for now
          // Admin can reset password through Supabase dashboard or Edge Function
          // updateData.password_hash = await hashPassword((workerData as any).password);
        }

        // Update user table
        const { error: userError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', workerData.id);

        if (userError) throw userError;

        // Handle shifts if provided
        if ((workerData as any).shifts) {
          const shifts = (workerData as any).shifts as Record<string, string>;
          
          // Delete existing shifts for this worker
          await supabase
            .from('worker_shifts')
            .delete()
            .eq('worker_id', workerData.id);

          // Insert new shifts
          const shiftEntries = Object.entries(shifts);
          if (shiftEntries.length > 0) {
            const shiftsToInsert = shiftEntries.map(([date, shiftType]) => ({
              worker_id: workerData.id,
              shift_date: date,
              shift_type: shiftType,
            }));

            const { data: insertedShifts, error: shiftsError } = await supabase
              .from('worker_shifts')
              .insert(shiftsToInsert)
              .select();

            if (shiftsError) throw shiftsError;

            // Handle custom shift hours for CUST shifts
            if ((workerData as any).customShiftHours) {
              const customHours = (workerData as any).customShiftHours as Record<string, { start: string; end: string }>;
              
              // Delete existing custom hours
              const shiftIds = insertedShifts?.map(s => s.id) || [];
              if (shiftIds.length > 0) {
                await supabase
                  .from('custom_shift_hours')
                  .delete()
                  .in('worker_shift_id', shiftIds);
              }

              // Insert custom hours for CUST shifts
              const customHoursToInsert: any[] = [];
              insertedShifts?.forEach((shift) => {
                if (shift.shift_type === 'CUST' && customHours[shift.shift_date]) {
                  customHoursToInsert.push({
                    worker_shift_id: shift.id,
                    start_time: customHours[shift.shift_date].start + ':00',
                    end_time: customHours[shift.shift_date].end + ':00',
                  });
                }
              });

              if (customHoursToInsert.length > 0) {
                const { error: customHoursError } = await supabase
                  .from('custom_shift_hours')
                  .insert(customHoursToInsert);

                if (customHoursError) throw customHoursError;
              }
            }
          }
        }

        toast.success("Pracownik zaktualizowany");
      } else {
        // Create new worker using Supabase Auth
        const password = (workerData as any).password || 'defaultpass123';
        const { userId, error: authError } = await createUserWithAuth(
          workerData.email,
          password,
          {
            name: workerData.name,
            phone: workerData.phone,
            role: 'worker',
          }
        );

        if (authError) throw authError;

        // Update status if provided
        if ((workerData as any).status) {
          const { error: statusError } = await supabase
            .from('users')
            .update({ status: (workerData as any).status })
            .eq('id', userId);

          if (statusError) throw statusError;
        }

        const userData = { id: userId };

        // Handle shifts if provided
        if ((workerData as any).shifts) {
          const shifts = (workerData as any).shifts as Record<string, string>;
          const shiftEntries = Object.entries(shifts);
          
          if (shiftEntries.length > 0) {
            const shiftsToInsert = shiftEntries.map(([date, shiftType]) => ({
              worker_id: userData.id,
              shift_date: date,
              shift_type: shiftType,
            }));

            const { data: insertedShifts, error: shiftsError } = await supabase
              .from('worker_shifts')
              .insert(shiftsToInsert)
              .select();

            if (shiftsError) throw shiftsError;

            // Handle custom shift hours for CUST shifts
            if ((workerData as any).customShiftHours) {
              const customHours = (workerData as any).customShiftHours as Record<string, { start: string; end: string }>;
              
              const customHoursToInsert: any[] = [];
              insertedShifts?.forEach((shift) => {
                if (shift.shift_type === 'CUST' && customHours[shift.shift_date]) {
                  customHoursToInsert.push({
                    worker_shift_id: shift.id,
                    start_time: customHours[shift.shift_date].start + ':00',
                    end_time: customHours[shift.shift_date].end + ':00',
                  });
                }
              });

              if (customHoursToInsert.length > 0) {
                const { error: customHoursError } = await supabase
                  .from('custom_shift_hours')
                  .insert(customHoursToInsert);

                if (customHoursError) throw customHoursError;
              }
            }
          }
        }

        toast.success("Pracownik dodany");
      }

      await loadWorkers();
    } catch (error: any) {
      console.error('Error saving worker:', error);
      toast.error(error.message || 'Błąd zapisywania pracownika');
    }
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesSearch = workerSearch === "" || 
        worker.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
        worker.phone.includes(workerSearch) ||
        worker.email.toLowerCase().includes(workerSearch.toLowerCase());
      
      const matchesStatus = workerStatusFilter === "all" || worker.status === workerStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [workers, workerSearch, workerStatusFilter]);

  if (loading) {
    return <div className="text-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pracownicy</h2>
          <p className="text-muted-foreground">
            Dodawaj, edytuj lub blokuj konta pracowników
          </p>
        </div>
        <UserManagementDialog
          userType="worker"
          onSave={handleSaveWorker}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista pracowników</CardTitle>
          <CardDescription>
            Zarządzaj kontami pracowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="relative w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={workerStatusFilter} onValueChange={setWorkerStatusFilter}>
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
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Brak pracowników
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>{worker.email}</TableCell>
                      <TableCell>{worker.phone}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            worker.status === "nieaktywny"
                              ? "destructive"
                              : "default"
                          }
                          className="pointer-events-none"
                        >
                          {worker.status === "nieaktywny" ? "Nieaktywny" : "Aktywny"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserManagementDialog
                          user={worker}
                          userType="worker"
                          onSave={handleSaveWorker}
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
