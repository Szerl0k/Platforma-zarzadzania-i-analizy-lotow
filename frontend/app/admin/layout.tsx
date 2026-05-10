"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useAuth,
  hasPermission,
  hasAnyPermission,
} from "@/common/hooks/useAuth";
import { PageShell, Spinner } from "@/common/components";

export const ADMIN_PERMS = [
  "users:write",
  "roles:write",
  "permissions:write",
  "api-usage:read",
];

const TABS: { href: string; label: string; perm: string }[] = [
  { href: "/admin/users", label: "Użytkownicy", perm: "users:write" },
  { href: "/admin/roles", label: "Role", perm: "roles:write" },
  {
    href: "/admin/permissions",
    label: "Uprawnienia",
    perm: "permissions:write",
  },
  {
    href: "/admin/api-usage",
    label: "Zużycie API",
    perm: "api-usage:read",
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user || !hasAnyPermission(user, ADMIN_PERMS)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || !hasAnyPermission(user, ADMIN_PERMS)) {
    return (
      <PageShell maxWidth="xl" center>
        <Spinner size="lg" />
      </PageShell>
    );
  }

  const visibleTabs = TABS.filter((t) => hasPermission(user, t.perm));

  return (
    <PageShell maxWidth="xl">
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-2">
          Panel administratora
        </p>
        <h1 className="font-sans text-3xl text-ink">Administracja</h1>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 border-b-2 border-ink pb-2">
        <Link
          href="/admin"
          className={
            "font-mono text-xs uppercase tracking-widest px-3 py-2 border-2 " +
            (pathname === "/admin"
              ? "border-ink bg-navy text-white"
              : "border-transparent text-ink hover:bg-[var(--color-lime)]")
          }
        >
          Start
        </Link>
        {visibleTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                "font-mono text-xs uppercase tracking-widest px-3 py-2 border-2 " +
                (active
                  ? "border-ink bg-navy text-white"
                  : "border-transparent text-ink hover:bg-[var(--color-lime)]")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </PageShell>
  );
}
