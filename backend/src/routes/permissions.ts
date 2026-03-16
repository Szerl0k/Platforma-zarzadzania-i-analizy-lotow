import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { Permission } from '../database/entities/Permission';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    const permRepo = AppDataSource.getRepository(Permission);
    const permissions = await permRepo.find();
    res.json(permissions);
});

router.post('/', async (req: Request, res: Response) => {
    const { name, resource, action, description } = req.body;

    if (!name || !resource || !action) {
        res.status(400).json({ error: 'name, resource, and action are required' });
        return;
    }

    const permRepo = AppDataSource.getRepository(Permission);
    const permission = permRepo.create({
        name,
        resource,
        action,
        description: description || null,
    });

    await permRepo.save(permission);
    res.status(201).json(permission);
});

router.delete('/:id', async (req: Request, res: Response) => {
    const permRepo = AppDataSource.getRepository(Permission);
    const permission = await permRepo.findOne({ where: { id: parseInt(req.params.id as string) } });

    if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
    }

    await permRepo.remove(permission);
    res.status(204).send();
});

export default router;
