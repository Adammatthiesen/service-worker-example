// Service Worker for handling push notifications
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    console.log('Push notification received', event);

    let data = { title: 'New Notification', body: 'You have a new message' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: data,
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked', event);
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});
