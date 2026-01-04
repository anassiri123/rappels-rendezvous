self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

/* 🔔 NOTIFICATION */
self.addEventListener("push", event => {
  const data = event.data.json();

  self.registration.showNotification("⏰ Rappel", {
    body: data.text,
    icon: "icon-192.png",
    badge: "icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      id: data.id
    }
  });
});

/* 👉 CLIC SUR LA NOTIFICATION */
self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsArr => {
      if (clientsArr.length > 0) {
        clientsArr[0].focus();
      } else {
        clients.openWindow("./index.html");
      }
    })
  );
});
