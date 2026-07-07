/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - SERVICE WORKER
 * File: sw.js
 * * NOTE: This file must sit in the ROOT of your project directory 
 * to have scope over the entire application.
 */

const CACHE_NAME = 'anaptixi-prayer-cache-v1';

// Install Event
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installed');
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activated');
    event.waitUntil(self.clients.claim());
});

// ==========================================
// 1. PUSH NOTIFICATION HANDLER
// ==========================================
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Notification Received.');

    // Default message payload if none is provided from serverless backend
    let data = {
        title: "Prayer Hour Reminder",
        body: "Hello Anaptixian, it's time to pray.",
        url: "/prayer.html"
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/ANAPTIXI LOGO.png', // Ensure this file is in root
        badge: '/ANAPTIXI LOGO.png',
        vibrate: [200, 100, 200], // Haptic feedback (if permitted by OS)
        data: {
            url: data.url // Where to go when clicked
        },
        actions: [
            {
                action: 'pray-now',
                title: 'Pray Now'
            },
            {
                action: 'ignore',
                title: 'Ignore'
            }
        ],
        requireInteraction: true // Keeps the notification on screen until acted upon
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ==========================================
// 2. NOTIFICATION CLICK HANDLER
// ==========================================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // If the user clicks "Ignore", do nothing and let the notification die.
    if (event.action === 'ignore') {
        console.log('[Service Worker] User ignored prayer hour.');
        return;
    }

    // If they click the banner OR "Pray Now", route them to the tab
    const targetUrl = event.notification.data.url || '/prayer.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});