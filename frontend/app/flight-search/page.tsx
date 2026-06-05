"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Input,
  PageShell,
  Spinner,
} from "@/common/components";
import { flightApi, FlightDetailsResponse } from "@/common/api/flights";
import { FlightPanel } from "@/features/flights/flight-panel";
import { extractError } from "@/common/utils/errorUtils";
import { formatTime } from "@/common/utils/dateUtils";

export default function FlightSearchPage() {
  const [ident, setIdent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FlightDetailsResponse[] | null>(null);
  const [selectedFlight, setSelectedFlight] =
    useState<FlightDetailsResponse | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ident.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedFlight(null);
    try {
      const data = await flightApi.searchFlights(
        ident.trim(),
        startDate || undefined,
        endDate || undefined,
      );
      setResults(data);
    } catch (err) {
      setError(extractError(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!ident.trim()) return;

    setSyncing(true);
    setError(null);
    setSelectedFlight(null);
    try {
      const data = await flightApi.syncFlights(
        ident.trim(),
        startDate || undefined,
        endDate || undefined,
      );
      setResults(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <PageShell maxWidth="2xl">
      <header className="mb-6">
        <h1 className="font-sans text-2xl font-medium text-ink">
          Wyszukaj konkretny lot
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-1">
          Znajdź szczegółowe informacje operacyjne i status wybranego lotu
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside>
          <Card variant="default" padding="md" className="mb-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <FormField label="Numer lotu (lub ICAO/IATA)" htmlFor="ident">
                <Input
                  id="ident"
                  placeholder="np. LO279, LOT279"
                  value={ident}
                  onChange={(e) => setIdent(e.target.value.toUpperCase())}
                  required
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Od dnia" htmlFor="startDate">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </FormField>
                <FormField label="Do dnia" htmlFor="endDate">
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </FormField>
              </div>
              <Button type="submit" loading={loading} variant="primary">
                Szukaj w bazie
              </Button>
            </form>
          </Card>

          {results !== null && (
            <Card variant="flat" padding="md">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-3">
                Nie widzisz swojego lotu lub dane są nieaktualne?
              </p>
              <Button
                variant="secondary"
                onClick={handleSync}
                loading={syncing}
                className="w-full"
              >
                Pobierz aktualne dane z AeroAPI
              </Button>
            </Card>
          )}
        </aside>

        <section className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Spinner size="sm" tone="ink" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Szukam lotów...
              </span>
            </div>
          )}

          {!loading && results !== null && results.length === 0 && (
            <Alert variant="info">
              Nie znaleziono lotu. Sprawdź poprawność numeru lotu i daty lub
              pobierz aktualne dane.
            </Alert>
          )}

          {!loading &&
            results !== null &&
            results.length > 0 &&
            !selectedFlight && (
              <div className="grid grid-cols-1 gap-4">
                {results.map((f) => (
                  <Card
                    key={f.id}
                    variant="default"
                    padding="md"
                    className="cursor-pointer hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut transition-[transform,box-shadow] duration-[120ms]"
                    onClick={() => setSelectedFlight(f)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-sans text-base font-medium text-ink">
                          {f.identIcao} {f.identIata ? `/ ${f.identIata}` : ""}
                        </h3>
                        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                          Trasa: {f.origin?.icaoCode || "?"} →{" "}
                          {f.destination?.icaoCode || "?"}
                        </p>
                      </div>
                      {f.isLive && <Badge variant="navy">LIVE</Badge>}
                    </div>
                    <div className="font-mono text-[11px] text-ink-subtle">
                      Planowany wylot: {formatTime(f.scheduledOut)}
                      <br />
                      Status: {f.status?.name || "Brak danych"}
                    </div>
                  </Card>
                ))}
              </div>
            )}

          {selectedFlight && (
            <FlightDetailsPanel
              flight={selectedFlight}
              onBack={() => setSelectedFlight(null)}
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}

function FlightDetailsPanel({
  flight,
  onBack,
}: {
  flight: FlightDetailsResponse;
  onBack: () => void;
}) {
  return (
    <div className="h-max border-2 border-ink shadow-brut overflow-hidden relative">
      <FlightPanel
        initialFlightId={flight.id}
        onClose={onBack}
        showPreviewMap={true}
      />
    </div>
  );
}
