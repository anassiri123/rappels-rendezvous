importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "TA_API_KEY",
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
