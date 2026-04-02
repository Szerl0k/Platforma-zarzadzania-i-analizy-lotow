import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../common/database/data-source';
import { User } from '../entities/User';
import { authorize } from '../../common/middleware/auth';

const router = Router();

router.get('/me', async (req: Request, res: Response) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
        where: { id: req.userId },
        relations: ['role'],
    });

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    const { passwordHash, ...userData } = user;
    res.json(userData);
});

router.patch('/me', async (req: Request, res: Response) => {
    const { nickname, profilePublic } = req.body;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id: req.userId } });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    if (nickname !== undefined) user.nickname = nickname;
    if (profilePublic !== undefined) user.profilePublic = profilePublic;
    user.updatedAt = new Date();

    await userRepo.save(user);

    const { passwordHash, ...userData } = user;
    res.json(userData);
});

router.get('/:id', async (req: Request, res: Response) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
        where: { id: req.params.id as string },
        relations: ['role'],
    });

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    // Allow if profile is public or requester is admin (roleId 1)
    if (!user.profilePublic && req.roleId !== 1) {
        res.status(403).json({ error: 'Profile is private' });
        return;
    }

    res.json({
        id: user.id,
        nickname: user.nickname,
        profilePublic: user.profilePublic,
        createdAt: user.createdAt,
    });
});

router.delete('/:id', authorize('users:delete'), async (req: Request, res: Response) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.params.id as string } });

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    await userRepo.remove(user);
    res.status(204).send();
});

export default router;
