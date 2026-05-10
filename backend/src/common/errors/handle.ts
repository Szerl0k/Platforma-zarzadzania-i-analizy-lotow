import { Response } from "express";
import { HttpError } from "./http-errors";
import { logger } from "../utils/logger";

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

export function handleHttpError(err: unknown, res: Response): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const req = res.req;
  const context = req
    ? {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        body: redact(req.body),
      }
    : undefined;

  logger.error("[Unhandled Server Exception]", {
    request: context,
    error: describeError(err),
  });
  res.status(500).json({ error: "Internal server error" });
}
