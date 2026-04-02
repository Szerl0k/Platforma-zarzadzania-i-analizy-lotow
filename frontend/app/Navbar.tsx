'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleLogout() {
        setOpen(false);
        await logout();
        router.push('/login');
    }

    const initial = user
        ? (user.nickname ?? user.email).charAt(0).toUpperCase()
        : '';

    return (
        <nav className="flex items-center justify-end px-6 py-3">
            {loading ? (
                <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setOpen(!open)}
                        className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer"
                    >
                        {initial}
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                            <div className="px-4 py-2 border-b border-gray-100">
                                {user.nickname && (
                                    <p className="text-sm font-medium text-gray-800">{user.nickname}</p>
                                )}
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer"
                            >
                                Wyloguj
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <Link
                    href="/login"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
                >
                    Zaloguj sie
                </Link>
            )}
        </nav>
    );
}
