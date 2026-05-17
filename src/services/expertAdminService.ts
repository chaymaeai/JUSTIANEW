import { api } from "@/services/api";

export type CreateExpertPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
  specializations?: string[];
  bio?: string;
  years_experience?: number;
  bar_number?: string;
  languages?: string[];
  is_available?: boolean;
};

export async function createExpert(payload: CreateExpertPayload) {
  const { data } = await api.post("/experts/admin/create/", payload);
  return data;
}

export async function listExperts() {
  const { data } = await api.get("/experts/admin/list/");
  return data;
}

export async function deleteExpert(expertId: string) {
  return await api.delete(`/auth/staff/experts/${expertId}/`);
}

export async function updateExpertStatus(expertId: string, isActive: boolean) {
  const { data } = await api.patch(`/experts/${expertId}/`, {
    is_active: isActive,
  });
  return data;
}