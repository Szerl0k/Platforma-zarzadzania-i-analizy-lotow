"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { type NotificationDTO } from "../api/tracking";

interface Toast {
  key: string;
  notification: NotificationDTO;
}

const TOAST_DURATION_MS = 8000;

export function ToastContainer() {
  const { user } = useAuth();
  const enabled = !!user;
  const { newSinceLast } = useNotifications(enabled ? 30_000 : 0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled || newSinceLast.length === 0) return;
    setToasts((prev) => {
      const existing = new Set(prev.map((t) => t.notification.id));
      const additions: Toast[] = [];
      for (const n of newSinceLast) {
        if (existing.has(n.id)) continue;
        additions.push({ key: n.id, notification: n });
      }
      return [...prev, ...additions];
    });

    newSinceLast.forEach((n) => {
      if (timersRef.current.has(n.id)) return;
      const t = setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.notification.id !== n.id));
        timersRef.current.delete(n.id);
      }, TOAST_DURATION_MS);
      timersRef.current.set(n.id, t);
    });
  }, [newSinceLast, enabled]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.notification.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }

  function activate(n: NotificationDTO) {
    if (n.link) router.push(n.link);
    dismiss(n.id);
  }

  if (!mounted || !enabled || toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[10001] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => activate(t.notification)}
          className="text-left bg-surface border-2 border-ink shadow-brut p-3 hover:bg-[var(--color-lime)]/30 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-1">
                Powiadomienie
              </p>
              <p className="font-mono text-xs uppercase tracking-widest text-ink truncate">
                {t.notification.title}
              </p>
              <p className="font-sans text-sm text-ink mt-1 break-words">
                {t.notification.body}
              </p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.notification.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  dismiss(t.notification.id);
                }
              }}
              className="shrink-0 w-6 h-6 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-white text-xs font-bold cursor-pointer"
              aria-label="Zamknij"
            >
              ✕
            </span>
          </div>
        </button>
      ))}
    </div>,
    document.body,
  );
}
