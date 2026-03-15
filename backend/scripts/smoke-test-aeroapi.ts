import axios from 'axios';

async function runSmokeTest() : Promise<void> {
    const apiKey = process.env.AEROAPI_SMOKE_TEST_KEY;
    const apiUrl = 'https://aeroapi.flightaware.com/aeroapi/airports/EPWA';

    if (!apiKey) {
        console.error('CRITICAL: AEROAPI_KEY environment variable is missing')
        process.exit(1);
    }

    console.log(`Starting AeroAPI smoke test (Endpoint: ${apiUrl})`)
    const startTime = Date.now();

    try {
        const res = await axios.get(apiUrl, {
            headers: {
                'x-apikey': apiKey,
                'Accept': 'application/json'
            },
            timeout: 5000
        })

        const duration = Date.now() - startTime;
        const data = res.data;

        if (res.status !== 200) {
            throw new Error(`Unexpected HTTP status: ${res.status}`);
        }

        if (!data || typeof data.airport_code !== 'string') {
            throw new Error('"airport_code" field is missing from the API response');
        }

        console.log(`Smoke test successful. Duration: ${duration}ms`);
        process.exit(0);
    } catch (error: unknown) {
        console.error('CRITICAL: Smoke test failed');

        if (axios.isAxiosError(error)) {
            console.error(`Status: ${error.response?.status} | Message: ${error.message}`);
        } else if (error instanceof Error) {
            console.error(error.message);
        }
        process.exit(1);

    }
}

runSmokeTest();