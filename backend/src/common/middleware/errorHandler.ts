import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AeroAPIError } from "../integrations/aeroapi";
import { OpenSkyError } from "../integrations/opensky";
import { logger } from "../utils/logger";

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Input data validation error.",
      details: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  const errObj = err as Record<string, unknown>;

  // TypeORM: Duplicate Key
  if (errObj.code === "23505") {
    res.status(409).json({ error: "Resource already exists" });
    return;
  }

  // TypeORM: Foreign Key Violaton
  if (errObj.code === "23503") {
    res.status(400).json({ error: "Referenced resource not found" });
    return;
  }

  // Custom errors like BoundingBoxLimitError
  if (typeof errObj.statusCode === "number") {
    res.status(errObj.statusCode).json({
      success: false,
      error: String(errObj.message ?? "Unknown error"),
    });
    return;
  }

  // API wrappers errors
  if (err instanceof AeroAPIError || err instanceof OpenSkyError) {
    logger.error(`[Upstream API Error] ${err.name}: ${err.message}`, err);

    // 502 bad gateway
    let statusCode = 502;
    if ("status" in err && typeof err.status === "number") {
      statusCode = err.status;
    }

    res.status(statusCode).json({
      success: false,
      error: "Error with communication to external data provider",
    });
    return;
  }

  logger.error("[Unhandled Server Exception]:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
  });
}
