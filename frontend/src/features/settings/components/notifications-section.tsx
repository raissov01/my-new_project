"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import {
  isPushSupported,
  getPushSubscription,
  getNotificationPermission,
} from "@/lib/push-notifications";
import { savePushSubscription, deletePushSubscription } from "@/features/settings/push-actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

interface Props {
  vapidPublicKey: string;
}

export function NotificationsSection({ vapidPublicKey }: Props) {
  const { t } = useLocale();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    setPermission(getNotificationPermission());
    getPushSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  const handleEnable = async () => {
    if (!supported || !vapidPublicKey) return;
    setLoading(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage({ type: "error", text: t("settings.notificationsBlocked") });
        setPermission(Notification.permission);
        return;
      }
      setPermission("granted");

      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as string,
        });
      }

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await savePushSubscription({ endpoint: subJson.endpoint, keys: subJson.keys });
      setSubscribed(true);
      setMessage({ type: "success", text: t("settings.notificationsEnabled") });
    } catch {
      setMessage({ type: "error", text: t("settings.notificationsBlocked") });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await deletePushSubscription(endpoint);
      }
      setSubscribed(false);
      setMessage({ type: "success", text: t("settings.notificationsDisabled") });
    } catch {
      setMessage({ type: "error", text: t("settings.notificationsBlocked") });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="nd-settings-section">
        <div className="nd-settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(100,116,139,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
            <BellOff style={{ width: 18, height: 18 }} />
          </div>
          <div className="nd-settings-lbl">
            <strong>{t("settings.notifications")}</strong>
            <span style={{ color: "var(--ink-mute)" }}>{t("settings.notificationsUnsupported")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nd-settings-section">
      <div className="nd-settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(234,179,8,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ca8a04", flexShrink: 0 }}>
          {subscribed ? <BellRing style={{ width: 18, height: 18 }} /> : <Bell style={{ width: 18, height: 18 }} />}
        </div>
        <div className="nd-settings-lbl">
          <strong>{t("settings.notifications")}</strong>
          <span>{t("settings.notificationsDescription")}</span>
        </div>
      </div>

      {permission === "denied" ? (
        <p style={{ fontSize: 13, color: "var(--terra)", marginTop: 10 }}>
          {t("settings.notificationsBlocked")}
        </p>
      ) : (
        <div style={{ marginTop: 12 }}>
          {subscribed ? (
            <Button variant="outline" size="sm" onClick={handleDisable} disabled={loading}>
              <BellOff className="h-4 w-4" />
              {t("settings.disableNotifications")}
            </Button>
          ) : (
            <Button size="sm" onClick={handleEnable} disabled={loading}>
              <Bell className="h-4 w-4" />
              {t("settings.enableNotifications")}
            </Button>
          )}
        </div>
      )}

      {message && (
        <p style={{
          marginTop: 10,
          fontSize: 13,
          color: message.type === "success" ? "var(--green)" : "var(--terra)",
        }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
