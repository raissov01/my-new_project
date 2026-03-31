import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-transparent bg-[linear-gradient(135deg,var(--primary-from),var(--primary-to))] text-white shadow-[0_18px_36px_-24px_rgba(79,124,255,0.8)] hover:brightness-[1.04]",
  accent:
    "border border-transparent bg-amber-500 text-white shadow-[0_18px_32px_-24px_rgba(245,158,11,0.75)] hover:bg-amber-400",
  secondary:
    "border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-primary)] shadow-[var(--surface-shadow)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]",
  outline:
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
  danger:
    "border border-transparent bg-red-600 text-white shadow-[0_18px_32px_-24px_rgba(220,38,38,0.75)] hover:bg-red-500",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-10 rounded-xl px-4 text-sm",
  md: "h-11 rounded-2xl px-4.5 text-sm",
  lg: "h-12 rounded-2xl px-5 text-[15px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "click-scale ui-interactive inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,91,255,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="mr-1 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps };
