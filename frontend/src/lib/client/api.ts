"use client";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
}

export async function fetchApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "request failed");
  }

  return data as T;
}
