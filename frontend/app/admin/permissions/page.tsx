'use client';

import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, hasPermission } from '@/common/hooks/useAuth';
import {
    Alert,
    Button,
    Card,
    ConfirmDialog,
    FormField,
    Input,
    Spinner,
} from '@/common/components';
import {
    Permission,
    createPermission,
    deletePermission,
    listPermissions,
} from '@/common/api/admin';

function extractError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        return err.response?.data?.error ?? err.message;
    }
    return err instanceof Error ? err.message : 'Nieznany błąd';
}

export default function AdminPermissionsPage() {
    const { user: currentUser } = useAuth();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [resource, setResource] = useState('');
    const [action, setAction] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function fetchPermissions() {
        setLoading(true);
        setError(null);
        try {
            const data = await listPermissions();
            setPermissions(data);
        } catch (err) {
            setError(extractError(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPermissions();
    }, []);

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || !resource.trim() || !action.trim()) return;
        setCreating(true);
        setError(null);
        try {
            await createPermission({
                name: name.trim(),
                resource: resource.trim(),
                action: action.trim(),
                description: description.trim() || null,
            });
            setName('');
            setResource('');
            setAction('');
            setDescription('');
            await fetchPermissions();
        } catch (err) {
            setError(extractError(err));
        } finally {
            setCreating(false);
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setError(null);
        try {
            await deletePermission(deleteTarget.id);
            setDeleteTarget(null);
            await fetchPermissions();
        } catch (err) {
            setError(extractError(err));
        } finally {
            setDeleting(false);
        }
    }

    if (!hasPermission(currentUser, 'permissions:write')) {
        return <Alert variant="error">Brak uprawnień do tej sekcji.</Alert>;
    }

    return (
        <div className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}

            <Card padding="md">
                <h2 className="font-sans text-lg text-ink mb-4">Utwórz uprawnienie</h2>
                <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Nazwa" htmlFor="perm-name" hint="np. flights:delete">
                        <Input
                            id="perm-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </FormField>
                    <FormField label="Opis" htmlFor="perm-desc" optional>
                        <Input
                            id="perm-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </FormField>
                    <FormField label="Zasób" htmlFor="perm-resource" hint="np. flights">
                        <Input
                            id="perm-resource"
                            value={resource}
                            onChange={(e) => setResource(e.target.value)}
                            required
                        />
                    </FormField>
                    <FormField label="Akcja" htmlFor="perm-action" hint="np. delete">
                        <Input
                            id="perm-action"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            required
                        />
                    </FormField>
                    <div className="sm:col-span-2">
                        <Button type="submit" loading={creating}>Utwórz</Button>
                    </div>
                </form>
            </Card>

            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-ink text-left">
                                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">Nazwa</th>
                                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">Zasób</th>
                                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">Akcja</th>
                                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">Opis</th>
                                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest">Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <Spinner size="md" />
                                    </td>
                                </tr>
                            ) : permissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center font-mono text-xs uppercase text-ink-subtle">
                                        Brak uprawnień
                                    </td>
                                </tr>
                            ) : (
                                permissions.map((p) => (
                                    <tr key={p.id} className="border-b border-border-subtle last:border-b-0">
                                        <td className="px-4 py-3 font-mono text-xs text-ink">{p.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-ink-subtle">{p.resource}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-ink-subtle">{p.action}</td>
                                        <td className="px-4 py-3 font-sans text-sm text-ink-subtle">{p.description ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>
                                                Usuń
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                title="Usuń uprawnienie"
                message={
                    <>
                        Czy na pewno chcesz usunąć uprawnienie <strong>{deleteTarget?.name}</strong>?
                        Ta operacja jest nieodwracalna.
                    </>
                }
                confirmLabel="Usuń"
                confirmVariant="danger"
                loading={deleting}
            />
        </div>
    );
}
