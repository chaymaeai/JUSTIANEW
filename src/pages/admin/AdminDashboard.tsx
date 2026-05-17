import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Users, FileText, TrendingUp, AlertCircle, Clock, UserCheck, Activity, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalClients: number;
  totalExperts: number;
  activeConsultations: number;
  pendingRequests: number;
}

type Demande = {
  id: string;
  reference: string;
  client_name: string;
  domain_display: string;
  urgency: string;
  status: string;
  status_display: string;
  created_at: string;
};

type Expert = {
  id: string;
  full_name: string;
  email: string;
  specialization: string[];
  is_verified: boolean;
  created_at: string;
};

type Client = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_verified: boolean;
  demandes_count: number;
};

type Consultation = {
  id: string;
  client_name?: string;
  expert_name?: string;
  scheduled_at: string;
  status: string;
  consultation_type?: string;
};

const URGENCY_STYLES: Record<string, string> = {
  normale:  "bg-slate-100 text-slate-700",
  urgente:  "bg-amber-100 text-amber-700",
  critique: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  assignee:   "bg-blue-100 text-blue-700",
  en_cours:   "bg-purple-100 text-purple-700",
  traitee:    "bg-emerald-100 text-emerald-700",
  annulee:    "bg-slate-100 text-slate-500",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();

  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [demandes, setDemandes]         = useState<Demande[]>([]);
  const [experts, setExperts]           = useState<Expert[]>([]);
  const [clients, setClients]           = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [clientsRes, expertsRes, demandesRes, consultationsRes] = await Promise.allSettled([
          api.get("/auth/staff/clients/"),
          api.get("/experts/admin/list/"),
          api.get("/demandes/", { params: { page_size: 5, ordering: "-created_at" } }),
          api.get("/consultations/", { params: { page_size: 5, ordering: "-scheduled_at" } }),
        ]);

        const clientsData: Client[] = clientsRes.status === "fulfilled"
          ? (Array.isArray(clientsRes.value.data) ? clientsRes.value.data : clientsRes.value.data?.results ?? [])
          : [];

        const expertsData: Expert[] = expertsRes.status === "fulfilled"
          ? (Array.isArray(expertsRes.value.data) ? expertsRes.value.data : expertsRes.value.data?.results ?? [])
          : [];

        const demandesData: Demande[] = demandesRes.status === "fulfilled"
          ? (demandesRes.value.data?.results ?? demandesRes.value.data ?? [])
          : [];

        const consultationsData: Consultation[] = consultationsRes.status === "fulfilled"
          ? (consultationsRes.value.data?.results ?? consultationsRes.value.data ?? [])
          : [];

        setClients(clientsData);
        setExperts(expertsData);
        setDemandes(demandesData);
        setConsultations(consultationsData);

        setStats({
          totalClients: clientsData.length,
          totalExperts: expertsData.length,
          activeConsultations: consultationsData.filter(c => c.status === "planifiee" || c.status === "en_cours").length,
          pendingRequests: demandesData.filter(d => d.status === "en_attente").length,
        });
      } catch (err) {
        setError("Erreur lors du chargement des statistiques");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [location.pathname, location.key]);

  const statCards = [
    { label: "Clients",               value: stats?.totalClients ?? "—",        icon: Users,       color: "bg-blue-500/10 text-blue-600" },
    { label: "Experts",               value: stats?.totalExperts ?? "—",         icon: UserCheck,   color: "bg-purple-500/10 text-purple-600" },
    { label: "Consultations actives", value: stats?.activeConsultations ?? "—",  icon: TrendingUp,  color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Demandes en attente",   value: stats?.pendingRequests ?? "—",      icon: AlertCircle, color: "bg-amber-500/10 text-amber-600" },
  ];

  // Demandes urgentes/critiques
  const urgentDemandes = demandes.filter(d => d.urgency === "urgente" || d.urgency === "critique");

  // Experts non vérifiés
  const unverifiedExperts = experts.filter(e => !e.is_verified);

  // Derniers clients inscrits
  const recentClients = [...clients]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                      {isLoading ? "..." : card.value}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Alertes urgentes ─────────────────────────────────── */}
      {urgentDemandes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Bell className="h-5 w-5" />
              {urgentDemandes.length} demande(s) urgente(s) ou critique(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentDemandes.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge className={URGENCY_STYLES[d.urgency]}>{d.urgency}</Badge>
                    <span className="font-medium">{d.client_name}</span>
                    <span className="text-slate-500">{d.domain_display}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(d.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <Badge className={STATUS_STYLES[d.status]}>{d.status_display}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Demandes récentes ─────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan" /> Demandes récentes
            </CardTitle>
            <Link to="/admin/demandes" className="text-sm text-cyan hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Chargement...</p>
            ) : demandes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Aucune demande.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Client</th>
                    <th className="px-4 py-2">Domaine</th>
                    <th className="px-4 py-2">Urgence</th>
                    <th className="px-4 py-2">Statut</th>
                    <th className="px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((d) => (
                    <tr key={d.id} className={cn(
                      "border-t border-slate-100",
                      d.urgency === "critique" && "border-l-4 border-l-red-500",
                      d.urgency === "urgente" && "border-l-4 border-l-amber-500"
                    )}>
                      <td className="px-4 py-2 font-medium">{d.client_name}</td>
                      <td className="px-4 py-2 text-slate-500">{d.domain_display}</td>
                      <td className="px-4 py-2">
                        <Badge className={cn("text-xs", URGENCY_STYLES[d.urgency])}>{d.urgency}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[d.status])}>
                          {d.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* ── Colonne droite ────────────────────────────────── */}
        <div className="space-y-4">

          {/* Experts en attente de validation */}
          <Card className={unverifiedExperts.length > 0 ? "border-purple-200" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-purple-600" />
                Experts à valider
                {unverifiedExperts.length > 0 && (
                  <Badge className="bg-purple-100 text-purple-700 ml-auto">
                    {unverifiedExperts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : unverifiedExperts.length === 0 ? (
                <p className="text-xs text-slate-400">Tous les experts sont vérifiés.</p>
              ) : (
                <div className="space-y-2">
                  {unverifiedExperts.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{e.full_name}</p>
                        <p className="text-xs text-slate-400">{e.email}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-700 text-xs">Non vérifié</Badge>
                    </div>
                  ))}
                  {unverifiedExperts.length > 3 && (
                    <p className="text-xs text-slate-400">+{unverifiedExperts.length - 3} autres</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Derniers clients inscrits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" /> Derniers clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : recentClients.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun client.</p>
              ) : (
                <div className="space-y-2">
                  {recentClients.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{c.full_name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(c.created_at).toLocaleDateString("fr-FR")} · {c.demandes_count} demande(s)
                        </p>
                      </div>
                      <Badge className={c.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {c.is_verified ? "✓" : "✗"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prochaines consultations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-emerald-600" /> Prochaines consultations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : consultations.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune consultation.</p>
              ) : (
                <div className="space-y-2">
                  {consultations.slice(0, 4).map((c) => (
                    <div key={c.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <p className="font-medium">{c.expert_name ?? "Expert"}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(c.scheduled_at).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Activité récente + Actions rapides ───────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan" /> Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" asChild>
                <Link to="/admin/experts">
                  <span className="font-semibold">Ajouter un expert</span>
                  <span className="text-xs text-slate-500">Créer un nouveau compte expert</span>
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" asChild>
                <Link to="/admin/clients">
                  <span className="font-semibold">Voir les clients</span>
                  <span className="text-xs text-slate-500">Liste de tous les clients inscrits</span>
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" asChild>
                <Link to="/admin/reports">
                  <span className="font-semibold">Rapports</span>
                  <span className="text-xs text-slate-500">Génération de rapports mensuels</span>
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" asChild>
                <Link to="/admin/parametres">
                  <span className="font-semibold">Paramètres</span>
                  <span className="text-xs text-slate-500">Configuration de la plateforme</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profil admin */}
        <Card>
          <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                {user?.firstName?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Nom</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {user ? `${user.firstName} ${user.lastName}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="font-semibold text-slate-900 dark:text-white">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Rôle</p>
                <Badge className="bg-blue-100 text-blue-700">Administrateur</Badge>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Modifier le profil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}