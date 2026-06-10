import { HttpError } from "./http-errors";

export * from "./http-errors";

export class FlightNotFoundError extends HttpError {
  constructor(message: string = "Flight details not found") {
    super(404, message);
    this.name = "FlightNotFoundError";
  }
}

export class TelemetryNotFoundError extends HttpError {
  constructor(message: string = "Telemetry data not found") {
    super(404, message);
    this.name = "TelemetryNotFoundError";
  }
}

export class RateLimitExceededError extends HttpError {
  constructor(message: string = "Token limit exceeded for external API") {
    super(429, message);
    this.name = "RateLimitExceededError";
  }
}
