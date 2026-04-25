"use client";

import { Languages } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { LOCALES, type Locale } from "@/lib/shared/i18n";
import { useLocale } from "@/components/providers/locale-provider";

export function LanguageSwitcher({
  variant = "default",
}: {
  variant?: "default" | "menu" | "navbar";
}) {
  const { locale, setLocale, t } = useLocale();

  if (variant === "navbar") {
    const nextLocale = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];
    return (
      <button
        type="button"
        onClick={() => setLocale(nextLocale)}
        aria-label={t("lang.label")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        title={t("lang.label")}
      >
        {locale.toUpperCase()}
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          <Languages className="h-3.5 w-3.5" />
          <span>{t("lang.label")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-all",
                locale === code
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {t(`lang.${code}`)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-secondary)] shadow-sm">
      <Languages className="h-4 w-4" />
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("lang.label")}
        className="bg-transparent outline-none"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(`lang.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
