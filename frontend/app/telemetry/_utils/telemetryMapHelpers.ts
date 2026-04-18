import type { ExpressionSpecification } from "maplibre-gl";
import { FlightPositionDTO } from "@/common/api/telemetry";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const POLISH_TEXT_FIELD: ExpressionSpecification = [
  "coalesce",
  ["get", "name:pl"],
  ["get", "name:latin"],
  ["get", "name"],
];

export function mapFlightsToGeoJson(
  flights: FlightPositionDTO[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: flights
      .filter(
        (f) =>
          f.location?.coordinates &&
          typeof f.location.coordinates[0] === "number" &&
          typeof f.location.coordinates[1] === "number",
      )
      .map((f) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.location!.coordinates[0], f.location!.coordinates[1]],
        },
        properties: {
          icao24: f.icao24,
          callsign: f.callsign?.trim() || f.icao24,
          altitude: f.altitude,
          velocity: f.velocity,
          heading: f.heading,
          onGround: f.onGround,
        },
      })),
  };
}
