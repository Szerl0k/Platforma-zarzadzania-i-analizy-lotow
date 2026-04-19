"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useAuth } from "@/common/hooks/useAuth";
import { APP_NAME } from "@/common/config";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageShell,
} from "@/common/components";

function LoginForm() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    try {
      await login(email, password);
      const from = searchParams.get("from");
      router.push(from || "/");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Nie udalo sie zalogowac";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell maxWidth="md" center>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          {APP_NAME} · Logowanie
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-[0.95] text-ink">
          Zaloguj sie.
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

          <FormField label="Haslo" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Logowanie" : "Zaloguj sie"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-ink-muted text-center">
        Nie masz konta?{" "}
        <Link
          href="/register"
          className="text-ink underline decoration-2 underline-offset-4 hover:bg-[var(--color-lime)] px-1"
        >
          Zarejestruj sie
        </Link>
      </p>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
