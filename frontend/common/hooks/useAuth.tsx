'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
    return useAuthStore();
}

export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const fetchUser = useAuthStore((s) => s.fetchUser);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return <>{children}</>;
}
