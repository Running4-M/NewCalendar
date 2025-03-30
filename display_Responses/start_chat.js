// Import necessary functions
import { auth } from '../backend/sharedAuthHelper.js'; // Import auth from sharedAuthHelper.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import onAuthStateChanged to track auth state
import { initializeAuthState, getUserId } from "../backend/sharedAuthHelper.js"; // Correct imports
import { initializeFirebase } from "../backend/firebase.js"; // Import the initializeFirebase function
import { db } from "../backend/firebase.js"; // Ensure you're importing the Firestore instance
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js"; // Import Firestore functions

// Initialize Firebase
(async () => {
  await initializeFirebase(); // Ensure Firebase is initialized
})();

const endpoint = "https://my-backend-three-pi.vercel.app/api/chat"; // Updated chat API endpoint

// Helper: Chat State to maintain context
const chatState = {
  userId: null, // User ID to identify the user
  messages: [], // Holds conversation context
};

let addEventMode = false; // Toggle for event creation mode

const addEventButton = document.getElementById("addevent-btn");

addEventButton.addEventListener("click", () => {
  addEventMode = !addEventMode; // Toggle the mode
  console.log("Add Event Mode:", addEventMode); // Debugging


  // Reflect the mode state by updating the button's color
  if (addEventMode) {
    addEventBtn.style.backgroundColor = '#4caf50';
    addEventBtn.style.color = '#fff';
  } else {
    addEventBtn.style.backgroundColor = '#f0f0f0';
    addEventBtn.style.color = '#000';
  }
});

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



// Extract response ID from URL
const urlParams = new URLSearchParams(window.location.search);
const responseId = urlParams.get("response");

if (!responseId) {
  console.error("No response ID found in URL.");
} else {
  fetchResponse();
}



// Fetch the selected response from Firebase
async function fetchResponse() {
  try {
    const responseRef = doc(db, "responses", responseId); // Correct way to reference a Firestore document
    const responseDoc = await getDoc(responseRef); // Fetch the document

    if (responseDoc.exists()) {
      const data = responseDoc.data();
      const responseText = data.response;
      console.log("Firebase response data:", responseText);
      const responseTitle = data.eventTitle; // Fetch the title from the document
      const responseDate = data.date; // Fetch the date from the document
      console.log("Firebase response data:", responseText);
      console.log("Firebase response title:", responseTitle);
      console.log("Firebase response date:", responseDate);
      // Add the response to chatState
      chatState.messages.push({
        role: "system",
        content: responseText
      });

      // Display the response from Firebase
      displayMessage(responseText, "system");

      // Insert the title and date into the navbar dynamically
      document.getElementById("response-title").textContent = responseTitle || "No Title"; // Handle if title is missing
      document.getElementById("response-date").textContent = responseDate || "No Date"; // Handle if date is missing
    } else {
      console.error("Response not found.");
    }
  } catch (error) {
    console.error("Error fetching response:", error);
  }
}

// Fetch and display the Firebase response after initialization
async function initializeChat(aiResponseContext, responseId) {
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

    // Only add system message if there are no previous messages in the chat
    if (chatState.messages.length === 0) {
      const systemMessage = {
        role: "system",
        content: "You are a helpful and friendly assistant that aims to offer help to the user in the best way it can. If you need more information, feel free to ask!"
      };

      chatState.messages.push(systemMessage);
      console.log("Initial system message set:", chatState.messages[0]);

      // Add user-specific context if provided
      if (aiResponseContext) {
        chatState.messages.push({
          role: "system",
          content: aiResponseContext,
        });
        console.log("User-specific AI context added:", aiResponseContext);
      }
    }

    // Fetch response from Firebase and display it
    if (responseId) {
      await fetchResponse();
    }

    console.log("Chat initialized successfully with context:", JSON.stringify(chatState.messages, null, 2));
  } catch (error) {
    console.error("Error in initializeChat:", error);
    throw error;
  }
}

// Global variables for pending AI message and animation
let pendingContainer = null;
let faceAnimationInterval = null;

// Start alternating the avatar between "thinking" and "explaining"
function startFaceAnimation(avatarImg) {
  let isThinking = true;
  faceAnimationInterval = setInterval(() => {
    // Toggle between explaining and thinking images every 2 seconds
    avatarImg.src = isThinking 
      ? "../face/Michael/explaining.png" 
      : "../face/Michael/curious.png";
    isThinking = !isThinking;
  }, 2000);
}

// Stop the animation and set the avatar to "smiling"
function stopFaceAnimation(avatarImg) {
  clearInterval(faceAnimationInterval);
  if (avatarImg) {
    avatarImg.src = "../face/Michael/smiling.png";
  }
}

function showPendingMessage() {
  const chatDisplay = document.getElementById("chat-display");
  pendingContainer = document.createElement("div");
  pendingContainer.classList.add("ai-message-container");
  pendingContainer.style.display = "flex";
  pendingContainer.style.alignItems = "flex-start";
  pendingContainer.style.gap = "10px";
  pendingContainer.style.marginBottom = "10px";
  
  // Create avatar element for the pending message
  const avatarImg = document.createElement("img");
  avatarImg.classList.add("ai-avatar");
  avatarImg.alt = "Avatar";
  if (addEventMode) {
    avatarImg.src = "../face/Michael/confident.png";
  } else {
    avatarImg.src = "../face/Michael/curious.png";
  }
  avatarImg.style.width = "80px";
  avatarImg.style.height = "80px";
  avatarImg.style.borderRadius = "50%";
  avatarImg.style.objectFit = "cover";
  avatarImg.style.border = "2px solid #000";
  
  // Create a placeholder bubble with skeleton effect and rounded borders
  const placeholderBubble = document.createElement("div");
  placeholderBubble.classList.add("pending-placeholder", "skeleton-box");
  placeholderBubble.style.flex = "1";
  
  // Create multiple skeleton lines to represent text
  const lines = [
    { width: "80%" },
    { width: "60%" },
    { width: "90%" },
    { width: "50%" },
  ];
  
  lines.forEach((line, index) => {
    const skeletonLine = document.createElement("div");
    skeletonLine.classList.add("skeleton-line");
    skeletonLine.style.setProperty('--line-width', line.width);
    skeletonLine.style.animationDelay = `${index * 0.5}s`;
    placeholderBubble.appendChild(skeletonLine);
  });
  
  pendingContainer.appendChild(avatarImg);
  pendingContainer.appendChild(placeholderBubble);
  chatDisplay.appendChild(pendingContainer);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
  
  if (!addEventMode) {
    startFaceAnimation(avatarImg);
  }
}





// Optionally, remove the pending message entirely
function removePendingMessage() {
  if (pendingContainer && pendingContainer.parentNode) {
    pendingContainer.parentNode.removeChild(pendingContainer);
    pendingContainer = null;
  }
}

// Initialize markdown-it with texmath plugin and KaTeX
const md = window.markdownit({
  html: true,        // Enable HTML tags in source
  breaks: true,      // Convert '\n' in paragraphs into <br>
  typographer: true  // Enable smart quotes and other typographic replacements
})
.use(window.texmath, {
  engine: window.katex,
  // If you want to use LaTeX-style delimiters, use this configuration:
  delimiters: 'brackets', // uses \(...\) for inline and \[...\] for display math
  katexOptions: { throwOnError: false }
  
  // Alternatively, if you choose to use 'dollars', then update both the config and the incoming text:
  // delimiters: 'dollars', // uses $ for inline and $$ for display math
});

// Function to check for the delimiters in the text
function logDelimiterPresence(text) {
  console.log("Raw text:", text);
  if (text.indexOf("\\(") !== -1) {
    console.log("Found inline math delimiter: \\(");
  } else {
    console.warn("Missing inline math delimiter: \\(");
  }
  if (text.indexOf("\\[") !== -1) {
    console.log("Found display math delimiter: \\[");
  } else {
    console.warn("Missing display math delimiter: \\[");
  }
}

function displayMessage(text, sender) {
  const chatDisplay = document.getElementById("chat-display");

  // Log the raw text and check for math delimiters
  logDelimiterPresence(text);

  // Convert Markdown (including math) to HTML
  let htmlResponse = md.render(text);
  console.log("Converted Markdown to HTML:", htmlResponse);

  // Create and style the message container
  let container;
  if (sender === "ai") {
    container = document.createElement("div");
    container.classList.add("ai-message-container");

    const avatarImg = document.createElement("img");
    avatarImg.classList.add("ai-avatar");
    avatarImg.src = "../face/Michael/smiling.png";
    avatarImg.alt = "Avatar";
    container.appendChild(avatarImg);
  }

  const messageBubble = document.createElement("div");
  messageBubble.style.textAlign = "left";
  messageBubble.style.padding = "8px 12px";
  messageBubble.innerHTML = htmlResponse;

  // Additional styling for non-user messages
  if (sender !== "user") {
    messageBubble.style.background = "transparent";
    messageBubble.style.alignSelf = "stretch";
    messageBubble.style.maxWidth = "100%";
    messageBubble.style.padding = "0";

    const innerElements = messageBubble.querySelectorAll('p, div, ul, ol, table, blockquote, pre, hr, li');
    innerElements.forEach(element => {
      element.style.fontSize = "16px";
      element.style.lineHeight = "1.8";
      element.style.margin = "20px";
    });

    const listItems = messageBubble.querySelectorAll('li');
    listItems.forEach(li => {
      li.style.margin = "15px";
    });

    const codeElements = messageBubble.querySelectorAll('code');
    codeElements.forEach(code => {
      code.style.fontSize = "16px";
      code.style.margin = "20px";
      code.style.fontFamily = "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace !important";
    });

    const codeBlocks = messageBubble.querySelectorAll('[class*="language-"]');
    codeBlocks.forEach(block => {
      Prism.highlightElement(block);
    });
  }

  if (sender === "ai") {
    container.appendChild(messageBubble);
    chatDisplay.appendChild(container);
  } else {
    chatDisplay.appendChild(messageBubble);
  }

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
  console.log("Message appended:", sender === "ai" ? container : messageBubble);
}







function displayChatMessage(message, sender) {
  const chatDisplay = document.getElementById("chat-display");
  if (!chatDisplay) {
    console.error("Chat display element not found.");
    return;
  }

  if (typeof marked === "undefined") {
    console.error("marked is not loaded!");
    return;
  }

  let htmlResponse = md.render(message); // Convert Markdown to HTML

  // Create a container for AI messages (avatar + message bubble)
  let container;
  if (addEventMode) {
    container = document.createElement("div");
    container.classList.add("event-message-container");
    container.style.display = "flex";
    container.style.alignItems = "flex-start"; // Align elements to the top-left
    container.style.marginBottom = "10px"; // Add spacing between messages

    // Create the AI avatar
    // Create the avatar element
    const avatarImg = document.createElement("img");
    avatarImg.classList.add("ai-avatar");
    // Initially set to smiling image (or whatever your default is)
    avatarImg.src = "../face/Michael/smiling.png";
    avatarImg.alt = "Avatar";
    avatarImg.style.marginRight = "10px"; // Space between avatar and message

    container.appendChild(avatarImg);
  }

  // Create the message bubble
  const messageBubble = document.createElement("div");
  messageBubble.classList.add("message-bubble");
  messageBubble.innerHTML = htmlResponse;
  messageBubble.style.textAlign = "left"; // Ensure text is left-aligned
  messageBubble.style.maxWidth = "80%"; // Prevents overly wide messages
  messageBubble.style.padding = "8px 12px";
  messageBubble.style.borderRadius = "8px";
  messageBubble.style.backgroundColor = "#f1f1f1"; // Light background for contrast
  messageBubble.style.marginBottom = "5px";

  if (addEventMode) {
    messageBubble.style.background = "transparent";
    messageBubble.style.alignSelf = "stretch";
    messageBubble.style.maxWidth = "100%";
    messageBubble.style.padding = "0";
  }

  // Apply consistent styles to inner elements
  const innerElements = messageBubble.querySelectorAll(
    "p, div, ul, ol, table, blockquote, pre, hr, li"
  );
  innerElements.forEach((element) => {
    element.style.fontSize = "16px";
    element.style.lineHeight = "1.8";
    element.style.margin = "10px 0";
    element.style.textAlign = "left"; // Ensuring all inner elements are left-aligned
  });

  // Add spacing for list items
  const listItems = messageBubble.querySelectorAll("li");
  listItems.forEach((li) => {
    li.style.margin = "10px 0";
  });

  // Adjust styling for code elements
  const codeElements = messageBubble.querySelectorAll("code");
  codeElements.forEach((code) => {
    code.style.fontSize = "16px";
    code.style.margin = "10px 0";
    code.style.fontFamily =
      "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace";
  });

  // Apply syntax highlighting for code blocks
  messageBubble.querySelectorAll("pre code").forEach((block) => {
    Prism.highlightElement(block);
  });

  // Append elements correctly
  if (addEventMode) {
    container.appendChild(messageBubble);
    chatDisplay.appendChild(container);
  } else {
    chatDisplay.appendChild(messageBubble);
  }

  chatDisplay.scrollTop = chatDisplay.scrollHeight; // Auto-scroll to latest message
}








let pendingEvents = []; // Initialize as an empty array, not null


async function sendMessageToModel(userMessage) {
  showPendingMessage();
  try {
    console.log("Preparing to send message. Current userId:", chatState.userId);

    if (!chatState.userId) {
      console.error("Cannot send message: userId is null.");
      throw new Error("User ID is not set.");
    }

    // Define the general system message (AI's role)
    const systemMessage = {
      role: "system",
      content: "You are an AI assistant that helps users with tasks, answering questions."
    };

    // Check if event mode is active and add system message if needed
    let eventSystemMessage = null;  // Declare variable

    if (addEventMode) {
      
      console.log("Event mode is active. Keeping event system message in context.");
      // Add current date to the system message
      const todayDate = format(new Date(), "yyyy-MM-dd");
      eventSystemMessage = {
        role: "system",
        content: `You are assisting with event creation or extracting event information to be saved depending on the users input. Today's date is ${todayDate}. Extract event details (title, description, date, and optional time, for time it must be in numerical format do not inlude am or pm, convert the time in a 24 hour format such as 13:05) from user messages. 
        Always return the result in JSON format. Ensure the 'title' and 'description' fields are filled. The 'date' field must be in numerical form. If user uses words such as (e.g., 'tomorrow', 'next Monday', 'March 5th') use todays date to figure out what the date would be based on the users text but return the date in this numerical format yyyy-MM-dd. 
        For multi-day events when creating events based on users input, create separate entries with the same group_id`
      };
    }

    // Add the user's message to chat state
    // Only add the user's message if it's not a confirmation ("yes") when in event mode
    if (!(addEventMode && userMessage.trim().toLowerCase() === "yes")) {
      chatState.messages.push({ role: "user", content: userMessage });
    }
    console.log("User message added to chatState:", userMessage);

    // Extract text from selected file (if any)
    let fileExtractedText = null;
    if (selectedFile) {
      console.log("Extracting text from selected file...");
      fileExtractedText = await extractTextFromFile(selectedFile);
    }

    // Extract text from provided URL (if any)
    let urlExtractedText = null;
    const urlInput = document.getElementById("url-bubble");
    if (urlInput) {
      // Assuming the URL text is inside a span within the bubble:
      const urlText = urlInput.querySelector("span").textContent.trim();
      if (urlText) {
        console.log("Extracting text from provided URL:", urlText);
        urlExtractedText = await extractTextFromURL(urlText);
      } else {
        console.error("URL bubble found, but no text inside it.");
      }
    } else {
      console.error("No URL bubble found in the DOM.");
    }

    // Prepare conversation history
    let conversationHistory = [systemMessage];
    console.log("Initial conversation history with system message:", conversationHistory);

    // If event mode is active, ensure the event-specific system message stays
    if (eventSystemMessage) {
      conversationHistory.push(eventSystemMessage);
      console.log("Event system message added to conversation history:", eventSystemMessage);
    }

    // Retain past event-related messages
    const eventMessages = chatState.messages.filter(msg => msg && (msg.role === "user" || msg.role === "assistant"));
    console.log("Filtered event-related messages:", eventMessages);

    if (addEventMode) {
      conversationHistory.push(...eventMessages.slice(-8)); // Keep last 8 messages if event mode is active
    } else {
      conversationHistory.push(...eventMessages.slice(-5)); // Otherwise, keep last 5 messages
    }

    console.log("Final conversation history sent to AI:", JSON.stringify(conversationHistory, null, 2));

    // Prepare request payload
    const requestBody = {
      userId: chatState.userId,
      userMessage,
      conversationHistory,
      urlExtractedText: urlExtractedText || null,
      fileExtractedText: fileExtractedText || null,
    };

    // Make POST request to backend
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

    // Process the AI response
    const aiMessage = await response.json();
    console.log("AI response received:", aiMessage);

    // Add AI's message to chat state
    chatState.messages.push({ role: "assistant", content: aiMessage.content });
    console.log("AI message added to chatState:", aiMessage.content);

    // Display AI response
    function generateRandomId() {
      return 'group_' + Math.random().toString(36).substr(2, 9);
    }

    function parseWithDateFns(dateStr) {
      try {
        const parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
        return isValid(parsedDate) ? format(parsedDate, "yyyy-MM-dd") : null;
      } catch (error) {
        return null;
      }
    }

    let aiResponse = aiMessage.content.trim();

// Stop the face animation by passing in the avatar element from the pending container
if (pendingContainer) {
  const avatarImg = pendingContainer.querySelector("img.ai-avatar");
  stopFaceAnimation(avatarImg);
}

if (addEventMode) {
  if (userMessage.toLowerCase() === "yes" && pendingEvents.length > 0) {
    addEventMode = false;
    console.log("Add Event Mode after confirmation:", addEventMode);

    let savedEvents = [];
    let eventGroupColor = getRandomColor();
    let groupId = generateRandomId();

    for (let event of pendingEvents) {
      if (event.date && typeof event.date !== "string") {
        event.date = String(event.date);
      }

      let eventDate = parseWithDateFns(event.date);
      if (!eventDate) {
        displayChatMessage(
          "I couldn't determine the exact date for one of the events. Please provide it in YYYY-MM-DD format.",
          "assistant"
        );
        removePendingMessage();
        return;
      }

      const newEvent = {
        title: event.title,
        description: event.description,
        date: eventDate,
        time: event.time || "",
        group_id: groupId,
        groupColor: eventGroupColor,
      };

      try {
        console.log("Saving new event to Firebase:", newEvent);
        await saveEvent(newEvent);
        savedEvents.push(newEvent);
      } catch (error) {
        console.error("Error saving event:", error);
        displayChatMessage("There was an error saving your event. Please try again.", "assistant");
        removePendingMessage();
        return;
      }
    }

    displayChatMessage("Your events have been saved to the calendar! 🎉", "assistant");
    removePendingMessage();

    if (calendar) {
      calendar.refetchEvents();
    }

    pendingEvents = [];
    console.log("Pending events cleared:", pendingEvents);
    removePendingMessage();
    return;
  } else if (aiResponse) {
    let jsonResponse;
    // Try to extract a JSON code block from the response
    let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      // Extract additional text outside of the JSON block
      const jsonBlock = jsonMatch[0];
      const textBefore = aiResponse.slice(0, jsonMatch.index).trim();
      const textAfter = aiResponse.slice(jsonMatch.index + jsonBlock.length).trim();
      let additionalText = "";
      if (textBefore) additionalText += textBefore + "\n\n";
      if (textAfter) additionalText += textAfter;

      try {
        jsonResponse = JSON.parse(jsonMatch[1].trim());
        console.log("Parsed JSON:", jsonResponse);
      } catch (error) {
        console.error("AI response is not valid JSON:", error, "\nRaw AI Response:", aiResponse);
        displayChatMessage("There was an issue understanding the event details. Please rephrase your request.", "assistant");
        removePendingMessage();
        return;
      }

      // If the parsed JSON is an object with an "events" property, extract that array.
      if (jsonResponse && jsonResponse.events && Array.isArray(jsonResponse.events)) {
        jsonResponse = jsonResponse.events;
      }

      // First, display any additional text as markdown
      if (additionalText) {
        let htmlAdditional = md.render(additionalText);
        displayChatMessage(htmlAdditional, "assistant");
      }

      // Then process the events
      if (Array.isArray(jsonResponse)) {
        processEvents(jsonResponse);
      } else if (jsonResponse && jsonResponse.title && jsonResponse.description && jsonResponse.date) {
        processEvents([jsonResponse]);
      } else {
        console.log("Invalid response format. Expected an array of events or a single event.");
        displayChatMessage("The AI response was not structured correctly. Please provide event details again.", "assistant");
        removePendingMessage();
        return;
      }
    } else {
      // If no JSON block is found – try parsing the whole response as JSON.
      try {
        jsonResponse = JSON.parse(aiResponse);
      } catch (e) {
        // Not valid JSON, so display the AI response as markdown.
        
        displayChatMessage(aiResponse, "assistant");
        removePendingMessage();
        return;
      }

      if (jsonResponse && jsonResponse.events && Array.isArray(jsonResponse.events)) {
        jsonResponse = jsonResponse.events;
      }
      if (Array.isArray(jsonResponse)) {
        processEvents(jsonResponse);
      } else if (jsonResponse && jsonResponse.title && jsonResponse.description && jsonResponse.date) {
        processEvents([jsonResponse]);
      } else {
        console.log("Invalid response format. Expected an array of events or a single event.");
        displayChatMessage("The AI response was not structured correctly. Please provide event details again.", "assistant");
        removePendingMessage();
        return;
      }
    }
  }
} else {
  displayMessage(aiMessage.content, "ai");
  removePendingMessage();
}




return aiMessage.content;

function processEvents(eventsArray) {
  pendingEvents = [];
  let missingFields = [];
  
  for (let event of eventsArray) {
    if (!event.title || !event.description || !event.date) {
      console.log("Invalid event data:", event);
      missingFields.push(`Event on ${event.date} is missing required details.`);
      continue;
    }

    const eventDate = parseWithDateFns(event.date);
    if (!eventDate) {
      displayChatMessage("The provided date format is incorrect. Please use YYYY-MM-DD format.", "assistant");
      removePendingMessage();
      return;
    }

    const newEvent = {
      title: event.title,
      description: event.description,
      date: eventDate,
      time: event.time || "",
      group_id: generateRandomId(),
    };

    pendingEvents.push(newEvent);
    console.log("Event extracted:", newEvent);
  }

  if (missingFields.length > 0) {
    displayChatMessage(missingFields.join(", "), "assistant");
    return;
  }

  pendingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log("Sorted pending events:", pendingEvents);

  const formattedHTML = formatEventsHTML(pendingEvents);
  displayChatMessage(formattedHTML, "assistant");

  displayChatMessage("Would you like to save these events? Please type 'yes' to confirm.", "assistant");
  removePendingMessage();
}


    return aiMessage.content;

  } catch (error) {
    console.error("Error in sendMessageToModel:", error);
    if (pendingContainer) {
      const avatarImg = pendingContainer.querySelector("img.ai-avatar");
      stopFaceAnimation(avatarImg);
      removePendingMessage();
    }
    throw error;
  }
}


// Generate a random color for event grouping
function getRandomColor() {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#A833FF", "#FF8C33"];
  return colors[Math.floor(Math.random() * colors.length)]; // Return a random color from predefined set
}

// Exported function to interact with the AI
export async function sendMessageToAI(userMessage) {
  try {
    console.log("Initiating sendMessageToAI with userMessage:", userMessage);

    // Check if user is logged in
    if (!chatState.userId) {
      console.log("User is not logged in, userId not set. Redirecting to login page.");
      return;
    }

    const aiResponse = await sendMessageToModel(userMessage); // Send message to model
    console.log("AI response from sendMessageToAI:", aiResponse);
    return aiResponse;
  } catch (error) {
    console.error("Error in chat interaction:", error);
    throw error;
  }
}

// Helper function to format events into HTML for display
function formatEventsHTML(events) {
  let html = '<div class="event-list" style="display: flex; flex-direction: column; gap: 10px;">';

  events.forEach((event) => {
    html += `<div class="event-item" style="margin: 10px 0; padding: 10px;">`;
    html += `<h4 style="margin-bottom: 5px;"><strong>Title:</strong> ${event.title}</h4>`;
    html += `<p style="margin-bottom: 5px;"><strong>Description:</strong> ${event.description}</p>`;
    html += `<p style="margin-bottom: 5px;"><strong>Date:</strong> ${event.date}</p>`;

    if (event.time && event.time.trim() !== "") {
      html += `<p style="margin-bottom: 5px;"><strong>Time:</strong> ${event.time}</p>`;
    }

    html += `</div>`;
  });

  html += '</div>';
  return html;
}














let selectedFile = null; // Global variable to store the selected file

// Capture the file as soon as it's selected
document.addEventListener("change", (event) => {
  if (event.target.id === "fileInput") {
    selectedFile = event.target.files[0]; // Store the file globally
    console.log("File selected and stored globally:", selectedFile);
  }
});

// Function to extract text from a file
async function extractTextFromFile(file) {
  if (!file) {
    console.error("No file provided for extraction.");
    return null;
  }

  const form = new FormData();
  form.append("file", file);

  const endpoint = file.type === "application/pdf"
    ? "https://api.apyhub.com/extract/text/pdf-file"
    : "https://api.apyhub.com/extract/text/word-file";

  try {
    console.log("Starting text extraction from file:", file.name);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "apy-token": "APY0kRziwHo31PQas6rRbJoz22HTeO3DIDYn3SD4Sg5Jtmjur04Jih3GTl8qd9KLfxvVRFikupWS" },
      body: form,
    });

    if (!response.ok) {
      console.error("HTTP error! Status:", response.status);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Extracted text:", result.data);
    return result.data || null;
  } catch (error) {
    console.error("Error extracting text from file:", error);
    return null;
  }
}

async function extractTextFromURL(url) {
  if (!url) {
    console.error("No URL provided for extraction.");
    return null;
  }

  // Encode the URL for use as a query parameter
  const encodedUrl = encodeURIComponent(url);
  // Use the GET method with the query parameter
  const endpoint = `https://api.apyhub.com/extract/text/webpage?url=${encodedUrl}`;

  try {
    console.log("Starting text extraction from URL:", url);
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apy-token": "APY0Yp88OzASZ7pBeNI8bUBjopbQZ4XwAh0LP9g8qk0aNvZlfiwhW6elHuhWKNMF" // Replace with your valid token if needed
      }
    });

    if (!response.ok) {
      console.error("HTTP error! Status:", response.status);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Extracted text from URL:", result.data);
    return result.data || null;
  } catch (error) {
    console.error("Error extracting text from URL:", error);
    return null;
  }
}


// Event listener for sending messages
document.getElementById("send-btn").addEventListener("click", async function() {
  let messageInput = document.getElementById('messageInput');
  let message = messageInput.value.trim();
  let chatDisplay = document.getElementById('chat-display');
  let chatHeader = document.getElementById('chat-header');
  let chatContainer = document.querySelector('.chat-container');

  if (message !== "") {
    // Ensure chat state is initialized before sending messages
    await initializeChat();

    // Hide header and show chat display
    chatHeader.style.display = "none";
    chatDisplay.style.display = "flex";
    chatDisplay.classList.add('active'); // Add active class to adjust width

    // Create message bubble for user
    let messageBubble = document.createElement("div");
    messageBubble.textContent = message;
    messageBubble.style.padding = "10px";
    messageBubble.style.background = "#f1f1f1"; // Very light grey, almost white
    messageBubble.style.borderRadius = "20px"; // More circular border radius
    messageBubble.style.alignSelf = "flex-end";
    messageBubble.style.maxWidth = "70%";
    messageBubble.style.wordWrap = "break-word";
    messageBubble.style.fontSize = "16px"; // Bigger text
    messageBubble.style.lineHeight = "1.8"; // Increase line spacing
    messageBubble.style.textAlign = "left"; // Ensure the text always aligns left

    // Append user message bubble to chat
    chatDisplay.appendChild(messageBubble);

    // Adjust chat-container height if message added
    chatContainer.classList.add('expanded');

    let fileExtractedText = null;
    let urlExtractedText = null;
  // Check if a file was selected
  if (selectedFile) {
    console.log("Extracting text from selected file...");
    fileExtractedText = await extractTextFromFile(selectedFile);
  } 
  // Check if a URL was provided
  else {
    const urlInput = document.getElementById("url-bubble");
if (urlInput) {
  // Assuming the URL text is inside a span within the bubble:
  const urlText = urlInput.querySelector("span").textContent.trim();
  if (urlText) {
    console.log("Extracting text from provided URL:", urlText);
    urlExtractedText = await extractTextFromURL(urlText);
  } else {
    console.error("URL bubble found, but no text inside it.");
  }
} else {
  console.error("No URL bubble found in the DOM.");
}
  }

    // Clear input
    messageInput.value = "";

    // Ensure chat container dynamically adjusts, only expanding once
    setTimeout(function() {
      chatContainer.style.height = 'auto';
    }, 100);

    // Scroll page to bottom
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight - 200, behavior: 'smooth' });
    }, 100);
  }

  if (!message) return;

  // Remove duplicate user message bubble creation
  try {
    await sendMessageToAI(message);
  } catch (error) {
    console.error("Error sending message:", error);
  }
});
