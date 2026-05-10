"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageShell,
  Spinner,
} from "@/common/components";
import {
  getMyPreferences,
  updateMyPreferences,
  type UserPreferencesDTO,
  type UserPreferencesPatch,
} from "@/common/api/preferences";
import { updateProfilePublic } from "@/common/api/auth";
import { useAuth } from "@/common/hooks/useAuth";

function extractError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Wystąpił błąd.";
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: ToggleProps) {
  return (
    <label
      className={
        "flex items-center justify-between gap-4 border-2 border-ink p-3 cursor-pointer " +
        (disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-[var(--color-lime)]/30")
      }
    >
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-ink">
          {label}
        </p>
        {description && (
          <p className="font-mono text-[11px] text-ink-subtle mt-1">
            {description}
          </p>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-[var(--color-navy)] cursor-pointer"
      />
    </label>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferencesDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function togglePrivacy(next: boolean) {
    setSavingPrivacy(true);
    setError(null);
    try {
      const updated = await updateProfilePublic(next);
      setUser(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSavingPrivacy(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getMyPreferences()
      .then((data) => {
        if (mounted) setPrefs(data);
      })
      .catch((err) => {
        if (mounted) setError(extractError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function patch(p: UserPreferencesPatch) {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyPreferences(p);
      setPrefs(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageShell maxWidth="lg" center>
        <Spinner size="lg" />
      </PageShell>
    );
  }

  if (!prefs) {
    return (
      <PageShell maxWidth="lg">
        <Alert variant="error">
          {error ?? "Nie udało się pobrać ustawień."}
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="lg">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-1">
          Twoje preferencje powiadomień
        </p>
        <h1 className="font-sans text-2xl font-medium text-ink">Ustawienia</h1>
      </header>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card variant="default" padding="md" className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink mb-3">
          Powiadomienia email
        </p>
        <div className="flex flex-col gap-3">
          <Toggle
            label="Włącz powiadomienia email"
            description="Wysyłamy maila gdy lot zmieni status, opóźnienie lub bramkę."
            checked={prefs.emailNotifications}
            disabled={saving}
            onChange={(v) => patch({ emailNotifications: v })}
          />
          <Toggle
            label="Powiadomienia o opóźnieniach"
            checked={prefs.notifyOnDelay}
            disabled={saving}
            onChange={(v) => patch({ notifyOnDelay: v })}
          />
          <Toggle
            label="Powiadomienia o zmianie bramki"
            checked={prefs.notifyOnGateChange}
            disabled={saving}
            onChange={(v) => patch({ notifyOnGateChange: v })}
          />
          <Toggle
            label="Powiadomienia o zmianie statusu"
            checked={prefs.notifyOnStatusChange}
            disabled={saving}
            onChange={(v) => patch({ notifyOnStatusChange: v })}
          />
        </div>
      </Card>

      {user && (
        <Card variant="default" padding="md" className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-ink mb-3">
            Prywatność
          </p>
          <Toggle
            label="Pokazuj mnie w rankingach"
            description="Twój nick i statystyki będą widoczne na publicznej stronie /rankings."
            checked={user.profilePublic}
            disabled={savingPrivacy}
            onChange={togglePrivacy}
          />
        </Card>
      )}

      <Card variant="default" padding="md">
        <p className="font-mono text-xs uppercase tracking-widest text-ink mb-3">
          Próg opóźnienia
        </p>
        <FormField
          label="Minuty"
          htmlFor="delayThreshold"
          hint="Powiadomimy o opóźnieniu dopiero gdy przekroczy tę wartość (5–120)."
        >
          <div className="flex items-center gap-3">
            <Input
              id="delayThreshold"
              type="number"
              min={5}
              max={120}
              value={prefs.delayThresholdMinutes}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setPrefs({ ...prefs, delayThresholdMinutes: n });
              }}
            />
            <Button
              loading={saving}
              onClick={() =>
                patch({ delayThresholdMinutes: prefs.delayThresholdMinutes })
              }
            >
              Zapisz
            </Button>
          </div>
        </FormField>
      </Card>

      {savedAt && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mt-4">
          Zapisano {new Date(savedAt).toLocaleTimeString("pl-PL")}
        </p>
      )}
    </PageShell>
  );
}
