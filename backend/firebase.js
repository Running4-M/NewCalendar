import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase initialization variables
let db, auth, messaging, currentUserId = null;

// Function to initialize Firebase with the config from the backend
async function initializeFirebase() {
  try {
    // Update the API URL to point to the Vercel endpoint
    const backendUrl = "https://my-backend-three-pi.vercel.app/api";
    
    const response = await fetch(`${backendUrl}/firebaseConfig`);
    const firebaseConfig = await response.json();

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    messaging = getMessaging(app);  // Initialize Messaging
    console.log('Firebase initialized successfully.');

    // Initialize user state observer
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUserId = user.uid;
        console.log("User signed in:", user.uid);
      } else {
        currentUserId = null;
        console.log("User signed out");
      }
    });

    // Resolve promise when Firebase is successfully initialized
    return Promise.resolve();
  } catch (error) {
    console.error("Error fetching Firebase config:", error);
    return Promise.reject(error);
  }
}

// Call the function to initialize Firebase, and use it after completion
initializeFirebase().then(() => {
  console.log("Firebase initialized, now you can use Firebase services.");
  // Your Firebase-dependent logic here
}).catch((error) => {
  console.error("Error initializing Firebase:", error);
});
// Function to get the current user ID
function getCurrentUserId() {
  return currentUserId;
}

// Function to fetch a specific event by eventId
async function fetchEventFromFirebase(eventId) {
  try {
    const eventRef = doc(db, "events", eventId);  // Reference to the document
    const eventDoc = await getDoc(eventRef);  // Fetch the document snapshot

    if (eventDoc.exists()) {
      return eventDoc;  // Return the document snapshot if it exists
    } else {
      console.error("No event found with ID:", eventId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching event from Firebase:", error);
    return null;
  }
}

// Function to fetch events
async function fetchEvents() {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    const eventsCollectionRef = collection(db, "events");
    const q = query(eventsCollectionRef, where("userId", "==", userId)); // Ensure this filter is applied
    const querySnapshot = await getDocs(q);

    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return events;
  } catch (error) {
    console.error("Error fetching events: ", error);
    throw error;
  }
}

// Function to save event to Firestore
async function saveEvent(eventData) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    if (!userId) throw new Error("User not authenticated.");

    console.log("Saving event for userId:", userId); // Debugging line
    const eventsCollectionRef = collection(db, "events");

    const docRef = await addDoc(eventsCollectionRef, {
      ...eventData,
      userId: userId, // Add userId to link the event to the current user
    });

    console.log("Event added successfully with ID:", docRef.id);
    return docRef.id; // Return only the document ID instead of the full reference
  } catch (error) {
    console.error("Error adding event:", error.message);
    throw error;
  }
}

// Function to save an event to Firestore, ensuring consistent colors for groups
async function saveEventToFirebase(eventData) {
  let color = eventData.color;

  if (eventData.group) {
    // Fetch an existing event in the same group to maintain the color
    const existingGroupEvent = (await fetchEvents()).find(e => e.group === eventData.group);
    color = existingGroupEvent ? existingGroupEvent.color : "#77DD77";
  } else {
    color = "#77DD77"; // Default color for events without a group
  }

  eventData.color = color; // Assign the color
  await saveEvent(eventData);
}
async function updateEvent(eventId, updatedData) {
  try {
    if (!eventId || typeof eventId !== "string") {
      throw new Error(`Invalid eventId: ${eventId}`);
    }

    const userId = getCurrentUserId();
    const eventDocRef = doc(db, "events", eventId);

    // Log to verify that we are fetching the correct event document
    console.log(`Fetching event with ID: ${eventId}`);

    const eventSnapshot = await getDoc(eventDocRef);

    if (eventSnapshot.exists()) {
      console.log("Fetched Event Snapshot:", eventSnapshot.data());
      
      if (eventSnapshot.data().userId === userId) {
        await updateDoc(eventDocRef, updatedData);
        console.log("Event updated successfully:", updatedData);
      } else {
        console.error("Unauthorized update attempt.");
      }
    } else {
      console.error("Event not found.");
    }
  } catch (error) {
    console.error("Error updating event:", error.message);
    throw error;
  }
}


// Function to delete an event from Firestore
async function deleteEvent(eventId) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    const eventDocRef = doc(db, "events", eventId);
    const eventSnapshot = await getDoc(eventDocRef);

    if (eventSnapshot.exists() && eventSnapshot.data().userId === userId) {
      // Only delete if the event belongs to the logged-in user
      await deleteDoc(eventDocRef);
      console.log("Event deleted successfully");
    } else {
      console.error("Unauthorized delete attempt.");
    }
  } catch (error) {
    console.error("Error deleting event: ", error.message);
    throw error;
  }
}

// Function to fetch events for a specific day
async function fetchEventsForToday(dateStr) {
  console.log("Fetching events for today:", dateStr); // Log the current date
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    const eventsCollection = collection(db, "events");
    const todayQuery = query(
      eventsCollection,
      where("userId", "==", userId), // Only fetch events for the logged-in user
      where("date", "==", dateStr)
    );
    const querySnapshot = await getDocs(todayQuery);

    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Today's events fetched:", events); // Log fetched events
    return events;
  } catch (error) {
    console.error("Error fetching today's events:", error.message);
    return [];
  }
}

async function saveResponse(responseData) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    // Only check for a valid response if it's not a placeholder
    if (!responseData.isLoading) {
      if (!responseData.response || responseData.response.trim() === "" || responseData.response === "AI responses fetched and saved successfully") {
        console.warn("Invalid response detected. It will not be saved to Firestore.");
        return;
      }
    }

    // Reference the 'responses' collection
    const responsesCollection = collection(db, "responses");

    // Add a new document to the collection with the response data
    const docRef = await addDoc(responsesCollection, {
      ...responseData,
      userId: userId, // Add userId to link the response to the current user
    });
    console.log("Response saved successfully:", responseData);
    return { id: docRef.id };
  } catch (error) {
    console.error("Error saving response:", error);
  }
}


async function updateResponse(docId, data) {
  const docRef = doc(db, "responses", docId);
  await updateDoc(docRef, data);
}

// Function to check for existing responses
async function getResponsesByDateAndTitle(date, title) {
  const userId = getCurrentUserId(); // Get the logged-in user's ID

  const responsesCollection = collection(db, "responses");
  const q = query(
    responsesCollection,
    where("userId", "==", userId), // Only fetch responses for the logged-in user
    where("date", "==", date),
    where("eventTitle", "==", title)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return doc.data(); // Return the existing response data
  }
  return null; // No response found
}

// Export functions
export { 
  fetchEvents, 
  saveEvent, 
  updateEvent, 
  deleteEvent, 
  fetchEventsForToday, 
  saveResponse, 
  getResponsesByDateAndTitle, 
  auth, 
  fetchEventFromFirebase, 
  getCurrentUserId, 
  saveEventToFirebase, 
  getToken, 
  onMessage, 
  messaging, 
  db,
  initializeFirebase,
  updateResponse 
};
