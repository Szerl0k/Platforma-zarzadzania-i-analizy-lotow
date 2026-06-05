import { apiClient } from "./client";

export interface AuthRole {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  emailVerified: boolean;
  profilePublic: boolean;
  roleId: number;
  role: AuthRole | null;
  permissions: string[];
  createdAt: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data } = await apiClient.post<{ user: AuthUser }>("/auth/login", {
    email,
    password,
  });
  return data.user;
}

export async function register(
  email: string,
  password: string,
  nickname?: string,
): Promise<{ message: string }> {
  // Registration no longer establishes a session — the account must be
  // activated via the e-mailed verification link before logging in.
  const { data } = await apiClient.post<{ user: AuthUser; message: string }>(
    "/auth/register",
    { email, password, nickname },
  );
  return { message: data.message };
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    "/auth/verify-email",
    { token },
  );
  return data;
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post("/auth/resend-verification", { email });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, password });
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/users/me");
  return data;
}

export async function updateProfilePublic(value: boolean): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>("/users/me", {
    profilePublic: value,
  });
  return data;
}
