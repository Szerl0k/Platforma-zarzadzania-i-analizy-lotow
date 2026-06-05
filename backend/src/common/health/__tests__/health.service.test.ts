import { buildHealthReport } from "../health.service";
import { AppDataSource } from "../../database/data-source";

jest.mock("../../database/data-source", () => ({
  AppDataSource: { isInitialized: true, query: jest.fn() },
}));

const mockedQuery = (AppDataSource as unknown as { query: jest.Mock }).query;

describe("buildHealthReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AEROAPI_KEY = "x";
    process.env.OPENSKY_CLIENT_ID = "x";
    process.env.OPENSKY_CLIENT_SECRET = "x";
    process.env.SMTP_HOST = "x";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "x";
    process.env.SMTP_PASSWORD = "x";
    process.env.MAIL_FROM = "x";
  });

  it("reports ok when the database responds", async () => {
    mockedQuery.mockResolvedValue([{ "?column?": 1 }]);
    const report = await buildHealthReport();
    expect(report.status).toBe("ok");
    expect(report.services.database.status).toBe("up");
    expect(report.services.aeroapi.status).toBe("up");
  });

  it("reports degraded when the database query fails", async () => {
    mockedQuery.mockRejectedValue(new Error("down"));
    const report = await buildHealthReport();
    expect(report.status).toBe("degraded");
    expect(report.services.database.status).toBe("down");
  });

  it("flags unconfigured external services", async () => {
    mockedQuery.mockResolvedValue([{ "?column?": 1 }]);
    delete process.env.AEROAPI_KEY;
    const report = await buildHealthReport();
    expect(report.services.aeroapi.status).toBe("not_configured");
    // DB still up → overall ok despite unconfigured provider.
    expect(report.status).toBe("ok");
  });
});
