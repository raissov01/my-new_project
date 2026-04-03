import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/shared/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-transparent bg-[var(--primary)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(37,99,235,0.4)] hover:bg-[var(--primary-hover)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-8px_rgba(37,99,235,0.5)]",
  accent:
    "border border-transparent bg-[var(--accent)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(249,115,22,0.4)] hover:bg-[var(--accent-hover)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-8px_rgba(249,115,22,0.5)]",
  secondary:
    "border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)]",
  outline:
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-soft)] hover:border-[var(--border-strong)]",
  ghost:
    "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]",
  danger:
    "border border-transparent bg-[var(--danger)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(239,68,68,0.4)] hover:bg-red-500",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 rounded-lg px-3 text-[13px] gap-1.5",
  md: "h-10 rounded-[var(--radius-md)] px-4 text-sm sm:h-11",
  lg: "h-11 rounded-[var(--radius-lg)] px-5 text-sm sm:h-12 sm:px-6 sm:text-[15px]",
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
          "click-scale inline-flex items-center justify-center gap-2 whitespace-nowrap text-center font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-50",
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
