/**
 * Validates and returns Supabase environment variables.
 * Throws a clear error if they're missing or still set to placeholders.
 */
export const SUPABASE_CONFIG_ERROR =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isPlaceholder =
    !url ||
    !anonKey ||
    url === "your-supabase-url-here" ||
    anonKey === "your-supabase-anon-key-here";

  if (isPlaceholder) {
    throw new Error(
      "Supabase is not configured.\n\n" +
        "Set these variables in .env.local:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n" +
        "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...\n\n" +
        "Get them from: Supabase Dashboard → Settings → API"
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}"\n` +
        "Expected format: https://your-project.supabase.co"
    );
  }

  // Warn if the anon key doesn't look like a JWT
  if (!anonKey.startsWith("eyJ")) {
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a JWT token.\n" +
        `Current value starts with: "${anonKey.slice(0, 20)}..."\n` +
        "The anon key should start with 'eyJhbGciOi...' and be ~200 characters long.\n" +
        "Find it at: Supabase Dashboard → Settings → API → Project API keys → anon (public)\n" +
        "Make sure you're not using the service_role key or the Management API key."
    );
  }

  return { url, anonKey };
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
