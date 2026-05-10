"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Card, Spinner, Button } from "@/common/components";
import {
  getProposalDetails,
  type ProposalDetails,
} from "@/common/api/cityBreak";
import axios from "axios";

interface FlightSchedulesViewProps {
  origin: string;
  destinationIcao: string;
  destinationLabel: string;
  dateFrom: string;
  dateTo: string;
  onBack: () => void;
}

function formatDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? "Wystąpił błąd";
  }
  if (err instanceof Error) return err.message;
  return "Wystąpił nieznany błąd";
}

export function FlightSchedulesView({
  origin,
  destinationIcao,
  destinationLabel,
  dateFrom,
  dateTo,
  onBack,
}: FlightSchedulesViewProps) {
  const [details, setDetails] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProposalDetails(destinationIcao, { origin, dateFrom, dateTo })
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [destinationIcao, origin, dateFrom, dateTo]);

  return (
    <Card variant="elevated" padding="md">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-sans text-lg font-medium text-ink">
            Rozkłady lotów: {origin} → {destinationLabel}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
            {dateFrom} → {dateTo}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← Wróć do propozycji
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" tone="ink" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
            Ładuję rozkłady…
          </span>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && !error && details && details.options.length === 0 && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
          Brak dostępnych lotów w wybranym oknie.
        </p>
      )}

      {!loading && !error && details && details.options.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="font-mono text-[10px] uppercase tracking-widest p-2">
                  Linia
                </th>
                <th className="font-mono text-[10px] uppercase tracking-widest p-2">
                  Numer
                </th>
                <th className="font-mono text-[10px] uppercase tracking-widest p-2">
                  Wylot
                </th>
                <th className="font-mono text-[10px] uppercase tracking-widest p-2">
                  Przylot
                </th>
                <th className="font-mono text-[10px] uppercase tracking-widest p-2">
                  Czas
                </th>
                <th className="font-mono text-[10px] uppercase tracking-widest p-2">
                  Typ
                </th>
              </tr>
            </thead>
            <tbody>
              {details.options.map((opt, idx) => {
                const dep = formatDateTime(opt.scheduledDeparture);
                const arr = formatDateTime(opt.scheduledArrival);
                return (
                  <tr
                    key={`${opt.flightNumber ?? "x"}-${idx}`}
                    className="border-b border-ink/20"
                  >
                    <td className="p-2 text-ink">
                      {opt.airlineName ?? opt.airlineIata ?? "—"}
                    </td>
                    <td className="p-2 font-mono text-[12px] text-ink">
                      {opt.airlineIata ?? opt.airlineIcao ?? ""}
                      {opt.flightNumber ? ` ${opt.flightNumber}` : ""}
                    </td>
                    <td className="p-2 font-mono text-[12px] text-ink">
                      {dep.date} {dep.time}
                    </td>
                    <td className="p-2 font-mono text-[12px] text-ink">
                      {arr.date} {arr.time}
                    </td>
                    <td className="p-2 font-mono text-[12px] text-ink">
                      {formatDuration(opt.durationMinutes)}
                    </td>
                    <td className="p-2">
                      <Badge variant={opt.isDirect ? "info" : "default"}>
                        {opt.isDirect ? "direct" : `${opt.stops} przes.`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
