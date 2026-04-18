import { ReactNode } from "react";
import { cn } from "./cn";
import { Label } from "./Label";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && (
          <span className="ml-2 text-ink-subtle normal-case tracking-normal">
            (opcjonalnie)
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 font-mono text-[11px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
