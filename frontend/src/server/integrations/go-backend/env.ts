function normalizeBackendUrl(value: string | undefined) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `http://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export function getBackendBaseUrl() {
  return normalizeBackendUrl(process.env.BACKEND_URL) ?? null;
}

export function getBackendInternalToken() {
  const value = process.env.BACKEND_INTERNAL_TOKEN?.trim();
  return value || null;
}

export function isGoBackendBridgeConfigured() {
  return Boolean(getBackendBaseUrl() && getBackendInternalToken());
}
