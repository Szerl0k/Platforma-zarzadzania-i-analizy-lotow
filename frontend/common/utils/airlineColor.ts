const PALETTE = [
  "#84CC16", // lime
  "#1E3A8A", // navy
  "#DC2626", // red
  "#EA580C", // orange
  "#0891B2", // cyan
  "#7C3AED", // violet
  "#DB2777", // pink
  "#15803D", // green
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function airlineColor(airlineIcao: string | null | undefined): string {
  if (!airlineIcao) return PALETTE[0]!;
  return PALETTE[hash(airlineIcao) % PALETTE.length]!;
}

export const AIRLINE_COLOR_PALETTE = PALETTE;
