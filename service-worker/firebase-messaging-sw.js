importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

// Initialize Firebase app inside the service worker
firebase.initializeApp({
    apiKey: "AIzaSyC9MoRFgajbAt58_s2zuW6vW6QKzpzUIbc",
    authDomain: "ai-calendar-5753a.firebaseapp.com",
    projectId: "ai-calendar-5753a",
    storageBucket: "ai-calendar-5753a.appspot.com",
    messagingSenderId: "610949624500",
    appId: "1:610949624500:web:b63a91859c298bb0e7dde1",
    measurementId: "G-8JTTER2Z6T"
});

// Correct way to get messaging inside a service worker
const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
    console.log("Received background message: ", payload);

    const notificationTitle = payload.notification?.title || "New Notification";
    const notificationOptions = {
        body: payload.notification?.body || "You have a new message.",
        icon: "/icon.png",
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
