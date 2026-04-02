/**
 * Validates and returns Supabase environment variables.
 * Throws a clear error if they're missing or still set to placeholders.
 */
export const SUPABASE_CONFIG_ERROR =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

/**
 * Returns Supabase env vars. During migration away from Supabase, this
 * returns empty strings instead of throwing so pages don't crash.
 * Callers that need Supabase should check isSupabaseConfigured() first.
 */
export function getSupabaseEnv() {
  const safe = getSupabaseEnvSafe();
  if (!safe) {
    return { url: "", anonKey: "" };
  }
  return safe;
}

/**
 * Non-throwing version — returns null if env is not configured.
 * Used by middleware which needs to gracefully skip when unconfigured.
 */
export function getSupabaseEnvSafe() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !anonKey ||
    url === "your-supabase-url-here" ||
    anonKey === "your-supabase-anon-key-here"
  ) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabaseEnvSafe() !== null;
}

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export function getPublicSiteUrl() {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    "http://localhost:3000"
  );
}
