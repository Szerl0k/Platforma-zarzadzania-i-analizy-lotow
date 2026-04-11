import { ReactNode } from 'react';
import { cn } from './cn';

type AlertVariant = 'error' | 'success' | 'info';

interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    children: ReactNode;
    className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
    error: 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] shadow-brut-danger',
    success: 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)] shadow-brut-success',
    info: 'border-ink bg-[var(--color-lime)]/25 text-ink shadow-brut-sm',
};

const defaultTitles: Record<AlertVariant, string> = {
    error: 'ERROR',
    success: 'OK',
    info: 'INFO',
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
    const resolvedTitle = title ?? defaultTitles[variant];
    return (
        <div role={variant === 'error' ? 'alert' : 'status'} className={cn('border-2 px-4 py-3', variantClasses[variant], className)}>
            <p className="font-mono text-[11px] uppercase tracking-widest mb-1 opacity-80">
                {resolvedTitle}
            </p>
            <div className="font-sans text-sm leading-snug">{children}</div>
        </div>
    );
}
