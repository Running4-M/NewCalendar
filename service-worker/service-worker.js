self.addEventListener('push', function(event) {
    const payload = event.data.json();  // Get the push notification payload
    const notificationOptions = {
        body: payload.body,  // Message body
        icon: 'icon.png',     // Icon for the notification
    };

    // Show the notification to the user
    event.waitUntil(self.registration.showNotification(payload.title, notificationOptions));
});

// Optional: Handle click events on notifications (e.g., navigate to the page)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();  // Close the notification
    event.waitUntil(
        clients.openWindow('https://your-website-url.com')  // Open the website or event details
    );
});
