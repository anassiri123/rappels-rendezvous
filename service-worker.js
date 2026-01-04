self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Quand l'utilisateur clique la notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const alarmId = event.notification?.data?.alarmId;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    // Si une fenêtre est déjà ouverte => focus + message
    for (const client of allClients) {
      if ("focus" in client) {
        await client.focus();
        client.postMessage({ type: "OPEN_ALARM", alarmId });
        return;
      }
    }

    // Sinon on ouvre l'app
    const newClient = await self.clients.openWindow("./");
    // On attend un peu puis on envoie le message
    setTimeout(async () => {
      const clientsAfter = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsAfter) {
        client.postMessage({ type: "OPEN_ALARM", alarmId });
      }
    }, 800);
  })());
});
