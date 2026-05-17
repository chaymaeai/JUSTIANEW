import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import {
  TrendingUp, Clock, AlertTriangle, FileText,
  Download, RefreshCw, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────
type Demande = {
  id: string;
  reference: string;
  client_name: string;
  domain: string;
  domain_display: string;
  urgency: string;
  status: string;
  status_display: string;
  created_at: string;
  avg_treatment_days?: number;
};

type ComputedStats = {
  total: number;
  en_attente: number;
  en_cours: number;
  traitee: number;
  annulee: number;
  this_period_count: number;
  by_domain: { domain: string; label: string; count: number }[];
  urgentCount: number;
  critiqueCount: number;
};

// ── Constantes ─────────────────────────────────────────────────
const DOMAIN_LABELS: Record<string, string> = {
  droit_affaires:           "Droit des affaires",
  rgpd:                     "RGPD",
  droit_ia:                 "Droit IA",
  propriete_intellectuelle: "Propriété intellectuelle",
  droit_numerique:          "Droit numérique",
  immobilier:               "Immobilier",
  gouvernance:              "Gouvernance",
};

const DOMAIN_COLORS: Record<string, string> = {
  droit_affaires:           "#0ea5e9",
  rgpd:                     "#8b5cf6",
  droit_ia:                 "#f59e0b",
  propriete_intellectuelle: "#10b981",
  droit_numerique:          "#f97316",
  immobilier:               "#ec4899",
  gouvernance:              "#6366f1",
};

const PERIOD_OPTIONS = [
  { value: "7d",  label: "7 derniers jours",  days: 7 },
  { value: "1m",  label: "1 mois",            days: 30 },
  { value: "3m",  label: "3 mois",            days: 90 },
  { value: "6m",  label: "6 mois",            days: 180 },
  { value: "1y",  label: "1 an",              days: 365 },
];

// ── Helper : calcul des stats depuis les demandes filtrées ─────
function computeStats(demandes: Demande[], periodDays: number): ComputedStats {
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const inPeriod = demandes.filter(d => new Date(d.created_at) >= cutoff);

  const byDomainMap: Record<string, number> = {};
  inPeriod.forEach(d => {
    const key = d.domain ?? "autre";
    byDomainMap[key] = (byDomainMap[key] ?? 0) + 1;
  });

  return {
    total:            inPeriod.length,
    en_attente:       inPeriod.filter(d => d.status === "en_attente").length,
    en_cours:         inPeriod.filter(d => d.status === "en_cours" || d.status === "assignee").length,
    traitee:          inPeriod.filter(d => d.status === "traitee").length,
    annulee:          inPeriod.filter(d => d.status === "annulee").length,
    this_period_count: inPeriod.length,
    urgentCount:      inPeriod.filter(d => d.urgency === "urgente").length,
    critiqueCount:    inPeriod.filter(d => d.urgency === "critique").length,
    by_domain: Object.entries(byDomainMap)
      .map(([domain, count]) => ({ domain, label: DOMAIN_LABELS[domain] ?? domain, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ── Export PDF professionnel ────────────────────────────────────
function generatePDF(stats: ComputedStats, periodLabel: string, demandes: Demande[]) {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const treatmentRate = stats.total > 0 ? ((stats.traitee / stats.total) * 100).toFixed(1) : "0";
  const cancelRate    = stats.total > 0 ? ((stats.annulee / stats.total) * 100).toFixed(1) : "0";
  const effScore = Math.max(0, Math.min(100, Math.round((Number(treatmentRate) - Number(cancelRate)) * 1.2)));

  const recentRows = demandes.slice(0, 15).map(d => `
    <tr>
      <td>${d.reference}</td>
      <td>${d.client_name}</td>
      <td>${DOMAIN_LABELS[d.domain] ?? d.domain_display}</td>
      <td><span class="badge badge-${d.urgency}">${d.urgency}</span></td>
      <td><span class="badge badge-status-${d.status}">${d.status_display}</span></td>
      <td>${new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
    </tr>
  `).join("");

  const domainRows = stats.by_domain.map(d => {
    const pct = stats.total > 0 ? Math.round((d.count / stats.total) * 100) : 0;
    const color = DOMAIN_COLORS[d.domain] ?? "#94a3b8";
    return `
      <tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;"></span>${d.label}</td>
        <td style="text-align:center;">${d.count}</td>
        <td style="text-align:center;">${pct}%</td>
        <td>
          <div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%;">
            <div style="background:${color};height:8px;border-radius:4px;width:${pct}%;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Rapport JUSTIA — ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }

    /* ── En-tête ── */
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: #fff; padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
    .header-logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .header-sub { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .header-meta { text-align: right; font-size: 12px; opacity: 0.9; line-height: 1.8; }

    /* ── Corps ── */
    .body { padding: 32px 40px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 28px 0 14px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }

    /* ── KPI grid ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 8px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #f8fafc; }
    .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .kpi-card.highlight { border-color: #0ea5e9; background: #f0f9ff; }
    .kpi-card.highlight .kpi-value { color: #0ea5e9; }
    .kpi-card.success .kpi-value { color: #10b981; }
    .kpi-card.warning .kpi-value { color: #f59e0b; }
    .kpi-card.danger .kpi-value { color: #ef4444; }

    /* ── Performance ── */
    .perf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .perf-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .perf-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    .perf-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 6px; }

    /* ── Tableaux ── */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 9px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }

    /* ── Badges ── */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
    .badge-normale   { background: #f1f5f9; color: #64748b; }
    .badge-urgente   { background: #fef3c7; color: #92400e; }
    .badge-critique  { background: #fee2e2; color: #991b1b; }
    .badge-status-en_attente { background: #fef9c3; color: #713f12; }
    .badge-status-assignee   { background: #dbeafe; color: #1e40af; }
    .badge-status-en_cours   { background: #ede9fe; color: #4c1d95; }
    .badge-status-traitee    { background: #d1fae5; color: #065f46; }
    .badge-status-annulee    { background: #f1f5f9; color: #475569; }

    /* ── Insights ── */
    .insight { display: flex; gap: 8px; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 12px; }
    .insight.ok      { background: #f0fdf4; color: #166534; border-left: 3px solid #22c55e; }
    .insight.warning { background: #fffbeb; color: #92400e; border-left: 3px solid #f59e0b; }
    .insight.danger  { background: #fef2f2; color: #991b1b; border-left: 3px solid #ef4444; }

    /* ── Pied de page ── */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 11px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="header">
    <div>
      <div class="header-logo">JUSTIA</div>
      <div class="header-sub">Rapport d'activité — ${periodLabel}</div>
    </div>
    <div class="header-meta">
      <div>Généré le ${date}</div>
      <div>Période : ${periodLabel}</div>
      <div>Total dossiers analysés : ${stats.total}</div>
    </div>
  </div>

  <div class="body">

    <!-- KPIs -->
    <div class="section-title">Indicateurs clés</div>
    <div class="kpi-grid">
      <div class="kpi-card highlight">
        <div class="kpi-label">Total dossiers</div>
        <div class="kpi-value">${stats.total}</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">En attente</div>
        <div class="kpi-value">${stats.en_attente}</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Traités</div>
        <div class="kpi-value">${stats.traitee}</div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-label">Annulés</div>
        <div class="kpi-value">${stats.annulee}</div>
      </div>
    </div>
    <div class="kpi-grid" style="margin-top:14px;">
      <div class="kpi-card success">
        <div class="kpi-label">Taux traitement</div>
        <div class="kpi-value">${treatmentRate}%</div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-label">Taux annulation</div>
        <div class="kpi-value">${cancelRate}%</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Dossiers urgents</div>
        <div class="kpi-value">${stats.urgentCount + stats.critiqueCount}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">En cours</div>
        <div class="kpi-value">${stats.en_cours}</div>
      </div>
    </div>

    <!-- Performance -->
    <div class="section-title">Résumé de performance</div>
    <div class="perf-grid">
      <div class="perf-card">
        <div class="perf-label">Score d'efficacité</div>
        <div class="perf-value" style="color:${effScore >= 70 ? '#10b981' : effScore >= 40 ? '#f59e0b' : '#ef4444'}">${effScore}/100</div>
      </div>
      <div class="perf-card">
        <div class="perf-label">Nouveaux dossiers (période)</div>
        <div class="perf-value">${stats.this_period_count}</div>
      </div>
      <div class="perf-card">
        <div class="perf-label">Tendance</div>
        <div class="perf-value" style="font-size:16px;">${stats.this_period_count > stats.total * 0.15 ? "📈 Croissance" : "📊 Stable"}</div>
      </div>
    </div>

    <!-- Domaines -->
    <div class="section-title">Répartition par domaine</div>
    <table>
      <thead>
        <tr>
          <th>Domaine</th>
          <th style="text-align:center;">Dossiers</th>
          <th style="text-align:center;">Part</th>
          <th style="width:200px;">Progression</th>
        </tr>
      </thead>
      <tbody>${domainRows}</tbody>
    </table>

    <!-- Demandes récentes -->
    <div class="section-title">Demandes récentes (${Math.min(15, demandes.length)} sur ${demandes.length})</div>
    <table>
      <thead>
        <tr>
          <th>Référence</th>
          <th>Client</th>
          <th>Domaine</th>
          <th>Urgence</th>
          <th>Statut</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>${recentRows}</tbody>
    </table>

    <!-- Analyse qualitative -->
    <div class="section-title">Analyse qualitative</div>
    ${Number(treatmentRate) >= 70
      ? `<div class="insight ok"><span>✓</span> Excellent taux de traitement (${treatmentRate}%).</div>`
      : `<div class="insight warning"><span>⚠</span> Taux de traitement à améliorer (${treatmentRate}%).</div>`}
    ${stats.en_attente > stats.traitee
      ? `<div class="insight danger"><span>🚨</span> Volume en attente (${stats.en_attente}) dépasse les dossiers traités (${stats.traitee}).</div>`
      : `<div class="insight ok"><span>✓</span> Flux de traitement équilibré.</div>`}
    ${stats.urgentCount + stats.critiqueCount > 0
      ? `<div class="insight warning"><span>⚠</span> ${stats.urgentCount + stats.critiqueCount} dossier(s) urgent(s) ou critique(s) nécessitent une attention immédiate.</div>`
      : `<div class="insight ok"><span>✓</span> Aucun dossier critique en attente.</div>`}
    ${stats.by_domain.length > 0
      ? `<div class="insight ok"><span>📊</span> Domaine le plus actif : <strong>${stats.by_domain[0].label}</strong> avec ${stats.by_domain[0].count} dossier(s).</div>`
      : ""}

    <div class="footer">
      <span>JUSTIA — Rapport confidentiel</span>
      <span>Généré automatiquement le ${date}</span>
    </div>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Autorisez les popups pour générer le PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

// ══════════════════════════════════════════════════════════════
export default function FournisseurReports() {
  const [allDemandes, setAllDemandes] = useState<Demande[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState("");
  const [period, setPeriod]           = useState("6m");

  // ── Charger TOUTES les demandes une seule fois ─────────────
  const fetchDemandes = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      const res = await api.get("/demandes/", { params: { page_size: 500, ordering: "-created_at" } });
      setAllDemandes(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchDemandes(); }, [fetchDemandes]);

  // ── Stats calculées côté frontend selon la période ─────────
  const periodDays = PERIOD_OPTIONS.find(p => p.value === period)?.days ?? 180;
  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label ?? "6 mois";

  // ✅ Recalcul automatique quand period OU allDemandes changent
  const stats = useMemo(
    () => computeStats(allDemandes, periodDays),
    [allDemandes, periodDays]
  );

  // ── Demandes filtrées pour la période ─────────────────────
  const filteredDemandes = useMemo(() => {
    const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    return allDemandes.filter(d => new Date(d.created_at) >= cutoff);
  }, [allDemandes, periodDays]);

  const treatmentRate = stats.total > 0 ? ((stats.traitee / stats.total) * 100).toFixed(1) : "0";
  const cancelRate    = stats.total > 0 ? ((stats.annulee / stats.total) * 100).toFixed(1) : "0";
  const effScore = Math.max(0, Math.min(100, Math.round((Number(treatmentRate) - Number(cancelRate)) * 1.2)));

  const kpiBlocks = [
    { label: "Total dossiers",  value: stats.total,         icon: FileText,      iconColor: "text-cyan-500" },
    { label: "En attente",      value: stats.en_attente,    icon: Clock,         iconColor: "text-amber-500" },
    { label: "En cours",        value: stats.en_cours,      icon: TrendingUp,    iconColor: "text-blue-500" },
    { label: "Traités",         value: stats.traitee,       icon: CheckCircle2,  iconColor: "text-emerald-500" },
    { label: "Annulés",         value: stats.annulee,       icon: XCircle,       iconColor: "text-red-500" },
    { label: "Taux traitement", value: `${treatmentRate}%`, icon: TrendingUp,    iconColor: "text-emerald-500" },
    { label: "Taux annulation", value: `${cancelRate}%`,    icon: AlertTriangle, iconColor: "text-rose-500" },
    { label: "Urgents/Critiques", value: stats.urgentCount + stats.critiqueCount, icon: AlertTriangle, iconColor: "text-red-600" },
  ];

  const statusBars = [
    { label: "En attente", value: stats.en_attente, color: "bg-amber-400" },
    { label: "En cours",   value: stats.en_cours,   color: "bg-blue-400" },
    { label: "Traités",    value: stats.traitee,    color: "bg-emerald-400" },
    { label: "Annulés",    value: stats.annulee,    color: "bg-red-400" },
  ];
  const maxVal = Math.max(...statusBars.map(i => i.value), 1);

  // ── Export CSV ─────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Référence", "Client", "Domaine", "Urgence", "Statut", "Date"];
    const rows = filteredDemandes.map(d => [
      d.reference, d.client_name,
      DOMAIN_LABELS[d.domain] ?? d.domain_display,
      d.urgency, d.status_display,
      new Date(d.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_justia_${period}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-sm text-slate-400">
      Chargement des rapports...
    </div>
  );

  if (error) return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
      {error}
      <Button variant="outline" size="sm" className="ml-4" onClick={() => void fetchDemandes()}>
        Réessayer
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── En-tête ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="font-semibold text-slate-900">Rapports</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* ✅ Filtre période — met à jour les stats immédiatement */}
            <select
              value={period}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {PERIOD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => void fetchDemandes(true)} disabled={refreshing}>
              <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "..." : "Actualiser"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => generatePDF(stats, periodLabel, filteredDemandes)}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button size="sm" className="bg-cyan-500 text-white hover:bg-cyan-600" onClick={exportCSV}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI cards ────────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiBlocks.map((block) => {
          const Icon = block.icon;
          return (
            <Card key={block.label}>
              <CardContent className="p-5">
                <div className="mb-2"><Icon className={cn("h-5 w-5", block.iconColor)} /></div>
                <p className="text-sm text-slate-500">{block.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{block.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* ── Barres + Domaines ─────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Répartition des dossiers</CardTitle>
            <span className="text-xs text-slate-400">{periodLabel}</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusBars.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full transition-all duration-500", item.color)}
                    style={{ width: `${(item.value / maxVal) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Demandes par domaine</CardTitle>
            <span className="text-xs text-slate-400">{periodLabel}</span>
          </CardHeader>
          <CardContent>
            {stats.by_domain.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Aucune donnée pour cette période.</p>
            ) : (
              <div className="space-y-3">
                {stats.by_domain.map((d) => {
                  const pct = stats.total > 0 ? Math.round((d.count / stats.total) * 100) : 0;
                  const color = DOMAIN_COLORS[d.domain] ?? "#94a3b8";
                  return (
                    <div key={d.domain}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          {d.label}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {d.count} <span className="text-xs font-normal text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Performance ──────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Résumé performance — {periodLabel}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Nouveaux dossiers</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.this_period_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Score d'efficacité</p>
            <p className={cn("mt-1 text-2xl font-semibold",
              effScore >= 70 ? "text-emerald-600" : effScore >= 40 ? "text-amber-600" : "text-red-600"
            )}>
              {effScore}<span className="text-base font-normal text-slate-400">/100</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Tendance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {stats.this_period_count > filteredDemandes.length * 0.15 ? "📈 Croissance" : "📊 Stable"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Analyse qualitative ──────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Analyse qualitative</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Number(treatmentRate) >= 70
            ? <p className="flex gap-2 text-emerald-700"><span>✓</span> Excellent taux de traitement ({treatmentRate}%).</p>
            : <p className="flex gap-2 text-amber-700"><span>⚠️</span> Taux de traitement à améliorer ({treatmentRate}%).</p>}
          {stats.en_attente > stats.traitee
            ? <p className="flex gap-2 text-red-600"><span>🚨</span> Volume en attente ({stats.en_attente}) dépasse les traités ({stats.traitee}).</p>
            : <p className="flex gap-2 text-emerald-700"><span>✓</span> Flux de traitement équilibré.</p>}
          {stats.urgentCount + stats.critiqueCount > 0
            ? <p className="flex gap-2 text-amber-700"><span>⚠️</span> {stats.urgentCount + stats.critiqueCount} dossier(s) urgent(s) ou critique(s).</p>
            : <p className="flex gap-2 text-emerald-700"><span>✓</span> Aucun dossier critique en attente.</p>}
          {stats.by_domain.length > 0 &&
            <p className="flex gap-2 text-slate-600"><span>📊</span> Domaine le plus actif : <strong>{stats.by_domain[0].label}</strong> ({stats.by_domain[0].count} dossiers).</p>}
        </CardContent>
      </Card>
    </div>
  );
}