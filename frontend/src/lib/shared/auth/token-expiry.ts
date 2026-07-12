// No "server-only" — used by proxy middleware which runs on the Edge runtime.

/**
 * Check whether a JWT is expired by decoding its `exp` claim.
 *
 * Does NOT verify the signature — the Go backend remains the authority on
 * token validity. This exists so the middleware and /api/auth/me can drop
 * the swr_token cookie when the token inside it has expired. Without this,
 * the cookie (30-day maxAge) outlives the JWT, the middleware keeps treating
 * the user as logged in, and every /login visit bounces back to the
 * dashboard whose server render gets a 401 — an infinite redirect loop that
 * locks the user out until they clear cookies by hand.
 *
 * A malformed token is treated as expired so garbage cookies get cleared too.
 * `skewSeconds` expires the token slightly early so the middleware never
 * calls a token valid that the backend is about to reject.
 */
export function isJwtExpired(token: string, skewSeconds = 60): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return true;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload: unknown = JSON.parse(atob(padded));

    if (typeof payload !== "object" || payload === null) return true;
    const exp = (payload as { exp?: unknown }).exp;
    if (typeof exp !== "number") return false;

    return exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}
