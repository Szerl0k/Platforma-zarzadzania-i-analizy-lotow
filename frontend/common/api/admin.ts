import { apiClient } from "./client";
import type { AuthRole, AuthUser } from "./auth";

export interface AdminUser extends Omit<AuthUser, "permissions"> {
  updatedAt: string;
  lastLogin: string | null;
  blocked: boolean;
}

export interface ListUsersParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

export async function listUsers(
  params: ListUsersParams = {},
): Promise<ListUsersResponse> {
  const { data } = await apiClient.get<ListUsersResponse>("/users", { params });
  return data;
}

export async function assignUserRole(
  userId: string,
  roleId: number,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/users/${userId}/role`, {
    roleId,
  });
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}

export async function setUserBlocked(
  userId: string,
  blocked: boolean,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(
    `/users/${userId}/${blocked ? "block" : "unblock"}`,
  );
  return data;
}

export async function listRoles(): Promise<AuthRole[]> {
  const { data } = await apiClient.get<AuthRole[]>("/roles");
  return data;
}

export async function createRole(payload: {
  name: string;
  description?: string | null;
}): Promise<AuthRole> {
  const { data } = await apiClient.post<AuthRole>("/roles", payload);
  return data;
}

export async function updateRole(
  id: number,
  payload: { name?: string; description?: string | null },
): Promise<AuthRole> {
  const { data } = await apiClient.patch<AuthRole>(`/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}

export async function listRolePermissions(
  roleId: number,
): Promise<Permission[]> {
  const { data } = await apiClient.get<Permission[]>(
    `/roles/${roleId}/permissions`,
  );
  return data;
}

export async function grantRolePermission(
  roleId: number,
  permissionId: number,
): Promise<void> {
  await apiClient.post(`/roles/${roleId}/permissions`, { permissionId });
}

export async function revokeRolePermission(
  roleId: number,
  permissionId: number,
): Promise<void> {
  await apiClient.delete(`/roles/${roleId}/permissions/${permissionId}`);
}

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<Permission[]>("/permissions");
  return data;
}

export type ServiceState = "up" | "down" | "not_configured";

export interface ServiceHealth {
  status: ServiceState;
  detail?: string;
}

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    database: ServiceHealth;
    aeroapi: ServiceHealth;
    opensky: ServiceHealth;
    smtp: ServiceHealth;
  };
}

export async function getHealth(): Promise<HealthReport> {
  const { data } = await apiClient.get<HealthReport>("/health", {
    validateStatus: (s) => s === 200 || s === 503,
  });
  return data;
}

export async function createPermission(payload: {
  name: string;
  resource: string;
  action: string;
  description?: string | null;
}): Promise<Permission> {
  const { data } = await apiClient.post<Permission>("/permissions", payload);
  return data;
}

export async function deletePermission(id: number): Promise<void> {
  await apiClient.delete(`/permissions/${id}`);
}
