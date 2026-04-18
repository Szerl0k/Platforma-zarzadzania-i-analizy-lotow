import { LabelHTMLAttributes } from "react";
import { cn } from "./cn";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, children, ...rest }: LabelProps) {
  return (
    <label
      className={cn(
        "block mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </label>
  );
}
