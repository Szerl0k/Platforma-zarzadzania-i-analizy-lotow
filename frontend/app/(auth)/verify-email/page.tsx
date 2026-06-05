"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { APP_NAME } from "@/common/config";
import { verifyEmail } from "@/common/api/auth";
import { Alert, Card, PageShell, Spinner } from "@/common/components";

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("");
  // Guard against the effect running twice (React strict mode) consuming the token.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Brak tokenu weryfikacyjnego w adresie.");
      return;
    }

    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message ?? "Adres e-mail został potwierdzony.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Link weryfikacyjny jest nieprawidłowy lub wygasł.",
        );
      });
  }, [token]);

  return (
    <PageShell maxWidth="md" center>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          {APP_NAME} · Aktywacja konta
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-[0.95] text-ink">
          Weryfikacja e-mail.
        </h1>
        <div className="mt-3 h-[3px] w-16 bg-ink" />
      </div>

      <Card variant="elevated" padding="lg">
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner />
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              Weryfikowanie…
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5">
            <Alert variant="success">{message}</Alert>
            <Link
              href="/login"
              className="block text-center font-mono text-[11px] uppercase tracking-widest text-ink underline decoration-2 underline-offset-4 hover:bg-[var(--color-lime)] px-1"
            >
              Przejdź do logowania
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <Alert variant="error">{message}</Alert>
            <Link
              href="/login"
              className="block text-center font-mono text-[11px] uppercase tracking-widest text-ink underline decoration-2 underline-offset-4 hover:bg-[var(--color-lime)] px-1"
            >
              Wróć do logowania
            </Link>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <PageShell maxWidth="md" center>
          <Card variant="elevated" padding="lg">
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner />
            </div>
          </Card>
        </PageShell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
