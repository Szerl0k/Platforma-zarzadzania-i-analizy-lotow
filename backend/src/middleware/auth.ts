import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source';
import { RolePermission } from '../database/entities/RolePermission';

interface JwtPayload {
    userId: string;
    roleId: number;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const token = header.slice(7);
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
