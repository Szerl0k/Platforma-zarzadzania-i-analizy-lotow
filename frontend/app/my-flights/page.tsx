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
  Modal,
  PageShell,
  Spinner,
} from "@/common/components";
import {
  useMyFlights,
  stopTracking,
  trackFlight,
} from "@/common/hooks/useTracking";
import {
  previewTracking,
  type FlightDetailsDTO,
  type TrackedFlightDTO,
} from "@/common/api/tracking";

type Bucket = TrackedFlightDTO["bucket"];

const BUCKET_LABELS: Record<Bucket, string> = {
  in_air: "W powietrzu",
  arriving_soon: "Wkrótce ląduje",
  scheduled: "Zaplanowane",
  completed: "Zakończone",
};

const BUCKET_ORDER: Bucket[] = [
  "in_air",
  "arriving_soon",
  "scheduled",
  "completed",
];

function formatRoute(f: TrackedFlightDTO) {
  const from = f.origin.iata || f.origin.icao || f.origin.city || "???";
  const to =
    f.destination.iata || f.destination.icao || f.destination.city || "???";
  return `${from} → ${to}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function extractError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Wystąpił błąd.";
}

export default function MyFlightsPage() {
  const router = useRouter();
  const { flights, loading, error, refresh } = useMyFlights();
  const [ident, setIdent] = useState("");
  const [date, setDate] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<FlightDetailsDTO | null>(
    null,
  );
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TrackedFlightDTO | null>(
    null,
  );
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<Bucket, TrackedFlightDTO[]> = {
      in_air: [],
      arriving_soon: [],
      scheduled: [],
      completed: [],
    };
    flights.forEach((f) => {
      buckets[f.bucket].push(f);
    });
    return buckets;
  }, [flights]);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!ident.trim()) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await previewTracking(ident.trim(), date || undefined);
      setPreviewResult(data);
    } catch (err) {
      setPreviewError(extractError(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmTrack() {
    if (!previewResult) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await trackFlight(previewResult.id, "flight_number");
      setPreviewResult(null);
      setIdent("");
      setDate("");
      await refresh();
    } catch (err) {
      setConfirmError(extractError(err));
    } finally {
      setConfirmBusy(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await stopTracking(removeTarget.id);
      setRemoveTarget(null);
      await refresh();
    } catch (err) {
      setRemoveError(extractError(err));
    } finally {
      setRemoveBusy(false);
    }
  }

  function viewOnMap(f: TrackedFlightDTO) {
    router.push(`/telemetry?flightId=${encodeURIComponent(f.flightId)}`);
  }

  return (
    <PageShell maxWidth="2xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-1">
          Twoje śledzone loty
        </p>
        <h1 className="font-sans text-2xl font-medium text-ink">Moje loty</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside>
          <Card variant="default" padding="md">
            <form onSubmit={handlePreview} className="flex flex-col gap-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink">
                Dodaj lot do śledzonych
              </p>
              <FormField label="Numer lotu" htmlFor="ident">
                <Input
                  id="ident"
                  placeholder="np. LOT123"
                  value={ident}
                  onChange={(e) => setIdent(e.target.value.toUpperCase())}
                  required
                />
              </FormField>
              <FormField label="Data (opcjonalna)" htmlFor="date">
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </FormField>
              {previewError && <Alert variant="error">{previewError}</Alert>}
              <Button type="submit" loading={previewLoading}>
                Wyszukaj
              </Button>
            </form>
          </Card>
        </aside>

        <section className="flex flex-col gap-6">
          {error && <Alert variant="error">{error}</Alert>}

          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Spinner size="sm" tone="ink" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Wczytywanie…
              </span>
            </div>
          )}

          {!loading && flights.length === 0 && (
            <Card variant="flat" padding="md">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                Nie śledzisz jeszcze żadnych lotów. Dodaj pierwszy po lewej.
              </p>
            </Card>
          )}

          {!loading &&
            BUCKET_ORDER.map((bucket) => {
              const items = grouped[bucket];
              if (items.length === 0) return null;
              return (
                <div key={bucket} className="flex flex-col gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                    {BUCKET_LABELS[bucket]} ({items.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {items.map((f) => (
                      <Card key={f.id} variant="default" padding="md">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-mono font-bold text-base uppercase tracking-widest text-ink">
                                {f.ident}
                              </p>
                              {f.flightStatus && (
                                <Badge>{f.flightStatus}</Badge>
                              )}
                            </div>
                            <p className="font-mono text-sm text-ink">
                              {formatRoute(f)}
                            </p>
                            {f.airlineName && (
                              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-1">
                                {f.airlineName}
                              </p>
                            )}
                            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              <span>
                                Wylot: {formatDateTime(f.scheduledOut)}
                              </span>
                              <span>
                                Przylot: {formatDateTime(f.scheduledIn)}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => viewOnMap(f)}
                            >
                              Pokaż na mapie
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRemoveTarget(f)}
                            >
                              Usuń
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
        </section>
      </div>

      <Modal
        open={!!previewResult}
        onClose={() => {
          if (!confirmBusy) {
            setPreviewResult(null);
            setConfirmError(null);
          }
        }}
        title="Potwierdź śledzenie"
        maxWidth="md"
      >
        {previewResult && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle self-center">
                Lot
              </span>
              <span className="font-mono font-bold uppercase tracking-widest">
                {previewResult.ident ||
                  previewResult.identIcao ||
                  previewResult.callsign ||
                  "-"}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle self-center">
                Trasa
              </span>
              <span className="font-mono">
                {previewResult.origin?.icaoCode ?? "???"} →{" "}
                {previewResult.destination?.icaoCode ?? "???"}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle self-center">
                Wylot
              </span>
              <span className="font-mono">
                {formatDateTime(previewResult.scheduledOut)}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle self-center">
                Przylot
              </span>
              <span className="font-mono">
                {formatDateTime(previewResult.scheduledIn)}
              </span>
              {previewResult.operatingAirline?.name && (
                <>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle self-center">
                    Linia
                  </span>
                  <span className="font-mono">
                    {previewResult.operatingAirline.name}
                  </span>
                </>
              )}
            </div>
            {confirmError && <Alert variant="error">{confirmError}</Alert>}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewResult(null);
                  setConfirmError(null);
                }}
                disabled={confirmBusy}
              >
                Anuluj
              </Button>
              <Button onClick={handleConfirmTrack} loading={confirmBusy}>
                Potwierdź
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => {
          if (!removeBusy) {
            setRemoveTarget(null);
            setRemoveError(null);
          }
        }}
        onConfirm={handleRemove}
        title="Przestań śledzić"
        message={
          <div className="flex flex-col gap-2">
            <p>
              Czy na pewno chcesz przestać śledzić lot{" "}
              <span className="font-mono font-bold uppercase">
                {removeTarget?.ident}
              </span>
              ?
            </p>
            {removeError && <Alert variant="error">{removeError}</Alert>}
          </div>
        }
        confirmLabel="Przestań śledzić"
        confirmVariant="danger"
        loading={removeBusy}
      />
    </PageShell>
  );
}
