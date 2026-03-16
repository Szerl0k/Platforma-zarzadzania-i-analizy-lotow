import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { UserPreferences } from '../database/entities/UserPreferences';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const prefsRepo = AppDataSource.getRepository(UserPreferences);
    const prefs = await prefsRepo.findOne({ where: { userId: req.userId } });

    if (!prefs) {
        res.status(404).json({ error: 'Preferences not found' });
        return;
    }

    res.json(prefs);
});

router.patch('/', async (req: Request, res: Response) => {
    const prefsRepo = AppDataSource.getRepository(UserPreferences);
    const prefs = await prefsRepo.findOne({ where: { userId: req.userId } });

    if (!prefs) {
        res.status(404).json({ error: 'Preferences not found' });
        return;
    }

    const allowedFields = [
        'emailNotifications', 'pushNotifications', 'notifyOnDelay',
        'notifyOnGateChange', 'notifyOnStatusChange', 'delayThresholdMinutes',
        'timezone', 'distanceUnit',
    ] as const;

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            (prefs as any)[field] = req.body[field];
        }
    }

    prefs.updatedAt = new Date();
    await prefsRepo.save(prefs);

    res.json(prefs);
});

export default router;
