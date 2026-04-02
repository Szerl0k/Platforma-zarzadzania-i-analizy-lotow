'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const { register, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/');
        }
    }, [authLoading, user, router]);

    if (authLoading || user) return null;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Hasla nie sa identyczne');
            return;
        }

        if (password.length < 6) {
            setError('Haslo musi miec co najmniej 6 znakow');
            return;
        }

        setLoading(true);
        try {
            await register(email, password, nickname || undefined);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Nie udalo sie utworzyc konta');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                    Zarejestruj sie
                </h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            E-mail
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="twoj@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                            Nazwa uzytkownika <span className="text-gray-400">(opcjonalnie)</span>
                        </label>
                        <input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Haslo
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Powtorz haslo
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Rejestracja...' : 'Zarejestruj sie'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Masz juz konto?{' '}
                    <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
                        Zaloguj sie
                    </Link>
                </p>
            </div>
        </main>
    );
}
