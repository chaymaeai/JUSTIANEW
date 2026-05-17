import type { ConsultationStatus, DemandeStatus, DomainJuridique } from "@/types/client";

export const DOMAINS: { value: DomainJuridique; label: string }[] = [
  { value: "droit_affaires", label: "Droit des affaires" },
  { value: "rgpd", label: "RGPD & données personnelles" },
  { value: "droit_ia", label: "Droit de l'IA" },
  { value: "propriete_intellectuelle", label: "Propriété intellectuelle" },
  { value: "droit_numerique", label: "Droit numérique" },
  { value: "immobilier", label: "Immobilier" },
  { value: "gouvernance", label: "Gouvernance & conformité" },
] as const;

export const DEMANDE_STATUSES: DemandeStatus[] = [
  "en_attente",
  "assignee",
  "en_cours",
  "en_revision",
  "traitee",
  "annulee",
];

/** Alias for filters / selects — demande workflow */
export const STATUSES = DEMANDE_STATUSES;

export const CONSULTATION_STATUSES: ConsultationStatus[] = [
  "planifiee",
  "en_cours",
  "terminee",
  "annulee",
];

export const DEMANDE_STATUS_LABELS: Record<DemandeStatus, string> = {
  en_attente: "En attente",
  assignee: "Assignée",
  en_cours: "En cours",
  en_revision: "En révision",
  traitee: "Traitée",
  annulee: "Annulée",
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const DOMAIN_LABELS: Record<DomainJuridique, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.value, d.label])
) as Record<DomainJuridique, string>;

export type UrgencyLevel = "normale" | "urgente" | "critique";

export const URGENCY_LEVELS: { value: UrgencyLevel; label: string }[] = [
  { value: "normale", label: "Normale" },
  { value: "urgente", label: "Urgente" },
  { value: "critique", label: "Critique" },
];

export const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  normale: 0,
  urgente: 1,
  critique: 2,
};
