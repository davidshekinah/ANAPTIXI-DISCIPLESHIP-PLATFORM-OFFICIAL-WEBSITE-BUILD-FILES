/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - SERVICE WORKER
 * File: sw.js
 */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Handles the click interactions for the local notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'ignore') {
        return;
    }

    const targetUrl = event.notification.data.url || '/prayer.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});