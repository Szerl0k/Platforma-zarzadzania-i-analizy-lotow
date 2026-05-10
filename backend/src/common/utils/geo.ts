import { Airport } from "../../geo/entities/Airport";

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function airportCoords(
  airport: Airport,
): { lat: number; lon: number } | null {
  const coords = airport.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  return { lon: coords[0], lat: coords[1] };
}
