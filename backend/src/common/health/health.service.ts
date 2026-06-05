import { AppDataSource } from "../database/data-source";
import { logger } from "../utils/logger";

export type ServiceState = "up" | "down" | "not_configured";

export interface ServiceHealth {
  status: ServiceState;
  detail?: string;
}

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    database: ServiceHealth;
    aeroapi: ServiceHealth;
    opensky: ServiceHealth;
    smtp: ServiceHealth;
  };
}

async function checkDatabase(): Promise<ServiceHealth> {
  try {
    if (!AppDataSource.isInitialized) {
      return { status: "down", detail: "DataSource not initialized" };
    }
    await AppDataSource.query("SELECT 1");
    return { status: "up" };
  } catch (err) {
    logger.error("Health check: database query failed", err);
    return { status: "down", detail: (err as Error).message };
  }
}

function checkConfigured(vars: string[], label: string): ServiceHealth {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return {
      status: "not_configured",
      detail: `${label}: brak zmiennych ${missing.join(", ")}`,
    };
  }
  return { status: "up" };
}

/**
 * Builds a health report. The database is actively pinged; external providers
 * report whether their credentials are configured (a deliberate choice — calling
 * AeroAPI/OpenSky on every health check would burn rate-limited quota).
 */
export async function buildHealthReport(
  now: Date = new Date(),
): Promise<HealthReport> {
  const database = await checkDatabase();
  const aeroapi = checkConfigured(["AEROAPI_KEY"], "AeroAPI");
  const opensky = checkConfigured(
    ["OPENSKY_CLIENT_ID", "OPENSKY_CLIENT_SECRET"],
    "OpenSky",
  );
  const smtp = checkConfigured(
    ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"],
    "SMTP",
  );

  const services = { database, aeroapi, opensky, smtp };
  // Only a database outage is treated as a hard failure; unconfigured external
  // providers degrade the system but do not take it down.
  const status: HealthReport["status"] =
    database.status === "up" ? "ok" : "degraded";

  return { status, timestamp: now.toISOString(), services };
}
