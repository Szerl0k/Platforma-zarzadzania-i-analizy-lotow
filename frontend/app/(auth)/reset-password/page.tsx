"use client";

import { Suspense, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { APP_NAME } from "@/common/config";
import { resetPassword } from "@/common/api/auth";
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageShell,
} from "@/common/components";

function ResetPasswordForm(): ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Brakuje tokenu resetu hasla");
      return;
    }

    if (password.length < 6) {
      setError("Haslo musi miec co najmniej 6 znakow");
      return;
    }

    if (password !== confirmPassword) {
      setError("Hasla nie sa identyczne");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Nie udalo sie ustawic nowego hasla";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell maxWidth="md" center>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          {APP_NAME} · Nowe haslo
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-[0.95] text-ink">
          Ustaw haslo.
        </h1>
        <div className="mt-3 h-[3px] w-16 bg-ink" />
      </div>

      <Card variant="elevated" padding="lg">
        {!token && (
          <div className="mb-5">
            <Alert variant="error">
              Link resetujacy jest nieprawidlowy albo nie zawiera tokenu.
            </Alert>
          </div>
        )}

        {error && (
          <div className="mb-5">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {success && (
          <div className="mb-5">
            <Alert variant="success">
              Haslo zostalo zmienione. Mozesz zalogowac sie nowym haslem.
            </Alert>
          </div>
        )}

        {success ? (
          <Link
            href="/login"
            className="inline-flex h-14 w-full items-center justify-center border-2 border-ink bg-navy px-7 font-mono text-base uppercase tracking-widest text-white shadow-brut-sm transition-[transform,box-shadow,background-color] duration-[120ms] ease-out hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            Przejdz do logowania
          </Link>
        ) : token ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              label="Nowe haslo"
              htmlFor="password"
              hint="Min. 6 znakow"
            >
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
              {loading ? "Zapisywanie" : "Ustaw nowe haslo"}
            </Button>
          </form>
        ) : (
          <Link
            href="/forgot-password"
            className="inline-flex h-14 w-full items-center justify-center border-2 border-ink bg-surface px-7 font-mono text-base uppercase tracking-widest text-ink shadow-brut-sm transition-[transform,box-shadow,background-color] duration-[120ms] ease-out hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-[var(--color-lime)] hover:shadow-brut active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            Wyslij nowy link
          </Link>
        )}
      </Card>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-ink-muted text-center">
        Masz juz dostep?{" "}
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

export default function ResetPasswordPage(): ReactElement {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
