import { normalizeEndpoint } from "../recorder";

describe("normalizeEndpoint", () => {
  describe("opensky", () => {
    it("returns the endpoint unchanged for static paths", () => {
      expect(normalizeEndpoint("opensky", "/states/all")).toBe("/states/all");
      expect(normalizeEndpoint("opensky", "/flights/arrival")).toBe(
        "/flights/arrival",
      );
      expect(normalizeEndpoint("opensky", "/tracks")).toBe("/tracks");
    });

    it("strips a query string if present", () => {
      expect(normalizeEndpoint("opensky", "/states/all?lamin=50")).toBe(
        "/states/all",
      );
    });
  });

  describe("aeroapi", () => {
    it("collapses dynamic flight ident into :ident", () => {
      expect(normalizeEndpoint("aeroapi", "/flights/UAL123")).toBe(
        "/flights/:ident",
      );
    });

    it("collapses flight position path into :id/position", () => {
      expect(
        normalizeEndpoint("aeroapi", "/flights/AAL456-1234567/position"),
      ).toBe("/flights/:id/position");
    });

    it("collapses airport ICAO/IATA into :id", () => {
      expect(normalizeEndpoint("aeroapi", "/airports/EPWA")).toBe(
        "/airports/:id",
      );
      expect(normalizeEndpoint("aeroapi", "/airports/EPWA/flights")).toBe(
        "/airports/:id/flights",
      );
      expect(
        normalizeEndpoint("aeroapi", "/airports/EPWA/flights/arrivals"),
      ).toBe("/airports/:id/flights/arrivals");
      expect(
        normalizeEndpoint("aeroapi", "/airports/EPWA/flights/departures"),
      ).toBe("/airports/:id/flights/departures");
    });

    it("collapses origin/destination pair into :origin/:dest", () => {
      expect(
        normalizeEndpoint("aeroapi", "/airports/EPWA/flights/to/EGLL"),
      ).toBe("/airports/:origin/flights/to/:dest");
    });

    it("collapses operator code into :id", () => {
      expect(normalizeEndpoint("aeroapi", "/operators/UAL")).toBe(
        "/operators/:id",
      );
    });

    it("collapses schedule date pair into :start/:end", () => {
      expect(
        normalizeEndpoint("aeroapi", "/schedules/2026-05-10/2026-05-11"),
      ).toBe("/schedules/:start/:end");
    });
  });
});
