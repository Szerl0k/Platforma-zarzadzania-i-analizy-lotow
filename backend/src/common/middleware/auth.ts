import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source';
import { RolePermission } from '../../users/entities/RolePermission';

interface JwtPayload {
    userId: string;
    roleId: number;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    let token = req.cookies?.access_token;

    if (!token) {
        const header = req.headers.authorization;
        if (header?.startsWith('Bearer ')) {
            token = header.slice(7);
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.userId = decoded.userId;
        req.roleId = decoded.roleId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function authorize(...requiredPermissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.roleId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const rolePermissionRepo = AppDataSource.getRepository(RolePermission);
        const userPermissions = await rolePermissionRepo.find({
            where: { roleId: req.roleId },
            relations: ['permission'],
        });

        const permissionNames = userPermissions.map(rp => rp.permission.name);
        const hasAll = requiredPermissions.every(p => permissionNames.includes(p));

        if (!hasAll) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
}
