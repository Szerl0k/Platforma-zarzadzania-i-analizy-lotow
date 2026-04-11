import { HTMLAttributes } from 'react';
import { cn } from './cn';

type BadgeVariant = 'default' | 'success' | 'danger' | 'info' | 'navy';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'border-ink text-ink bg-surface',
    success: 'border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-bg)]',
    danger: 'border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-bg)]',
    info: 'border-ink text-ink bg-[var(--color-lime)]',
    navy: 'border-ink text-white bg-navy',
};

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 border px-1.5 py-0.5',
                'font-mono text-[10px] uppercase tracking-widest leading-none',
                variantClasses[variant],
                className,
            )}
            {...rest}
        >
            {children}
        </span>
    );
}
