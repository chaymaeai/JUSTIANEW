import { useMemo, useState } from "react";
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
  Plus,
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  { icon: UserCircle2, label: "Equipe", to: "/fournisseur/equipe", adminOnly: true },
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

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Expert JUSTIA";
  const specialization = "Droit des affaires";
  const notificationsCount = 5;

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/fournisseur/clients/")) return "Detail client";
    return titleByPath[location.pathname] ?? "Espace Expert";
  }, [location.pathname]);

  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-screen bg-slate-50">
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
          <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-100/85 transition hover:bg-white/10 hover:text-white">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </span>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{notificationsCount}</span>
          </button>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-100/85 transition hover:bg-white/10 hover:text-white">
            <Settings className="h-4 w-4" />
            Parametres
          </button>
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
            <button className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </button>
            <Button className="bg-cyan text-white hover:bg-cyan/90">
              <Plus className="mr-1.5 h-4 w-4" />
              Nouvelle demande +
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-6 pt-20 lg:ml-[280px] lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}
