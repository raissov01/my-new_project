"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/shared/utils";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showLabel: string;
  hideLabel: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className = "",
      label,
      error,
      id,
      showLabel,
      hideLabel,
      disabled,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);

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

        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            disabled={disabled}
            className={cn(
              "block min-h-11 w-full rounded-xl border bg-[var(--bg-surface)] px-3.5 pr-12 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[rgba(99,91,255,0.48)] focus:bg-[var(--bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[rgba(99,91,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:rounded-2xl sm:px-4 sm:pr-14",
              error
                ? "border-red-400/70 focus:border-red-400 focus:ring-red-500/10"
                : "border-[var(--border)]",
              className
            )}
            {...props}
          />

          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
            aria-label={visible ? hideLabel : showLabel}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-12 sm:rounded-r-2xl"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p className="text-sm leading-6 text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput, type PasswordInputProps };
