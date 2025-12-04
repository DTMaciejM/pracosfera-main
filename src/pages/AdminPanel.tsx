import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarDays, LogOut, LayoutDashboard, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminWorkers } from "@/components/admin/AdminWorkers";
import { AdminFranchisees } from "@/components/admin/AdminFranchisees";
import { AdminReservations } from "@/components/admin/AdminReservations";

type ActiveView = "dashboard" | "workers" | "franchisees" | "reservations";

const AdminPanel = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { id: "dashboard" as ActiveView, label: "Dashboard", icon: LayoutDashboard },
    { id: "workers" as ActiveView, label: "Pracownicy", icon: Users },
    { id: "franchisees" as ActiveView, label: "Franczyzobiorcy", icon: Users },
    { id: "reservations" as ActiveView, label: "Zlecenia", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative border-r bg-card transition-all duration-300 ease-in-out flex flex-col",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button - Right Edge */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -right-3 z-10 h-6 w-6 rounded-full border bg-card shadow-md transition-all duration-200 hover:scale-110",
            "flex items-center justify-center"
          )}
          title={sidebarCollapsed ? "Rozwiń menu" : "Zwiń menu"}
        >
          <span className={cn(
            "transition-all duration-300 text-sm",
            sidebarCollapsed ? "rotate-180" : "rotate-0"
          )}>
            ←
          </span>
        </Button>

        <div className={cn(
          "flex h-16 items-center border-b px-4 transition-all duration-300",
          sidebarCollapsed && "justify-center px-2"
        )}>
          <CalendarDays className={cn(
            "h-6 w-6 text-primary transition-all duration-300",
            !sidebarCollapsed && "mr-2"
          )} />
          <span className={cn(
            "font-bold text-lg transition-all duration-300",
            sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            Pracosfera
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  activeView === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className={cn(
                  "transition-all duration-300",
                  sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Panel Administratora</h1>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Wyloguj
          </Button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeView === "dashboard" && <AdminDashboard />}
          {activeView === "workers" && <AdminWorkers />}
          {activeView === "franchisees" && <AdminFranchisees />}
          {activeView === "reservations" && <AdminReservations />}
        </main>
      </div>
    </div>
  );
};


export default AdminPanel;

