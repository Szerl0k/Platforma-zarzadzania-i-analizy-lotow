export class FlightNotFoundError extends Error {
  public readonly statusCode: number = 404;

  constructor(message: string = "Flight details not found") {
    super(message);
    this.name = "FlightNotFoundError";
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, FlightNotFoundError);
  }
}

export class TelemetryNotFoundError extends Error {
  public readonly statusCode: number = 404;

  constructor(message: string = "Telemetry data not found") {
    super(message);
    this.name = "TelemetryNotFoundError";
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, TelemetryNotFoundError);
  }
}
