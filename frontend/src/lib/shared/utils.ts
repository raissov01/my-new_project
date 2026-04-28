/**
 * Merge class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a date string for display.
 */
export function formatDate(dateString: string, locale = "en"): string {
  const mapping: Record<string, string> = {
    kk: "kk-KZ",
    ru: "ru-RU",
    en: "en-US",
  };

  const bcp47 = mapping[locale] ?? "en-US";
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  try {
    return new Date(dateString).toLocaleDateString(bcp47, opts);
  } catch {
    return new Date(dateString).toLocaleDateString("en-US", opts);
  }
}
