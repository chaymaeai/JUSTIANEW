import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, getApiErrorMessage } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────
interface Invoice {
  id: string;
  number: string;
  status: string;
  total: string;
  subtotal: string;
  currency: string;
  due_date: string;
  created_at: string;
  paid_at: string | null;
  client: { id: string; first_name: string; last_name: string; email: string } | null;
  client_name?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface RevenueStats {
  total_revenue: string;
  pending_amount: string;
  this_month: string;
  last_month: string;
}

// ── Styles ────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  brouillon:  "Brouillon",
  envoyee:    "Envoyée",
  en_attente: "En attente",
  payee:      "Payée",
  en_retard:  "En retard",
  annulee:    "Annulée",
};

const STATUS_CLASS: Record<string, string> = {
  brouillon:  "bg-slate-100 text-slate-600",
  envoyee:    "bg-blue-100 text-blue-700",
  en_attente: "bg-amber-100 text-amber-700",
  payee:      "bg-emerald-100 text-emerald-700",
  en_retard:  "bg-red-100 text-red-700",
  annulee:    "bg-slate-100 text-slate-400",
};

function fmt(value: string | number, currency = "MAD") {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${currency}`;
}

// ══════════════════════════════════════════════════════════════
export default function FournisseurFacturation() {
  const [tab, setTab]           = useState<"factures" | "revenus">("factures");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [stats, setStats]       = useState<RevenueStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    description: "",
    amount: "",
    currency: "MAD",
    due_date: "",
    send_to_client: true,
  });

  // ── Charger données ───────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [invRes, clientsRes, statsRes] = await Promise.allSettled([
        api.get("/invoices/", { params: { ordering: "-created_at", page_size: 50 } }),
        api.get("/auth/staff/clients/"),
        api.get("/invoices/stats/"),
      ]);
      if (invRes.status === "fulfilled")
        setInvoices(invRes.value.data?.results ?? invRes.value.data ?? []);
      if (clientsRes.status === "fulfilled")
        setClients(clientsRes.value.data?.results ?? clientsRes.value.data ?? []);
      if (statsRes.status === "fulfilled")
        setStats(statsRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  // ── Créer facture ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.client_id) { setError("Veuillez choisir un client."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Montant invalide."); return; }
    if (!form.due_date) { setError("Veuillez choisir une échéance."); return; }
    if (!form.description) { setError("Veuillez saisir une description."); return; }

    setSaving(true);
    setError(null);
    try {
      const subtotal = parseFloat(form.amount);
      await api.post("/invoices/", {
        client_id: form.client_id,
        tax_rate: "20.00",
        currency: form.currency,
        due_date: form.due_date,
        notes: form.description,
        send_to_client: form.send_to_client,
        lines: [{
          description: form.description,
          quantity: "1",
          unit_price: subtotal,
        }],
      });

      setSuccess("Facture créée avec succès !");
      setShowModal(false);
      setForm({ client_id: "", description: "", amount: "", currency: "MAD", due_date: "", send_to_client: true });
      loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Erreur lors de la création."));
    } finally {
      setSaving(false);
    }
  };

  // ── Envoyer au client ─────────────────────────────────────
  const handleSend = async (invoice: Invoice) => {
    try {
      await api.post(`/invoices/${invoice.id}/send/`);
      setSuccess(`Facture ${invoice.number} envoyée au client.`);
      loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(getApiErrorMessage(e, "Erreur lors de l'envoi."));
    }
  };

  return (
    <div className="space-y-4">

      {/* Messages */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Button
            variant={tab === "factures" ? "default" : "outline"}
            className={tab === "factures" ? "bg-cyan-500 text-white hover:bg-cyan-600" : ""}
            onClick={() => setTab("factures")}
          >Factures</Button>
          <Button
            variant={tab === "revenus" ? "default" : "outline"}
            className={tab === "revenus" ? "bg-cyan-500 text-white hover:bg-cyan-600" : ""}
            onClick={() => setTab("revenus")}
          >Revenus</Button>
        </CardContent>
      </Card>

      {/* ── FACTURES ── */}
      {tab === "factures" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Factures ({invoices.length})</CardTitle>
            <Button
              className="bg-cyan-500 text-white hover:bg-cyan-600"
              onClick={() => { setShowModal(true); setError(null); }}
            >
              + Créer une facture
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Chargement...</p>
            ) : invoices.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Aucune facture créée</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">N° Facture</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Échéance</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{inv.number}</td>
                      <td className="px-4 py-3">
                        {inv.client
                          ? `${inv.client.first_name} ${inv.client.last_name}`
                          : inv.client_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{fmt(inv.total, inv.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASS[inv.status])}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(inv.due_date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => window.open(`/api/invoices/${inv.id}/pdf/`, "_blank")}
                          >
                            PDF
                          </Button>
                          {inv.status === "brouillon" && (
                            <Button
                              size="sm"
                              className="bg-cyan-500 text-white hover:bg-cyan-600"
                              onClick={() => handleSend(inv)}
                            >
                              Envoyer au client
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── REVENUS ── */}
      {tab === "revenus" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Revenus totaux",   value: stats ? fmt(stats.total_revenue) : "…" },
            { label: "En attente",        value: stats ? fmt(stats.pending_amount) : "…" },
            { label: "Ce mois",          value: stats ? fmt(stats.this_month) : "…" },
            { label: "Mois précédent",   value: stats ? fmt(stats.last_month) : "…" },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL CRÉATION ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Créer une facture</CardTitle>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </CardHeader>
            <CardContent className="space-y-3">

              {/* Client */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Client *</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={form.client_id}
                  onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                >
                  <option value="">-- Choisir un client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} — {c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Description service *</label>
                <Textarea
                  placeholder="Ex: Consultation droit des affaires"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Montant + Devise + Échéance */}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Montant HT *</label>
                  <Input
                    type="number" placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Devise</label>
                  <select
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                    value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  >
                    <option value="MAD">MAD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Échéance *</label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Aperçu */}
              {form.amount && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-medium">Aperçu :</p>
                  <p>HT : {fmt(parseFloat(form.amount) || 0, form.currency)}</p>
                  <p>TVA 20% : {fmt((parseFloat(form.amount) || 0) * 0.2, form.currency)}</p>
                  <p className="font-semibold">TTC : {fmt((parseFloat(form.amount) || 0) * 1.2, form.currency)}</p>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button
                  className="bg-cyan-500 text-white hover:bg-cyan-600"
                  disabled={saving}
                  onClick={handleCreate}
                >
                  {saving ? "Création..." : "Créer la facture"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}