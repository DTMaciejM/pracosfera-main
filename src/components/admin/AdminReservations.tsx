import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminReservationTable } from "@/components/AdminReservationTable";
import { AdminNewReservationDialog } from "@/components/admin/AdminNewReservationDialog";

export const AdminReservations = () => {
  const refreshTableRef = useRef<(() => void) | null>(null);

  const handleReservationCreated = () => {
    if (refreshTableRef.current) {
      refreshTableRef.current();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Zlecenia</h2>
          <p className="text-muted-foreground">
            Zarządzaj zleceniami
          </p>
        </div>
        <AdminNewReservationDialog onReservationCreated={handleReservationCreated} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie zlecenia</CardTitle>
          <CardDescription>
            Przypisuj pracowników do zleceń i zarządzaj ich statusami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminReservationTable onRefreshRef={refreshTableRef} />
        </CardContent>
      </Card>
    </div>
  );
};
