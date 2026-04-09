import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../common/middleware/auth';
import {
    createAirline,
    createAirport,
    deleteAirline,
    deleteAirport,
    getOrFetchAirline,
    getOrFetchAirport,
    listAirlines,
    listAirports,
    searchAirlines,
    searchAirports,
    serializeAirline,
    serializeAirport,
    updateAirline,
    updateAirport,
} from './geo.service';

const router = Router();

function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

function parseLimit(value: unknown, fallback: number): number {
    const parsed = parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parseOffset(value: unknown): number {
    const parsed = parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

router.get(
    '/airports/search',
    asyncHandler(async (req, res) => {
        const q = String(req.query.q ?? '').trim();
        if (!q) {
            res.json([]);
            return;
        }
        const limit = parseLimit(req.query.limit, 20);
        const results = await searchAirports(q, limit);
        res.json(results.map(serializeAirport));
    }),
);

router.get(
    '/airports',
    asyncHandler(async (req, res) => {
        const limit = parseLimit(req.query.limit, 50);
        const offset = parseOffset(req.query.offset);
        const { items, total } = await listAirports(limit, offset);
        res.json({
            items: items.map(serializeAirport),
            total,
            limit,
            offset,
        });
    }),
);

router.get(
    '/airports/:code',
    asyncHandler(async (req, res) => {
        const code = String(req.params.code ?? '');
        if (!code.trim()) {
            res.status(400).json({ error: 'Airport code is required' });
            return;
        }
        const airport = await getOrFetchAirport(code);
        res.json(serializeAirport(airport));
    }),
);

router.post(
    '/airports',
    authenticate,
    authorize('geo:write'),
    asyncHandler(async (req, res) => {
        const created = await createAirport(req.body);
        res.status(201).json(serializeAirport(created));
    }),
);

router.patch(
    '/airports/:code',
    authenticate,
    authorize('geo:write'),
    asyncHandler(async (req, res) => {
        const updated = await updateAirport(String(req.params.code ?? ''), req.body);
        res.json(serializeAirport(updated));
    }),
);

router.delete(
    '/airports/:code',
    authenticate,
    authorize('geo:delete'),
    asyncHandler(async (req, res) => {
        await deleteAirport(String(req.params.code ?? ''));
        res.status(204).send();
    }),
);

router.get(
    '/airlines/search',
    asyncHandler(async (req, res) => {
        const q = String(req.query.q ?? '').trim();
        if (!q) {
            res.json([]);
            return;
        }
        const limit = parseLimit(req.query.limit, 20);
        const results = await searchAirlines(q, limit);
        res.json(results.map(serializeAirline));
    }),
);

router.get(
    '/airlines',
    asyncHandler(async (req, res) => {
        const limit = parseLimit(req.query.limit, 50);
        const offset = parseOffset(req.query.offset);
        const { items, total } = await listAirlines(limit, offset);
        res.json({
            items: items.map(serializeAirline),
            total,
            limit,
            offset,
        });
    }),
);

router.get(
    '/airlines/:code',
    asyncHandler(async (req, res) => {
        const code = String(req.params.code ?? '');
        if (!code.trim()) {
            res.status(400).json({ error: 'Airline code is required' });
            return;
        }
        const airline = await getOrFetchAirline(code);
        res.json(serializeAirline(airline));
    }),
);

router.post(
    '/airlines',
    authenticate,
    authorize('geo:write'),
    asyncHandler(async (req, res) => {
        const created = await createAirline(req.body);
        res.status(201).json(serializeAirline(created));
    }),
);

router.patch(
    '/airlines/:code',
    authenticate,
    authorize('geo:write'),
    asyncHandler(async (req, res) => {
        const updated = await updateAirline(String(req.params.code ?? ''), req.body);
        res.json(serializeAirline(updated));
    }),
);

router.delete(
    '/airlines/:code',
    authenticate,
    authorize('geo:delete'),
    asyncHandler(async (req, res) => {
        await deleteAirline(String(req.params.code ?? ''));
        res.status(204).send();
    }),
);

export default router;
