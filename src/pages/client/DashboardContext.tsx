import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Consultation, Demande, Document, Expert } from "@/types/client";
import { listDemandes } from "@/services/demandeService";
import { api } from "@/services/api";

interface DashboardDossier {
  id: string;
  reference: string;
  domainLabel: string;
  statusLabel: string;
  statusTone: "amber" | "blue" | "green" | "red";
  progress: number;
  lastActivity: string;
}

interface DashboardContextType {
  demandes: Demande[];
  consultations: Consultation[];
  documents: Document[];
  experts: Expert[];
  dossiers: DashboardDossier[];
  loading: boolean;
  refresh: () => void;
}

const domainLabels: Record<string, string> = {
  droit_affaires: "Droit des affaires",
  rgpd: "RGPD",
  droit_ia: "Droit IA",
  propriete_intellectuelle: "Propriété intellectuelle",
  droit_numerique: "Droit numérique",
  immobilier: "Immobilier",
  gouvernance: "Gouvernance",
};

const statusLabelMap: Record<string, string> = {
  en_attente: "En attente",
  assignee: "Assignée",
  en_cours: "En cours",
  en_revision: "En révision",
  traitee: "Traitée",
  annulee: "Annulée",
};

const statusToneMap: Record<string, "amber" | "blue" | "green" | "red"> = {
  en_attente: "amber",
  assignee: "blue",
  en_cours: "blue",
  en_revision: "blue",
  traitee: "green",
  annulee: "red",
};

const progressMap: Record<string, number> = {
  en_attente: 10,
  assignee: 30,
  en_cours: 60,
  en_revision: 80,
  traitee: 100,
  annulee: 0,
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [experts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      try {
        const [demandesRes, consultationsRes, documentsRes] = await Promise.allSettled([
          listDemandes({ page: 1, pageSize: 50 }),
          api.get("/consultations/").then((r) => r.data?.results ?? r.data ?? []),
          api.get("/documents/").then((r) => r.data?.results ?? r.data ?? []),
        ]);

        if (cancelled) return;

        if (demandesRes.status === "fulfilled") {
          setDemandes(demandesRes.value.data ?? []);
        }

        if (documentsRes.status === "fulfilled") {
          const raw = documentsRes.value ?? [];
          setDocuments(raw.map((d: any) => ({
            id:         String(d.id ?? ""),
            name:       d.name ?? "",
            type:       d.file_type ?? "",
            size:       d.size ?? 0,
            uploadedAt: d.created_at ?? new Date().toISOString(),
            url:        d.file_url ?? "",
            demandeId:  d.demande ?? undefined,
          })));
        }

        // ✅ Mapping complet avec rating
        if (consultationsRes.status === "fulfilled") {
          const raw = consultationsRes.value ?? [];
          setConsultations(raw.map((c: any) => ({
            ...c,
            scheduledAt:   c.scheduled_at ?? c.scheduledAt,
            demande:       String(c.demande ?? c.demandeId ?? ""),   // ← pour /rate/ et /messages/
            demandeId:     String(c.demande ?? c.demandeId ?? ""),
            expertId:      String(c.expert ?? c.expertId ?? ""),
            rating:        c.rating ?? null,                          // ← CRITIQUE
            ratingComment: c.rating_comment ?? null,
            expert: c.expert_name
              ? {
                  id:             String(c.expert ?? ""),
                  firstName:      c.expert_name?.split(" ")[0] ?? "",
                  lastName:       c.expert_name?.split(" ").slice(1).join(" ") ?? "",
                  specialization: c.expert_specialization ?? [],
                  rating:         c.expert_rating ?? 0,
                }
              : c.expert,
          })));
        }

      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [tick]);

  const dossiers: DashboardDossier[] = useMemo(
    () =>
      demandes
        .filter((d) => d.status !== "annulee" && d.status !== "traitee")
        .map((d) => ({
          id: d.id,
          reference: d.reference,
          domainLabel: domainLabels[d.domain] ?? d.domain,
          statusLabel: statusLabelMap[d.status] ?? d.status,
          statusTone: statusToneMap[d.status] ?? "blue",
          progress: progressMap[d.status] ?? 0,
          lastActivity: new Date(d.updatedAt).toLocaleDateString("fr-FR"),
        })),
    [demandes]
  );

  const value = useMemo(
    () => ({ demandes, consultations, documents, experts, dossiers, loading, refresh }),
    [demandes, consultations, documents, experts, dossiers, loading]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}