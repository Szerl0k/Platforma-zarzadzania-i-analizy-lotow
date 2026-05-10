"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Spinner } from "@/common/components";
import {
  getProposalDetails,
  type CityBreakProposal,
  type ProposalDetails,
  type ProposalFlightOption,
} from "@/common/api/cityBreak";
import { addFavorite } from "@/common/api/favorites";
import { useAuth } from "@/common/hooks/useAuth";
import axios from "axios";

interface DetailsPanelProps {
  proposal: CityBreakProposal;
  origin: string;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
  onShowSchedules: () => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function DetailsPanel({
  proposal,
  origin,
  dateFrom,
  dateTo,
  onClose,
  onShowSchedules,
}: DetailsPanelProps) {
  const { user } = useAuth();
  const [details, setDetails] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favStatus, setFavStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "auth"
  >("idle");
  const [favMessage, setFavMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetails(null);
    setLoading(true);
    setError(null);
    getProposalDetails(proposal.destinationIcao, {
      origin,
      dateFrom,
      dateTo,
    })
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(extractError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposal.destinationIcao, origin, dateFrom, dateTo]);

  async function handleAddFavorite() {
    if (!user) {
      setFavStatus("auth");
      setFavMessage("Zaloguj się, aby zapisywać ulubione kierunki.");
      return;
    }
    setFavStatus("saving");
    setFavMessage(null);
    try {
      await addFavorite({ airportIcao: proposal.destinationIcao });
      setFavStatus("saved");
      setFavMessage("Dodano do ulubionych.");
    } catch (err: unknown) {
      setFavStatus("error");
      setFavMessage(extractError(err));
    }
  }

  return (
    <Card variant="elevated" padding="md" className="h-full overflow-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-sans text-lg font-medium text-ink">
            {proposal.cityName ?? proposal.airportName}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
            {proposal.countryName ?? "—"} · {proposal.destinationIcao}
            {proposal.destinationIata ? ` / ${proposal.destinationIata}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="border-2 border-ink px-2 py-1 font-mono text-xs uppercase tracking-widest hover:bg-[var(--color-lime)] cursor-pointer"
        >
          ×
        </button>
      </div>

      <section className="mb-4">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle mb-2">
          O mieście
        </h3>
        <p className="font-sans text-sm text-ink leading-snug">
          {proposal.cityName ?? proposal.airportName}
          {proposal.countryName ? `, ${proposal.countryName}` : ""}. Lotnisko:{" "}
          {proposal.airportName}.
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle mb-2">
          Dostępne loty ({dateFrom} → {dateTo})
        </h3>
        {loading && (
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" tone="ink" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
              Ładuję rozkłady…
            </span>
          </div>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && !error && details && (
          <FlightOptionsList options={details.options} />
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={onShowSchedules}>
          Zobacz dostępne loty
        </Button>
        <Button
          variant="secondary"
          onClick={handleAddFavorite}
          loading={favStatus === "saving"}
          disabled={favStatus === "saved"}
        >
          {favStatus === "saved" ? "W ulubionych" : "Dodaj do ulubionych"}
        </Button>
        {favMessage && (
          <Alert
            variant={
              favStatus === "saved"
                ? "success"
                : favStatus === "error"
                  ? "error"
                  : "info"
            }
          >
            {favMessage}
          </Alert>
        )}
      </div>
    </Card>
  );
}

function FlightOptionsList({ options }: { options: ProposalFlightOption[] }) {
  if (options.length === 0) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
        Brak dostępnych lotów w wybranym oknie.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {options.slice(0, 8).map((opt, idx) => (
        <li
          key={`${opt.flightNumber ?? "x"}-${idx}`}
          className="border-2 border-ink p-2"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-sans text-sm text-ink">
              {opt.airlineName ?? opt.airlineIata ?? "—"}{" "}
              <span className="font-mono text-[11px] text-ink-subtle">
                {opt.airlineIata ?? opt.airlineIcao ?? ""}
                {opt.flightNumber ? ` · ${opt.flightNumber}` : ""}
              </span>
            </span>
            <Badge variant={opt.isDirect ? "info" : "default"}>
              {opt.isDirect ? "bez przesiadki" : `${opt.stops} przesiadka(i)`}
            </Badge>
          </div>
          <p className="font-mono text-[11px] text-ink-subtle">
            {formatTime(opt.scheduledDeparture)} →{" "}
            {formatTime(opt.scheduledArrival)} ·{" "}
            {formatDuration(opt.durationMinutes)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? "Wystąpił błąd";
  }
  if (err instanceof Error) return err.message;
  return "Wystąpił nieznany błąd";
}
