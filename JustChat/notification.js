import { messaging, getToken, db } from "../backend/firebase.js";
import { doc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { initializeFirebase } from "../backend/firebase.js"; // Import the initializeFirebase function
  // Wait for Firebase to be initialized first (await your initialization here)
  await initializeFirebase(); // Make sure Firebase is initialized first
const auth = getAuth();

/**
 * Registers the Firebase Messaging Service Worker.
 */
function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/frontend/service-worker/firebase-messaging-sw.js")
            .then((registration) => {
                console.log("Service Worker registered with scope:", registration.scope);
            })
            .catch((err) => {
                console.error("Service Worker registration failed:", err);
            });
    } else {
        console.warn("Service Workers are not supported in this browser.");
    }
}

/**
 * Request notification permission from the user.
 */
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("This browser does not support notifications.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            console.log("Notification permission granted.");
            localStorage.setItem("notificationsEnabled", "true");

            // Show a test notification to confirm it's working
            new Notification("Notifications Enabled", {
                body: "You will now receive event reminders!",
                icon: "/icon.png"
            });

        } else {
            console.warn("Notification permission denied.");
            localStorage.setItem("notificationsEnabled", "false");
        }
    });
}

/**
 * Request and store the FCM token in Firestore for the authenticated user.
 * @param {string} userId - The authenticated user's ID.
 */
async function requestFCMToken(userId) {
    try {
        if (!userId) {
            console.warn("User ID is undefined. Cannot request FCM token.");
            return;
        }

        // Check if token is already stored to prevent unnecessary requests
        const storedToken = localStorage.getItem("fcmToken");
        if (storedToken) {
            console.log("FCM token already exists. Skipping new request.");
            return;
        }

        // Request a new FCM token
        const token = await getToken(messaging, { vapidKey: "BPpogVifRNIEOqgN3z4T3kqG_JUbS2-Ui9TiJDu84VtzvabIC2XI_XQHy0Yh3BueZ-LnSINZ9wEDT5Bdm0LvqyI" });

        if (token) {
            console.log("Obtained FCM Token:", token);

            // Save FCM token to Firestore under the user's document (merge prevents overwriting other data)
            await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });

            // Store token locally to prevent duplicate requests
            localStorage.setItem("fcmToken", token);
            localStorage.setItem("notificationsEnabled", "true");
        } else {
            console.warn("No registration token available. User may have denied permission.");
        }
    } catch (err) {
        console.error("Error while getting FCM token:", err);
    }
}

/**
 * Checks for upcoming events in Firestore and schedules notifications.
 * @param {string} userId - The authenticated user's ID.
 */
async function checkAndSendEventNotifications(userId) { 
    if (!userId) {
        console.warn("User ID is undefined. Cannot check event notifications.");
        return;
    }

    try {
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // Format: YYYY-MM-DD
        console.log(`Checking for events on ${today} for user ${userId}...`);

        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("userId", "==", userId), where("date", "==", today));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            console.log("Event data:", eventData); // Log entire event object

            // Check if the 'notification' field is true
            const shouldSendNotification = eventData.notification === true;
            if (!shouldSendNotification) {
                console.log(`Skipping notification for event '${eventData.title}' as the notification flag is not set to true.`);
                return;
            }

            const eventTime = eventData.time;

            // Validate time field
            if (!eventTime || typeof eventTime !== "string" || eventTime.trim() === "") {
                console.warn(`Skipping event '${eventData.title}' because it has no valid time field.`);
                return;
            }

            console.log(`Parsing event time: ${eventTime}`);
            const [eventHours, eventMinutes] = eventTime.split(":").map(Number);

            if (isNaN(eventHours) || isNaN(eventMinutes)) {
                console.error(`Invalid time format for event '${eventData.title}': ${eventTime}`);
                return;
            }

            const eventDateTime = new Date();
            eventDateTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
            eventDateTime.setHours(eventHours, eventMinutes, 0, 0);

            const timeDiff = eventDateTime - now;

            console.log(`Current Time: ${now}`);
            console.log(`Event Time: ${eventDateTime}`);
            console.log(`Time Difference: ${timeDiff}ms (${timeDiff / 60000} minutes)`);

            if (timeDiff > 0) {
                console.log(`Scheduling notification for '${eventData.title}' at ${eventData.time} in ${timeDiff / 60000} minutes.`);
                
                setTimeout(() => {
                    new Notification("Event Reminder", {
                        body: `Reminder: ${eventData.title} is scheduled at ${eventData.time}.`,
                        icon: "/icon.png"
                    });
                }, timeDiff);
            } else {
                console.warn(`Skipping event '${eventData.title}' as time has already passed.`);
            }
        });
    } catch (err) {
        console.error("Error fetching events from Firestore:", err);
    }
}



/**
 * Handles authentication state changes to manage notifications.
 */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User authenticated:", user.uid);
        localStorage.setItem("userId", user.uid);

        // Request FCM token if notifications are enabled
        if (localStorage.getItem("notificationsEnabled") === "true") {
            await requestFCMToken(user.uid);
        }

        // Check for today's events and schedule notifications
        checkAndSendEventNotifications(user.uid);
    } else {
        console.warn("User not authenticated. Clearing stored FCM token.");
        localStorage.removeItem("userId");
        localStorage.removeItem("fcmToken");
    }
});

/**
 * Ensures FCM token is requested, service worker is registered,
 * and event notifications are checked on page load.
 */
document.addEventListener("DOMContentLoaded", async () => {
    registerServiceWorker(); // Register Service Worker on page load

    const notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
    const userId = localStorage.getItem("userId");

    if (notificationsEnabled && userId) {
        console.log("Notifications enabled. Requesting FCM token...");
        await requestFCMToken(userId);
        checkAndSendEventNotifications(userId);
    } else {
        console.warn("Notifications not enabled or no authenticated user.");
    }
});
