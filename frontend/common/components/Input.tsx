import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        "w-full h-11 px-3 font-sans text-sm text-ink bg-surface",
        "border-2 placeholder:text-ink-subtle",
        "transition-[transform,box-shadow,background-color,border-color] duration-[120ms] ease-out",
        "focus:outline-none focus:ring-0",
        error
          ? [
              "border-[var(--color-danger)]",
              "shadow-brut-danger",
              "focus:-translate-x-[2px] focus:-translate-y-[2px]",
            ].join(" ")
          : [
              "border-ink",
              "focus:-translate-x-[2px] focus:-translate-y-[2px]",
              "focus:shadow-brut-sm",
              "focus:bg-[var(--color-lime)]/30",
              "focus:border-ink",
            ].join(" "),
        "disabled:bg-disabled disabled:text-ink-subtle disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  );
});
