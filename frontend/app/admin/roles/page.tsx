"use client";

import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, hasPermission } from "@/common/hooks/useAuth";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  Spinner,
} from "@/common/components";
import type { AuthRole } from "@/common/api/auth";
import {
  Permission,
  createRole,
  deleteRole,
  grantRolePermission,
  listPermissions,
  listRolePermissions,
  listRoles,
  revokeRolePermission,
  updateRole,
} from "@/common/api/admin";

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Nieznany błąd";
}

export default function AdminRolesPage() {
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState<AuthRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Grant form
  const [grantPermissionId, setGrantPermissionId] = useState<number | "">("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AuthRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchRoles() {
    setLoadingRoles(true);
    setError(null);
    try {
      const data = await listRoles();
      setRoles(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoadingRoles(false);
    }
  }

  useEffect(() => {
    fetchRoles();
    listPermissions()
      .then(setAllPermissions)
      .catch((err) => setError(extractError(err)));
  }, []);

  async function fetchRolePermissions(roleId: number) {
    setLoadingPerms(true);
    try {
      const data = await listRolePermissions(roleId);
      setRolePermissions(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoadingPerms(false);
    }
  }

  function handleSelectRole(id: number) {
    setSelectedRoleId(id);
    setGrantPermissionId("");
    fetchRolePermissions(id);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createRole({
        name: newName.trim(),
        description: newDescription.trim() || null,
      });
      setNewName("");
      setNewDescription("");
      await fetchRoles();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(role: AuthRole) {
    setEditingId(role.id);
    setEditName(role.name);
    setEditDescription(role.description ?? "");
  }

  async function saveEdit() {
    if (editingId == null) return;
    setError(null);
    try {
      await updateRole(editingId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setEditingId(null);
      await fetchRoles();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteRole(deleteTarget.id);
      if (selectedRoleId === deleteTarget.id) {
        setSelectedRoleId(null);
        setRolePermissions([]);
      }
      setDeleteTarget(null);
      await fetchRoles();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleGrant() {
    if (selectedRoleId == null || grantPermissionId === "") return;
    setError(null);
    try {
      await grantRolePermission(selectedRoleId, Number(grantPermissionId));
      setGrantPermissionId("");
      await fetchRolePermissions(selectedRoleId);
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function handleRevoke(permissionId: number) {
    if (selectedRoleId == null) return;
    setError(null);
    try {
      await revokeRolePermission(selectedRoleId, permissionId);
      await fetchRolePermissions(selectedRoleId);
    } catch (err) {
      setError(extractError(err));
    }
  }

  if (!hasPermission(currentUser, "roles:write")) {
    return <Alert variant="error">Brak uprawnień do tej sekcji.</Alert>;
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const availableToGrant = allPermissions.filter(
    (p) => !rolePermissions.some((rp) => rp.id === p.id),
  );

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h2 className="font-sans text-lg text-ink mb-4">Utwórz rolę</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Nazwa" htmlFor="new-role-name">
              <Input
                id="new-role-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="np. moderator"
                required
              />
            </FormField>
            <FormField label="Opis" htmlFor="new-role-desc" optional>
              <Input
                id="new-role-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </FormField>
            <Button type="submit" loading={creating}>
              Utwórz
            </Button>
          </form>
        </Card>

        <Card padding="md">
          <h2 className="font-sans text-lg text-ink mb-4">Lista ról</h2>
          {loadingRoles ? (
            <div className="py-8 text-center">
              <Spinner />
            </div>
          ) : (
            <ul className="space-y-2">
              {roles.map((role) => (
                <li key={role.id}>
                  {editingId === role.id ? (
                    <div className="border-2 border-ink p-3 space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="nazwa"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="opis"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          Zapisz
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectRole(role.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectRole(role.id);
                        }
                      }}
                      className={
                        "w-full text-left border-2 p-3 cursor-pointer transition-colors duration-[120ms] " +
                        (selectedRoleId === role.id
                          ? "border-ink bg-[var(--color-lime)]/30"
                          : "border-ink bg-surface hover:bg-[var(--color-lime)]/10")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-ink">
                              {role.name}
                            </span>
                            {role.isSystem && (
                              <Badge variant="navy">SYSTEM</Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="font-mono text-[11px] text-ink-subtle mt-1">
                              {role.description}
                            </p>
                          )}
                        </div>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={role.isSystem}
                            onClick={() => startEdit(role)}
                          >
                            Edytuj
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={role.isSystem}
                            onClick={() => setDeleteTarget(role)}
                          >
                            Usuń
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="md">
        <h2 className="font-sans text-lg text-ink mb-4">
          Uprawnienia roli {selectedRole ? `— ${selectedRole.name}` : ""}
        </h2>
        {!selectedRole ? (
          <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
            Wybierz rolę z listy, aby zarządzać jej uprawnieniami.
          </p>
        ) : loadingPerms ? (
          <div className="py-8 text-center">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {rolePermissions.length === 0 ? (
                <span className="font-mono text-xs text-ink-subtle">
                  Ta rola nie ma jeszcze żadnych uprawnień.
                </span>
              ) : (
                rolePermissions.map((p) => (
                  <Badge key={p.id} variant="info" className="gap-2">
                    <span>{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRevoke(p.id)}
                      className="hover:text-[var(--color-danger)] font-bold cursor-pointer"
                      aria-label={`Odbierz ${p.name}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))
              )}
            </div>

            {availableToGrant.length > 0 && (
              <div className="flex flex-wrap gap-2 items-end">
                <select
                  value={grantPermissionId}
                  onChange={(e) =>
                    setGrantPermissionId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="h-11 px-3 font-mono text-xs uppercase border-2 border-ink bg-surface"
                >
                  <option value="">— wybierz uprawnienie —</option>
                  {availableToGrant.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleGrant}
                  disabled={grantPermissionId === ""}
                >
                  Przyznaj
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Usuń rolę"
        message={
          <>
            Czy na pewno chcesz usunąć rolę{" "}
            <strong>{deleteTarget?.name}</strong>? Ta operacja jest
            nieodwracalna.
          </>
        }
        confirmLabel="Usuń"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
