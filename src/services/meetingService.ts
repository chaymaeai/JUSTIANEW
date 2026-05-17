import type { Meeting, PaginatedResponse } from "@/types/api";
import { api } from "./api";

export async function listMeetings(params?: {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}): Promise<PaginatedResponse<Meeting>> {
  const { data } = await api.get<PaginatedResponse<Meeting>>("/meetings", { params });
  return data;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await api.get<Meeting>(`/meetings/${id}`);
  return data;
}

export async function createMeeting(
  payload: Pick<Meeting, "title" | "startAt" | "endAt"> & {
    demandeId?: string;
    consultationId?: string;
    meetingUrl?: string;
  }
): Promise<Meeting> {
  const { data } = await api.post<Meeting>("/meetings", payload);
  return data;
}

export async function updateMeeting(
  id: string,
  payload: Partial<Pick<Meeting, "title" | "startAt" | "endAt" | "meetingUrl" | "status">>
): Promise<Meeting> {
  const { data } = await api.patch<Meeting>(`/meetings/${id}`, payload);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await api.delete(`/meetings/${id}`);
}
