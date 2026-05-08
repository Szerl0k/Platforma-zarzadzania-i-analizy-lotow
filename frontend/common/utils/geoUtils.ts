/**
 * Pure geospatial mathematical functions for coordinate calculations.
 */

/**
 * Calculates a series of coordinates along a great circle path between two points.
 * Uses the slerp (spherical linear interpolation) formula.
 */
export function greatCircleCoords(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  steps = 64,
): number[][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1R = toRad(lat1),
    lon1R = toRad(lon1);
  const lat2R = toRad(lat2),
    lon2R = toRad(lon2);

  const x1 = Math.cos(lat1R) * Math.cos(lon1R);
  const y1 = Math.cos(lat1R) * Math.sin(lon1R);
  const z1 = Math.sin(lat1R);

  const x2 = Math.cos(lat2R) * Math.cos(lon2R);
  const y2 = Math.cos(lat2R) * Math.sin(lon2R);
  const z2 = Math.sin(lat2R);

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const d = Math.acos(dot);

  if (d < 1e-10)
    return [
      [lon1, lat1],
      [lon2, lat2],
    ];

  const sinD = Math.sin(d);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const A = Math.sin((1 - t) * d) / sinD;
    const B = Math.sin(t * d) / sinD;
    const x = A * x1 + B * x2;
    const y = A * y1 + B * y2;
    const z = A * z1 + B * z2;
    return [
      toDeg(Math.atan2(y, x)),
      toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    ];
  });
}

/**
 * Linearly interpolates a position along a path defined by a series of coordinates.
 * @param coords Array of [lon, lat] coordinates
 * @param t Interpolation factor [0, 1]
 */
export function getPositionAlongPath(
  coords: number[][],
  t: number,
): [number, number] {
  if (coords.length < 2) return [coords[0][0], coords[0][1]];
  const idx = Math.max(0, Math.min(t, 1)) * (coords.length - 1);
  const i = Math.min(Math.floor(idx), coords.length - 2);
  const frac = idx - i;
  return [
    coords[i][0] + frac * (coords[i + 1][0] - coords[i][0]),
    coords[i][1] + frac * (coords[i + 1][1] - coords[i][1]),
  ];
}

/**
 * Calculates the bearing (heading) along a path at a given interpolation factor.
 */
export function getBearingAlongPath(coords: number[][], t: number): number {
  const from = getPositionAlongPath(coords, t);
  const next = getPositionAlongPath(coords, Math.min(t + 0.005, 1));
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lon1, lat1] = from.map(toRad);
  const [lon2, lat2] = next.map(toRad);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/**
 * Translates heading in degrees to a universal short geographical direction (N, NE, E, etc.).
 * @param heading Heading in degrees (0-360)
 */
export function getDirectionShort(heading: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}
