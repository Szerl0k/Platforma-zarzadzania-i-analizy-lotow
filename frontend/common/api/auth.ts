import { apiClient } from './client';

export interface AuthUser {
    id: string;
    email: string;
    nickname: string | null;
    emailVerified: boolean;
    profilePublic: boolean;
    roleId: number;
    createdAt: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<{ user: AuthUser }>('/auth/login', { email, password });
    return data.user;
}

export async function register(email: string, password: string, nickname?: string): Promise<AuthUser> {
    const { data } = await apiClient.post<{ user: AuthUser }>('/auth/register', { email, password, nickname });
    return data.user;
}

export async function logout(): Promise<void> {
    await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/users/me');
    return data;
}
