import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { api } from "@/services/api";

interface Stats {
  total: number;
  en_attente: number;
  en_cours: number;
  traitee: number;
  this_month_count: number;
}

export default function AdminReports() {
  const [stats, setStats]               = useState<Stats | null>(null);
  const [clientsCount, setClientsCount] = useState(0);
  const [expertsCount, setExpertsCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [reportType, setReportType]     = useState("mensuel");
  const [generating, setGenerating]     = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, clientsRes, expertsRes] = await Promise.allSettled([
          api.get("/demandes/stats/"),
          api.get("/auth/staff/clients/"),
          api.get("/experts/admin/list/"),
        ]);

        if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
        if (clientsRes.status === "fulfilled") {
          const data = clientsRes.value.data;
          setClientsCount(Array.isArray(data) ? data.length : data?.count ?? data?.results?.length ?? 0);
        }
        if (expertsRes.status === "fulfilled") {
          const data = expertsRes.value.data;
          setExpertsCount(Array.isArray(data) ? data.length : data?.count ?? data?.results?.length ?? 0);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleGenerate = async () => {
  setGenerating(true);
  try {
    const res = await api.get("/rapports/generate/", {
      params: { type: reportType, from: dateFrom, to: dateTo },
      responseType: "blob", // ✅ important pour PDF
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_${reportType}_${dateFrom}_${dateTo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch {
    alert("Erreur lors de la génération.");
  } finally {
    setGenerating(false);
  }
};
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Rapports</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Consultez les rapports et statistiques de la plateforme
        </p>
      </div>

      {/* ✅ Statistiques réelles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan">
                {loading ? "..." : stats?.this_month_count ?? 0}
              </p>
              <p className="text-sm text-slate-500 mt-2">Demandes ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {loading ? "..." : clientsCount}
              </p>
              <p className="text-sm text-slate-500 mt-2">Clients inscrits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {loading ? "..." : expertsCount}
              </p>
              <p className="text-sm text-slate-500 mt-2">Experts inscrits</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Statistiques demandes */}
      {stats && (
        <Card>
          <CardHeader><CardTitle>Répartition des demandes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "En attente", value: stats.en_attente, color: "bg-amber-400" },
              { label: "En cours",   value: stats.en_cours,   color: "bg-blue-400" },
              { label: "Traitées",   value: stats.traitee,    color: "bg-emerald-400" },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{row.label}</span>
                  <span>{row.value} / {stats.total}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: stats.total > 0 ? `${Math.round((row.value / stats.total) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ✅ Générer un rapport */}
      <Card>
        <CardHeader><CardTitle>Générer un rapport</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Type de rapport
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="mensuel">Rapport mensuel</option>
                <option value="trimestriel">Rapport trimestriel</option>
                <option value="annuel">Rapport annuel</option>
                <option value="personnalise">Rapport personnalisé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Période
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full bg-cyan text-white hover:bg-cyan/90"
              onClick={handleGenerate}
              disabled={generating || !dateFrom || !dateTo}
            >
              {generating ? "Génération..." : "Générer le rapport"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}