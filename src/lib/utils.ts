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

  return new Date(dateString).toLocaleDateString(mapping[locale] ?? "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
