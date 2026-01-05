importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBWCblzEU4XjE_HLF5pXHYvM-8RjVEJJQQ",
  authDomain: "rappels-rendezvous.firebaseapp.com",
  projectId: "rappels-rendezvous",
  storageBucket: "rappels-rendezvous.appspot.com",
  messagingSenderId: "1022749873102",
  appId: "1:1022749873102:web:e0d47471a9bb49a5f2519f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log("[SW] Message reçu en arrière-plan", payload);

  const title = payload.notification?.title || "Rappel";
  const options = {
    body: payload.notification?.body || "Vous avez un rappel",
    icon: "/icon-192.png"
  };

  self.registration.showNotification(title, options);
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {

        // Si l'app est déjà ouverte → on la focus
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url.includes("anassiri123.github.io") && "focus" in client) {
            return client.focus();
          }
        }

        // Sinon → on ouvre l'app
        if (clients.openWindow) {
          return clients.openWindow("https://anassiri123.github.io/rappels-rendezvous/");
        }
      })
  );
});
