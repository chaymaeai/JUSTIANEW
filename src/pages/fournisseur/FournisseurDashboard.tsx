import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardList, Users, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { Link } from "react-router-dom";

interface Demande {
  id: string;
  reference: string;
  client_name: string;
  domain_display: string;
  urgency: string;
  status: string;
  status_display: string;
  created_at: string;
  assigned_to_name: string | null;
}

interface Stats {
  total: number;
  en_attente: number;
  en_cours: number;
  traitee: number;
  annulee: number;
  this_month_count: number;
  by_domain: { domain: string; count: number }[];
}

interface RatingStats {
  average: number;
  total: number;
  breakdown: Record<number, number>; // { 1: x, 2: x, 3: x, 4: x, 5: x }
}

const URGENCY_STYLES: Record<string, string> = {
  normale:  "bg-slate-100 text-slate-700 border-slate-200",
  urgente:  "bg-amber-100 text-amber-700 border-amber-200",
  critique: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_STYLES: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  assignee:   "bg-blue-100 text-blue-700",
  en_cours:   "bg-purple-100 text-purple-700",
  traitee:    "bg-emerald-100 text-emerald-700",
  annulee:    "bg-slate-100 text-slate-500",
};

const DOMAIN_COLORS: Record<string, string> = {
  droit_affaires:            "#0ea5e9",
  rgpd:                      "#8b5cf6",
  droit_ia:                  "#f59e0b",
  propriete_intellectuelle:  "#10b981",
  droit_numerique:           "#f97316",
  immobilier:                "#ec4899",
  gouvernance:               "#6366f1",
};

export default function FournisseurDashboard() {
  const [demandes, setDemandes]       = useState<Demande[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [demandesRes, statsRes, ratingRes] = await Promise.allSettled([
          api.get("/demandes/", { params: { page_size: 10, ordering: "-created_at" } }),
          api.get("/demandes/stats/"),
          api.get("/consultations/rating-stats/"),
        ]);
        if (cancelled) return;
        if (demandesRes.status === "fulfilled") {
          setDemandes(demandesRes.value.data?.results ?? demandesRes.value.data ?? []);
        }
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data);
        }
        if (ratingRes.status === "fulfilled") {
          setRatingStats(ratingRes.value.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const activeCount  = stats ? (stats.en_attente + stats.en_cours) : 0;
  const urgentToday  = demandes.filter(d => d.urgency === "urgente" || d.urgency === "critique").length;
  const treatedMonth = stats?.this_month_count ?? 0;

  const kpis = [
    { icon: ClipboardList,    label: "Demandes actives", value: loading ? "…" : String(activeCount) },
    { icon: AlertTriangle,    label: "Urgentes ce jour", value: loading ? "…" : String(urgentToday) },
    { icon: CheckCircle2,     label: "Traitees ce mois", value: loading ? "…" : String(treatedMonth) },
    { icon: CalendarDays,     label: "RDV aujourd'hui",  value: "0" },
    { icon: Users,            label: "Clients actifs",   value: loading ? "…" : String(stats?.total ?? 0) },
    { icon: CircleDollarSign, label: "Revenus ce mois",  value: "0 MAD" },
  ];

  const total = stats?.by_domain?.reduce((s, d) => s + d.count, 0) ?? 0;
  const donutData = (stats?.by_domain ?? []).map(d => ({
    label: d.domain,
    value: total > 0 ? Math.round((d.count / total) * 100) : 0,
    color: DOMAIN_COLORS[d.domain] ?? "#94a3b8",
  }));

  function donutGradient() {
    if (donutData.length === 0) return "conic-gradient(#e2e8f0 0% 100%)";
    let start = 0;
    return `conic-gradient(${donutData.map(s => {
      const end = start + s.value;
      const v = `${s.color} ${start}% ${end}%`;
      start = end;
      return v;
    }).join(", ")})`;
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <kpi.icon className="h-5 w-5 text-cyan" />
              </div>
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">

        {/* Tableau demandes récentes */}
        <Card className="xl:col-span-8">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Demandes recentes</CardTitle>
            <Link to="/fournisseur/demandes" className="text-sm text-cyan hover:underline">
              Voir tout
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Chargement...</p>
            ) : demandes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Aucune demande</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Domaine</th>
                      <th className="px-4 py-3">Urgence</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandes.map((d) => (
                      <tr
                        key={d.id}
                        className={cn(
                          "border-t border-slate-100",
                          d.urgency === "critique" && "border-l-4 border-l-red-500",
                          d.urgency === "urgente"  && "border-l-4 border-l-amber-500"
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-slate-700">{d.client_name}</td>
                        <td className="px-4 py-3">{d.domain_display}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn("border", URGENCY_STYLES[d.urgency])}>
                            {d.urgency}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[d.status])}>
                            {d.status_display}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(d.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/fournisseur/demandes?id=${d.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="mr-1 h-3.5 w-3.5" /> Voir
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colonne droite */}
        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader><CardTitle>Rendez-vous du jour</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Aucun rendez-vous aujourd'hui.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Alertes</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {demandes.filter(d => d.urgency === "critique").length > 0 && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">
                  {demandes.filter(d => d.urgency === "critique").length} demande(s) critique(s)
                </p>
              )}
              {demandes.filter(d => d.urgency === "urgente").length > 0 && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-700">
                  {demandes.filter(d => d.urgency === "urgente").length} demande(s) urgente(s)
                </p>
              )}
              {demandes.filter(d => d.urgency === "critique").length === 0 &&
               demandes.filter(d => d.urgency === "urgente").length === 0 && (
                <p className="text-slate-400">Aucune alerte active.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Graphiques */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Demandes par domaine</CardTitle></CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune donnée</p>
            ) : (
              <>
                <div
                  className="mx-auto h-44 w-44 rounded-full"
                  style={{ background: donutGradient() }}
                />
                <div className="mt-4 space-y-2 text-sm">
                  {donutData.map((item) => (
                    <p key={item.label} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label} — {item.value}%
                    </p>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Répartition des statuts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats ? (
              [
                { label: "En attente", value: stats.en_attente, color: "bg-yellow-400" },
                { label: "En cours",   value: stats.en_cours,   color: "bg-purple-400" },
                { label: "Traitées",   value: stats.traitee,    color: "bg-emerald-400" },
                { label: "Annulées",   value: stats.annulee,    color: "bg-slate-300" },
              ].map(row => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full", row.color)}
                      style={{ width: stats.total > 0 ? `${Math.round((row.value / stats.total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Chargement...</p>
            )}
          </CardContent>
        </Card>

        {/* ✅ Satisfaction clients avec vraies données */}
        <Card>
          <CardHeader><CardTitle>Satisfaction clients</CardTitle></CardHeader>
          <CardContent>
            {!ratingStats || ratingStats.total === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Aucune évaluation pour le moment.
              </p>
            ) : (
              <div className="space-y-4">

                {/* Note moyenne */}
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-900 dark:text-white">
                    {ratingStats.average}
                    <span className="text-lg font-normal text-slate-400">/5</span>
                  </p>
                  <div className="mt-1 flex justify-center gap-0.5 text-2xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= Math.round(ratingStats.average) ? "text-amber-400" : "text-slate-200"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {ratingStats.total} avis
                  </p>
                </div>

                {/* Barres par étoile (5 → 1) */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingStats.breakdown[star] ?? 0;
                    const pct = ratingStats.total > 0
                      ? Math.round((count / ratingStats.total) * 100)
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right text-slate-500">{star}</span>
                        <span className="text-amber-400">★</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}