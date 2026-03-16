import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import { Role } from '../database/entities/Role';
import { UserPreferences } from '../database/entities/UserPreferences';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const prefsRepo = AppDataSource.getRepository(UserPreferences);

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }

    const defaultRole = await roleRepo.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
        res.status(500).json({ error: 'Default role not found' });
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const user = userRepo.create({
        email,
        passwordHash,
        nickname: nickname || null,
        emailVerified: false,
        profilePublic: false,
        roleId: defaultRole.id,
        createdAt: now,
        updatedAt: now,
    });

    await userRepo.save(user);

    const preferences = prefsRepo.create({
        userId: user.id,
        emailNotifications: true,
        pushNotifications: false,
        notifyOnDelay: true,
        notifyOnGateChange: true,
        notifyOnStatusChange: true,
        delayThresholdMinutes: 15,
        timezone: 'UTC',
        distanceUnit: 'km',
        createdAt: now,
        updatedAt: now,
    });

    await prefsRepo.save(preferences);

    const signOptions: SignOptions = { expiresIn: '7d' };
    const token = jwt.sign(
        { userId: user.id, roleId: user.roleId },
        process.env.JWT_SECRET!,
        signOptions,
    );

    res.status(201).json({
        token,
        user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            emailVerified: user.emailVerified,
            profilePublic: user.profilePublic,
            roleId: user.roleId,
            createdAt: user.createdAt,
        },
    });
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    user.lastLogin = new Date();
    await userRepo.save(user);

    const loginSignOptions: SignOptions = { expiresIn: '7d' };
    const token = jwt.sign(
        { userId: user.id, roleId: user.roleId },
        process.env.JWT_SECRET!,
        loginSignOptions,
    );

    res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            emailVerified: user.emailVerified,
            profilePublic: user.profilePublic,
            roleId: user.roleId,
            createdAt: user.createdAt,
        },
    });
});

export default router;
