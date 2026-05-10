"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NotificationDTO,
  listNotifications,
  getUnreadCount,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
} from "../api/tracking";

interface UseNotificationsResult {
  items: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  newSinceLast: NotificationDTO[];
}

export function useNotifications(
  pollIntervalMs = 30_000,
): UseNotificationsResult {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newSinceLast, setNewSinceLast] = useState<NotificationDTO[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialisedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        listNotifications({ limit: 20 }),
        getUnreadCount(),
      ]);
      setItems(list);
      setUnreadCount(count);

      if (initialisedRef.current) {
        const fresh = list.filter((n) => !seenIdsRef.current.has(n.id));
        if (fresh.length > 0) setNewSinceLast(fresh);
      } else {
        initialisedRef.current = true;
      }
      list.forEach((n) => seenIdsRef.current.add(n.id));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  const markRead = useCallback(async (id: string) => {
    await apiMarkRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await apiMarkAllRead();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
  }, []);

  return {
    items,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    newSinceLast,
  };
}
