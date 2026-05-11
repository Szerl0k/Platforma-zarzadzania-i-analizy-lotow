"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth, hasAnyPermission } from "@/common/hooks/useAuth";
import { useTrackedCount } from "@/common/hooks/useTracking";
import { useNotifications } from "@/common/hooks/useNotifications";
import { APP_NAME } from "@/common/config";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ADMIN_PERMS = ["users:write", "roles:write", "permissions:write"];

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "teraz";
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h temu`;
  const d = Math.floor(h / 24);
  return `${d} dni temu`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  return user ? <NavbarAuthed user={user} logout={logout} /> : <NavbarPublic />;
}

function NavbarPublic() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 border-b-2 border-ink bg-[var(--color-bg)]">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink"
        >
          <span className="w-5 h-5 border-2 border-ink bg-navy shadow-brut-sm group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] transition-transform duration-[120ms] ease-out" />
          <span className="group-hover:bg-[var(--color-lime)] px-1 py-0.5">
            {APP_NAME}
          </span>
        </Link>
        <div className="hidden sm:block w-px h-6 bg-ink opacity-20" />
        <Link
          href="/telemetry"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          Telemetria
        </Link>
        <Link
          href="/city-break"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          City Break
        </Link>
        <Link
          href="/connections"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          Połączenia
        </Link>
        <Link
          href="/rankings"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          Rankingi
        </Link>
      </div>
      <Link
        href="/login"
        className="font-mono text-xs uppercase tracking-[0.25em] text-ink hover:bg-[var(--color-lime)] px-1 py-0.5"
      >
        Zaloguj sie
      </Link>
    </nav>
  );
}

interface NavbarAuthedProps {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  logout: ReturnType<typeof useAuth>["logout"];
}

function NavbarAuthed({ user, logout }: NavbarAuthedProps) {
  const trackedCount = useTrackedCount(30_000);
  const {
    items: notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications(30_000);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [bellOpen, setBellOpen] = useState(false);
  const [bellCoords, setBellCoords] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open && !bellOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (open) {
        if (buttonRef.current?.contains(target)) return;
        if (dropdownRef.current?.contains(target)) return;
        setOpen(false);
      }
      if (bellOpen) {
        if (bellRef.current?.contains(target)) return;
        if (bellDropdownRef.current?.contains(target)) return;
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, bellOpen]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((prev) => !prev);
    setBellOpen(false);
  }

  function toggleBell() {
    if (!bellOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setBellCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setBellOpen((prev) => !prev);
    setOpen(false);
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/login");
  }

  async function handleNotificationClick(id: string, link: string | null) {
    setBellOpen(false);
    try {
      await markRead(id);
    } catch {}
    if (link) router.push(link);
  }

  async function handleMarkAll() {
    try {
      await markAllRead();
    } catch {}
  }

  const initial = user
    ? (user.nickname ?? user.email).charAt(0).toUpperCase()
    : "";

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 border-b-2 border-ink bg-[var(--color-bg)]">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink"
        >
          <span className="w-5 h-5 border-2 border-ink bg-navy shadow-brut-sm group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] transition-transform duration-[120ms] ease-out" />
          <span className="group-hover:bg-[var(--color-lime)] px-1 py-0.5">
            {APP_NAME}
          </span>
        </Link>

        <div className="hidden sm:block w-px h-6 bg-ink opacity-20" />

        <Link
          href="/telemetry"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          Telemetria
        </Link>

        <Link
          href="/city-break"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          City Break
        </Link>

        <Link
          href="/connections"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          Połączenia
        </Link>

        {user && (
          <Link
            href="/my-flights"
            className="hidden sm:flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
          >
            Moje loty
            {trackedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 border-2 border-ink bg-navy text-white text-[10px] leading-none">
                {trackedCount}
              </span>
            )}
          </Link>
        )}

        {user && (
          <Link
            href="/history"
            className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
          >
            Historia
          </Link>
        )}

        {user && (
          <Link
            href="/my-stats"
            className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
          >
            Moje statystyki
          </Link>
        )}

        <Link
          href="/rankings"
          className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
        >
          Rankingi
        </Link>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <button
            ref={bellRef}
            onClick={toggleBell}
            aria-label="Powiadomienia"
            aria-haspopup="menu"
            aria-expanded={bellOpen}
            className={
              "relative w-9 h-9 border-2 border-ink bg-surface " +
              "flex items-center justify-center font-mono text-base " +
              "shadow-brut-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut " +
              "active:translate-x-0 active:translate-y-0 active:shadow-none " +
              "transition-[transform,box-shadow] duration-[120ms] ease-out cursor-pointer"
            }
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 border-2 border-ink bg-[var(--color-danger)] text-white text-[10px] leading-none font-mono">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button
            ref={buttonRef}
            onClick={toggleOpen}
            aria-haspopup="menu"
            aria-expanded={open}
            className={
              "w-9 h-9 border-2 border-ink bg-navy text-white " +
              "flex items-center justify-center font-mono text-xs uppercase " +
              "shadow-brut-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut " +
              "active:translate-x-0 active:translate-y-0 active:shadow-none " +
              "transition-[transform,box-shadow] duration-[120ms] ease-out cursor-pointer"
            }
          >
            {initial}
          </button>

          {mounted &&
            bellOpen &&
            bellCoords &&
            createPortal(
              <div
                ref={bellDropdownRef}
                role="menu"
                style={{
                  top: bellCoords.top,
                  right: bellCoords.right,
                }}
                className="fixed z-[9999] w-80 bg-surface border-2 border-ink shadow-brut max-h-[80vh] flex flex-col"
              >
                <div className="px-4 py-3 border-b-2 border-ink flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink">
                    Powiadomienia
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAll}
                      className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      Oznacz wszystkie
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 font-mono text-[11px] uppercase tracking-widest text-ink-subtle text-center">
                      Brak powiadomień
                    </p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id, n.link)}
                        className={
                          "w-full text-left px-4 py-3 border-b border-ink/20 last:border-b-0 cursor-pointer hover:bg-[var(--color-lime)]/30 " +
                          (!n.readAt ? "bg-[var(--color-lime)]/15" : "")
                        }
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-mono text-xs uppercase tracking-widest text-ink truncate">
                            {n.title}
                          </p>
                          {!n.readAt && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-[var(--color-danger)]" />
                          )}
                        </div>
                        <p className="font-sans text-sm text-ink leading-snug break-words">
                          {n.body}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle mt-1">
                          {formatRelative(n.createdAt)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>,
              document.body,
            )}

          {mounted &&
            open &&
            coords &&
            createPortal(
              <div
                ref={dropdownRef}
                role="menu"
                style={{
                  top: coords.top,
                  right: coords.right,
                }}
                className="fixed z-[9999] w-60 bg-surface border-2 border-ink shadow-brut"
              >
                <div className="px-4 py-3 border-b-2 border-ink">
                  {user.nickname && (
                    <p className="font-sans text-sm text-ink mb-0.5">
                      {user.nickname}
                    </p>
                  )}
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted truncate">
                    {user.email}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className={
                    "block w-full text-left px-4 py-3 border-b-2 border-ink " +
                    "font-mono text-xs uppercase tracking-widest text-ink " +
                    "hover:bg-[var(--color-lime)] cursor-pointer"
                  }
                >
                  Ustawienia
                </Link>
                {hasAnyPermission(user, ADMIN_PERMS) && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className={
                      "block w-full text-left px-4 py-3 border-b-2 border-ink " +
                      "font-mono text-xs uppercase tracking-widest text-ink " +
                      "hover:bg-[var(--color-lime)] cursor-pointer"
                    }
                  >
                    Panel admina
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className={
                    "block w-full text-left px-4 py-3 " +
                    "font-mono text-xs uppercase tracking-widest text-[var(--color-danger)] " +
                    "hover:bg-[var(--color-danger-bg)] cursor-pointer"
                  }
                >
                  Wyloguj
                </button>
              </div>,
              document.body,
            )}
        </div>
      ) : (
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-[0.25em] text-ink hover:bg-[var(--color-lime)] px-1 py-0.5"
        >
          Zaloguj sie
        </Link>
      )}
    </nav>
  );
}
