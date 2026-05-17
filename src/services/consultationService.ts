import type { PaginatedResponse } from "@/types/api";
import type { Consultation } from "@/types/client";
import { api } from "./api";

export async function listConsultations(params?: {
  page?: number;
  pageSize?: number;
  demandeId?: string;
}): Promise<PaginatedResponse<Consultation>> {
  const { data } = await api.get<PaginatedResponse<Consultation>>("/consultations", { params });
  return data;
}

export async function getConsultation(id: string): Promise<Consultation> {
  const { data } = await api.get<Consultation>(`/consultations/${id}`);
  return data;
}

export async function createConsultation(payload: {
  demandeId: string;
  scheduledAt: string;
  duration: number;
  expertId?: string;
  notes?: string;
}): Promise<Consultation> {
  const { data } = await api.post<Consultation>("/consultations", payload);
  return data;
}

export async function updateConsultation(
  id: string,
  payload: Partial<Pick<Consultation, "scheduledAt" | "duration" | "status" | "notes" | "report">>
): Promise<Consultation> {
  const { data } = await api.patch<Consultation>(`/consultations/${id}`, payload);
  return data;
}

export async function deleteConsultation(id: string): Promise<void> {
  await api.delete(`/consultations/${id}`);
}
