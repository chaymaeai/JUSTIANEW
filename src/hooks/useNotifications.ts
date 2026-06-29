import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationItem } from "@/types/api";
import { getApiErrorMessage } from "@/services/api";
import * as notificationService from "@/services/notificationService";
import { mapNotification } from "@/services/notificationService";
function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const token = localStorage.getItem("justia_token") ?? "";
  return `${proto}://${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      if (mountedRef.current) setUnreadCount(count);
    } catch {
      // silencieux
    }
  }, []);

  const fetchList = useCallback(async (params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.listNotifications(params);
      if (mountedRef.current) {
        setItems(res.data);
        setTotal(res.total);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(getApiErrorMessage(e));
        setItems([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    
ws.onmessage = (event: MessageEvent) => {
  if (!mountedRef.current) return;
  try {
    const raw = JSON.parse(event.data as string) as Record<string, unknown>;
    const payload = mapNotification(raw); // ← conversion snake_case → camelCase
    setItems((prev) => {
      if (prev.some((n) => n.id === payload.id)) return prev;
      return [payload, ...prev];
    });
    if (!payload.read) {
      setUnreadCount((c) => c + 1);
    }
  } catch {
    // message malformé
  }
};

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      if (!mountedRef.current) return;
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connectWs();
      }, 5_000);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchUnreadCount();
    connectWs();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs, fetchUnreadCount]);

  const markRead = useCallback(async (id: string) => {
    try {
      const updated = await notificationService.markAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
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
      setUnreadCount(0);
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