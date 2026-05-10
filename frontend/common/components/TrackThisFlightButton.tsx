"use client";

import { useState } from "react";
import { Button } from "./Button";
import { useMyFlights, trackFlight, stopTracking } from "../hooks/useTracking";

interface TrackThisFlightButtonProps {
  flightId: string;
  source?: "flight_number" | "map_click";
}

export function TrackThisFlightButton({
  flightId,
  source = "map_click",
}: TrackThisFlightButtonProps) {
  const { isTracked, trackedFlightIdFor, refresh } = useMyFlights();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = isTracked(flightId);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      if (tracked) {
        const trackedId = trackedFlightIdFor(flightId);
        if (trackedId) {
          await stopTracking(trackedId);
        }
      } else {
        await trackFlight(flightId, source);
      }
      await refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Nie udało się zaktualizować śledzenia.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={tracked ? "secondary" : "primary"}
        onClick={handleClick}
        loading={busy}
      >
        {tracked ? "Przestań śledzić" : "Śledź ten lot"}
      </Button>
      {error && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
