import { DataSource } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../common/errors/http-errors";
import type { FlightLookupPort } from "../common/contracts/flight-lookup.port";
import {
  resolveService,
  PORT_TOKENS,
} from "../common/contracts/service-registry";
import type { FlightDetailsResponseDTO } from "../flights/flights.dto";
import { Flight } from "../flights/entities/Flight";
import { TrackingRepository } from "./tracking.repository";
import { TrackedFlight } from "./entities/TrackedFlight";
import { FlightHistory } from "./entities/FlightHistory";
import {
  TrackedFlightDTO,
  FlightHistoryDTO,
  HistoryQueryDTO,
} from "./tracking.dto";

const TERMINAL_STATUS_NAMES = [
  "Arrived",
  "Arrived / Gate Arrival",
  "Landed",
  "Cancelled",
  "Diverted",
];

const ARRIVING_SOON_WINDOW_MS = 30 * 60 * 1000;

/**
 * Maximum number of flights a single user may actively track at once.
 * Defaults to 20 (product scenario), overridable via MAX_ACTIVE_TRACKED_FLIGHTS.
 */
export const MAX_ACTIVE_TRACKED_FLIGHTS = (() => {
  const parsed = Number(process.env.MAX_ACTIVE_TRACKED_FLIGHTS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 20;
})();

export class TrackingService {
  private readonly flightsOverride?: FlightLookupPort;

  constructor(
    private readonly repo: TrackingRepository = new TrackingRepository(),
    flights?: FlightLookupPort,
    private readonly dataSource: DataSource = AppDataSource,
  ) {
    this.flightsOverride = flights;
  }

  /**
   * Flight data via the FlightLookupPort contract (composition root, or injected
   * in tests) so tracking does not import the flights module's service.
   */
  private get flightsService(): FlightLookupPort {
    return (
      this.flightsOverride ??
      resolveService<FlightLookupPort>(PORT_TOKENS.FlightLookup)
    );
  }

  // ---------- Track flight by flight number / ICAO ----------

  /**
   * US-009: preview the flight before user confirms tracking.
   * Re-uses FlightsService.searchFlight for normalization + AeroAPI lookup.
   * If a date is provided and the resolved flight is on a different day, throws BadRequest.
   */
  async previewByIdent(
    ident: string,
    departureDate?: string,
  ): Promise<FlightDetailsResponseDTO> {
    const flight = await this.flightsService.searchFlight(ident);
    if (departureDate) {
      const wanted = departureDate;
      const candidate = (
        flight.scheduledOut ??
        flight.estimatedOut ??
        flight.actualOut
      )?.slice(0, 10);
      if (candidate && candidate !== wanted) {
        throw new BadRequestError(
          `Nie znaleziono lotu ${ident} na ${wanted}. Najbliższy lot: ${candidate}.`,
        );
      }
    }
    return flight;
  }

  /**
   * US-009 / US-010: confirm tracking after preview (or directly from the map panel).
   */
  async confirmTrack(
    userId: string,
    flightId: string,
    sourceName: "flight_number" | "map_click",
  ): Promise<TrackedFlightDTO> {
    const existing = await this.repo.findActiveByUserAndFlight(
      userId,
      flightId,
    );
    if (existing) {
      throw new ConflictError("Już śledzisz ten lot.");
    }

    const activeCount = await this.repo.countActiveByUser(userId);
    if (activeCount >= MAX_ACTIVE_TRACKED_FLIGHTS) {
      throw new BadRequestError(
        `Osiągnięto limit ${MAX_ACTIVE_TRACKED_FLIGHTS} aktywnie śledzonych lotów. ` +
          "Zakończ śledzenie innego lotu, aby dodać nowy.",
      );
    }

    const flight = await this.dataSource.getRepository(Flight).findOne({
      where: { id: flightId },
      relations: [
        "status",
        "origin",
        "origin.city",
        "origin.city.country",
        "destination",
        "destination.city",
        "destination.city.country",
        "operatingAirline",
      ],
    });
    if (!flight) {
      throw new NotFoundError(`Lot ${flightId} nie istnieje.`);
    }

    const status = await this.repo.findStatusByName("active");
    if (!status) {
      throw new NotFoundError(
        "Brak rekordu tracking_statuses.active. Uruchom migracje.",
      );
    }

    const source = await this.repo.findSourceByName(sourceName);
    if (!source) {
      throw new NotFoundError(
        `Brak rekordu tracking_sources.${sourceName}. Uruchom migracje.`,
      );
    }

    const tracked = await this.repo.create({
      userId,
      flightId,
      trackingStatusId: status.id,
      sourceId: source.id,
    });
    tracked.flight = flight;
    return mapTrackedToDto(tracked);
  }

  async listMyFlights(userId: string): Promise<TrackedFlightDTO[]> {
    const items = await this.repo.listActiveByUser(userId);
    return items.map(mapTrackedToDto);
  }

  async countActive(userId: string): Promise<number> {
    return this.repo.countActiveByUser(userId);
  }

  async untrack(userId: string, trackedFlightId: string): Promise<void> {
    const tracked = await this.repo.findActiveById(userId, trackedFlightId);
    if (!tracked) {
      throw new NotFoundError("Śledzony lot nie istnieje.");
    }
    await this.repo.markStopped(trackedFlightId);
  }

  // ---------- History ----------

  async listHistory(
    userId: string,
    query: HistoryQueryDTO,
  ): Promise<FlightHistoryDTO[]> {
    const items = await this.repo.listHistoryByUser(userId);
    const filtered = items.filter((h) => {
      if (query.year !== undefined) {
        const year = parseInt(h.travelDate.slice(0, 4), 10);
        if (year !== query.year) return false;
      }
      if (query.airlineIcao !== undefined) {
        if (h.flight?.operatingAirline?.icaoCode !== query.airlineIcao) {
          return false;
        }
      }
      if (query.countryName !== undefined) {
        const country = h.flight?.destination?.city?.country?.name ?? null;
        if (country !== query.countryName) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (query.sort) {
        case "oldest":
          return a.travelDate.localeCompare(b.travelDate);
        case "alpha":
          return (a.flight?.identIcao ?? "").localeCompare(
            b.flight?.identIcao ?? "",
          );
        case "newest":
        default:
          return b.travelDate.localeCompare(a.travelDate);
      }
    });

    return sorted.map(mapHistoryToDto);
  }

  async deleteHistory(userId: string, id: string): Promise<void> {
    const ok = await this.repo.deleteHistoryById(userId, id);
    if (!ok) throw new NotFoundError("Wpis historii nie istnieje.");
  }

  /** Marks (or unmarks) a historical flight as actually flown by the user. */
  async markFlown(
    userId: string,
    id: string,
    flown: boolean,
  ): Promise<FlightHistoryDTO> {
    const ok = await this.repo.setHistoryFlown(userId, id, flown);
    if (!ok) throw new NotFoundError("Wpis historii nie istnieje.");
    const updated = await this.repo.findHistoryById(userId, id);
    if (!updated) throw new NotFoundError("Wpis historii nie istnieje.");
    return mapHistoryToDto(updated);
  }

  /**
   * Returns the spatial path (GeoJSON) of the flight behind a history entry,
   * so the user can view its route on the map.
   */
  async getHistoryRoute(userId: string, id: string): Promise<unknown> {
    const entry = await this.repo.findHistoryById(userId, id);
    if (!entry) throw new NotFoundError("Wpis historii nie istnieje.");
    if (!entry.flightId) {
      throw new NotFoundError("Ten wpis historii nie ma powiązanego lotu.");
    }
    return this.flightsService.getFlightPath(entry.flightId);
  }

  async exportHistoryCsv(userId: string): Promise<string> {
    const items = await this.repo.listHistoryByUser(userId);
    const header = [
      "data",
      "ident",
      "linia",
      "miasto_wylotu",
      "kraj_wylotu",
      "miasto_przylotu",
      "kraj_przylotu",
      "czas_lotu_min",
      "opozniony",
      "opoznienie_min",
    ];
    const lines = [header.join(",")];
    for (const h of items) {
      const dto = mapHistoryToDto(h);
      const cells = [
        dto.travelDate,
        dto.ident ?? "",
        dto.airlineName ?? "",
        dto.originCity ?? "",
        dto.originCountry ?? "",
        dto.destinationCity ?? "",
        dto.destinationCountry ?? "",
        dto.durationMinutes != null ? String(dto.durationMinutes) : "",
        dto.wasDelayed === null ? "" : dto.wasDelayed ? "tak" : "nie",
        dto.delayMinutes != null ? String(dto.delayMinutes) : "",
      ].map(csvEscape);
      lines.push(cells.join(","));
    }
    return lines.join("\n");
  }
}

// ---------- helpers ----------

export function isFlightTerminal(flight: Flight): boolean {
  if (flight.actualIn) return true;
  if (
    flight.status?.name &&
    TERMINAL_STATUS_NAMES.includes(flight.status.name)
  ) {
    return true;
  }
  return false;
}

export function determineBucket(
  flight: Flight,
  now: Date = new Date(),
): TrackedFlightDTO["bucket"] {
  if (isFlightTerminal(flight)) return "completed";
  if (flight.actualOut && !flight.actualIn) {
    const eta = flight.estimatedIn ?? flight.scheduledIn;
    if (eta && eta.getTime() - now.getTime() <= ARRIVING_SOON_WINDOW_MS) {
      return "arriving_soon";
    }
    return "in_air";
  }
  return "scheduled";
}

function mapTrackedToDto(tf: TrackedFlight): TrackedFlightDTO {
  const flight = tf.flight;
  return {
    id: tf.id,
    flightId: tf.flightId,
    ident: flight?.identIcao ?? "",
    identIata: flight?.identIata ?? null,
    callsign: flight?.callsign ?? "",
    airlineName: flight?.operatingAirline?.name ?? null,
    origin: {
      icao: flight?.origin?.icaoCode ?? null,
      iata: flight?.origin?.iataCode ?? null,
      city: flight?.origin?.city?.name ?? null,
    },
    destination: {
      icao: flight?.destination?.icaoCode ?? null,
      iata: flight?.destination?.iataCode ?? null,
      city: flight?.destination?.city?.name ?? null,
    },
    scheduledOut: flight?.scheduledOut?.toISOString() ?? null,
    scheduledIn: flight?.scheduledIn?.toISOString() ?? null,
    estimatedIn: flight?.estimatedIn?.toISOString() ?? null,
    actualOut: flight?.actualOut?.toISOString() ?? null,
    actualIn: flight?.actualIn?.toISOString() ?? null,
    flightStatus: flight?.status?.name ?? null,
    flightStatusCategory: flight?.status?.category ?? null,
    bucket: flight ? determineBucket(flight) : "scheduled",
    startedTrackingAt: tf.startedTrackingAt.toISOString(),
  };
}

function mapHistoryToDto(h: FlightHistory): FlightHistoryDTO {
  const flight = h.flight ?? null;
  let durationMinutes: number | null = null;
  if (flight?.actualOut && flight.actualIn) {
    durationMinutes = Math.round(
      (flight.actualIn.getTime() - flight.actualOut.getTime()) / 60000,
    );
  } else if (flight?.scheduledOut && flight.scheduledIn) {
    durationMinutes = Math.round(
      (flight.scheduledIn.getTime() - flight.scheduledOut.getTime()) / 60000,
    );
  }
  return {
    id: h.id,
    flightId: h.flightId,
    travelDate: h.travelDate,
    ident: flight?.identIcao ?? null,
    airlineName: flight?.operatingAirline?.name ?? null,
    originCity: flight?.origin?.city?.name ?? null,
    originCountry: flight?.origin?.city?.country?.name ?? null,
    destinationCity: flight?.destination?.city?.name ?? null,
    destinationCountry: flight?.destination?.city?.country?.name ?? null,
    durationMinutes,
    wasDelayed: h.wasDelayed,
    delayMinutes: h.delayMinutes,
    flown: h.flown,
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
