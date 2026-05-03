import { AppDataSource } from "../common/database/data-source";
import { Flight } from "./entities/Flight";
import { FlightStatus } from "./entities/FlightStatus";
import { DataSource } from "typeorm";
import { getAeroApiClient } from "../common/integrations/aeroapi";
import {
  AeroAPIFlightDetails,
  AeroAPIStandardFlightsResponse,
} from "../common/integrations/aeroapi/types";
import { FlightCodeshare } from "./entities/FlightCodeshare";
import { Airport } from "../geo/entities/Airport";
import { Airline } from "../geo/entities/Airline";
import { FlightDetailsResponseDTO } from "./flights.dto";
import { FlightNotFoundError } from "../common/errors";

export class FlightsService {
  private readonly dataSource: DataSource;
  private readonly aeroClient = getAeroApiClient();

  constructor(dataSource: DataSource = AppDataSource) {
    this.dataSource = dataSource;
  }

  public async getFlightDetailsAndSave(
    identIcao: string,
  ): Promise<FlightDetailsResponseDTO> {
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    // 1. Try to fetch from DB first to check for cache
    const existingFlight = await this.dataSource.getRepository(Flight).findOne({
      where: { callsign: identIcao },
      relations: [
        "status",
        "origin",
        "origin.city",
        "origin.city.country",
        "destination",
        "destination.city",
        "destination.city.country",
        "operatingAirline",
        "codeshares",
      ],
      order: { updatedAt: "DESC" }, // Get the most recent one if multiple exist
    });

    if (existingFlight) {
      const timeSinceUpdate = Date.now() - existingFlight.updatedAt.getTime();
      if (timeSinceUpdate < CACHE_DURATION_MS) {
        return this.mapToDTO(existingFlight, "database");
      }
    }

    // 2. Fetch from AeroAPI if cache miss or expired
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const startTimestamp = now - 4 * 60 * 60; // 4 hours ago
    const endTimestamp = now + 4 * 60 * 60; // 4 hours from now

    // AeroAPI expects strict ISO8601 without milliseconds (example: 2026-04-15T23:00:00Z)
    const formatAeroDate = (date: Date): string => date.toISOString().split(".")[0] + "Z";

    const response: AeroAPIStandardFlightsResponse =
      await this.aeroClient.getFlightInfo(identIcao, {
        start: formatAeroDate(new Date(startTimestamp * 1000)),
        end: formatAeroDate(new Date(endTimestamp * 1000)),
        max_pages: 1,
      });

    if (!response.flights || response.flights.length === 0) {
      throw new FlightNotFoundError(`Could not find active flight details in AeroAPI for ICAO code: ${identIcao}`);
    }

    const flightDetails: AeroAPIFlightDetails = response.flights[0];

    // Transaction to ensure consistency
    const flight = await this.dataSource.transaction(async (manager) => {
      // Find or create flight status
      let status = await manager.findOne(FlightStatus, {
        where: { name: flightDetails.status },
      });
      if (!status) {
        status = manager.create(FlightStatus, {
          name: flightDetails.status,
          // Mapped category if needed
          category: null,
        });
        await manager.save(status);
      }

      // Pre-fetch airports and airlines for relationships
      let origin: Airport | null = null;
      if (flightDetails.origin?.code_icao) {
        origin = await manager.findOne(Airport, {
          where: { icaoCode: flightDetails.origin.code_icao },
          relations: ["city", "city.country"],
        });
      }

      let destination: Airport | null = null;
      if (flightDetails.destination?.code_icao) {
        destination = await manager.findOne(Airport, {
          where: { icaoCode: flightDetails.destination.code_icao },
          relations: ["city", "city.country"],
        });
      }

      let operatingAirline: Airline | null = null;
      if (flightDetails.operator_icao) {
        operatingAirline = await manager.findOne(Airline, {
          where: { icaoCode: flightDetails.operator_icao },
        });
      }

      let flightRecord = await manager.findOne(Flight, {
        where: { faFlightId: flightDetails.fa_flight_id },
        relations: [
          "status",
          "origin",
          "origin.city",
          "origin.city.country",
          "destination",
          "destination.city",
          "destination.city.country",
          "operatingAirline",
          "codeshares",
        ],
      });

      if (!flightRecord) {
        flightRecord = manager.create(Flight, {
          identIcao: flightDetails.ident_icao || flightDetails.ident,
          identIata: flightDetails.ident_iata,
          operatingAirlineIcao: flightDetails.operator_icao,
          operatingAirline: operatingAirline,
          callsign:
            flightDetails.atc_ident ||
            flightDetails.ident_icao ||
            flightDetails.ident,
          faFlightId: flightDetails.fa_flight_id,
          originIcao: flightDetails.origin?.code_icao || null,
          origin: origin,
          destinationIcao: flightDetails.destination?.code_icao || null,
          destination: destination,
          statusId: status.id,
          status: status,
          terminalOrigin: flightDetails.terminal_origin,
          gateOrigin: flightDetails.gate_origin,
          terminalDestination: flightDetails.terminal_destination,
          gateDestination: flightDetails.gate_destination,
          departureDelay: flightDetails.departure_delay,
          arrivalDelay: flightDetails.arrival_delay,
          scheduledOut: flightDetails.scheduled_out
            ? new Date(flightDetails.scheduled_out)
            : null,
          estimatedOut: flightDetails.estimated_out
            ? new Date(flightDetails.estimated_out)
            : null,
          actualOut: flightDetails.actual_out
            ? new Date(flightDetails.actual_out)
            : null,
          scheduledIn: flightDetails.scheduled_in
            ? new Date(flightDetails.scheduled_in)
            : null,
          estimatedIn: flightDetails.estimated_in
            ? new Date(flightDetails.estimated_in)
            : null,
          actualIn: flightDetails.actual_in
            ? new Date(flightDetails.actual_in)
            : null,
        });

        await manager.save(flightRecord);
      } else {
        // Update existing flight
        flightRecord.statusId = status.id;
        flightRecord.status = status;
        flightRecord.terminalOrigin = flightDetails.terminal_origin;
        flightRecord.gateOrigin = flightDetails.gate_origin;
        flightRecord.terminalDestination = flightDetails.terminal_destination;
        flightRecord.gateDestination = flightDetails.gate_destination;
        flightRecord.departureDelay = flightDetails.departure_delay;
        flightRecord.arrivalDelay = flightDetails.arrival_delay;
        flightRecord.scheduledOut = flightDetails.scheduled_out
          ? new Date(flightDetails.scheduled_out)
          : null;
        flightRecord.estimatedOut = flightDetails.estimated_out
          ? new Date(flightDetails.estimated_out)
          : null;
        flightRecord.actualOut = flightDetails.actual_out
          ? new Date(flightDetails.actual_out)
          : null;
        flightRecord.scheduledIn = flightDetails.scheduled_in
          ? new Date(flightDetails.scheduled_in)
          : null;
        flightRecord.estimatedIn = flightDetails.estimated_in
          ? new Date(flightDetails.estimated_in)
          : null;
        flightRecord.actualIn = flightDetails.actual_in
          ? new Date(flightDetails.actual_in)
          : null;

        await manager.save(flightRecord);
      }

      // Handle codeshares
      if (
        flightDetails.codeshares_iata &&
        flightDetails.codeshares_iata.length > 0
      ) {
        for (const codeshareIata of flightDetails.codeshares_iata) {
          let existingCodeshare = await manager.findOne(FlightCodeshare, {
            where: { flightId: flightRecord.id, marketingIdentIata: codeshareIata },
          });
          if (!existingCodeshare) {
            // Extract airline code (usually first two characters)
            const marketingAirlineCode = codeshareIata.substring(0, 2);
            const marketingAirline = await manager.findOne(Airline, {
              where: { iataCode: marketingAirlineCode },
            });

            existingCodeshare = manager.create(FlightCodeshare, {
              flightId: flightRecord.id,
              flight: flightRecord,
              marketingIdentIata: codeshareIata,
              marketingAirlineIcao: marketingAirline?.icaoCode || null,
            });

            if (marketingAirline) {
              existingCodeshare.marketingAirline = marketingAirline;
            }

            await manager.save(existingCodeshare);
          }
        }
      }

      return flightRecord;
    });

    return this.mapToDTO(flight, "AeroAPI");
  }

  private mapToDTO(
    flight: Flight,
    source: "database" | "AeroAPI",
  ): FlightDetailsResponseDTO {
    return {
      id: flight.id,
      identIcao: flight.identIcao,
      identIata: flight.identIata,
      operatingAirlineIcao: flight.operatingAirlineIcao,
      callsign: flight.callsign,
      faFlightId: flight.faFlightId,
      originIcao: flight.originIcao,
      destinationIcao: flight.destinationIcao,
      statusId: flight.statusId,
      terminalOrigin: flight.terminalOrigin,
      gateOrigin: flight.gateOrigin,
      terminalDestination: flight.terminalDestination,
      gateDestination: flight.gateDestination,
      departureDelay: flight.departureDelay,
      arrivalDelay: flight.arrivalDelay,
      scheduledOut: flight.scheduledOut
        ? flight.scheduledOut.toISOString()
        : null,
      estimatedOut: flight.estimatedOut
        ? flight.estimatedOut.toISOString()
        : null,
      actualOut: flight.actualOut ? flight.actualOut.toISOString() : null,
      scheduledIn: flight.scheduledIn ? flight.scheduledIn.toISOString() : null,
      estimatedIn: flight.estimatedIn ? flight.estimatedIn.toISOString() : null,
      actualIn: flight.actualIn ? flight.actualIn.toISOString() : null,
      status: flight.status
        ? {
            id: flight.status.id,
            name: flight.status.name,
            category: flight.status.category,
          }
        : undefined,
      origin: flight.origin
        ? {
            icaoCode: flight.origin.icaoCode,
            iataCode: flight.origin.iataCode,
            name: flight.origin.name,
            city: flight.origin.city
              ? {
                  name: flight.origin.city.name,
                  countryName: flight.origin.city.country
                    ? flight.origin.city.country.name
                    : null,
                }
              : undefined,
          }
        : null,
      destination: flight.destination
        ? {
            icaoCode: flight.destination.icaoCode,
            iataCode: flight.destination.iataCode,
            name: flight.destination.name,
            city: flight.destination.city
              ? {
                  name: flight.destination.city.name,
                  countryName: flight.destination.city.country
                    ? flight.destination.city.country.name
                    : null,
                }
              : undefined,
          }
        : null,
      operatingAirline: flight.operatingAirline
        ? {
            icaoCode: flight.operatingAirline.icaoCode,
            name: flight.operatingAirline.name,
          }
        : null,
      source,
    };
  }
}
