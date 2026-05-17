import type { Invoice, PaginatedResponse } from "@/types/api";
import { api } from "./api";

export async function listInvoices(params?: {
  page?: number;
  pageSize?: number;
  status?: Invoice["status"];
}): Promise<PaginatedResponse<Invoice>> {
  const { data } = await api.get<PaginatedResponse<Invoice>>("/invoices", { params });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(
  payload: Pick<Invoice, "amount" | "currency" | "dueDate"> & {
    demandeId?: string;
    reference?: string;
  }
): Promise<Invoice> {
  const { data } = await api.post<Invoice>("/invoices", payload);
  return data;
}

export async function updateInvoice(
  id: string,
  payload: Partial<Pick<Invoice, "status" | "dueDate" | "amount">>
): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}
