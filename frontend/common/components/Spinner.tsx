import { cn } from "./cn";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  tone?: "ink" | "light";
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export function Spinner({
  size = "md",
  className,
  tone = "ink",
}: SpinnerProps) {
  const borderColor = tone === "ink" ? "border-ink" : "border-white";
  const topColor =
    tone === "ink"
      ? "border-t-[var(--color-lime)]"
      : "border-t-[var(--color-lime)]";

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin border-2",
        borderColor,
        topColor,
        sizeMap[size],
        className,
      )}
    />
  );
}
