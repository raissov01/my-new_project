/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string; icon?: string } | undefined;
  const title = data?.title ?? "StudyWithRaissov";
  const options: NotificationOptions = {
    body: data?.body ?? "",
    icon: data?.icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data?.url ?? "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = (event.notification.data as { url?: string })?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
