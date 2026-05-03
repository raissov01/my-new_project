import "server-only";

import { getBackendBaseUrl, getBackendInternalToken } from "./env";

type BackendFetchOptions = {
  path: string;
  userId: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: HeadersInit;
  timeoutMs?: number;
  cache?: RequestCache;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

export async function fetchBackendJson<T>(options: BackendFetchOptions): Promise<T> {
  const baseUrl = getBackendBaseUrl();
  const internalToken = getBackendInternalToken();

  if (!baseUrl || !internalToken) {
    throw new Error("GO_BACKEND_BRIDGE_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);

  try {
    const response = await fetch(`${baseUrl}${options.path}`, {
      method: options.method ?? "GET",
      body: options.body ?? null,
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "X-User-ID": options.userId,
        ...(options.headers ?? {}),
      },
      cache: options.cache ?? "no-store",
      next: options.next,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `[Go backend] ${response.status} ${typeof data?.error === "string" ? data.error : "request failed"}`
      );
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

// fetchBackendRaw is the streaming counterpart used for non-JSON endpoints
// (CSV exports, file downloads). It returns the raw status/body/headers so
// the proxy route can forward them verbatim to the browser. Call sites that
// expect JSON should use fetchBackendJson instead.
export async function fetchBackendRaw(
  options: BackendFetchOptions,
): Promise<{ status: number; body: ReadableStream<Uint8Array> | null; headers: Headers }> {
  const baseUrl = getBackendBaseUrl();
  const internalToken = getBackendInternalToken();

  if (!baseUrl || !internalToken) {
    throw new Error("GO_BACKEND_BRIDGE_NOT_CONFIGURED");
  }

  const response = await fetch(`${baseUrl}${options.path}`, {
    method: options.method ?? "GET",
    body: options.body ?? null,
    headers: {
      Authorization: `Bearer ${internalToken}`,
      "X-User-ID": options.userId,
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  // Pass through only headers we know are safe for download UX. Strip
  // hop-by-hop / cookie headers so the proxy doesn't accidentally leak
  // backend session state.
  const passthrough = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const v = response.headers.get(name);
    if (v) passthrough.set(name, v);
  }

  return {
    status: response.status,
    body: response.body,
    headers: passthrough,
  };
}
