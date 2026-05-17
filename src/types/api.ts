import type { User } from "@/types/auth";
import type { Demande } from "@/types/client";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Meeting {
  id: string;
  demandeId?: string;
  consultationId?: string;
  title: string;
  startAt: string;
  endAt: string;
  meetingUrl?: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  issuedAt: string;
  paidAt?: string;
  demandeId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
  type?: "demande" | "consultation" | "document" | "invoice" | "system";
}

export type AuthResponse = {
  user: User;
  token: string;
};

export type DemandeListParams = {
  page?: number;
  pageSize?: number;
  status?: Demande["status"];
  domain?: Demande["domain"];
  search?: string;
};

export type DocumentUploadPayload = {
  file: File;
  demandeId?: string;
  name?: string;
};
