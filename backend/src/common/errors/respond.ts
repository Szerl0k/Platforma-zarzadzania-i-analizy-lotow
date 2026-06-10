import { Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "./http-errors";
import { AeroAPIError } from "../integrations/aeroapi";
import { OpenSkyError } from "../integrations/opensky";
import { logger } from "../utils/logger";

export interface ErrorBody {
  success: false;
  error: string;
  details?: { path: string; message: string }[];
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "refreshToken",
  "accessToken",
  "authorization",
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k) ? "[REDACTED]" : redact(v);
  }
  return out;
}

function describeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const extra: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(err)) {
      if (key === "stack" || key === "message" || key === "name") continue;
      extra[key] = (err as unknown as Record<string, unknown>)[key];
    }
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(Object.keys(extra).length ? { extra } : {}),
      ...(err.cause !== undefined ? { cause: describeError(err.cause) } : {}),
    };
  }
  return { value: err };
}

export function mapError(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof HttpError) {
    return { status: err.status, body: { success: false, error: err.message } };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        success: false,
        error: "Input data validation error.",
        details: err.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    };
  }

  const errObj = err as Record<string, unknown>;

  if (errObj.code === "23505") {
    return {
      status: 409,
      body: { success: false, error: "Resource already exists" },
    };
  }
  if (errObj.code === "23503") {
    return {
      status: 400,
      body: { success: false, error: "Referenced resource not found" },
    };
  }

  if (err instanceof AeroAPIError || err instanceof OpenSkyError) {
    let status = 502;
    if ("status" in err && typeof err.status === "number") {
      status = err.status;
    }
    return {
      status,
      body: {
        success: false,
        error: "Error with communication to external data provider",
      },
    };
  }

  if (typeof errObj.statusCode === "number") {
    return {
      status: errObj.statusCode,
      body: {
        success: false,
        error: String(errObj.message ?? "Unknown error"),
      },
    };
  }

  return {
    status: 500,
    body: { success: false, error: "Internal Server Error" },
  };
}

export function respondWithError(
  err: unknown,
  req: Request | undefined,
  res: Response,
): void {
  const { status, body } = mapError(err);

  if (status >= 500) {
    const context = req
      ? {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query,
          body: redact(req.body),
        }
      : undefined;
    logger.error("[Server Error]", {
      request: context,
      error: describeError(err),
    });
  }

  res.status(status).json(body);
}
