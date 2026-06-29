import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  type?: string;           // ✅ backend envoie "type", pas "notification_type"
  read_at?: string | null;
  demande_id?: string | null;
  consultation_id?: string | null;
  document_id?: string | null;
  invoice_id?: string | null;
}

type FilterType = "all" | "unread" | "nouveau_message" | "rdv_confirme" | "rdv_rappel" | "rdv_annule" | "facture_disponible" | "rapport_disponible" | "statut_modifie";

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  nouveau_message:     { label: "Message",       icon: "💬", color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  rdv_confirme:        { label: "Rendez-vous",   icon: "📅", color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  rdv_rappel:          { label: "Rappel RDV",    icon: "⏰", color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  rdv_annule:          { label: "RDV annulé",    icon: "❌", color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  facture_disponible:  { label: "Facture",       icon: "✅", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  facture_en_retard:   { label: "Facture",       icon: "🔴", color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  rapport_disponible:  { label: "Rapport",       icon: "📄", color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  document_ajoute:     { label: "Document",      icon: "📎", color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  statut_modifie:      { label: "Dossier",       icon: "📁", color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-800/50" },
  nouvelle_demande:    { label: "Demande",       icon: "📋", color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-800/50" },
  demande_assignee:    { label: "Assignée",      icon: "👤", color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  demande_traitee:     { label: "Traitée",       icon: "✔️", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  consultation_planifiee: { label: "Consultation", icon: "📅", color: "text-cyan-600",  bg: "bg-cyan-50 dark:bg-cyan-950/30" },
};

const DEFAULT_META = { label: "Notification", icon: "🔔", color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800/50" };

function getMeta(type?: string) {
  return type && TYPE_META[type] ? TYPE_META[type] : DEFAULT_META;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function ClientNotifications() {
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [connected, setConnected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await api.get("/notifications/", {
        params: { page: pageNum, page_size: 20 },
      });
      console.log("✅ Réponse API:", res.status, res.data);
      const data: Notification[] = res.data?.results ?? res.data ?? [];
      const count: number = res.data?.count ?? data.length;
      setNotifications(prev => append ? [...prev, ...data] : data);
      setHasMore(pageNum * 20 < count);
    } catch (err) {
      console.error("❌ Erreur API notifications:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── WebSocket temps réel ───────────────────────────────────
  const connectWS = useCallback(() => {
    try {
      const token = localStorage.getItem("justia_token");
      if (!token) return;
      const wsUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api")
        .replace(/^http/, "ws")
        .replace("/api", "");
      const ws = new WebSocket(`${wsUrl}/ws/notifications/?token=${token}`);

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        window.setTimeout(connectWS, 5000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "notification_message") {
            // ✅ backend envoie type="notification_message" avec data=payload
            const notif: Notification = data.data;
            setNotifications(prev => [notif, ...prev]);
            if ("vibrate" in navigator) navigator.vibrate(200);
          }
        } catch {}
      };
      wsRef.current = ws;
    } catch {
      // fallback polling
    }
  }, []);

  // ── Polling fallback toutes les 30s ───────────────────────
  useEffect(() => {
    void fetchNotifications(1);
    connectWS();

    pollingRef.current = setInterval(() => {
      if (!connected) void fetchNotifications(1);
    }, 30_000);

    return () => {
      wsRef.current?.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchNotifications, connectWS, connected]);

  // ── Actions ───────────────────────────────────────────────

  // ✅ POST /notifications/{id}/read/  (pas PATCH)
  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.post(`/notifications/${id}/read/`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch {}
  };

  // ✅ POST /notifications/read-all/  (pas mark-all-read)
  const markAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all/");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    await fetchNotifications(next, true);
  };

  // ── Filtres ───────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "all") return true;
    return n.type === filter;   // ✅ "type" et non "notification_type"
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filterTabs: Array<{ id: FilterType; label: string; icon: string }> = [
    { id: "all",                label: "Tout",         icon: "🔔" },
    { id: "unread",             label: "Non lus",      icon: "🔵" },
    { id: "nouveau_message",    label: "Messages",     icon: "💬" },
    { id: "rdv_confirme",       label: "Rendez-vous",  icon: "📅" },
    { id: "facture_disponible", label: "Factures",     icon: "✅" },
    { id: "statut_modifie",     label: "Dossiers",     icon: "📁" },
    { id: "rdv_rappel",         label: "Rappels",      icon: "⏰" },
    { id: "rapport_disponible", label: "Rapports",     icon: "📄" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
              <p className="text-xs text-slate-400">
                {connected ? "Temps réel actif" : "Polling toutes les 30s"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                ${filter === tab.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.id === "unread" && unreadCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filter === "unread" ? "bg-white/20" : "bg-red-100 text-red-600"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {loading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b border-slate-100 dark:border-slate-800 p-4 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2 w-1/4 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-2xl">
                🔔
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {filter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            <div>
              {filtered.map((n, idx) => {
                const meta = getMeta(n.type);   // ✅ "type"
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`group relative flex cursor-pointer items-start gap-3 p-4 transition-colors
                      ${idx < filtered.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}
                      ${!n.is_read
                        ? "bg-cyan-50/50 dark:bg-cyan-950/10 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                  >
                    {/* Icône type */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${meta.bg}`}
                    >
                      {meta.icon}
                    </div>

                    {/* Contenu */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-sm font-medium ${
                              !n.is_read
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {n.title}
                          </p>
                          {n.type && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color} ${meta.bg}`}
                            >
                              {meta.label}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400 mt-0.5">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {n.message}
                      </p>
                    </div>

                    {/* Indicateur non lu + bouton marquer */}
                    <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5">
                      {!n.is_read ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-cyan-500" />
                          <button
                            onClick={(e) => markAsRead(n.id, e)}
                            className="hidden group-hover:flex items-center justify-center rounded-full h-5 w-5 bg-cyan-100 dark:bg-cyan-900 text-cyan-600"
                            title="Marquer comme lu"
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-3 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-xs font-medium text-cyan-600 hover:underline disabled:opacity-50"
                  >
                    {loadingMore ? "Chargement…" : "Voir plus"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}