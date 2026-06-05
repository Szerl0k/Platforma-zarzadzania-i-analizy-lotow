import { FlightDetailsResponse } from "@/common/api/flights";
import {
  calculateFlightDuration,
  calculateMinutesBetween,
  calculateTimeRemaining,
} from "@/common/utils/flightUtils";

export interface FlightMetrics {
  currentDuration: number | null;
  plannedDuration: number | null;
  estimatedDuration: number | null;
  timeLeft: number | null;
}

/**
 * Pure transformation: derives the duration / time-left metrics from a
 * flight-details payload. Extracted from FlightPanel so the presentation layer
 * holds no business logic.
 */
export function computeFlightMetrics(
  flightDetails: FlightDetailsResponse | null,
): FlightMetrics | null {
  if (!flightDetails) return null;

  const currentDuration = calculateFlightDuration(
    {
      actual: flightDetails.actualOut,
      estimated: flightDetails.estimatedOut,
      scheduled: flightDetails.scheduledOut,
    },
    {
      actual: flightDetails.actualIn,
      estimated: flightDetails.estimatedIn,
      scheduled: flightDetails.scheduledIn,
    },
  );

  const plannedDuration = calculateMinutesBetween(
    flightDetails.scheduledOut,
    flightDetails.scheduledIn,
  );

  const estimatedDuration = calculateMinutesBetween(
    flightDetails.estimatedOut || flightDetails.scheduledOut,
    flightDetails.estimatedIn || flightDetails.scheduledIn,
  );

  const timeLeft = calculateTimeRemaining(
    flightDetails.estimatedIn || flightDetails.scheduledIn,
  );

  return { currentDuration, plannedDuration, estimatedDuration, timeLeft };
}

/**
 * Wraps a single (possibly null) GeoJSON geometry into a FeatureCollection, or
 * returns null. Keeps GeoJSON shaping out of the map components.
 */
export function geometryToFeatureCollection(
  geometry: GeoJSON.Geometry | null | undefined,
): GeoJSON.FeatureCollection | null {
  if (!geometry) return null;
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry, properties: {} }],
  };
}
