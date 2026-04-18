"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/common/hooks/useAuth";
import { APP_NAME } from "@/common/config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageShell,
} from "@/common/components";

export default function RegisterPage() {
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  if (authLoading || user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Hasla nie sa identyczne");
      return;
    }

    if (password.length < 6) {
      setError("Haslo musi miec co najmniej 6 znakow");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, nickname || undefined);
      router.push("/");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Nie udalo sie utworzyc konta";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell maxWidth="md" center>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          {APP_NAME} · Nowe konto
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-[0.95] text-ink">
          Zaloz konto.
        </h1>
        <div className="mt-3 h-[3px] w-16 bg-ink" />
      </div>

      <Card variant="elevated" padding="lg">
        {error && (
          <div className="mb-5">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.com"
            />
          </FormField>

          <FormField label="Nazwa uzytkownika" htmlFor="nickname" optional>
            <Input
              id="nickname"
              type="text"
              autoComplete="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </FormField>

          <FormField label="Haslo" htmlFor="password" hint="Min. 6 znakow">
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          <FormField label="Powtorz haslo" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
            rightIcon={<span aria-hidden>&rarr;</span>}
          >
            {loading ? "Rejestracja" : "Zaloz konto"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-ink-muted text-center">
        Masz juz konto?{" "}
        <Link
          href="/login"
          className="text-ink underline decoration-2 underline-offset-4 hover:bg-[var(--color-lime)] px-1"
        >
          Zaloguj sie
        </Link>
      </p>
    </PageShell>
  );
}
