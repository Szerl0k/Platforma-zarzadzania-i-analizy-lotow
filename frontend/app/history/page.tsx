"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  PageShell,
  Spinner,
} from "@/common/components";
import {
  useFlightHistory,
  deleteFromHistory,
} from "@/common/hooks/useTracking";
import {
  exportHistoryCsvUrl,
  markHistoryFlown,
  type FlightHistoryDTO,
  type HistoryFilters,
} from "@/common/api/tracking";

const SORTS: { value: NonNullable<HistoryFilters["sort"]>; label: string }[] = [
  { value: "newest", label: "Od najnowszych" },
  { value: "oldest", label: "Od najstarszych" },
  { value: "alpha", label: "Alfabetycznie" },
];

function extractError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Wystąpił błąd.";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL");
}

function formatDuration(min: number | null): string {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [flownBusyId, setFlownBusyId] = useState<string | null>(null);
  const [sort, setSort] = useState<HistoryFilters["sort"]>("newest");
  const [year, setYear] = useState<string>("");
  const [airlineIcao, setAirlineIcao] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [removeTarget, setRemoveTarget] = useState<FlightHistoryDTO | null>(
    null,
  );
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters: HistoryFilters = useMemo(
    () => ({
      sort,
      ...(year ? { year: Number(year) } : {}),
      ...(airlineIcao ? { airlineIcao: airlineIcao.toUpperCase() } : {}),
      ...(countryName ? { countryName } : {}),
    }),
    [sort, year, airlineIcao, countryName],
  );

  const { items, loading, error, refresh } = useFlightHistory(filters);

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await deleteFromHistory(removeTarget.id);
      setRemoveTarget(null);
      await refresh();
    } catch (err) {
      setRemoveError(extractError(err));
    } finally {
      setRemoveBusy(false);
    }
  }

  async function handleToggleFlown(h: FlightHistoryDTO) {
    setFlownBusyId(h.id);
    try {
      await markHistoryFlown(h.id, !h.flown);
      await refresh();
    } catch {
      // surfaced via list refresh; keep UI resilient
    } finally {
      setFlownBusyId(null);
    }
  }

  function handleShowRoute(h: FlightHistoryDTO) {
    if (!h.flightId) return;
    router.push(`/telemetry?flightId=${encodeURIComponent(h.flightId)}`);
  }

  async function handleExport() {
    setExportBusy(true);
    setExportError(null);
    try {
      const csv = await exportHistoryCsvUrl();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flight-history-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(extractError(err));
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <PageShell maxWidth="2xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-1">
            Twoje zakończone loty
          </p>
          <h1 className="font-sans text-2xl font-medium text-ink">
            Historia lotów
          </h1>
        </div>
        <Button onClick={handleExport} loading={exportBusy} variant="secondary">
          Eksport CSV
        </Button>
      </header>

      {exportError && (
        <Alert variant="error" className="mb-4">
          {exportError}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside>
          <Card variant="default" padding="md">
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink">
                Filtry
              </p>
              <FormField label="Sortowanie" htmlFor="sort">
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value as HistoryFilters["sort"])
                  }
                  className="w-full h-11 px-3 font-sans text-sm text-ink bg-surface border-2 border-ink"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Rok" htmlFor="year">
                <Input
                  id="year"
                  type="number"
                  placeholder="np. 2026"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </FormField>
              <FormField label="ICAO linii" htmlFor="airlineIcao">
                <Input
                  id="airlineIcao"
                  placeholder="np. LOT"
                  value={airlineIcao}
                  onChange={(e) => setAirlineIcao(e.target.value)}
                />
              </FormField>
              <FormField label="Kraj docelowy" htmlFor="country">
                <Input
                  id="country"
                  placeholder="np. Polska"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                />
              </FormField>
              <Button
                variant="secondary"
                onClick={() => {
                  setSort("newest");
                  setYear("");
                  setAirlineIcao("");
                  setCountryName("");
                }}
              >
                Wyczyść
              </Button>
            </div>
          </Card>
        </aside>

        <section className="flex flex-col gap-3">
          {error && <Alert variant="error">{error}</Alert>}

          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Spinner size="sm" tone="ink" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Wczytywanie…
              </span>
            </div>
          )}

          {!loading && items.length === 0 && (
            <Card variant="flat" padding="md">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Brak wpisów w historii dla wybranych filtrów.
              </p>
            </Card>
          )}

          {!loading &&
            items.map((h) => (
              <Card key={h.id} variant="default" padding="md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono font-bold text-base uppercase tracking-widest text-ink">
                        {h.ident || "?"}
                      </p>
                      {h.flown && <Badge variant="success">Odbyty</Badge>}
                      {h.wasDelayed && (
                        <Badge variant="danger">
                          Opóźnienie {h.delayMinutes ?? "?"} min
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-sm text-ink">
                      {h.originCity ?? "???"} → {h.destinationCity ?? "???"}
                    </p>
                    {(h.originCountry || h.destinationCountry) && (
                      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-0.5">
                        {h.originCountry ?? ""}{" "}
                        {h.destinationCountry
                          ? `→ ${h.destinationCountry}`
                          : ""}
                      </p>
                    )}
                    {h.airlineName && (
                      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-1">
                        {h.airlineName}
                      </p>
                    )}
                    <div className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Data: {formatDate(h.travelDate)}</span>
                      <span>
                        Czas lotu: {formatDuration(h.durationMinutes)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={h.flown ? "secondary" : "primary"}
                      loading={flownBusyId === h.id}
                      onClick={() => handleToggleFlown(h)}
                    >
                      {h.flown ? "Odznacz odbyty" : "Oznacz jako odbyty"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!h.flightId}
                      onClick={() => handleShowRoute(h)}
                    >
                      Pokaż trasę
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRemoveTarget(h)}
                    >
                      Usuń
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
        </section>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => {
          if (!removeBusy) {
            setRemoveTarget(null);
            setRemoveError(null);
          }
        }}
        onConfirm={handleRemove}
        title="Usuń z historii"
        message={
          <div className="flex flex-col gap-2">
            <p>Czy na pewno chcesz usunąć ten wpis?</p>
            {removeError && <Alert variant="error">{removeError}</Alert>}
          </div>
        }
        confirmLabel="Usuń"
        confirmVariant="danger"
        loading={removeBusy}
      />
    </PageShell>
  );
}
