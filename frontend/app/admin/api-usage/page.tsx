"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth, hasPermission } from "@/common/hooks/useAuth";
import { Alert, Button, Card, Spinner } from "@/common/components";
import {
  getApiUsageStats,
  ProviderUsageStats,
  UsageStatsResponse,
} from "@/common/api/apiUsage";

const PROVIDER_LABEL: Record<ProviderUsageStats["provider"], string> = {
  opensky: "OpenSky Network",
  aeroapi: "FlightAware AeroAPI",
};

const PERIOD_LABEL: Record<ProviderUsageStats["period"], string> = {
  day: "dziś (UTC)",
  month: "ten miesiąc (UTC)",
};

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Nieznany błąd";
}

function barColor(percent: number): string {
  if (percent >= 90) return "bg-[var(--color-danger)]";
  if (percent >= 75) return "bg-[#f59e0b]";
  return "bg-navy";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pl-PL", { hour12: false });
}

function ProviderCard({ stats }: { stats: ProviderUsageStats }) {
  return (
    <Card variant="elevated" padding="lg" className="h-full">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-2">
        {PERIOD_LABEL[stats.period]}
      </p>
      <h2 className="font-sans text-xl text-ink mb-1">
        {PROVIDER_LABEL[stats.provider]}
      </h2>
      <p className="font-mono text-xs text-ink-subtle mb-4">
        od {formatDateTime(stats.windowStart)}
      </p>

      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-3xl text-ink">
          {stats.used.toLocaleString("pl-PL")}
        </span>
        <span className="font-mono text-sm text-ink-subtle">
          / {stats.limit.toLocaleString("pl-PL")}
        </span>
      </div>

      <div className="h-2 w-full bg-border-subtle rounded mb-2 overflow-hidden">
        <div
          className={`h-full ${barColor(stats.percent)} transition-all`}
          style={{ width: `${Math.min(stats.percent, 100)}%` }}
        />
      </div>

      <div className="flex justify-between font-mono text-xs text-ink-subtle">
        <span>{stats.percent.toFixed(1)}% wykorzystane</span>
        <span>pozostało {stats.remaining.toLocaleString("pl-PL")}</span>
      </div>
    </Card>
  );
}

function EndpointBreakdown({ stats }: { stats: ProviderUsageStats }) {
  return (
    <Card padding="md">
      <h3 className="font-sans text-base text-ink mb-3">
        {PROVIDER_LABEL[stats.provider]} — endpointy
      </h3>
      {stats.byEndpoint.length === 0 ? (
        <p className="font-mono text-xs uppercase text-ink-subtle">
          Brak wywołań w bieżącym okresie
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 font-mono text-[11px] uppercase tracking-widest">
                Endpoint
              </th>
              <th className="py-2 font-mono text-[11px] uppercase tracking-widest text-right">
                Liczba
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.byEndpoint.map((row) => (
              <tr
                key={row.endpoint}
                className="border-b border-border-subtle last:border-b-0"
              >
                <td className="py-2 font-mono text-xs text-ink truncate">
                  {row.endpoint}
                </td>
                <td className="py-2 font-mono text-xs text-ink-subtle text-right">
                  {row.count.toLocaleString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function RecentCalls({ data }: { data: UsageStatsResponse }) {
  const merged = data.providers
    .flatMap((p) =>
      p.recent.map((r) => ({ ...r, provider: p.provider as string })),
    )
    .sort((a, b) => (a.calledAt < b.calledAt ? 1 : -1))
    .slice(0, 30);

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b-2 border-ink">
        <h3 className="font-sans text-base text-ink">Ostatnie wywołania</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">
                Czas
              </th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">
                Provider
              </th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">
                Endpoint
              </th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-right">
                Status
              </th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-right">
                Czas (ms)
              </th>
            </tr>
          </thead>
          <tbody>
            {merged.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-mono text-xs uppercase text-ink-subtle"
                >
                  Brak wywołań
                </td>
              </tr>
            ) : (
              merged.map((r) => (
                <tr
                  key={`${r.provider}-${r.id}`}
                  className="border-b border-border-subtle last:border-b-0"
                >
                  <td className="px-4 py-2 font-mono text-xs text-ink-subtle">
                    {formatDateTime(r.calledAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink">
                    {r.provider}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink truncate">
                    {r.endpoint}
                  </td>
                  <td
                    className={
                      "px-4 py-2 font-mono text-xs text-right " +
                      (r.success
                        ? "text-ink-subtle"
                        : "text-[var(--color-danger)]")
                    }
                  >
                    {r.statusCode ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink-subtle text-right">
                    {r.durationMs}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminApiUsagePage() {
  const { user } = useAuth();
  const [data, setData] = useState<UsageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const stats = await getApiUsageStats();
      setData(stats);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (!hasPermission(user, "api-usage:read")) {
    return <Alert variant="error">Brak uprawnień do tej sekcji.</Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-ink-subtle">
          Liczniki zużycia zewnętrznych API względem darmowego limitu.
        </p>
        <Button size="sm" variant="secondary" onClick={fetchStats}>
          Odśwież
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            {data.providers.map((p) => (
              <ProviderCard key={p.provider} stats={p} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {data.providers.map((p) => (
              <EndpointBreakdown key={p.provider} stats={p} />
            ))}
          </div>

          <RecentCalls data={data} />
        </>
      ) : null}
    </div>
  );
}
