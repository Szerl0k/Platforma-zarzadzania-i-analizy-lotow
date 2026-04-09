import { AeroAPIClient } from './client';

export { AeroAPIClient, AeroAPIError } from './client';
export * from './types';

let cachedClient: AeroAPIClient | null = null;

export function getAeroApiClient(): AeroAPIClient {
    if (cachedClient) return cachedClient;

    const apiKey = process.env.AEROAPI_KEY;
    if (!apiKey) {
        throw new Error('AEROAPI_KEY environment variable is not set');
    }

    cachedClient = new AeroAPIClient(apiKey);
    return cachedClient;
}
