import "server-only";

import { headers as requestHeaders } from "next/headers";
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

// In production all SSR traffic to the Go backend exits the frontend container
// from a single Docker-network IP. Without forwarding the real client IP, the
// backend's IP-based rate limiter throttles every user as if they were the
// same caller. We read the inbound request's X-Forwarded-For (set by nginx)
// and pass it through so the backend can rate-limit per real client.
async function getForwardedClientIP(path: string): Promise<string | null> {
  try {
    const h = await requestHeaders();
    const xff = h.get("x-forwarded-for");
    const xri = h.get("x-real-ip");
    if (process.env.XFF_DEBUG === "1") {
      console.log(`[xff] path=${path} xff=${xff ?? "NONE"} xri=${xri ?? "NONE"}`);
    }
    if (xff) return xff;
    if (xri) return xri;
  } catch (e) {
    if (process.env.XFF_DEBUG === "1") {
      console.log(`[xff] path=${path} ERROR`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

export async function fetchBackendJson<T>(options: BackendFetchOptions): Promise<T> {
  const baseUrl = getBackendBaseUrl();
  const internalToken = getBackendInternalToken();

  if (!baseUrl || !internalToken) {
    throw new Error("GO_BACKEND_BRIDGE_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);

  const forwardedFor = await getForwardedClientIP(options.path);

  try {
    const response = await fetch(`${baseUrl}${options.path}`, {
      method: options.method ?? "GET",
      body: options.body ?? null,
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "X-User-ID": options.userId,
        ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
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

  const forwardedFor = await getForwardedClientIP(options.path);

  const response = await fetch(`${baseUrl}${options.path}`, {
    method: options.method ?? "GET",
    body: options.body ?? null,
    headers: {
      Authorization: `Bearer ${internalToken}`,
      "X-User-ID": options.userId,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
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
