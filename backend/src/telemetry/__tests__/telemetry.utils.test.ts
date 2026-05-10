import { TelemetryUtils } from "../telemetry.utils";
import { BoundingBoxLimitError } from "../telemetry.errors";

describe("TelemetryUtils", () => {
  describe("createBoundingBox", () => {
    it("should create a bounding box with the default buffer", () => {
      const lat = 52.0;
      const lon = 21.0;
      const buffer = TelemetryUtils.SPATIAL_BUFFER_DEGREES;

      const result = TelemetryUtils.createBoundingBox(lat, lon);

      expect(result).toEqual({
        lamin: lat - buffer,
        lamax: lat + buffer,
        lomin: lon - buffer,
        lomax: lon + buffer,
      });
    });

    it("should clamp latitude to -90", () => {
      const result = TelemetryUtils.createBoundingBox(-89.5, 0);
      expect(result.lamin).toBe(-90);
    });

    it("should clamp latitude to 90", () => {
      const result = TelemetryUtils.createBoundingBox(89.5, 0);
      expect(result.lamax).toBe(90);
    });

    it("should clamp longitude to -180", () => {
      const result = TelemetryUtils.createBoundingBox(0, -179.5);
      expect(result.lomin).toBe(-180);
    });

    it("should clamp longitude to 180", () => {
      const result = TelemetryUtils.createBoundingBox(0, 179.5);
      expect(result.lomax).toBe(180);
    });
  });

  describe("validateAreaLimits", () => {
    it("should not throw error if area is within limit", () => {
      const query = {
        lamin: 50,
        lamax: 60, // 10 degrees lat
        lomin: 20,
        lomax: 30, // 10 degrees lon
      }; // Area = 100

      expect(() => TelemetryUtils.validateAreaLimits(query)).not.toThrow();
    });

    it("should not throw error if area is exactly 400", () => {
      const query = {
        lamin: 0,
        lamax: 20,
        lomin: 0,
        lomax: 20,
      }; // Area = 400
      expect(() => TelemetryUtils.validateAreaLimits(query)).not.toThrow();
    });

    it("should throw BoundingBoxLimitError if area exceeds limit", () => {
      const query = {
        lamin: 40,
        lamax: 61, // 21 degrees lat
        lomin: 10,
        lomax: 30, // 20 degrees lon
      }; // Area = 420 > 400

      expect(() => TelemetryUtils.validateAreaLimits(query)).toThrow(
        BoundingBoxLimitError,
      );
    });

    it("should throw BoundingBoxLimitError with correct message", () => {
      const query = {
        lamin: 0,
        lamax: 21,
        lomin: 0,
        lomax: 20,
      }; // Area = 420

      expect(() => TelemetryUtils.validateAreaLimits(query)).toThrow(
        "Requested map area (420.00) sq° exceeded allowed limit 400 sq°",
      );
    });
  });
});
