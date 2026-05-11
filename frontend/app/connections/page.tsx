"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import { Alert, Button, Card, PageShell, Spinner } from "@/common/components";
import {
  getAirportRoutes,
  getRouteCheck,
  type Airport,
  type AirlineWithDestinations,
  type RouteCheckResult,
} from "@/common/api/airports";
import { AirportSearch } from "./_components/AirportSearch";
import { ConnectionsResults } from "./_components/ConnectionsResults";
import { ConnectionsMap } from "./_components/ConnectionsMap";
import { FlightCheckPanel } from "./_components/FlightCheckPanel";
import { RouteCheckMap } from "./_components/RouteCheckMap";

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? "Wystąpił błąd";
  }
  if (err instanceof Error) return err.message;
  return "Wystąpił nieznany błąd";
}

export default function ConnectionsPage() {
  const [origin, setOrigin] = useState<Airport | null>(null);
  const [destination, setDestination] = useState<Airport | null>(null);

  const [routes, setRoutes] = useState<AirlineWithDestinations[] | null>(null);
  const [routesStale, setRoutesStale] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [activeAirline, setActiveAirline] = useState<string | null>(null);

  const [routeCheckResult, setRouteCheckResult] =
    useState<RouteCheckResult | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [activeRouteFilter, setActiveRouteFilter] = useState<string | null>(
    null,
  );

  const loadGrid = useCallback(async (icaoCode: string) => {
    setRoutesLoading(true);
    setRoutesError(null);
    setRoutes(null);
    try {
      const result = await getAirportRoutes(icaoCode);
      setRoutes(result.routes);
      setRoutesStale(result.stale);
    } catch (err) {
      setRoutesError(extractError(err));
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  function handleOriginChange(airport: Airport | null) {
    setOrigin(airport);
    setActiveAirline(null);
    setRouteCheckResult(null);
    setCheckError(null);
    if (airport) {
      loadGrid(airport.icaoCode);
    } else {
      setRoutes(null);
      setRoutesError(null);
    }
  }

  function handleDestinationChange(airport: Airport | null) {
    setDestination(airport);
    setRouteCheckResult(null);
    setCheckError(null);
  }

  async function handleCheck() {
    if (!origin || !destination) return;
    setCheckLoading(true);
    setRouteCheckResult(null);
    setCheckError(null);
    setActiveRouteFilter(null);
    try {
      const result = await getRouteCheck(origin.icaoCode, destination.icaoCode);
      setRouteCheckResult(result);
    } catch (err) {
      setCheckError(extractError(err));
    } finally {
      setCheckLoading(false);
    }
  }

  function handleAirlineClick(icaoCode: string) {
    setActiveAirline((prev) => (prev === icaoCode ? null : icaoCode));
  }

  const checkDone =
    routeCheckResult !== null || checkError !== null || checkLoading;

  return (
    <PageShell maxWidth="2xl">
      <header className="mb-6">
        <h1 className="font-sans text-2xl font-medium text-ink">
          Połączenia lotniskowe
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-1">
          Siatka połączeń wybranego lotniska lub weryfikacja dostępnych tras
          między dwoma portami lotniczymi
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
        <aside className="flex flex-col gap-4">
          <Card variant="default" padding="md">
            <div className="flex flex-col gap-4">
              <AirportSearch
                inputId="origin"
                label="Lotnisko startowe"
                value={origin}
                onChange={handleOriginChange}
                disabled={routesLoading}
              />

              <AirportSearch
                inputId="destination"
                label="Lotnisko docelowe"
                placeholder="np. Londyn, EGLL, LHR"
                value={destination}
                onChange={handleDestinationChange}
                optional
              />

              {destination && (
                <Button
                  variant="primary"
                  onClick={handleCheck}
                  loading={checkLoading}
                  disabled={!origin}
                >
                  Sprawdź połączenia
                </Button>
              )}
            </div>
          </Card>

          {routesLoading && (
            <div className="flex items-center gap-2 py-1">
              <Spinner size="sm" tone="ink" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Pobieram siatkę połączeń…
              </span>
            </div>
          )}
          {routesError && <Alert variant="error">{routesError}</Alert>}

          {checkDone && origin && destination && (
            <FlightCheckPanel
              origin={origin}
              destination={destination}
              result={routeCheckResult}
              loading={checkLoading}
              error={checkError}
              activeFilter={activeRouteFilter}
              onFilterChange={setActiveRouteFilter}
            />
          )}

          {!checkDone &&
            !routesLoading &&
            routes !== null &&
            routes.length === 0 && (
              <Card variant="flat" padding="md">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                  Brak zaplanowanych tras z tego lotniska.
                </p>
              </Card>
            )}

          {!checkDone &&
            !routesLoading &&
            routes !== null &&
            routes.length > 0 && (
              <ConnectionsResults
                routes={routes}
                stale={routesStale}
                activeAirline={activeAirline}
                onAirlineClick={handleAirlineClick}
              />
            )}
        </aside>

        <section className="lg:sticky lg:top-20">
          {!origin && !routesLoading && (
            <Card variant="flat" padding="md">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Wprowadź lotnisko startowe, aby zobaczyć siatkę połączeń na
                mapie.
              </p>
            </Card>
          )}

          {origin && routesLoading && !routeCheckResult && (
            <div className="h-[600px] border-2 border-ink bg-surface flex items-center justify-center">
              <Spinner size="lg" tone="ink" />
            </div>
          )}

          {routeCheckResult && origin && destination && (
            <RouteCheckMap
              key={`${origin.icaoCode}:${destination.icaoCode}`}
              origin={origin}
              destination={destination}
              result={routeCheckResult}
              activeFilter={activeRouteFilter}
            />
          )}

          {!routeCheckResult &&
            origin &&
            !routesLoading &&
            routes !== null &&
            routes.length > 0 && (
              <ConnectionsMap
                key={origin.icaoCode}
                origin={origin}
                routes={routes}
                activeAirline={activeAirline}
              />
            )}
        </section>
      </div>
    </PageShell>
  );
}
