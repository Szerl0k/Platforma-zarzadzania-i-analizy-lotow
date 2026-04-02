import { create } from 'zustand';
import {
    AuthUser,
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    fetchCurrentUser,
} from '../api/auth';

interface AuthState {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, nickname?: string) => Promise<void>;
    logout: () => Promise<void>;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,

    login: async (email, password) => {
        const user = await apiLogin(email, password);
        set({ user });
    },

    register: async (email, password, nickname?) => {
        const user = await apiRegister(email, password, nickname);
        set({ user });
    },

    logout: async () => {
        await apiLogout();
        set({ user: null });
    },

    fetchUser: async () => {
        try {
            const user = await fetchCurrentUser();
            set({ user, loading: false });
        } catch {
            set({ user: null, loading: false });
        }
    },
}));
