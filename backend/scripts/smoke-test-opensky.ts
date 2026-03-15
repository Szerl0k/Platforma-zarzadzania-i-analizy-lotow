import axios from 'axios';

async function runOpenSkySmokeTest(): Promise<void> {
    const clientId = process.env.OPENSKY_CLIENT_ID_SMOKE_TEST;
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET_SMOKE_TEST;

    if (!clientId || !clientSecret) {
        console.error('CRITICAL: Environment variables for OpenSky API auth are missing')
        process.exit(1);
    }

    const authUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
    const apiUrl = 'https://opensky-network.org/api/states/all';

    console.log('Starting smoke test for OpenSky Network API');

    try {
        const payload = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        });

        const authResponse = await axios.post(authUrl, payload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 5000
        });

        const token = authResponse.data.access_token;

        if (!token) {
            throw new Error('Access token is missing in the auth server response')
        }

        const startTime = Date.now();
        const apiResponse = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: {
                lamin: 52.09,
                lomin: 20.85,
                lamax: 52.37,
                lomax: 21.28
            },
            timeout: 5000
        });

        const duration = Date.now() - startTime;
        const data = apiResponse.data;

        if (apiResponse.status !== 200) {
            throw new Error(`Unexpected HTTP status: ${apiResponse.status}`);
        }

        if (!data || typeof data.time !== 'number') {
            throw new Error('"time" field is missing from the API response');
        }

        console.log(`Smoke test successful. Duration: ${duration}ms`);
        process.exit(0);
    } catch (error: unknown) {
        console.error('CRITICAL: OpenSky Network API Smoke test failed');
        if (axios.isAxiosError(error)) {
            console.error(`Status: ${error.response?.status} | Message: ${error.message}`);
        } else if (error instanceof Error) {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runOpenSkySmokeTest();