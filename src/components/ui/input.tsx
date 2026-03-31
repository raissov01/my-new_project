import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 sm:space-y-2">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium leading-6 tracking-[-0.01em] text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "block min-h-11 w-full rounded-xl border bg-[var(--bg-surface)] px-3.5 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[rgba(99,91,255,0.48)] focus:bg-[var(--bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[rgba(99,91,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:rounded-2xl sm:px-4",
            error
              ? "border-red-400/70 focus:border-red-400 focus:ring-red-500/10"
              : "border-[var(--border)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm leading-6 text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, type InputProps };
