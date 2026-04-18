import { Request, Response, NextFunction } from 'express';
import {ZodError} from "zod";
import {AeroAPIError} from "../integrations/aeroapi";
import {OpenSkyError} from "../integrations/opensky";

export function globalErrorHandler(
    err: any,
    req: Request,
    res: Response ,
    next: NextFunction
): void {
    // Zod

    if (err instanceof ZodError) {
        const zodError = err as ZodError<any>;
        res.status(400).json({
            success: false,
            error: 'Input data validation error.',
            details: zodError.issues.map(e => ({ path: e.path.join('.'), message: e.message}))
        });
        return
    }

    // TypeORM: Duplicate Key
    if (err.code === '23505') {
        res.status(409).json({ error: 'Resource already exists' });
        return;
    }

    // TypeORM: Foreign Key Violaton
    if (err.code === '23503') {
        res.status(400).json({ error: 'Referenced resource not found' });
        return;
    }

    // Custom errors like BoundingBoxLimitError
    if ('statusCode' in err && typeof err.statusCode === 'number') {
        res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
        return;
    }

    // API wrappers errors
    if (err instanceof AeroAPIError || err instanceof OpenSkyError) {
        console.error(`[Upstream API Error] ${err.name}: ${err.message}`, err);

        // 502 bad gateway
        const statusCode = ('status' in err && typeof err.status === 'number') ? err.status : 502;

        res.status(statusCode).json({
            success: false,
            error: 'Error with communication to external data provider'
        })
    }

    console.error('[Unhandled Server Exception]:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Report'
    })

}