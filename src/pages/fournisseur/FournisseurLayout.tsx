import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  UserCircle2,
  Users,
  BarChart3,
  FileText,
  Newspaper,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type NavItemType = {
  icon: typeof LayoutDashboard;
  label: string;
  to: string;
  adminOnly?: boolean;
};

const navItems: NavItemType[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", to: "/fournisseur/dashboard" },
  { icon: Newspaper, label: "Publications", to: "/espace-client/publications", adminOnly: true },
  { icon: ClipboardList, label: "Demandes clients", to: "/fournisseur/demandes" },
  { icon: Users, label: "Clients", to: "/fournisseur/clients" },
  { icon: CalendarDays, label: "Calendrier", to: "/fournisseur/calendar" },
  { icon: FolderOpen, label: "Documents", to: "/fournisseur/documents" },
  { icon: FileText, label: "Facturation", to: "/fournisseur/facturation" },
  { icon: BarChart3, label: "Rapports", to: "/fournisseur/reports" },
];

const titleByPath: Record<string, string> = {
  "/fournisseur/dashboard": "Tableau de bord",
  "/fournisseur/demandes": "Demandes clients",
  "/fournisseur/clients": "Clients",
  "/fournisseur/calendar": "Calendrier",
  "/fournisseur/documents": "Documents",
  "/fournisseur/facturation": "Facturation",
  "/fournisseur/equipe": "Equipe",
  "/fournisseur/reports": "Rapports",
  "/espace-client/publications": "Publications",
};

function NavItem({ item }: { item: NavItemType }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-cyan text-white" : "text-slate-100/85 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

export default function FournisseurLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<{
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    api.get("/notifications/").then(res => {
      const data = res.data?.results ?? res.data ?? [];
      setNotifications(data);
    }).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Expert JUSTIA";
  const specialization = "Droit des affaires";

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/fournisseur/clients/")) return "Detail client";
    return titleByPath[location.pathname] ?? "Espace Expert";
  }, [location.pathname]);

  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-[280px] bg-[#001A33] p-6 lg:flex lg:flex-col">
        <div>
          <p className="text-xl font-semibold text-white">JUSTIA</p>
          <p className="text-xs uppercase tracking-wide text-cyan-100">Espace Expert</p>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-900/40 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan/20 text-cyan">
              <UserCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-xs text-cyan-100">{specialization}</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {visibleItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          {/* Notifications sidebar */}
          <NavLink
  to="/fournisseur/notifications"
  className={({ isActive }) =>
    cn(
      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
      isActive ? "bg-cyan text-white" : "text-slate-100/85 hover:bg-white/10 hover:text-white"
    )
  }
>
  <span className="flex items-center gap-2">
    <Bell className="h-4 w-4" />
    Notifications
  </span>
  {unreadCount > 0 && (
    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
  )}
</NavLink>

          <NavLink
  to="/fournisseur/parametres"
  className={({ isActive }) =>
    cn(
      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
      isActive ? "bg-cyan text-white" : "text-slate-100/85 hover:bg-white/10 hover:text-white"
    )
  }
>
  <Settings className="h-4 w-4" />
  Parametres
</NavLink>

          <button
            onClick={() => {
              logout();
              navigate("/client-space/login?espace=expert");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20 hover:text-red-100"
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="fixed left-0 top-0 z-20 h-16 w-full border-b border-slate-200 bg-white px-4 lg:left-[280px] lg:w-[calc(100%-280px)] lg:px-6">
        <div className="flex h-full items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <div className="relative hidden w-[360px] md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher clients, demandes, documents..."
                className="pl-9"
              />
            </div>

            {/* Bouton cloche header */}
            <div className="relative">
              <button
                className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </button>

              {/* Dropdown notifications */}
              {showNotifications && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-sm">Notifications</p>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-slate-400 text-center">Aucune notification</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-slate-50 text-sm ${!n.is_read ? "bg-cyan/5" : ""}`}
                        >
                          <p className="font-medium text-slate-800">{n.title}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{n.message}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            {new Date(n.created_at).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 pb-6 pt-20 lg:ml-[280px] lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}