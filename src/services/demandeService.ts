import type { DemandeListParams, PaginatedResponse } from "@/types/api";
import type { Demande } from "@/types/client";
import { api } from "./api";

type DrfPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  pages: number;
  results: T[];
};

export async function listDemandes(params?: DemandeListParams): Promise<PaginatedResponse<Demande>> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const { data } = await api.get<DrfPaginated<Demande>>("/demandes/", {
    params: {
      page,
      page_size: pageSize,
      search: params?.search,
      status: params?.status,
      domain: params?.domain,
    },
  });
  return {
    data: data.results,
    total: data.count,
    page,
    pageSize,
  };
}

export async function getDemande(id: string): Promise<Demande> {
  const { data } = await api.get<Demande>(`/demandes/${id}/`);
  return data;
}

export async function createDemande(
  payload: Pick<Demande, "domain" | "description" | "urgency"> & { notes?: string }
): Promise<Demande> {
  const { data } = await api.post<Demande>("/demandes/", payload);
  return data;
}

export async function updateDemande(
  id: string,
  payload: Partial<Pick<Demande, "status" | "description" | "urgency" | "notes">>
): Promise<Demande> {
  const { data } = await api.patch<Demande>(`/demandes/${id}/`, payload);
  return data;
}

export async function deleteDemande(id: string): Promise<void> {
  await api.delete(`/demandes/${id}/`);
}
