'use client';

import Link from 'next/link';
import { useAuth, hasPermission } from '@/common/hooks/useAuth';
import { Card } from '@/common/components';

const TILES = [
    {
        href: '/admin/users',
        perm: 'users:write',
        title: 'Użytkownicy',
        description: 'Przeglądaj listę użytkowników, zmieniaj ich role i usuwaj konta.',
    },
    {
        href: '/admin/roles',
        perm: 'roles:write',
        title: 'Role',
        description: 'Twórz role, edytuj je i przypisuj im uprawnienia.',
    },
    {
        href: '/admin/permissions',
        perm: 'permissions:write',
        title: 'Uprawnienia',
        description: 'Definiuj uprawnienia używane w systemie.',
    },
];

export default function AdminHomePage() {
    const { user } = useAuth();
    const visible = TILES.filter((t) => hasPermission(user, t.perm));

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tile) => (
                <Link key={tile.href} href={tile.href} className="block group">
                    <Card
                        variant="elevated"
                        padding="lg"
                        className="h-full group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] transition-transform duration-[120ms] ease-out"
                    >
                        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-2">
                            {tile.perm}
                        </p>
                        <h2 className="font-sans text-xl text-ink mb-2">{tile.title}</h2>
                        <p className="font-sans text-sm text-ink-subtle leading-snug">
                            {tile.description}
                        </p>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
