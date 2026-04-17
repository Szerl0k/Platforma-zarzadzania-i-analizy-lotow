'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, hasAnyPermission } from '@/common/hooks/useAuth';
import { APP_NAME } from '@/common/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ADMIN_PERMS = ['users:write', 'roles:write', 'permissions:write'];

export default function Navbar() {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
    const [mounted, setMounted] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (dropdownRef.current?.contains(target)) return;
            setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    function toggleOpen() {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen((prev) => !prev);
    }

    async function handleLogout() {
        setOpen(false);
        await logout();
        router.push('/login');
    }

    const initial = user
        ? (user.nickname ?? user.email).charAt(0).toUpperCase()
        : '';

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 border-b-2 border-ink bg-[var(--color-bg)]">
            <div className="flex items-center gap-6">
                <Link
                    href="/"
                    className="group flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink"
                >
                    <span className="w-5 h-5 border-2 border-ink bg-navy shadow-brut-sm group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] transition-transform duration-[120ms] ease-out" />
                    <span className="group-hover:bg-[var(--color-lime)] px-1 py-0.5">{APP_NAME}</span>
                </Link>
                
                <div className="hidden sm:block w-px h-6 bg-ink opacity-20" />

                <Link 
                    href="/telemetry" 
                    className="hidden sm:block font-mono text-xs uppercase tracking-widest text-ink hover:bg-[var(--color-lime)] px-2 py-1 transition-colors"
                >
                    Telemetria
                </Link>
            </div>

            {user ? (
                <>
                    <button
                        ref={buttonRef}
                        onClick={toggleOpen}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        className={
                            'w-9 h-9 border-2 border-ink bg-navy text-white ' +
                            'flex items-center justify-center font-mono text-xs uppercase ' +
                            'shadow-brut-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut ' +
                            'active:translate-x-0 active:translate-y-0 active:shadow-none ' +
                            'transition-[transform,box-shadow] duration-[120ms] ease-out cursor-pointer'
                        }
                    >
                        {initial}
                    </button>

                    {mounted && open && coords && createPortal(
                        <div
                            ref={dropdownRef}
                            role="menu"
                            style={{
                                position: 'fixed',
                                top: coords.top,
                                right: coords.right,
                                zIndex: 9999,
                            }}
                            className="w-60 bg-surface border-2 border-ink shadow-brut"
                        >
                            <div className="px-4 py-3 border-b-2 border-ink">
                                {user.nickname && (
                                    <p className="font-sans text-sm text-ink mb-0.5">{user.nickname}</p>
                                )}
                                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted truncate">
                                    {user.email}
                                </p>
                            </div>
                            {hasAnyPermission(user, ADMIN_PERMS) && (
                                <Link
                                    href="/admin"
                                    onClick={() => setOpen(false)}
                                    className={
                                        'block w-full text-left px-4 py-3 border-b-2 border-ink ' +
                                        'font-mono text-xs uppercase tracking-widest text-ink ' +
                                        'hover:bg-[var(--color-lime)] cursor-pointer'
                                    }
                                >
                                    Panel admina
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className={
                                    'block w-full text-left px-4 py-3 ' +
                                    'font-mono text-xs uppercase tracking-widest text-[var(--color-danger)] ' +
                                    'hover:bg-[var(--color-danger-bg)] cursor-pointer'
                                }
                            >
                                Wyloguj
                            </button>
                        </div>,
                        document.body
                    )}
                </>
            ) : (
                <Link
                    href="/login"
                    className="font-mono text-xs uppercase tracking-[0.25em] text-ink hover:bg-[var(--color-lime)] px-1 py-0.5"
                >
                    Zaloguj sie
                </Link>
            )}
        </nav>
    );
}
