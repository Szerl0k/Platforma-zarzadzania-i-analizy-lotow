"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import { Alert, Card, PageShell, Spinner } from "@/common/components";
import {
  searchCityBreak,
  type CityBreakProposal,
  type CityBreakSearchParams,
} from "@/common/api/cityBreak";
import { SearchForm } from "./_components/SearchForm";
import { ResultsList } from "./_components/ResultsList";
import { DetailsPanel } from "./_components/DetailsPanel";
import { FlightSchedulesView } from "./_components/FlightSchedulesView";

type ViewMode = "proposals" | "schedules";

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? "Wystąpił błąd";
  }
  if (err instanceof Error) return err.message;
  return "Wystąpił nieznany błąd";
}

export default function CityBreakPage() {
  const [params, setParams] = useState<CityBreakSearchParams | null>(null);
  const [results, setResults] = useState<CityBreakProposal[] | null>(null);
  const [selected, setSelected] = useState<CityBreakProposal | null>(null);
  const [view, setView] = useState<ViewMode>("proposals");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (next: CityBreakSearchParams) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    setView("proposals");
    setParams(next);
    try {
      const data = await searchCityBreak(next);
      setResults(data.items);
    } catch (err: unknown) {
      setResults([]);
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  if (view === "schedules" && selected && params) {
    return (
      <PageShell maxWidth="2xl">
        <FlightSchedulesView
          origin={params.origin}
          destinationIcao={selected.destinationIcao}
          destinationLabel={selected.cityName ?? selected.airportName}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          onBack={() => setView("proposals")}
        />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="2xl">
      <header className="mb-6">
        <h1 className="font-sans text-2xl font-medium text-ink">
          City Break Planner
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-1">
          Znajdź propozycje krótkich wyjazdów w wybranym oknie czasowym
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside>
          <Card variant="default" padding="md">
            <SearchForm onSubmit={handleSearch} loading={loading} />
          </Card>
        </aside>

        <section className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Spinner size="sm" tone="ink" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Szukam propozycji…
              </span>
            </div>
          )}

          {!loading && results === null && (
            <Card variant="flat" padding="md">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Wprowadź parametry wyszukiwania, aby zobaczyć propozycje
                wyjazdów.
              </p>
            </Card>
          )}

          {!loading && results !== null && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
              <ResultsList
                items={results}
                selectedIcao={selected?.destinationIcao ?? null}
                onSelect={(p) => setSelected(p)}
              />

              {selected && params && (
                <div className="xl:sticky xl:top-20 xl:self-start">
                  <DetailsPanel
                    proposal={selected}
                    origin={params.origin}
                    dateFrom={params.dateFrom}
                    dateTo={params.dateTo}
                    onClose={() => setSelected(null)}
                    onShowSchedules={() => setView("schedules")}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
