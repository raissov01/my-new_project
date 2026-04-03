import "server-only";

import { getBackendBaseUrl, getBackendInternalToken } from "./env";

type BackendFetchOptions = {
  path: string;
  userId: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
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
