"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, hasPermission } from "@/common/hooks/useAuth";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Spinner,
} from "@/common/components";
import type { AuthRole } from "@/common/api/auth";
import {
  AdminUser,
  assignUserRole,
  deleteUser,
  listRoles,
  listUsers,
  setUserBlocked,
} from "@/common/api/admin";

const PAGE_SIZE = 20;

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Nieznany błąd";
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<AuthRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listRoles()
      .then(setRoles)
      .catch((err) => setError(extractError(err)));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers({ q, page, limit: PAGE_SIZE });
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRoleId: number) {
    setError(null);
    try {
      await assignUserRole(userId, newRoleId);
      await fetchUsers();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function handleToggleBlock(target: AdminUser) {
    setError(null);
    try {
      await setUserBlocked(target.id, !target.blocked);
      await fetchUsers();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setDeleting(false);
    }
  }

  if (!hasPermission(currentUser, "users:write")) {
    return <Alert variant="error">Brak uprawnień do tej sekcji.</Alert>;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input
            type="search"
            placeholder="Szukaj po email lub nicku..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
          {total} {total === 1 ? "użytkownik" : "użytkowników"}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card padding="none" variant="default">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">
                  Email
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">
                  Nick
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">
                  Rola
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">
                  Utworzony
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">
                  Status
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center font-mono text-xs uppercase text-ink-subtle"
                  >
                    Brak wyników
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border-subtle last:border-b-0"
                    >
                      <td className="px-4 py-3 font-sans text-ink">
                        {u.email}
                        {isSelf && (
                          <Badge variant="info" className="ml-2">
                            TY
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-sans text-ink">
                        {u.nickname ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.roleId}
                          disabled={isSelf}
                          onChange={(e) =>
                            handleRoleChange(u.id, Number(e.target.value))
                          }
                          className="h-9 px-2 font-mono text-xs uppercase border-2 border-ink bg-surface disabled:bg-disabled disabled:cursor-not-allowed"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-subtle">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.blocked ? "danger" : "success"}>
                          {u.blocked ? "ZABLOKOWANY" : "AKTYWNY"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!isSelf && (
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleBlock(u)}
                            >
                              {u.blocked ? "Odblokuj" : "Zablokuj"}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteTarget(u)}
                            >
                              Usuń
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Poprzednia
          </Button>
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
            Strona {page} z {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Następna
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Usuń użytkownika"
        message={
          <>
            Czy na pewno chcesz usunąć użytkownika{" "}
            <strong>{deleteTarget?.email}</strong>? Ta operacja jest
            nieodwracalna i usunie wszystkie jego dane.
          </>
        }
        confirmLabel="Usuń"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
