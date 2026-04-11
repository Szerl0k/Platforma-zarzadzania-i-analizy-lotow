import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-7 text-base',
};

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        'bg-navy text-white border-2 border-ink shadow-brut-sm ' +
        'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut ' +
        'active:translate-x-0 active:translate-y-0 active:shadow-none ' +
        'disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed',
    secondary:
        'bg-surface text-ink border-2 border-ink shadow-brut-sm ' +
        'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut hover:bg-[var(--color-lime)] ' +
        'active:translate-x-0 active:translate-y-0 active:shadow-none ' +
        'disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed',
    ghost:
        'bg-transparent text-ink border-2 border-transparent ' +
        'hover:border-ink hover:bg-[var(--color-lime)] ' +
        'disabled:opacity-60 disabled:cursor-not-allowed',
    danger:
        'bg-[var(--color-danger)] text-white border-2 border-ink shadow-brut-sm ' +
        'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut ' +
        'active:translate-x-0 active:translate-y-0 active:shadow-none ' +
        'disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = 'primary',
        size = 'md',
        loading = false,
        leftIcon,
        rightIcon,
        disabled,
        className,
        children,
        type = 'button',
        ...rest
    },
    ref,
) {
    const isDisabled = disabled || loading;
    return (
        <button
            ref={ref}
            type={type}
            disabled={isDisabled}
            aria-busy={loading || undefined}
            className={cn(
                'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-widest',
                'select-none cursor-pointer whitespace-nowrap',
                'transition-[transform,box-shadow,background-color] duration-[120ms] ease-out',
                'focus-visible:outline-none focus-visible:ring-0',
                sizeClasses[size],
                variantClasses[variant],
                className,
            )}
            {...rest}
        >
            {loading ? (
                <Spinner size="sm" tone={variant === 'primary' || variant === 'danger' ? 'light' : 'ink'} />
            ) : (
                leftIcon
            )}
            <span>{children}</span>
            {!loading && rightIcon}
        </button>
    );
});
