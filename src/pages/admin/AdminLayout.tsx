import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  Settings,
  UserCircle2,
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItemType = {
  icon: typeof LayoutDashboard;
  label: string;
  to: string;
};

const navItems: NavItemType[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", to: "/admin/dashboard" },
  { icon: Users, label: "Experts", to: "/admin/experts" },
  { icon: FileText, label: "Clients", to: "/admin/clients" },
  { icon: BarChart3, label: "Rapports", to: "/admin/reports" },
  { icon: Settings, label: "Paramètres", to: "/admin/settings" },
  { icon: FileText, label: "Dossiers", to: "/admin/demandes" },
];

const titleByPath: Record<string, string> = {
  "/admin/dashboard": "Tableau de bord",
  "/admin/experts": "Gestion des experts",
  "/admin/clients": "Clients",
  "/admin/reports": "Rapports",
  "/admin/settings": "Paramètres",
  "/admin/demandes": "Gestion des dossiers",
};

function NavItem({ icon: Icon, label, to, onClick }: { icon: typeof LayoutDashboard; label: string; to: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-cyan text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle = useMemo(() => titleByPath[location.pathname] ?? "Administration", [location.pathname]);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Admin JUSTIA";

  const handleLogout = () => {
    logout();
    navigate("/client-space/login?espace=admin");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A1628]">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-[260px] border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <div className="mb-6">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">JUSTIA</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">Administration</p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
              <span className="inline-flex rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400">
                Administrateur
              </span>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <Settings className="h-4 w-4 mr-2" />
            Mon profil
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <p className="font-semibold text-slate-900 dark:text-white">JUSTIA</p>
        <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-2 text-slate-600 dark:text-slate-300">
          {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 top-14 z-30 flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} onClick={() => setDrawerOpen(false)} />
            ))}
          </nav>
          <div className="mt-auto space-y-2 border-t border-slate-200 p-4 dark:border-slate-700">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Mon profil
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-600 dark:text-red-400">
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-[260px]">
        <div className="mt-14 lg:mt-0 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{pageTitle}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gestion de la plateforme Justia</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800">
                <UserCircle2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
