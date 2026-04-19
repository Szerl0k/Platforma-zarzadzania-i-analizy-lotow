import { OpenSkyClient } from "./client";

export { OpenSkyClient, OpenSkyError } from "./client";
export * from "./types";

let cachedClient: OpenSkyClient | null = null;

export function getOpenSkyClient(): OpenSkyClient {
  if (cachedClient) return cachedClient;

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId) {
    throw new Error("OPENSKY_CLIENT_ID environment variable is not set");
  }

  if (!clientSecret) {
    throw new Error("OPENSKY_CLIENT_SECRET environment variable is not set");
  }

  cachedClient = new OpenSkyClient(clientId, clientSecret);
  return cachedClient;
}
