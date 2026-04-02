import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../../common/database/data-source';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { UserPreferences } from '../entities/UserPreferences';
import { RefreshToken } from '../entities/RefreshToken';

const router = Router();

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;           // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: ACCESS_TOKEN_MAX_AGE,
        path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        path: '/api/auth',
    });
}

async function createRefreshToken(userId: string): Promise<string> {
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    const rawToken = crypto.randomBytes(40).toString('hex');

    const refreshToken = refreshTokenRepo.create({
        tokenHash: hashToken(rawToken),
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
        createdAt: new Date(),
    });

    await refreshTokenRepo.save(refreshToken);
    return rawToken;
}

function signAccessToken(userId: string, roleId: number): string {
    const signOptions: SignOptions = { expiresIn: '15m' };
    return jwt.sign(
        { userId, roleId },
        process.env.JWT_SECRET!,
        signOptions,
    );
}

function userResponse(user: User) {
    return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        emailVerified: user.emailVerified,
        profilePublic: user.profilePublic,
        roleId: user.roleId,
        createdAt: user.createdAt,
    };
}

router.post('/register', async (req: Request, res: Response) => {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
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

    const accessToken = signAccessToken(user.id, user.roleId);
    const refreshToken = await createRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: userResponse(user) });
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

    const accessToken = signAccessToken(user.id, user.roleId);
    const refreshToken = await createRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user: userResponse(user) });
});

router.post('/refresh', async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.refresh_token;
    if (!rawRefreshToken) {
        res.status(401).json({ error: 'No refresh token' });
        return;
    }

    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) await refreshTokenRepo.remove(storedToken);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
    }

    // Refresh token rotation: delete old, create new
    await refreshTokenRepo.remove(storedToken);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: storedToken.userId } });
    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
    }

    const accessToken = signAccessToken(user.id, user.roleId);
    const newRefreshToken = await createRefreshToken(user.id);
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({ user: userResponse(user) });
});

router.post('/logout', async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.refresh_token;

    if (rawRefreshToken) {
        const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
        const tokenHash = hashToken(rawRefreshToken);
        await refreshTokenRepo.delete({ tokenHash });
    }

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.json({ message: 'Logged out' });
});

export default router;
