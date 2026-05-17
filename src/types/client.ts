export type DemandeStatus =
  | "en_attente"
  | "assignee"
  | "en_cours"
  | "en_revision"
  | "traitee"
  | "annulee";

export type ConsultationStatus =
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee";

export type DomainJuridique =
  | "droit_affaires"
  | "rgpd"
  | "droit_ia"
  | "propriete_intellectuelle"
  | "droit_numerique"
  | "immobilier"
  | "gouvernance";

export interface Demande {
  id: string;
  reference: string;
  domain: DomainJuridique;
  description: string;
  status: DemandeStatus;
  urgency: "normale" | "urgente" | "critique";
  createdAt: string;
  updatedAt: string;
  assignedTo?: Expert;
  documents: Document[];
  documentsCount?: number;
  consultations: Consultation[];
  notes?: string;
}

export interface Consultation {
  id: string;
  demande: string;           // ← ID utilisé dans /messages/ et /rate/
  demandeId: string;
  expertId: string;
  expert: Expert;
  scheduledAt: string;
  duration: number;
  status: ConsultationStatus;
  meetingUrl?: string;
  notes?: string;
  report?: string;
  rating?: number | null;        // ← note 1-5 donnée par le client
  ratingComment?: string | null; // ← commentaire associé
}

export interface Expert {
  id: string;
  firstName: string;
  lastName: string;
  specialization: DomainJuridique[];
  avatar?: string;
  rating: number;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
  demandeId?: string;
}