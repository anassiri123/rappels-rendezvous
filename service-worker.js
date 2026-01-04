// 🔥 Firebase Cloud Messaging - Service Worker

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ⚠️ Configuration Firebase (la tienne)
firebase.initializeApp({
  apiKey: "AIzaSyBWCblzEU4XjE_HLF5pXHYvM-8RjVEJJQQ",
  authDomain: "rappels-rendezvous.firebaseapp.com",
  projectId: "rappels-rendezvous",
  storageBucket: "rappels-rendezvous.appspot.com",
  messagingSenderId: "1022749873102",
  appId: "1:1022749873102:web:e0d47471a9bb49a5f2519f"
});

// 📩 Initialiser FCM
const messaging = firebase.messaging();

// 📲 Notification reçue quand l’app est FERMÉE
messaging.onBackgroundMessage(function(payload) {
  console.log("Notification reçue (background): ", payload);

  const title = payload.notification.title || "⏰ Rappel";
  const options = {
    body: payload.notification.body || "",
    icon: "/icon-192.png",
  };

  self.registration.showNotification(title, options);
});

// 👆 Clic sur notification
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/")
  );
});
