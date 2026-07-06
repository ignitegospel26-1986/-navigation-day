// Minimal service worker: lets the app show notifications and focuses the app
// when one is clicked. No push subscription / no server — reminders are either
// local (while a tab is open) or synced to the user's own Google Calendar.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/dashboard") && "focus" in client) return client.focus();
      }
      return self.clients.openWindow("/dashboard");
    })
  );
});
