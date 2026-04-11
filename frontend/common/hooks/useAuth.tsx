'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { AuthUser } from '../api/auth';

export function useAuth() {
    return useAuthStore();
}

export function hasPermission(user: AuthUser | null, perm: string): boolean {
    return !!user?.permissions?.includes(perm);
}

export function hasAnyPermission(user: AuthUser | null, perms: string[]): boolean {
    if (!user?.permissions) return false;
    return perms.some((p) => user.permissions.includes(p));
}

export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const fetchUser = useAuthStore((s) => s.fetchUser);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return <>{children}</>;
}
