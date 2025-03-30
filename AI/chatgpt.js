import { fetchEventsForToday, saveResponse, getResponsesByDateAndTitle } from "../backend/firebase.js";

// Process one event – the eventData parameter must include title, date, description, and aiType.
async function fetchChatGPTResponse(eventData) {
  // Log the event data for verification.
  console.log("Processing event data for OpenAI:", eventData);

  try {
    // Send the event data to OpenAI.
    console.log("Sending event data to OpenAI:", eventData);
    const assistantResponse = await sendToOpenAI(eventData);

    // Validate the assistant's response.
    if (
      !assistantResponse ||
      assistantResponse.trim() === "" ||
      assistantResponse === "AI responses fetched successfully"
    ) {
      console.warn("Invalid or placeholder response received for event:", eventData.title);
      throw new Error("Invalid AI response received");
    }

    // Return the valid response.
    return assistantResponse;
  } catch (error) {
    console.error("Error in fetchChatGPTResponse:", error.message);
    throw error;
  }
}

async function sendToOpenAI(eventData) {
  // Instead of fetching the API key from the frontend, we directly call the backend endpoint.
  const openaiUrl = "https://my-backend-three-pi.vercel.app/api/calendar"; // Vercel endpoint for calendar processing

  const response = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Send the event data directly as expected by your backend.
    body: JSON.stringify({ eventData }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error from OpenAI API:", error);
    throw new Error("Failed to fetch response from OpenAI");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export { fetchChatGPTResponse };


