import { HttpError } from "../common/errors/http-errors";

export class BoundingBoxLimitError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = "BoundingBoxLimitError";
  }
}

export class DataStaleError extends HttpError {
  constructor(message: string = "Received telemetry data is stale.") {
    super(409, message);
    this.name = "DataStaleError";
  }
}
