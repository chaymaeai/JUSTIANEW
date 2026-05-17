import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api, getApiErrorMessage } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────
type InvoiceStatus = "brouillon" | "envoyee" | "en_attente" | "payee" | "en_retard" | "annulee";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: string;
  currency: string;
  due_date: string;
  created_at: string;
  paid_at: string | null;
  payment_ref: string;
  notes: string;
  lines: { description: string; quantity: string; unit_price: string; total: string }[];
}

// ── Styles ────────────────────────────────────────────────────
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  brouillon:   "Brouillon",
  envoyee:     "Envoyée",
  en_attente:  "En attente",
  payee:       "Payée",
  en_retard:   "En retard",
  annulee:     "Annulée",
};

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  brouillon:  "bg-slate-100 text-slate-600 border-slate-200",
  envoyee:    "bg-blue-100 text-blue-700 border-blue-200",
  en_attente: "bg-amber-100 text-amber-700 border-amber-200",
  payee:      "bg-green-100 text-green-700 border-green-200",
  en_retard:  "bg-red-100 text-red-700 border-red-200",
  annulee:    "bg-slate-100 text-slate-400 border-slate-200",
};

function formatAmount(value: string | number, currency = "MAD") {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${currency}`;
}

// ══════════════════════════════════════════════════════════════
export default function ClientFactures() {
  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [loading, setLoading]         = useState(true);
  const [paying, setPaying]           = useState<string | null>(null);
  const [payError, setPayError]       = useState<string | null>(null);
  const [flashMsg, setFlashMsg]       = useState<{ type: "success" | "info"; text: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Retour depuis Stripe ──────────────────────────────────
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setFlashMsg({ type: "success", text: "✅ Paiement confirmé ! Votre facture a été mise à jour." });
      loadInvoices();
      setSearchParams({});
    } else if (payment === "cancelled") {
      setFlashMsg({ type: "info", text: "Le paiement a été annulé. Vous pouvez réessayer." });
      setSearchParams({});
    }
  }, []);

  // ── Charger les factures depuis l'API ─────────────────────
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/invoices/", { params: { ordering: "-created_at" } });
      setInvoices(res.data?.results ?? res.data ?? []);
    } catch (e) {
      console.error("Erreur chargement factures", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  // ── Initier paiement Stripe ───────────────────────────────
  const handlePay = async (invoice: Invoice) => {
    setPaying(invoice.id);
    setPayError(null);
    try {
      const res = await api.post(`/invoices/${invoice.id}/create-payment-session/`);
      const { checkout_url } = res.data;
      if (checkout_url) {
        window.location.href = checkout_url;
      }
    } catch (e: any) {
      setPayError(
        e?.response?.data?.detail ||
        getApiErrorMessage(e, "Impossible d'initier le paiement.")
      );
    } finally {
      setPaying(null);
    }
  };

  // ── Résumé ────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalRegle     = invoices.filter(i => i.status === "payee").reduce((s, i) => s + parseFloat(i.total), 0);
    const totalEnAttente = invoices.filter(i => i.status !== "payee" && i.status !== "annulee").reduce((s, i) => s + parseFloat(i.total), 0);
    return { totalRegle, totalEnAttente, nbFactures: invoices.length };
  }, [invoices]);

  return (
    <div className="space-y-4">

      {/* Flash messages */}
      {flashMsg && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm flex items-center justify-between",
          flashMsg.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-blue-50 border-blue-200 text-blue-700"
        )}>
          <span>{flashMsg.text}</span>
          <button onClick={() => setFlashMsg(null)} className="ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {payError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{payError}</span>
          <button onClick={() => setPayError(null)} className="ml-4 text-lg leading-none">×</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Mes factures</CardTitle>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total réglé</p>
            <p className="mt-1 text-2xl font-semibold">{formatAmount(summary.totalRegle)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">En attente</p>
            <p className="mt-1 text-2xl font-semibold">{formatAmount(summary.totalEnAttente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Nb factures</p>
            <p className="mt-1 text-2xl font-semibold">{summary.nbFactures}</p>
          </CardContent>
        </Card>
      </section>

      {/* Tableau */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Chargement...</p>
          ) : invoices.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Aucune facture</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">N° Facture</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{invoice.number}</td>
                    <td className="px-4 py-3">{formatAmount(invoice.total, invoice.currency)}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("border", STATUS_CLASS[invoice.status])}>
                        {STATUS_LABEL[invoice.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(invoice.due_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {/* Bouton PDF */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/invoices/${invoice.id}/pdf/`, "_blank")}
                        >
                          Télécharger PDF
                        </Button>

                        {/* Bouton Payer — uniquement si non payée */}
                        {(invoice.status === "en_attente" || invoice.status === "envoyee" || invoice.status === "en_retard") && (
                          <Button
                            size="sm"
                            disabled={paying === invoice.id}
                            onClick={() => handlePay(invoice)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white"
                          >
                            {paying === invoice.id ? "Redirection..." : "💳 Payer en ligne"}
                          </Button>
                        )}

                        {/* Badge payée */}
                        {invoice.status === "payee" && invoice.paid_at && (
                          <span className="text-xs text-emerald-600 font-medium self-center">
                            ✅ Payée le {new Date(invoice.paid_at).toLocaleDateString("fr-FR")}
                          </span>
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
    </div>
  );
}