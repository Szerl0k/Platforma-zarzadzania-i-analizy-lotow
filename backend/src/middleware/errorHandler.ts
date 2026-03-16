import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
    console.error('Unhandled error:', err);

    // TypeORM duplicate key
    if (err.code === '23505') {
        res.status(409).json({ error: 'Resource already exists' });
        return;
    }

    // TypeORM foreign key violation
    if (err.code === '23503') {
        res.status(400).json({ error: 'Referenced resource not found' });
        return;
    }

    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal server error',
    });
}
