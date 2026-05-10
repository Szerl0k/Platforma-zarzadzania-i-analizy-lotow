"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, PageShell, Spinner } from "@/common/components";
import { useAuth } from "@/common/hooks/useAuth";
import {
  getMyRanking,
  getRankings,
  type MyRankingResponseDTO,
  type RankingEntryDTO,
  type RankingMetric,
} from "@/common/api/rankings";

const TABS: { metric: RankingMetric; label: string; unit: string }[] = [
  { metric: "distance", label: "Dystans", unit: "km" },
  { metric: "flights", label: "Liczba lotów", unit: "lot." },
  { metric: "countries", label: "Kraje", unit: "" },
];

function extractError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Wystąpił błąd.";
}

function formatValue(metric: RankingMetric, value: number): string {
  if (metric === "distance") return `${value.toLocaleString("pl-PL")} km`;
  if (metric === "flights")
    return `${value.toLocaleString("pl-PL")} lot${value === 1 ? "" : "ów"}`;
  return `${value} kraj${value === 1 ? "" : value < 5 ? "e" : "ów"}`;
}

export default function RankingsPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<RankingMetric>("distance");
  const [items, setItems] = useState<RankingEntryDTO[]>([]);
  const [me, setMe] = useState<MyRankingResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    const tasks: Promise<unknown>[] = [getRankings(metric, 100)];
    if (user) tasks.push(getMyRanking(metric));

    Promise.all(tasks)
      .then((results) => {
        if (!mounted) return;
        setItems(results[0] as RankingEntryDTO[]);
        if (user) {
          setMe(results[1] as MyRankingResponseDTO);
        } else {
          setMe(null);
        }
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
  }, [metric, user]);

  return (
    <PageShell maxWidth="lg">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle mb-1">
          Top 100 podróżników
        </p>
        <h1 className="font-sans text-2xl font-medium text-ink">Rankingi</h1>
      </header>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.metric}
            type="button"
            onClick={() => setMetric(t.metric)}
            className={
              "border-2 border-ink px-4 py-2 font-mono text-xs uppercase tracking-widest " +
              (metric === t.metric
                ? "bg-[var(--color-lime)] shadow-brut"
                : "bg-surface hover:bg-[var(--color-lime)]/30")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Alert variant="info">Brak wyników w rankingu.</Alert>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((entry) => (
            <Card
              key={entry.userId}
              variant={entry.rank <= 3 ? "elevated" : "default"}
              padding="sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-base font-bold tabular-nums w-12 shrink-0">
                    #{entry.rank}
                  </span>
                  <span className="font-sans text-sm text-ink truncate">
                    {entry.nickname}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold whitespace-nowrap">
                  {formatValue(metric, entry.value)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="sticky bottom-4 mt-6">
        <Card
          variant="elevated"
          padding="md"
          className="bg-[var(--color-lime)]/40"
        >
          {!user ? (
            <p className="font-mono text-xs uppercase tracking-widest text-ink">
              <Link href="/login" className="underline">
                Zaloguj się
              </Link>
              , aby zobaczyć swoją pozycję
            </p>
          ) : me?.hidden ? (
            <p className="font-mono text-xs uppercase tracking-widest text-ink">
              Ukryto z rankingu —{" "}
              <Link href="/settings" className="underline">
                włącz publiczny profil
              </Link>
            </p>
          ) : me?.entry ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-ink">
                Twoja pozycja
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold">
                  {me.entry.rank > 0 ? `#${me.entry.rank}` : "—"}
                </span>
                <span className="font-mono text-sm font-bold">
                  {formatValue(metric, me.entry.value)}
                </span>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </PageShell>
  );
}
