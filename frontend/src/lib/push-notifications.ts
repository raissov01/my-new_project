"use client";

// Web Push Notification utilities.
// VAPID public key must be set in NEXT_PUBLIC_VAPID_PUBLIC_KEY env var.
// To enable: generate VAPID keys with `npx web-push generate-vapid-keys`
// and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in backend .env,
// NEXT_PUBLIC_VAPID_PUBLIC_KEY in frontend .env.local.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

async function getVAPIDPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/push/vapid-public-key`);
  if (!res.ok) throw new Error("Failed to fetch VAPID key");
  const data = await res.json() as { publicKey: string };
  return data.publicKey;
}

export async function subscribeToPush(token: string): Promise<PushSubscription | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const vapidKey = await getVAPIDPublicKey();
  if (!vapidKey) return null;

  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();

  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as string,
    });
  }

  const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await fetch(`${API_BASE}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
  });

  return sub;
}

export async function unsubscribeFromPush(token: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();

  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch(`${API_BASE}/push/subscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint }),
    });
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
