import { BoundingBox, StateVectorTuple } from "../common/integrations/opensky";
import { BoundingBoxAreaQuery, MapFlightSummaryDTO } from "./telemetry.dto";
import { BoundingBoxLimitError } from "./telemetry.errors";

/**
 * Utility functions for telemetry calculations and validations.
 * These methods are stateless and pure.
 */
export const TelemetryUtils = {
  /**
   * Area limit in square degrees to secure API credit usage.
   * A value of 400 corresponds to a 20x20 degree box.
   */
  MAX_AREA_SQ_DEGREES: 400,

  /**
   * Spatial buffer in degrees for matching AeroAPI position to OpenSky states.
   * Creates a 3x3 degree search area centered on the aircraft.
   */
  SPATIAL_BUFFER_DEGREES: 1.5,

  /**
   * Maps an OpenSky state vector tuple to a MapFlightSummaryDTO.
   *
   * @param state - The state vector tuple from OpenSky.
   * @returns A summarized DTO for map display.
   */
  mapStateVectorToSummaryDTO(state: StateVectorTuple): MapFlightSummaryDTO {
    return {
      icao24: state[0],
      callsign: state[1] ? state[1].trim() : null,
      location: {
        type: "Point",
        coordinates: [state[5]!, state[6]!],
      },
      altitude: state[7] ?? null,
      velocity: state[9] ?? null,
      heading: state[10] ?? null,
      onGround: state[8],
      originCountry: state[2] ? state[2].trim() : null,
      category: state[17] ?? null,
    };
  },

  /**
   * Creates a BoundingBox around a given coordinate point using the spatial buffer.
   * Clamps results to valid geographic coordinate ranges.
   *
   * @param lat - Center latitude.
   * @param lon - Center longitude.
   * @returns OpenSky compatible BoundingBox object.
   */
  createBoundingBox(lat: number, lon: number): BoundingBox {
    return {
      lamin: Math.max(lat - this.SPATIAL_BUFFER_DEGREES, -90),
      lamax: Math.min(lat + this.SPATIAL_BUFFER_DEGREES, 90),
      lomin: Math.max(lon - this.SPATIAL_BUFFER_DEGREES, -180),
      lomax: Math.min(lon + this.SPATIAL_BUFFER_DEGREES, 180),
    };
  },

  /**
   * Validates that the requested bounding box area does not exceed security limits.
   * Calculated as (max_lat - min_lat) * (max_lon - min_lon).
   *
   * @param query - Bounding box area coordinates from the request.
   * @throws {BoundingBoxLimitError} If the area exceeds MAX_AREA_SQ_DEGREES.
   */
  validateAreaLimits(query: BoundingBoxAreaQuery): void {
    const latRange = query.lamax - query.lamin;
    const lonRange = query.lomax - query.lomin;
    const areaSqDegrees = latRange * lonRange;

    if (areaSqDegrees > this.MAX_AREA_SQ_DEGREES) {
      throw new BoundingBoxLimitError(
        `Requested map area (${areaSqDegrees.toFixed(2)}) sq° exceeded allowed limit ${this.MAX_AREA_SQ_DEGREES} sq°`,
      );
    }
  },
};
