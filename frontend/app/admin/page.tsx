"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, hasPermission } from "@/common/hooks/useAuth";
import { Badge, Card, Spinner } from "@/common/components";
import {
  getHealth,
  type HealthReport,
  type ServiceState,
} from "@/common/api/admin";

const SERVICE_LABELS: Record<keyof HealthReport["services"], string> = {
  database: "Baza danych",
  aeroapi: "AeroAPI",
  opensky: "OpenSky",
  smtp: "Poczta (SMTP)",
};

function stateBadge(state: ServiceState) {
  if (state === "up") return <Badge variant="success">OK</Badge>;
  if (state === "down") return <Badge variant="danger">NIEDOSTĘPNA</Badge>;
  return <Badge variant="default">NIESKONFIGUROWANA</Badge>;
}

function SystemHealth() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getHealth()
      .then((r) => mounted && setReport(r))
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card variant="default" padding="lg" className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sans text-xl text-ink">Status usług</h2>
        {report && (
          <Badge variant={report.status === "ok" ? "success" : "danger"}>
            {report.status === "ok" ? "SPRAWNY" : "DEGRADACJA"}
          </Badge>
        )}
      </div>

      {loading ? (
        <Spinner size="sm" />
      ) : error || !report ? (
        <p className="font-mono text-xs uppercase text-ink-subtle">
          Nie udało się pobrać statusu usług.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            Object.keys(report.services) as (keyof HealthReport["services"])[]
          ).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between border border-border-subtle px-3 py-2"
            >
              <span className="font-sans text-sm text-ink">
                {SERVICE_LABELS[key]}
              </span>
              {stateBadge(report.services[key].status)}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const TILES = [
  {
    href: "/admin/users",
    perm: "users:write",
    title: "Użytkownicy",
    description:
      "Przeglądaj listę użytkowników, zmieniaj ich role i usuwaj konta.",
  },
  {
    href: "/admin/roles",
    perm: "roles:write",
    title: "Role",
    description: "Twórz role, edytuj je i przypisuj im uprawnienia.",
  },
  {
    href: "/admin/permissions",
    perm: "permissions:write",
    title: "Uprawnienia",
    description: "Definiuj uprawnienia używane w systemie.",
  },
  {
    href: "/admin/api-usage",
    perm: "api-usage:read",
    title: "Zużycie API",
    description:
      "Monitoruj zużycie OpenSky i AeroAPI względem darmowego limitu.",
  },
];

export default function AdminHomePage() {
  const { user } = useAuth();
  const visible = TILES.filter((t) => hasPermission(user, t.perm));

  return (
    <div>
      <SystemHealth />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((tile) => (
          <Link key={tile.href} href={tile.href} className="block group">
            <Card
              variant="elevated"
              padding="lg"
              className="h-full group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] transition-transform duration-[120ms] ease-out"
            >
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-2">
                {tile.perm}
              </p>
              <h2 className="font-sans text-xl text-ink mb-2">{tile.title}</h2>
              <p className="font-sans text-sm text-ink-subtle leading-snug">
                {tile.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
