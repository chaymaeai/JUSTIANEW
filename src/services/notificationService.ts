import type { NotificationItem, PaginatedResponse } from "@/types/api";
import { api } from "./api";

export async function listNotifications(params?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}): Promise<PaginatedResponse<NotificationItem>> {
  const { data } = await api.get<PaginatedResponse<NotificationItem>>("/notifications", { params });
  return data;
}

export async function markAsRead(id: string): Promise<NotificationItem> {
  const { data } = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return data;
}

export async function markAllRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
