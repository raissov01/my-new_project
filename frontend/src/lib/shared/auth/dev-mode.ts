// DEV MODE: auth disabled
// ──────────────────────────────────────────────────────────────────────────────
// Set to `false` to re-enable full authentication.
// When `true`, all auth checks are bypassed and a mock user is injected.
// ──────────────────────────────────────────────────────────────────────────────

export const DEV_MODE = false;

export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@test.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: { username: "dev" },
  created_at: new Date().toISOString(),
} as const;
