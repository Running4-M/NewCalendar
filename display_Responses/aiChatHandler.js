// Import necessary functions
import { auth } from '../backend/sharedAuthHelper.js'; // Import auth from sharedAuthHelper.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import onAuthStateChanged to track auth state
import { initializeAuthState, getUserId } from "../backend/sharedAuthHelper.js"; // Correct imports
import { initializeFirebase } from "../backend/firebase.js"; // Import the initializeFirebase function


// Updated chat API endpoint to Vercel deployment URL
const endpoint = "https://my-backend-three-pi.vercel.app/api/chat"; // Updated chat API endpoint

// Helper: Chat State to maintain context
const chatState = {
  userId: null, // User ID to identify the user
  messages: [], // Holds conversation context
};
  // Wait for Firebase to be initialized first (await your initialization here)
  await initializeFirebase(); // Make sure Firebase is initialized first
// Listen for changes in authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    chatState.userId = user.uid; // Update the user ID
  } else {
    console.log("No user is logged in.");
    chatState.userId = null; // Reset the user ID
  }
});

// Initialize chat with the first AI context
export async function initializeChat(aiResponseContext) {
  try {
    console.log("Initializing chat...");

    // Ensure userId is initialized (but only once)
    if (!chatState.userId) {
      console.log("Fetching userId using sharedAuthHelper...");
      await initializeAuthState(); // Corrected function name
      chatState.userId = getUserId(); // Retrieve the fetched userId
      console.log("User ID fetched and set:", chatState.userId);
    }

    if (!chatState.userId) {
      console.error("User ID is null. Chat cannot proceed.");
      throw new Error("User ID must be initialized before starting chat.");
    }

    // Set up the initial system message if chatState.messages is empty
    if (chatState.messages.length === 0) {
      chatState.messages.push({
        role: "system",
        content: aiResponseContext || 
          "You are a helpful assistant that provides insightful suggestions based on user prompts.",
      });
      console.log("Initial system message set:", chatState.messages[0]);
    }

    console.log("Chat initialized successfully with context:", JSON.stringify(chatState.messages, null, 2));
  } catch (error) {
    console.error("Error in initializeChat:", error);
    throw error;
  }
}

// Helper: Send a message to the AI
async function sendMessageToModel(userMessage) {
  try {
    console.log("Preparing to send message. Current userId:", chatState.userId);

    // Check for valid userId
    if (!chatState.userId) {
      console.error("Cannot send message: userId is null.");
      throw new Error("User ID is not set.");
    }

    // Add the user's message to the chat state
    chatState.messages.push({ role: "user", content: userMessage });
    console.log("User message added to chatState:", userMessage);

    // Prepare the request payload
    const requestBody = {
      userId: chatState.userId,
      userMessage,
      conversationHistory: chatState.messages,
    };

    console.log("Request payload prepared:", JSON.stringify(requestBody, null, 2));

    // Make the POST request to the backend
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${errorText}`);
      throw new Error(`Failed to fetch AI response: ${response.statusText}`);
    }

    // Process the response
    const aiMessage = await response.json();
    console.log("AI response received:", aiMessage);

    // Add the AI's message to the chat state
    chatState.messages.push({ role: "system", content: aiMessage.content });
    console.log("AI message added to chatState:", aiMessage.content);

    return aiMessage.content;
  } catch (error) {
    console.error("Error in sendMessageToModel:", error);
    throw error;
  }
}

// Exported function to interact with the AI
export async function sendMessageToAI(userMessage) {
  try {
    console.log("Initiating sendMessageToAI with userMessage:", userMessage);

    // Ensure the userId is initialized before proceeding
    if (!chatState.userId) {
      console.log("User is not logged in, userId not set. Redirecting to login page.");
      
      return; // Prevent further execution
    }

    const aiResponse = await sendMessageToModel(userMessage);
    console.log("AI response from sendMessageToAI:", aiResponse);
    return aiResponse;
  } catch (error) {
    console.error("Error in chat interaction:", error);
    throw error;
  }
}
