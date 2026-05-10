import { ReactNode } from "react";
import { Card } from "./Card";

interface StatCardProps {
  title: string;
  value: ReactNode;
  sublabel?: ReactNode;
}

export function StatCard({ title, value, sublabel }: StatCardProps) {
  return (
    <Card variant="default" padding="md">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
        {title}
      </p>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      {sublabel && (
        <p className="mt-1 font-mono text-[10px] uppercase text-ink-subtle">
          {sublabel}
        </p>
      )}
    </Card>
  );
}
