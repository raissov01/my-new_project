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
        className="flex w-full items-center justify-between rounded-[18px] border border-[var(--line)] bg-[var(--paper-2)] px-4 py-3 text-left transition-all hover:bg-[var(--paper-3)]"
        aria-label={
          theme === "dark"
            ? t("theme.switchToLight")
            : t("theme.switchToDark")
        }
      >
        <div>
          <p className="text-sm font-bold text-[var(--ink)]">
            {t("nav.theme")}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[var(--ink-mute)]">
            {theme === "dark" ? t("settings.dark") : t("settings.light")}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            theme === "dark"
              ? "border-[var(--terra)] bg-[var(--terra-tint)] text-[var(--terra)]"
              : "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-soft)]"
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
