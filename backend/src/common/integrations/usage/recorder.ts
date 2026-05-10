import { AppDataSource } from "../../database/data-source";
import { ApiUsageLog, ApiUsageProvider } from "./ApiUsageLog";

interface RecordApiCallInput {
  provider: ApiUsageProvider;
  endpoint: string;
  statusCode: number | null;
  success: boolean;
  durationMs: number;
}

function normalizeAeroApiEndpoint(endpoint: string): string {
  let p = endpoint;
  p = p.replace(
    /^\/airports\/[^/]+\/flights\/to\/[^/]+$/,
    "/airports/:origin/flights/to/:dest",
  );
  p = p.replace(
    /^\/airports\/[^/]+\/flights\/(arrivals|departures)$/,
    "/airports/:id/flights/$1",
  );
  p = p.replace(/^\/airports\/[^/]+\/flights$/, "/airports/:id/flights");
  p = p.replace(/^\/airports\/[^/]+$/, "/airports/:id");
  p = p.replace(/^\/operators\/[^/]+$/, "/operators/:id");
  p = p.replace(/^\/flights\/[^/]+\/position$/, "/flights/:id/position");
  p = p.replace(/^\/flights\/[^/]+$/, "/flights/:ident");
  p = p.replace(/^\/schedules\/[^/]+\/[^/]+$/, "/schedules/:start/:end");
  return p;
}

export function normalizeEndpoint(
  provider: ApiUsageProvider,
  endpoint: string,
): string {
  const trimmed = endpoint.split("?")[0];
  if (provider === "aeroapi") return normalizeAeroApiEndpoint(trimmed);
  return trimmed;
}

export function recordApiCall(input: RecordApiCallInput): void {
  // Fire-and-forget: persistence failures must never break the API call path.
  void AppDataSource.getRepository(ApiUsageLog)
    .insert({
      provider: input.provider,
      endpoint: normalizeEndpoint(input.provider, input.endpoint),
      statusCode: input.statusCode,
      success: input.success,
      durationMs: input.durationMs,
    })
    .catch((err: unknown) => {
      console.error("[apiUsage] failed to record call", err);
    });
}
