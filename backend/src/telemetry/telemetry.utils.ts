import { BoundingBox } from "../common/integrations/opensky";
import { BoundingBoxAreaQuery } from "./telemetry.dto";
import { BoundingBoxLimitError } from "./telemetry.errors";

/**
 * Utility functions for telemetry calculations and validations.
 * These methods are stateless and pure.
 */
export const TelemetryUtils = {
  /**
   * Area limit (in square degrees) to secure API credit usage.
   */
  MAX_AREA_SQ_DEGREES: 400,

  /**
   * Spatial buffer in degrees for matching AeroAPI position to OpenSky states.
   */
  SPATIAL_BUFFER_DEGREES: 1.5,

  /**
   * Creates a BoundingBox around a given coordinate point using the spatial buffer.
   * 
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns OpenSky compatible BoundingBox
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
   * 
   * @param query - Bounding box area coordinates.
   * @throws {BoundingBoxLimitError} If area exceeds limits.
   */
  validateAreaLimits(query: BoundingBoxAreaQuery): void {
    const latRange = query.lamax - query.lamin;
    const lonRange = query.lomax - query.lomin;
    const areaSqDegrees = latRange * lonRange;

    if (areaSqDegrees > this.MAX_AREA_SQ_DEGREES) {
      throw new BoundingBoxLimitError(
        `Requested map area (${areaSqDegrees.toFixed(2)}) sq° exceeded allowed limit ${this.MAX_AREA_SQ_DEGREES} sq°`
      );
    }
  },
};
