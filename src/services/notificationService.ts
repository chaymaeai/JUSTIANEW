import type { NotificationItem, PaginatedResponse } from "@/types/api";
import { api } from "./api";

// Traduit Django (snake_case) → Frontend (camelCase)
function map(n: Record<string, unknown>): NotificationItem {
  return {
    id: n.id as string,
    title: n.title as string,
    body: (n.message ?? "") as string,
    read: (n.is_read ?? false) as boolean,
    createdAt: (n.created_at ?? "") as string,
    href: (n.link || undefined) as string | undefined,
    type: n.type as NotificationItem["type"],
  };
}

export { map as mapNotification };

export async function listNotifications(params?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}): Promise<PaginatedResponse<NotificationItem>> {
  const { data } = await api.get<{ results: unknown[]; count: number }>("/notifications/", { params });
  return {
    data: (data.results ?? []).map((n) => map(n as Record<string, unknown>)),
    total: data.count ?? 0,
    page: 1,
    pageSize: params?.pageSize ?? 20,
  };
}

export async function markAsRead(id: string): Promise<NotificationItem> {
  const { data } = await api.post<Record<string, unknown>>(`/notifications/${id}/read/`);
  return map(data);
}

export async function markAllRead(): Promise<void> {
  await api.post("/notifications/read-all/");
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/notifications/unread-count/");
  return data.count;
}