import { Flight } from "../Flight";

describe("Flight Entity", () => {
  let flight: Flight;

  beforeEach(() => {
    flight = new Flight();
  });

  describe("updateSchedule", () => {
    it("should update timestamps when valid date strings are provided", () => {
      const data = {
        scheduledOut: "2026-06-03T10:00:00Z",
        estimatedOut: "2026-06-03T11:00:00Z",
        actualOut: "2026-06-03T12:00:00Z",
        scheduledIn: "2026-06-03T14:00:00Z",
        estimatedIn: "2026-06-03T15:00:00Z",
        actualIn: "2026-06-03T16:00:00Z",
      };

      flight.updateSchedule(data);

      expect(flight.scheduledOut).toEqual(new Date("2026-06-03T10:00:00Z"));
      expect(flight.estimatedOut).toEqual(new Date("2026-06-03T11:00:00Z"));
      expect(flight.actualOut).toEqual(new Date("2026-06-03T12:00:00Z"));
      expect(flight.scheduledIn).toEqual(new Date("2026-06-03T14:00:00Z"));
      expect(flight.estimatedIn).toEqual(new Date("2026-06-03T15:00:00Z"));
      expect(flight.actualIn).toEqual(new Date("2026-06-03T16:00:00Z"));
    });

    it("should set timestamps to null if null is passed", () => {
      flight.scheduledOut = new Date();
      flight.updateSchedule({ scheduledOut: null });
      expect(flight.scheduledOut).toBeNull();
    });

    it("should not modify timestamps if undefined is passed", () => {
      const existingDate = new Date("2026-06-01T10:00:00Z");
      flight.scheduledOut = existingDate;
      flight.updateSchedule({ scheduledOut: undefined });
      expect(flight.scheduledOut).toEqual(existingDate);
    });
  });

  describe("isDelayed", () => {
    it("should return false if delays are null", () => {
      flight.departureDelay = null;
      flight.arrivalDelay = null;
      expect(flight.isDelayed()).toBe(false);
    });

    it("should return false if delays are 0", () => {
      flight.departureDelay = 0;
      flight.arrivalDelay = 0;
      expect(flight.isDelayed()).toBe(false);
    });

    it("should return true if departureDelay is greater than 0", () => {
      flight.departureDelay = 15;
      flight.arrivalDelay = null;
      expect(flight.isDelayed()).toBe(true);
    });

    it("should return true if arrivalDelay is greater than 0", () => {
      flight.departureDelay = null;
      flight.arrivalDelay = 10;
      expect(flight.isDelayed()).toBe(true);
    });

    it("should return true if both delays are greater than 0", () => {
      flight.departureDelay = 5;
      flight.arrivalDelay = 5;
      expect(flight.isDelayed()).toBe(true);
    });
  });
});
