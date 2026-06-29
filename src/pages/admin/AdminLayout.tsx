import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, LogOut, Menu, Settings, UserCircle2,
  LayoutDashboard, Users, FileText, BarChart3,
  X, CheckCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";

type NavItemType = {
  icon: typeof LayoutDashboard;
  label: string;
  to: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
};

const navItems: NavItemType[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", to: "/admin/dashboard" },
  { icon: Users,           label: "Experts",         to: "/admin/experts" },
  { icon: FileText,        label: "Clients",         to: "/admin/clients" },
  { icon: BarChart3,       label: "Rapports",        to: "/admin/reports" },
  { icon: Settings,        label: "Paramètres",      to: "/admin/settings" },
  { icon: FileText,        label: "Dossiers",        to: "/admin/demandes" },
];

const titleByPath: Record<string, string> = {
  "/admin/dashboard": "Tableau de bord",
  "/admin/experts":   "Gestion des experts",
  "/admin/clients":   "Clients",
  "/admin/reports":   "Rapports",
  "/admin/settings":  "Paramètres",
  "/admin/demandes":  "Gestion des dossiers",
};

function NavItem({ icon: Icon, label, to, onClick }: {
  icon: typeof LayoutDashboard; label: string; to: string; onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-cyan text-white"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
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

  // ── Notifications ─────────────────────────────────────────
  const [notifs, setNotifs]             = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await api.get("/notifications/", { params: { page_size: 20 } });
      setNotifs(res.data?.results ?? res.data ?? []);
    } catch {
      // Silencieux si endpoint inexistant
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/`, { is_read: true });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read/");
    } catch {}
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const toggleNotif = () => {
    if (!notifOpen) void fetchNotifs();
    setNotifOpen(prev => !prev);
  };

  // Fermer en cliquant en dehors
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Polling toutes les 60s
  useEffect(() => {
    void fetchNotifs();
    const interval = setInterval(() => void fetchNotifs(), 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const pageTitle   = useMemo(() => titleByPath[location.pathname] ?? "Administration", [location.pathname]);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Admin JUSTIA";

  const handleLogout = () => {
    logout();
    navigate("/client-space/login?espace=admin");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A1628]">

      {/* ── Sidebar desktop ─────────────────────────────────── */}
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
          {navItems.map(item => (
            <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <Settings className="mr-2 h-4 w-4" /> Mon profil
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* ── Header mobile ───────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <p className="font-semibold text-slate-900 dark:text-white">JUSTIA</p>
        <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-2 text-slate-600 dark:text-slate-300">
          {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Drawer mobile ───────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 top-14 z-30 flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <nav className="space-y-1 p-4">
            {navItems.map(item => (
              <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} onClick={() => setDrawerOpen(false)} />
            ))}
          </nav>
          <div className="mt-auto space-y-2 border-t border-slate-200 p-4 dark:border-slate-700">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" /> Mon profil
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-600 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      )}

      {/* ── Contenu principal ────────────────────────────────── */}
      <main className="lg:ml-[260px]">

        {/* Sub-header avec titre + notifications */}
        <div className="mt-14 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:mt-0 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{pageTitle}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gestion de la plateforme Justia</p>
            </div>

            <div className="flex items-center gap-3">

              {/* ✅ Bouton notifications avec panneau dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={toggleNotif}
                  className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* ✅ Panneau dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">

                    {/* En-tête */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                            {unreadCount} non lue(s)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="flex items-center gap-1 text-xs text-cyan-600 hover:underline"
                          >
                            <CheckCheck className="h-3.5 w-3.5" /> Tout lire
                          </button>
                        )}
                        <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Liste */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifLoading ? (
                        <p className="py-6 text-center text-xs text-slate-400">Chargement...</p>
                      ) : notifs.length === 0 ? (
                        <div className="py-8 text-center">
                          <Bell className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                          <p className="text-xs text-slate-400">Aucune notification</p>
                        </div>
                      ) : (
                        notifs.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              void markAsRead(n.id);
                              if (n.link) navigate(n.link);
                              setNotifOpen(false);
                            }}
                            className={cn(
                              "cursor-pointer border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800",
                              !n.is_read && "bg-cyan-50/60 dark:bg-cyan-900/10"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span className={cn(
                                "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                                n.is_read ? "bg-transparent" : "bg-cyan-500"
                              )} />
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "text-xs font-medium",
                                  n.is_read ? "text-slate-500" : "text-slate-900 dark:text-white"
                                )}>
                                  {n.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {new Date(n.created_at).toLocaleString("fr-FR", {
                                    day: "2-digit", month: "short",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pied */}
                    {notifs.length > 0 && (
                      <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                        <button
                          onClick={() => { navigate("/admin/notifications"); setNotifOpen(false); }}
                          className="w-full text-center text-xs text-cyan-600 hover:underline"
                        >
                          Voir toutes les notifications →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bouton profil */}
              <button
                onClick={() => navigate("/admin/settings")}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Mon profil"
              >
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