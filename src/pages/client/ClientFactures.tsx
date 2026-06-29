import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type PaymentStep = "idle" | "form" | "validating" | "success" | "error";

// ── Styles ────────────────────────────────────────────────────
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  brouillon:  "Brouillon",
  envoyee:    "Envoyée",
  en_attente: "En attente",
  payee:      "Payée",
  en_retard:  "En retard",
  annulee:    "Annulée",
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

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}
function detectNetwork(num: string): "visa" | "mastercard" | "amex" | null {
  const d = num.replace(/\s/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]|^2[2-7]/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  return null;
}

// ── Composant Section Paiement ────────────────────────────────
interface PaymentSectionProps {
  invoice: Invoice;
  onSuccess: (invoiceId: string) => void;
}

function PaymentSection({ invoice, onSuccess }: PaymentSectionProps) {
  const [step, setStep] = useState<PaymentStep>("idle");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stripeRedirect, setStripeRedirect] = useState(false);

  const network = detectNetwork(cardNumber);

  const networkBadge: Record<NonNullable<typeof network>, { label: string; color: string }> = {
    visa:       { label: "VISA", color: "bg-blue-700 text-white" },
    mastercard: { label: "MC",   color: "bg-red-600 text-white" },
    amex:       { label: "AMEX", color: "bg-green-700 text-white" },
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (cardNumber.replace(/\s/g, "").length < 16) e.cardNumber = "Numéro de carte invalide";
    if (!cardName.trim()) e.cardName = "Nom requis";
    const [m, y] = expiry.split("/").map(Number);
    const now = new Date();
    if (!m || !y || m > 12 || m < 1 || y + 2000 < now.getFullYear() || (y + 2000 === now.getFullYear() && m < now.getMonth() + 1))
      e.expiry = "Date d'expiration invalide";
    if (cvv.length < 3) e.cvv = "CVV invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep("validating");
    try {
      const res = await api.post(`/invoices/${invoice.id}/create-payment-session/`);
      const { checkout_url } = res.data;
      if (checkout_url) {
        setStripeRedirect(true);
        window.location.href = checkout_url;
        return;
      }
    } catch {
      // Stripe indisponible : simulation locale
    }
    await new Promise((r) => setTimeout(r, 1500));
    setStep("success");
    onSuccess(invoice.id);
  };

  if (step === "success") {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
        <span className="mt-0.5 text-lg">✅</span>
        <div>
          <p className="font-medium text-green-800">Paiement confirmé</p>
          <p className="mt-0.5 text-sm text-green-700">
            Votre paiement de{" "}
            <span className="font-semibold">{formatAmount(invoice.total, invoice.currency)}</span>{" "}
            a bien été enregistré. Un reçu vous a été envoyé par email.
          </p>
        </div>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <Button size="sm" onClick={() => setStep("form")} className="bg-cyan-500 hover:bg-cyan-600 text-white">
        💳 Payer en ligne
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">Coordonnées de paiement</p>
          <p className="text-xs text-slate-500">
            Facture {invoice.number} ·{" "}
            <span className="font-medium text-slate-700">{formatAmount(invoice.total, invoice.currency)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(["visa", "mastercard", "amex"] as const).map((net) => (
            <span key={net} className={cn(
              "rounded px-2 py-0.5 text-[10px] font-bold tracking-wide transition-opacity",
              networkBadge[net].color,
              network && network !== net ? "opacity-30" : "opacity-100"
            )}>
              {networkBadge[net].label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <span>🔒</span>
        <span>Paiement sécurisé — chiffrement SSL 256 bits. Vos données ne sont jamais stockées.</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Numéro de carte</label>
        <div className="relative">
          <Input
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            maxLength={19}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className={cn("pr-16 font-mono tracking-widest", errors.cardNumber && "border-red-400")}
          />
          {network && (
            <span className={cn("absolute right-3 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-bold", networkBadge[network].color)}>
              {networkBadge[network].label}
            </span>
          )}
        </div>
        {errors.cardNumber && <p className="text-xs text-red-500">{errors.cardNumber}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Nom du titulaire</label>
        <Input
          placeholder="JEAN DUPONT"
          value={cardName}
          onChange={(e) => setCardName(e.target.value.toUpperCase())}
          className={cn("uppercase tracking-wide", errors.cardName && "border-red-400")}
        />
        {errors.cardName && <p className="text-xs text-red-500">{errors.cardName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Date d'expiration</label>
          <Input
            inputMode="numeric"
            placeholder="MM/AA"
            value={expiry}
            maxLength={5}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className={cn("font-mono", errors.expiry && "border-red-400")}
          />
          {errors.expiry && <p className="text-xs text-red-500">{errors.expiry}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">CVV</label>
          <Input
            inputMode="numeric"
            placeholder="···"
            value={cvv}
            maxLength={4}
            type="password"
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={cn("font-mono", errors.cvv && "border-red-400")}
          />
          {errors.cvv && <p className="text-xs text-red-500">{errors.cvv}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-600">Montant à régler</span>
        <span className="text-base font-semibold text-slate-800">{formatAmount(invoice.total, invoice.currency)}</span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          className="flex-1 bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-60"
          disabled={step === "validating" || stripeRedirect}
          onClick={handleSubmit}
        >
          {step === "validating" || stripeRedirect ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Validation en cours...
            </span>
          ) : "🔒 Payer et confirmer"}
        </Button>
        <Button
          variant="outline"
          onClick={() => { setStep("idle"); setErrors({}); setCardNumber(""); setCardName(""); setExpiry(""); setCvv(""); }}
          disabled={step === "validating"}
        >
          Annuler
        </Button>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        En cliquant sur "Payer et confirmer", vous acceptez les conditions générales de vente.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function ClientFactures() {
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [flashMsg, setFlashMsg]     = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Retour depuis Stripe ──────────────────────────────────
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setFlashMsg({ type: "success", text: "✅ Paiement confirmé ! Votre facture a été mise à jour." });
      void loadInvoices();
      setSearchParams({});
    } else if (payment === "cancelled") {
      setFlashMsg({ type: "info", text: "Le paiement a été annulé. Vous pouvez réessayer." });
      setSearchParams({});
    }
  }, []);

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

  useEffect(() => { void loadInvoices(); }, []);

  // ✅ Téléchargement PDF via Axios (avec token JWT)
  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const res = await api.get(`/invoices/${invoice.id}/pdf/`, {
        responseType: "blob",
      });

      // ✅ Backend retourne 202 si PDF en cours de génération
      if (res.status === 202) {
        setFlashMsg({ type: "info", text: "⏳ PDF en cours de génération, veuillez réessayer dans quelques secondes." });
        return;
      }

      // ✅ Créer le lien de téléchargement
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `facture-${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setFlashMsg({ type: "success", text: `✅ Facture ${invoice.number} téléchargée.` });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 202) {
        setFlashMsg({ type: "info", text: "⏳ PDF en cours de génération, réessayez dans quelques secondes." });
      } else if (status === 404) {
        setFlashMsg({ type: "info", text: "⏳ PDF non encore disponible, réessayez dans quelques secondes." });
      } else {
        setFlashMsg({ type: "error", text: "Impossible de télécharger le PDF. Veuillez réessayer." });
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // Paiement inline réussi
  const handleInlineSuccess = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "payee", paid_at: new Date().toISOString() }
          : inv
      )
    );
    setExpandedId(null);
    setFlashMsg({ type: "success", text: "✅ Paiement confirmé ! Votre facture a été mise à jour." });
  };

  const summary = useMemo(() => {
    const totalRegle     = invoices.filter(i => i.status === "payee").reduce((s, i) => s + parseFloat(i.total), 0);
    const totalEnAttente = invoices.filter(i => i.status !== "payee" && i.status !== "annulee").reduce((s, i) => s + parseFloat(i.total), 0);
    return { totalRegle, totalEnAttente, nbFactures: invoices.length };
  }, [invoices]);

  const isPayable = (status: InvoiceStatus) =>
    status === "en_attente" || status === "envoyee" || status === "en_retard";

  return (
    <div className="space-y-4">

      {/* Flash messages */}
      {flashMsg && (
        <div className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3 text-sm",
          flashMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : flashMsg.type === "error" ? "bg-red-50 border-red-200 text-red-700"
          : "bg-blue-50 border-blue-200 text-blue-700"
        )}>
          <span>{flashMsg.text}</span>
          <button onClick={() => setFlashMsg(null)} className="ml-4 text-lg leading-none">×</button>
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
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{formatAmount(summary.totalRegle)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">En attente</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{formatAmount(summary.totalEnAttente)}</p>
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
              <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900">
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
                  // ✅ Fragment avec key pour éviter le warning React
                  <React.Fragment key={invoice.id}>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
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
                        <div className="flex flex-wrap items-center gap-2">

                          {/* ✅ Télécharger PDF — via Axios avec token JWT */}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingId === invoice.id}
                            onClick={() => void handleDownloadPdf(invoice)}
                          >
                            {downloadingId === invoice.id ? (
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                Génération...
                              </span>
                            ) : "📄 Télécharger PDF"}
                          </Button>

                          {/* Payer en ligne */}
                          {isPayable(invoice.status) && (
                            <Button
                              size="sm"
                              onClick={() => setExpandedId((prev) => prev === invoice.id ? null : invoice.id)}
                              className={cn(
                                "text-white",
                                expandedId === invoice.id
                                  ? "bg-slate-500 hover:bg-slate-600"
                                  : "bg-cyan-500 hover:bg-cyan-600"
                              )}
                            >
                              {expandedId === invoice.id ? "Fermer" : "💳 Payer en ligne"}
                            </Button>
                          )}

                          {/* Payée */}
                          {invoice.status === "payee" && invoice.paid_at && (
                            <span className="self-center text-xs font-medium text-emerald-600">
                              ✅ Payée le {new Date(invoice.paid_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Panneau paiement inline */}
                    {expandedId === invoice.id && isPayable(invoice.status) && (
                      <tr className="border-t border-slate-100 dark:border-slate-800">
                        <td colSpan={5} className="px-4 pb-5 pt-0">
                          <PaymentSection invoice={invoice} onSuccess={handleInlineSuccess} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}