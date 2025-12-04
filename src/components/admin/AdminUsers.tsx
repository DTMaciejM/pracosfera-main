import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerUser, FranchiseeUser } from "@/types/user";
import { mockWorkers, mockFranchisees } from "@/lib/mockUsers";
import { UserManagementDialog } from "./UserManagementDialog";
import { Edit, Search } from "lucide-react";

const statusConfig = {
  aktywny: { label: "Aktywny", variant: "default" as const },
  nieaktywny: { label: "Nieaktywny", variant: "destructive" as const },
};

export const AdminUsers = () => {
  const [workers, setWorkers] = useState<WorkerUser[]>(mockWorkers);
  const [franchisees, setFranchisees] = useState<FranchiseeUser[]>(mockFranchisees);
  
  const [franchiseeSearch, setFranchiseeSearch] = useState("");
  const [franchiseeStatusFilter, setFranchiseeStatusFilter] = useState<string>("all");
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerStatusFilter, setWorkerStatusFilter] = useState<string>("all");

  const handleSaveWorker = (workerData: Partial<WorkerUser>) => {
    if (workerData.id) {
      setWorkers((prev) =>
        prev.map((w) => (w.id === workerData.id ? { ...w, ...workerData } : w))
      );
    } else {
      const newWorker: WorkerUser = {
        id: `w${workers.length + 1}`,
        name: workerData.name!,
        phone: workerData.phone!,
        email: workerData.email!,
        password: (workerData as any).password || "defaultpass123",
        role: "worker",
        status: "aktywny",
      };
      setWorkers((prev) => [...prev, newWorker]);
    }
  };

  const handleSaveFranchisee = (franchiseeData: Partial<FranchiseeUser>) => {
    if (franchiseeData.id) {
      setFranchisees((prev) =>
        prev.map((f) => (f.id === franchiseeData.id ? { ...f, ...franchiseeData } : f))
      );
    } else {
      const newFranchisee: FranchiseeUser = {
        id: `f${franchisees.length + 1}`,
        name: franchiseeData.name!,
        phone: franchiseeData.phone!,
        storeAddress: (franchiseeData as any).storeAddress!,
        mpkNumber: (franchiseeData as any).mpkNumber!,
        status: (franchiseeData as any).status || "aktywny",
        email: franchiseeData.name!.toLowerCase().replace(/\s+/g, '') + "@email.com",
        password: (franchiseeData as any).password || "defaultpass123",
        role: "franchisee",
        termsAccepted: true,
        registeredAt: new Date().toISOString(),
      };
      setFranchisees((prev) => [...prev, newFranchisee]);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Użytkownicy</h2>
        <p className="text-muted-foreground">
          Zarządzaj franczyzobiorcami i pracownikami
        </p>
      </div>

      <Tabs defaultValue="franchisees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="franchisees">Franczyzobiorcy</TabsTrigger>
          <TabsTrigger value="workers">Pracownicy</TabsTrigger>
        </TabsList>

        <TabsContent value="franchisees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Franczyzobiorcy</CardTitle>
                <CardDescription>
                  Akceptuj, edytuj lub blokuj konta franczyzobiorców
                </CardDescription>
              </div>
              <UserManagementDialog
                userType="franchisee"
                onSave={handleSaveFranchisee}
              />
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
                    {filteredFranchisees.map((franchisee) => (
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pracownicy</CardTitle>
                <CardDescription>
                  Dodawaj, edytuj lub blokuj konta pracowników
                </CardDescription>
              </div>
              <UserManagementDialog
                userType="worker"
                onSave={handleSaveWorker}
              />
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
                    {filteredWorkers.map((worker) => (
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
