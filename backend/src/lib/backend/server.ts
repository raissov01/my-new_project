/**
 * Server-side bridge to the Go backend.
 *
 * Every function here runs on the Next.js server and calls the Go backend
 * using the internal API token for authentication. The Go backend trusts
 * the X-User-ID header when the token is valid.
 *
 * Environment variables:
 *   GO_BACKEND_URL         — e.g. http://localhost:8080
 *   BACKEND_INTERNAL_TOKEN — shared secret between Next.js and Go
 */

const BACKEND_URL = process.env.GO_BACKEND_URL ?? "";
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

function isConfigured(): boolean {
  return BACKEND_URL !== "" && INTERNAL_TOKEN !== "";
}

type FetchOptions = {
  path: string;
  userId: string;
  method?: string;
  body?: unknown;
  timeout?: number;
};

/**
 * Make an authenticated request to the Go backend.
 * Throws if the backend is not configured or the request fails.
 */
export async function fetchBackendJson<T>(options: FetchOptions): Promise<T> {
  if (!isConfigured()) {
    throw new Error("Go backend is not configured");
  }

  const { path, userId, method = "GET", body, timeout = 10000 } = options;
  const url = `${BACKEND_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${INTERNAL_TOKEN}`,
        "X-User-ID": userId,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Backend ${method} ${path} returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Try the Go backend; if it fails (not configured, network error, etc.),
 * return null so the caller can fall back to Supabase.
 */
export async function tryBackend<T>(options: FetchOptions): Promise<T | null> {
  if (!isConfigured()) return null;

  try {
    return await fetchBackendJson<T>(options);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[backend] ${options.method ?? "GET"} ${options.path} failed:`, err);
    }
    return null;
  }
}
