// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyC-NULo0E1WB-9DPRLQlfvlKlmoG9beAhQ",
    authDomain: "notifications-d1187.firebaseapp.com",
    databaseURL: "https://notifications-d1187-default-rtdb.firebaseio.com",
    projectId: "notifications-d1187",
    storageBucket: "notifications-d1187.firebasestorage.app",
    messagingSenderId: "237025997774",
    appId: "1:237025997774:web:834bebf387ffbdf76cb19f"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || 'Doghri Chat';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%230e94e1"/%3E%3Ctext x="50" y="58" text-anchor="middle" font-size="40" fill="white" font-family="Arial"%3E💬%3C/text%3E%3C/svg%3E',
        badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%230e94e1"/%3E%3Ctext x="50" y="58" text-anchor="middle" font-size="40" fill="white" font-family="Arial"%3E💬%3C/text%3E%3C/svg%3E',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        timestamp: Date.now()
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});