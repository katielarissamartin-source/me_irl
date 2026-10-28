self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Rest's up" }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: "timer-done" }));
    await self.registration.showNotification(d.title || "Rest's up", {
      body: d.body || "Next set.",
      tag: d.tag || "rest-timer",
      renotify: true,
      requireInteraction: false,
      vibrate: [300, 150, 300, 150, 300],
      icon: "/icon.svg",
      badge: "/icon.svg"
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.length) return wins[0].focus();
    return self.clients.openWindow("/");
  })());
});
