"use client";

import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import Link from "next/link";
import { APP_NAME } from "@/common/config";
import { requestPasswordReset } from "@/common/api/auth";
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageShell,
} from "@/common/components";

export default function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Nie udalo sie wyslac linku resetujacego";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell maxWidth="md" center>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          {APP_NAME} · Reset hasla
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-[0.95] text-ink">
          Odzyskaj dostep.
        </h1>
        <div className="mt-3 h-[3px] w-16 bg-ink" />
      </div>

      <Card variant="elevated" padding="lg">
        {error && (
          <div className="mb-5">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {sent && (
          <div className="mb-5">
            <Alert variant="success">
              Jesli konto istnieje, link do ustawienia nowego hasla zostal
              wyslany na podany adres.
            </Alert>
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
            rightIcon={<span aria-hidden>&rarr;</span>}
          >
            {loading ? "Wysylanie" : "Wyslij link"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-ink-muted text-center">
        Pamietasz haslo?{" "}
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
