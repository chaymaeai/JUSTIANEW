// src/hooks/usePayment.ts
// ─────────────────────────────────────────────────────────────
// Hook pour initier un paiement Stripe depuis le frontend

import { useState } from "react";
import { api } from "@/services/api";

interface UsePaymentResult {
  paying: boolean;
  error: string | null;
  initiatePayment: (invoiceId: string) => Promise<void>;
}

export function usePayment(): UsePaymentResult {
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const initiatePayment = async (invoiceId: string) => {
    setPaying(true);
    setError(null);
    try {
      const res = await api.post(`/invoices/${invoiceId}/create-payment-session/`);
      const { checkout_url } = res.data;
      if (checkout_url) {
        // Rediriger vers Stripe Checkout
        window.location.href = checkout_url;
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
        "Impossible d'initier le paiement. Veuillez réessayer."
      );
    } finally {
      setPaying(false);
    }
  };

  return { paying, error, initiatePayment };
}


// ─────────────────────────────────────────────────────────────
// Exemple d'utilisation dans ClientFactures.tsx
// Ajouter ce bouton sur chaque facture "en_attente" ou "envoyee"
// ─────────────────────────────────────────────────────────────

/*
import { usePayment } from "@/hooks/usePayment";

function PayButton({ invoiceId, status }: { invoiceId: string; status: string }) {
  const { paying, error, initiatePayment } = usePayment();

  // Afficher uniquement si la facture n'est pas encore payée
  if (status === "payee" || status === "annulee") return null;

  return (
    <div>
      <Button
        onClick={() => initiatePayment(invoiceId)}
        disabled={paying}
        className="bg-cyan-500 hover:bg-cyan-600 text-white"
      >
        {paying ? "Redirection..." : "💳 Payer en ligne"}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
*/


// ─────────────────────────────────────────────────────────────
// Gestion du retour Stripe (success / cancelled)
// À ajouter dans ClientFactures.tsx avec useEffect
// ─────────────────────────────────────────────────────────────

/*
import { useSearchParams } from "react-router-dom";

// Dans le composant :
const [searchParams] = useSearchParams();

useEffect(() => {
  const payment = searchParams.get("payment");
  if (payment === "success") {
    // Afficher message succès + recharger la facture
    setSuccessMessage("✅ Paiement confirmé ! Votre facture a été mise à jour.");
    loadInvoices(); // recharger la liste
  }
  if (payment === "cancelled") {
    setInfoMessage("Le paiement a été annulé. Vous pouvez réessayer.");
  }
}, []);
*/