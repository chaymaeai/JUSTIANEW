import { useCallback, useMemo, useState } from "react";
import type { NotificationItem } from "@/types/api";
import { getApiErrorMessage } from "@/services/api";
import * as notificationService from "@/services/notificationService";

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const fetchList = useCallback(async (params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.listNotifications(params);
      setItems(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      const updated = await notificationService.markAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
      return updated;
    } catch (e) {
      setError(getApiErrorMessage(e));
      throw e;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      setError(getApiErrorMessage(e));
      throw e;
    }
  }, []);

  return {
    notifications: items,
    total,
    unreadCount,
    loading,
    error,
    fetchList,
    markRead,
    markAllRead,
  };
}
