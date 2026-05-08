import {
  LocateFlightQuerySchema,
  BoundingBoxAreaQuerySchema,
} from "../telemetry.dto";

describe("Telemetry DTO Schemas", () => {
  describe("LocateFlightQuerySchema", () => {
    it("should validate when faFlightId is provided", () => {
      const result = LocateFlightQuerySchema.safeParse({
        faFlightId: "AAL123-12345678",
      });
      expect(result.success).toBe(true);
    });

    it("should validate when icao24 is provided", () => {
      const result = LocateFlightQuerySchema.safeParse({ icao24: "a1b2c3" });
      expect(result.success).toBe(true);
    });

    it("should validate when both are provided", () => {
      const result = LocateFlightQuerySchema.safeParse({
        faFlightId: "AAL123-12345678",
        icao24: "a1b2c3",
      });
      expect(result.success).toBe(true);
    });

    it("should fail when neither is provided", () => {
      const result = LocateFlightQuerySchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Należy podać faFlightId lub icao24.",
        );
      }
    });
  });

  describe("BoundingBoxAreaQuerySchema", () => {
    it("should validate a correct bounding box", () => {
      const result = BoundingBoxAreaQuerySchema.safeParse({
        lamin: 50,
        lamax: 52,
        lomin: 20,
        lomax: 22,
      });
      expect(result.success).toBe(true);
    });

    it("should coerce strings to numbers", () => {
      const result = BoundingBoxAreaQuerySchema.safeParse({
        lamin: "50",
        lamax: "52",
        lomin: "20",
        lomax: "22",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lamin).toBe(50);
      }
    });

    it("should fail if lamin >= lamax", () => {
      const result = BoundingBoxAreaQuerySchema.safeParse({
        lamin: 52,
        lamax: 50,
        lomin: 20,
        lomax: 22,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Parametr 'lamin' musi być mniejszy niż 'lamax'",
        );
      }
    });

    it("should fail if lomin > lomax", () => {
      const result = BoundingBoxAreaQuerySchema.safeParse({
        lamin: 50,
        lamax: 52,
        lomin: 22,
        lomax: 20,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Parametr 'lomin' musi być mniejszy niż 'lomax'",
        );
      }
    });

    it("should fail if coordinates are out of bounds", () => {
      const result = BoundingBoxAreaQuerySchema.safeParse({
        lamin: -91,
        lamax: 91,
        lomin: -181,
        lomax: 181,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(4);
      }
    });
  });
});
