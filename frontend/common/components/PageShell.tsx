import { ReactNode } from "react";
import { cn } from "./cn";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl";

interface PageShellProps {
  maxWidth?: MaxWidth;
  center?: boolean;
  className?: string;
  children: ReactNode;
}

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-7xl",
};

export function PageShell({
  maxWidth = "xl",
  center = false,
  className,
  children,
}: PageShellProps) {
  return (
    <main
      className={cn(
        "min-h-[calc(100vh-3.5rem)] w-full px-4 sm:px-6 lg:px-8 py-10",
        center && "flex items-center justify-center",
      )}
    >
      <div
        className={cn("w-full mx-auto", maxWidthClasses[maxWidth], className)}
      >
        {children}
      </div>
    </main>
  );
}
