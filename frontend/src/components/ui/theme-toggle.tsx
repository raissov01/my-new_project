"use client";

import { Moon, MoonStar, Sun } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/shared/utils";

export function ThemeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "menu";
}) {
  const { t } = useLocale();
  const { theme, toggle, mounted } = useTheme();

  if (!mounted) {
    return variant === "menu" ? <div className="h-16 rounded-2xl" /> : <div className="h-9 w-9 rounded-xl" />;
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-left transition-all hover:bg-[var(--bg-elevated)]"
        aria-label={
          theme === "dark"
            ? t("theme.switchToLight")
            : t("theme.switchToDark")
        }
      >
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("nav.theme")}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {theme === "dark" ? t("settings.dark") : t("settings.light")}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            theme === "dark"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
              : "border-indigo-500/20 bg-indigo-500/10 text-indigo-600"
          )}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <MoonStar className="h-4 w-4" />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="click-scale inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
      aria-label={
        theme === "dark"
          ? t("theme.switchToLight")
          : t("theme.switchToDark")
      }
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
