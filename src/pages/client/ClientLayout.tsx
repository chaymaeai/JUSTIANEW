import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, FileText, FolderOpen, LayoutDashboard, LogOut, Menu,
  MessageSquare, Newspaper, Settings, UserCircle2, CalendarDays,
  X, CheckCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardProvider } from "@/pages/client/DashboardContext";
import { api } from "@/services/api";

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
};

const baseNavItems = [
  { icon: LayoutDashboard, label: "Tableau de bord",   to: "/espace-client/dashboard" },
  { icon: FileText,        label: "Mes demandes",       to: "/espace-client/demandes" },
  { icon: MessageSquare,   label: "Mes consultations",  to: "/espace-client/consultations" },
  { icon: CalendarDays,    label: "Mes rendez-vous",    to: "/espace-client/meetings" },
  { icon: FolderOpen,      label: "Mes documents",      to: "/espace-client/documents" },
  { icon: FileText,        label: "Mes factures",       to: "/espace-client/factures" },
  { icon: UserCircle2,     label: "Mon profil",         to: "/espace-client/profil" },
  { icon: Settings,        label: "Paramètres",         to: "/espace-client/parametres" },
];

const titleByPath: Record<string, string> = {
  "/espace-client/dashboard":     "Tableau de bord",
  "/espace-client/demandes":      "Mes demandes",
  "/espace-client/consultations": "Mes consultations",
  "/espace-client/meetings":      "Mes rendez-vous",
  "/espace-client/documents":     "Mes documents",
  "/espace-client/factures":      "Mes factures",
  "/espace-client/profil":        "Mon profil",
  "/espace-client/publications":  "Publications",
  "/espace-client/parametres": "Paramètres",
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
          isActive ? "bg-cyan text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);

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
    setMenuOpen(false);
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

  // ── Divers ────────────────────────────────────────────────
  const pageTitle   = useMemo(() => titleByPath[location.pathname] ?? "Mon espace", [location.pathname]);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Client JUSTIA";

  const navItems = useMemo(() => {
    if (user?.role !== "admin") return baseNavItems;
    const next = [...baseNavItems];
    next.splice(1, 0, { icon: Newspaper, label: "Publications", to: "/espace-client/publications" });
    return next;
  }, [user?.role]);

  const mobileTabs = useMemo(() => navItems.slice(0, 5), [navItems]);

  const handleLogout = () => { logout(); navigate("/client-space/login"); };

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A1628]">

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="fixed left-0 top-0 hidden h-screen w-[260px] border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
          <div className="mb-6">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">JUSTIA</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">Mon espace</p>
          </div>
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/15 text-cyan">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                <span className="inline-flex rounded-full bg-cyan/10 px-2 py-0.5 text-[11px] font-medium text-cyan">
                  {user?.role === "admin" ? "Administrateur" : "Client"}
                </span>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} />
            ))}
          </nav>
          <div className="mt-auto pt-4">
            <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Deconnexion
            </Button>
          </div>
        </aside>

        {/* ── Header ──────────────────────────────────────── */}
        <header className="fixed left-0 top-0 z-30 h-16 w-full border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:left-[260px] lg:w-[calc(100%-260px)] lg:px-6">
          <div className="flex h-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-3">

              {/* ✅ Bouton notifications avec panneau dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={toggleNotif}
                  className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                                <p className={cn("text-xs font-medium", n.is_read ? "text-slate-500" : "text-slate-900 dark:text-white")}>
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
                          onClick={() => { navigate("/espace-client/notifications"); setNotifOpen(false); }}
                          className="w-full text-center text-xs text-cyan-600 hover:underline"
                        >
                          Voir toutes les notifications →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu utilisateur */}
              <div className="relative">
                <button
                  onClick={() => { setMenuOpen(prev => !prev); setNotifOpen(false); }}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <UserCircle2 className="h-5 w-5 text-cyan" />
                  <span className="hidden sm:block">{user?.firstName}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <Link onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" to="/espace-client/profil">
                      <UserCircle2 className="h-4 w-4" /> Mon profil
                    </Link>
                    <Link onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" to="/espace-client/parametres">
                      <Settings className="h-4 w-4" /> Paramètres
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                      <LogOut className="h-4 w-4" /> Deconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Drawer mobile ───────────────────────────────── */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden">
            <div className="h-full w-full bg-white p-5 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">JUSTIA</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Mon espace</p>
                </div>
                <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Fermer</Button>
              </div>
              <nav className="space-y-2">
                {navItems.map(item => (
                  <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} onClick={() => setDrawerOpen(false)} />
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="px-4 pb-28 pt-20 lg:ml-[260px] lg:px-6 lg:pb-6">
          <Outlet />
        </main>

        {/* ── Nav mobile ──────────────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          {mobileTabs.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              cn("flex flex-col items-center gap-1 rounded-md py-1 text-[11px]", isActive ? "text-cyan" : "text-slate-500")
            }>
              <item.icon className="h-4 w-4" />
              <span>{item.label.split(" ")[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </DashboardProvider>
  );
}