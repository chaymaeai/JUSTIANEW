import type { PaginatedResponse } from "@/types/api";
import type { Document } from "@/types/client";
import { api } from "./api";

export async function listDocuments(params?: {
  page?: number;
  pageSize?: number;
  demandeId?: string;
}): Promise<PaginatedResponse<Document>> {
  const { data } = await api.get<PaginatedResponse<Document>>("/documents", { params });
  return data;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await api.get<Document>(`/documents/${id}`);
  return data;
}

export async function uploadDocument(file: File, demandeId?: string): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (demandeId) form.append("demandeId", demandeId);
  const { data } = await api.post<Document>("/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export function getDocumentDownloadUrl(id: string): string {
  const base = import.meta.env.VITE_API_URL ?? "/api";
  return `${base.replace(/\/$/, "")}/documents/${id}/download`;
}
