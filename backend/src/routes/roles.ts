import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { Role } from '../database/entities/Role';
import { RolePermission } from '../database/entities/RolePermission';
import { Permission } from '../database/entities/Permission';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find();
    res.json(roles);
});

router.post('/', async (req: Request, res: Response) => {
    const { name, description } = req.body;

    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const role = roleRepo.create({
        name,
        description: description || null,
        isSystem: false,
        createdAt: new Date(),
    });

    await roleRepo.save(role);
    res.status(201).json(role);
});

router.patch('/:id', async (req: Request, res: Response) => {
    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { id: parseInt(req.params.id as string) } });

    if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
    }

    if (role.isSystem) {
        res.status(403).json({ error: 'Cannot modify system roles' });
        return;
    }

    if (req.body.name !== undefined) role.name = req.body.name;
    if (req.body.description !== undefined) role.description = req.body.description;

    await roleRepo.save(role);
    res.json(role);
});

router.delete('/:id', async (req: Request, res: Response) => {
    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { id: parseInt(req.params.id as string) } });

    if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
    }

    if (role.isSystem) {
        res.status(403).json({ error: 'Cannot delete system roles' });
        return;
    }

    await roleRepo.remove(role);
    res.status(204).send();
});

router.get('/:id/permissions', async (req: Request, res: Response) => {
    const rpRepo = AppDataSource.getRepository(RolePermission);
    const rolePermissions = await rpRepo.find({
        where: { roleId: parseInt(req.params.id as string) },
        relations: ['permission'],
    });

    res.json(rolePermissions.map(rp => rp.permission));
});

router.post('/:id/permissions', async (req: Request, res: Response) => {
    const { permissionId } = req.body;

    if (!permissionId) {
        res.status(400).json({ error: 'permissionId is required' });
        return;
    }

    const permRepo = AppDataSource.getRepository(Permission);
    const permission = await permRepo.findOne({ where: { id: permissionId } });
    if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
    }

    const rpRepo = AppDataSource.getRepository(RolePermission);
    const rp = rpRepo.create({
        roleId: parseInt(req.params.id as string),
        permissionId,
        grantedAt: new Date(),
    });

    await rpRepo.save(rp);
    res.status(201).json(rp);
});

router.delete('/:id/permissions/:permissionId', async (req: Request, res: Response) => {
    const rpRepo = AppDataSource.getRepository(RolePermission);
    const rp = await rpRepo.findOne({
        where: {
            roleId: parseInt(req.params.id as string),
            permissionId: parseInt(req.params.permissionId as string),
        },
    });

    if (!rp) {
        res.status(404).json({ error: 'Role permission not found' });
        return;
    }

    await rpRepo.remove(rp);
    res.status(204).send();
});

export default router;
