import { HTMLAttributes } from 'react';
import { cn } from './cn';

type CardVariant = 'default' | 'elevated' | 'flat';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: CardPadding;
}

const variantClasses: Record<CardVariant, string> = {
    default: 'bg-surface border-2 border-ink',
    elevated: 'bg-surface border-2 border-ink shadow-brut',
    flat: 'bg-surface border border-border-subtle',
};

const paddingClasses: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export function Card({
    variant = 'default',
    padding = 'lg',
    className,
    children,
    ...rest
}: CardProps) {
    return (
        <div className={cn(variantClasses[variant], paddingClasses[padding], className)} {...rest}>
            {children}
        </div>
    );
}
