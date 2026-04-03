import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/shared/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "block h-11 w-full rounded-[var(--radius-md)] border bg-[var(--bg-surface)] px-3.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:px-4",
            error
              ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-soft)]"
              : "border-[var(--border)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, type InputProps };
