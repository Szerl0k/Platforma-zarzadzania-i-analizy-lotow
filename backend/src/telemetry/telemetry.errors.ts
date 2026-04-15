export class BoundingBoxLimitError extends Error {
    public readonly statusCode: number = 400;

    constructor(message: string) {
        super(message);

        this.name = 'BoundingBoxLimitError';
        this.statusCode = 400;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BoundingBoxLimitError);
        }
    }
}

export class RateLimitExceededError extends Error {
    public readonly statusCode: number = 429;

    constructor(message: string = "Token limit exceeded for external API") {
        super(message);
        this.name = 'RateLimitExceededError';
        if (Error.captureStackTrace) Error.captureStackTrace(this, RateLimitExceededError);

    }

}

export class DataStaleError extends Error {
    public readonly statusCode: number = 409

    constructor(message: string = 'Recieved telemetry data is stale.') {
        super(message);
        this.name = 'DataStaleError';
        if (Error.captureStackTrace) Error.captureStackTrace(this, DataStaleError);
    }
}