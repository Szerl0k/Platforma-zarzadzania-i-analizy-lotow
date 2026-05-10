"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Card, PageShell, Spinner, StatCard } from "@/common/components";
import { BarChartHorizontal } from "@/common/components/charts/BarChartHorizontal";
import { BarChartVertical } from "@/common/components/charts/BarChartVertical";
import {
  getMyRoutes,
  getMyStats,
  type UserRouteDTO,
  type UserStatsDTO,
} from "@/common/api/stats";
import { RoutesMap } from "./_components/RoutesMap";

function extractError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Wystąpił błąd.";
}

function formatKm(km: number): string {
  return `${km.toLocaleString("pl-PL")} km`;
}

function formatMinutes(m: number): string {
  if (m === 0) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function MyStatsPage() {
  const [stats, setStats] = useState<UserStatsDTO | null>(null);
  const [routes, setRoutes] = useState<UserRouteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<"all" | number>("all");

  useEffect(() => {
    let mounted = true;
    Promise.all([getMyStats(), getMyRoutes()])
      .then(([s, r]) => {
        if (!mounted) return;
        setStats(s);
        setRoutes(r);
      })
      .catch((err) => {
        if (mounted) setError(extractError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const r of routes) {
      const y = Number.parseInt(r.travelDate.slice(0, 4), 10);
      if (Number.isFinite(y)) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    if (year === "all") return routes;
    return routes.filter(
      (r) => Number.parseInt(r.travelDate.slice(0, 4), 10) === year,
    );
  }, [routes, year]);

  if (loading) {
    return (
      <PageShell maxWidth="2xl" center>
        <Spinner size="lg" />
      </PageShell>
    );
  }

  if (error || !stats) {
    return (
      <PageShell maxWidth="2xl">
        <Alert variant="error">
          {error ?? "Nie udało się pobrać statystyk."}
        </Alert>
      </PageShell>
    );
  }

  const isEmpty = stats.totalFlights === 0;

  return (
    <PageShell maxWidth="2xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-1">
          Twoje podsumowanie podróży
        </p>
        <h1 className="font-sans text-2xl font-medium text-ink">
          Moje statystyki
        </h1>
      </header>

      {isEmpty && (
        <Alert variant="info" className="mb-6">
          Brak danych — Twoje statystyki pojawią się tutaj po pierwszym
          śledzonym locie.
        </Alert>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Liczba lotów" value={stats.totalFlights} />
        <StatCard
          title="Pokonany dystans"
          value={formatKm(stats.totalDistanceKm)}
        />
        <StatCard
          title="Czas w powietrzu"
          value={formatMinutes(stats.totalAirTimeMinutes)}
        />
        <StatCard
          title="Średni czas lotu"
          value={formatMinutes(stats.averageDurationMinutes)}
        />
        <StatCard title="Odwiedzone kraje" value={stats.countriesVisited} />
        <StatCard title="Odwiedzone lotniska" value={stats.airportsVisited} />
        <StatCard
          title="Najczęstsza linia"
          value={stats.topAirline?.name ?? "—"}
          sublabel={
            stats.topAirline ? `${stats.topAirline.count} lotów` : undefined
          }
        />
        <StatCard
          title="Najdłuższy lot"
          value={
            stats.longestFlight ? formatKm(stats.longestFlight.distanceKm) : "—"
          }
          sublabel={
            stats.longestFlight
              ? `${stats.longestFlight.originIcao} → ${stats.longestFlight.destinationIcao}`
              : undefined
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Card variant="default" padding="md">
          <p className="font-mono text-xs uppercase tracking-widest text-ink mb-3">
            Top linie lotnicze
          </p>
          <BarChartHorizontal
            data={stats.topAirlines.map((a) => ({
              label: a.icao,
              value: a.count,
            }))}
            valueLabel={(v) => `${v} lot.`}
          />
        </Card>
        <Card variant="default" padding="md">
          <p className="font-mono text-xs uppercase tracking-widest text-ink mb-3">
            Loty według roku
          </p>
          <BarChartVertical
            data={stats.perYear.map((y) => ({
              label: String(y.year),
              value: y.flights,
            }))}
          />
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="font-mono text-xs uppercase tracking-widest text-ink">
            Mapa Twoich tras
          </p>
          <label className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
              Rok
            </span>
            <select
              value={year}
              onChange={(e) =>
                setYear(
                  e.target.value === "all"
                    ? "all"
                    : Number.parseInt(e.target.value, 10),
                )
              }
              className="border-2 border-ink bg-surface px-2 py-1 font-mono text-xs uppercase"
            >
              <option value="all">Wszystkie</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <RoutesMap routes={filteredRoutes} />
      </section>
    </PageShell>
  );
}
