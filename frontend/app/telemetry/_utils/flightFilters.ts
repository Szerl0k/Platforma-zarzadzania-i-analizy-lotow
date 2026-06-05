import type { FlightPositionDTO } from "@/common/api/telemetry";

export const OPENSKY_CATEGORY_LABELS: Record<number, string> = {
  0: "Brak informacji",
  1: "Brak danych ADS-B",
  2: "Lekki (< 7 t)",
  3: "Mały (7–34 t)",
  4: "Duży (34–136 t)",
  5: "Duży, silna turbulencja",
  6: "Ciężki (> 136 t)",
  7: "Wysokie osiągi",
  8: "Śmigłowiec",
  9: "Szybowiec",
  10: "Lżejszy od powietrza",
  11: "Skoczek spadochronowy",
  12: "Ultralekki / lotnia",
  13: "Zarezerwowane",
  14: "Bezzałogowy (UAV)",
  15: "Pojazd kosmiczny",
  16: "Pojazd naziemny – ratowniczy",
  17: "Pojazd naziemny – serwisowy",
  18: "Przeszkoda punktowa",
  19: "Przeszkoda – skupisko",
  20: "Przeszkoda liniowa",
};

export const UNKNOWN_AIRLINE = "—";

export function callsignToAirlineIcao(
  callsign: string | null | undefined,
): string | null {
  if (!callsign) return null;
  const trimmed = callsign.trim().toUpperCase();
  const match = /^([A-Z]{3})\d/.exec(trimmed);
  return match ? match[1] : null;
}

export interface FlightFilters {
  flightNumber: string;
  airlines: Set<string>;
  countries: Set<string>;
  categories: Set<number>;
}

export const EMPTY_FLIGHT_FILTERS: FlightFilters = {
  flightNumber: "",
  airlines: new Set(),
  countries: new Set(),
  categories: new Set(),
};

export function countActiveFilters(f: FlightFilters): number {
  return (
    (f.flightNumber.trim() ? 1 : 0) +
    (f.airlines.size > 0 ? 1 : 0) +
    (f.countries.size > 0 ? 1 : 0) +
    (f.categories.size > 0 ? 1 : 0)
  );
}

export interface FilterOption<T> {
  value: T;
  label: string;
  count: number;
}

export interface FlightFilterOptions {
  airlines: FilterOption<string>[];
  countries: FilterOption<string>[];
  categories: FilterOption<number>[];
}

export function deriveFilterOptions(
  flights: FlightPositionDTO[],
): FlightFilterOptions {
  const airlineCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const categoryCounts = new Map<number, number>();

  for (const f of flights) {
    const airline = callsignToAirlineIcao(f.callsign) ?? UNKNOWN_AIRLINE;
    airlineCounts.set(airline, (airlineCounts.get(airline) ?? 0) + 1);

    if (f.originCountry) {
      countryCounts.set(
        f.originCountry,
        (countryCounts.get(f.originCountry) ?? 0) + 1,
      );
    }
    if (f.category != null) {
      categoryCounts.set(f.category, (categoryCounts.get(f.category) ?? 0) + 1);
    }
  }

  const airlines = [...airlineCounts.entries()]
    .map(([value, count]) => ({
      value,
      label: value === UNKNOWN_AIRLINE ? "Inne / GA" : value,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const countries = [...countryCounts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const categories = [...categoryCounts.entries()]
    .map(([value, count]) => ({
      value,
      label: OPENSKY_CATEGORY_LABELS[value] ?? `Kategoria ${value}`,
      count,
    }))
    .sort((a, b) => a.value - b.value);

  return { airlines, countries, categories };
}

export function flightMatchesFilters(
  flight: FlightPositionDTO,
  filters: FlightFilters,
): boolean {
  const term = filters.flightNumber.trim().toUpperCase();
  if (term) {
    const callsign = flight.callsign?.trim().toUpperCase() ?? "";
    if (!callsign.includes(term)) return false;
  }

  if (filters.airlines.size > 0) {
    const airline = callsignToAirlineIcao(flight.callsign) ?? UNKNOWN_AIRLINE;
    if (!filters.airlines.has(airline)) return false;
  }

  if (filters.countries.size > 0) {
    if (!flight.originCountry || !filters.countries.has(flight.originCountry)) {
      return false;
    }
  }

  if (filters.categories.size > 0) {
    if (flight.category == null || !filters.categories.has(flight.category)) {
      return false;
    }
  }

  return true;
}

export function filterFlights(
  flights: FlightPositionDTO[],
  filters: FlightFilters,
): FlightPositionDTO[] {
  if (countActiveFilters(filters) === 0) return flights;
  return flights.filter((f) => flightMatchesFilters(f, filters));
}
