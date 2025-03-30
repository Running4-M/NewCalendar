import { sendMessageToAI } from "./aiChatHandler.js";
import { auth } from '../backend/sharedAuthHelper.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { initializeAuthState, getUserId } from "../backend/sharedAuthHelper.js";
import { initializeFirebase } from "../backend/firebase.js";
import { getFirestore, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db } from "../backend/firebase.js";


console.log("displayResponse.js loaded");
initializeAuthState();
initializeFirebase();
console.log("Firebase initialized");

async function initialize() {
  // Function to create a skeleton card
  function createSkeletonCard() {
    const skeleton = document.createElement("div");
    skeleton.classList.add("card-skeleton");
    skeleton.innerHTML = `
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-date"></div>
      <div class="skeleton-line skeleton-description"></div>
      <div class="loading-text">Response being fetched,<br>will only be a moment</div>
    `;
    return skeleton;
  }

  // Show loading skeleton before fetching responses
  const skeletonCard = createSkeletonCard();
  responseContainer.appendChild(skeletonCard);

  let userId = null;

  console.log("Checking authentication state...");
  const user = await new Promise((resolve) => onAuthStateChanged(auth, resolve));

  if (user) {
    userId = user.uid;
    console.log("User authenticated with ID:", userId);
  } else {
    alert("You need to log in first.");
    window.location.href = "../Login/login.html";
    return;
  }

  console.log("Querying Firestore with userId:", userId);
  const userResponsesQuery = query(
    collection(db, "responses"),
    where("userId", "==", userId)
  );

  // Use onSnapshot to listen for realtime updates
  onSnapshot(userResponsesQuery, (querySnapshot) => {
    // Clear the entire container to re-render responses
    responseContainer.innerHTML = "";
    
    // If the skeleton is still present, remove it.
    if (skeletonCard.parentNode) {
      skeletonCard.parentNode.removeChild(skeletonCard);
    }

    const dateGroups = {};

    // Group responses by date
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      const responseId = doc.id;
      const date = docData.date || "Unknown Date";
      const eventTitle = docData.eventTitle || "Untitled Event";
      const response = docData.response || "No response available.";

      console.log("Fetched document:", responseId, date, eventTitle, response);

      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push({ eventTitle, response, responseId });
    });

    // Check if there are any responses
    if (Object.keys(dateGroups).length === 0) {
      console.log("No responses found for this user.");
      const noResponsesMessage = document.createElement("div");
      noResponsesMessage.className = "no-responses-message";
      noResponsesMessage.style.fontSize = "2rem";
      noResponsesMessage.style.fontWeight = "bold";
      noResponsesMessage.textContent = "No responses to display";
      responseContainer.appendChild(noResponsesMessage);
    } else {
      console.log("Responses grouped by date:", dateGroups);

      // Sort dates in descending order (most recent first)
      const sortedDates = Object.keys(dateGroups).sort(
        (a, b) => new Date(b) - new Date(a)
      );
      console.log("Sorted dates:", sortedDates);

      // Predefine your gradient classes (4 options)
      const gradientClasses = ["card-1", "card-2", "card-3", "card-4"];

      // For each date, create a heading and then render cards
      sortedDates.forEach((date) => {
        // Create a heading for this date group
        const dateHeading = document.createElement("h2");
        dateHeading.className = "date-heading";
        dateHeading.textContent = date;
        responseContainer.appendChild(dateHeading);

        // For each response under this date
        dateGroups[date].forEach(({ eventTitle, response, responseId }) => {
          console.log("Rendering event:", eventTitle);

          // 1) Create the card container
          const card = document.createElement("div");
          card.classList.add("card"); // base card class

          // Pick a random gradient class
          const randomClass =
            gradientClasses[Math.floor(Math.random() * gradientClasses.length)];
          card.classList.add(randomClass);

          // 2) Title (h3)
          const titleElement = document.createElement("h3");
          titleElement.textContent = eventTitle;

          // 3) Date label inside the card (optional)
          const dateElement = document.createElement("span");
          dateElement.className = "card-date";
          dateElement.textContent = date;

          // 4) Description (truncated body in a <p>)
          const messageBodyElement = document.createElement("p");
          // Convert full response to HTML first
          const fullHtmlResponse = marked.parse(response);

          // Create a temporary div to strip any remaining HTML tags
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = fullHtmlResponse;

          // Extract plain text from the converted HTML
          const plainTextResponse = tempDiv.textContent || tempDiv.innerText;

          // Truncate the clean text
          const truncatedResponse =
            plainTextResponse.length > 100
              ? plainTextResponse.substring(0, 100) + "..."
              : plainTextResponse;

          // Convert the truncated text back to HTML (for minimal Markdown styling)
          const responseSnippet = marked.parse(truncatedResponse);
          messageBodyElement.innerHTML = responseSnippet;

          // 5) "Learn more" link
          const learnMoreLink = document.createElement("a");
          learnMoreLink.className = "learn-more";
          learnMoreLink.href = "#";
          learnMoreLink.textContent = "Learn more";

          // Show the modal on link click (instead of the entire card)
          learnMoreLink.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent the card click from also firing
            showModal(eventTitle, date, response);
          });

          // Append elements to the card
          card.appendChild(titleElement);
          card.appendChild(dateElement);
          card.appendChild(messageBodyElement);
          card.appendChild(learnMoreLink);

          // Add the card to the response container
          responseContainer.appendChild(card);

          // On card click, show the full response in a modal
          card.addEventListener("click", () => {
            showModal(eventTitle, date, response);
          });

          // Wire up "Start Chat" buttons if present
          document.querySelectorAll(".chat-btn").forEach((button) => {
            button.addEventListener("click", function () {
              window.location.href = `start_chat.html?response=${responseId}`;
            });
          });
        });
      });
    }
  });

  // Function to display the modal with title, date, and response
  function showModal(title, date, response) {
    // Set the title and date
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-date").textContent = date;

    if (typeof marked === "undefined") {
      console.error("marked is not loaded!");
      return;
    }

    console.log("Original Response:", response);

    // Convert LaTeX-style math to HTML placeholders for KaTeX rendering
    response = response.replace(/\\\((.*?)\\\)/g, '<span class="katex-inline">$1</span>'); // Inline math
    response = response.replace(/\\\[(.*?)\\\]/g, '<div class="katex-block">$1</div>');   // Block math

    // Convert Markdown to HTML using Marked
    let htmlResponse = marked.parse(response);
    console.log("Converted HTML:", htmlResponse);

    // Find and render KaTeX placeholders
    const katexElements = htmlResponse.match(
      /<span class="katex-inline">.*?<\/span>|<div class="katex-block">.*?<\/div>/g
    );
    if (katexElements) {
      katexElements.forEach((element) => {
        const mathContent = element.replace(/<\/?.*?>/g, ""); // Strip HTML tags
        const renderedElement = document.createElement(
          element.includes("inline") ? "span" : "div"
        );
        try {
          katex.render(mathContent, renderedElement, {
            throwOnError: false,
            displayMode: element.includes("block"),
          });
          htmlResponse = htmlResponse.replace(element, renderedElement.outerHTML);
        } catch (error) {
          console.error("Error rendering math with KaTeX:", error);
        }
      });
    }

    // Insert the formatted response into the modal's response element
    const modalResponseElement = document.getElementById("modal-response");
    modalResponseElement.innerHTML = htmlResponse;

    // (Optional) Apply additional styling if needed for inner content
    const innerElements = modalResponseElement.querySelectorAll(
      "p, div, ul, ol, table, blockquote, pre, hr, li"
    );
    innerElements.forEach((element) => {
      element.style.fontSize = "16px";
      element.style.lineHeight = "1.8";
      element.style.margin = "20px";
    });

    // Adjust list item margins
    const listItems = modalResponseElement.querySelectorAll("li");
    listItems.forEach((li) => {
      li.style.margin = "15px";
    });

    // Style <code> elements for better readability
    const codeElements = modalResponseElement.querySelectorAll("code");
    codeElements.forEach((code) => {
      code.style.fontSize = "16px";
      code.style.margin = "20px";
      code.style.fontFamily =
        "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace";
    });

    // Apply syntax highlighting using Prism.js (if loaded)
    const codeBlocks = modalResponseElement.querySelectorAll('[class*="language-"]');
    codeBlocks.forEach((block) => {
      Prism.highlightElement(block);
    });

    // Finally, display the modal and overlay
    document.getElementById("modal").classList.remove("hidden");

    const overlay = document.getElementById("overlay");
    overlay.classList.remove("hidden");  // Remove hidden so it's rendered
    overlay.classList.add("active");       // Activate the overlay's opacity/visibility
  }

  // Function to hide/close the modal
  function hideModal() {
    document.getElementById("modal").classList.add("hidden");

    const overlay = document.getElementById("overlay");
    overlay.classList.remove("active");
    overlay.classList.add("hidden"); // Optionally add hidden back for CSS display: none
  }

  // Handle logout
  document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("You have been logged out.");
      window.location.href = "../Login/login.html"; // Redirect to login page
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to log out. Please try again.");
    }
  });

  // Redirect to the help page when the help button is clicked
  helpButton.addEventListener("click", () => {
    window.location.href = "../help/help.html"; // Redirect to the help page
  });
}

initialize();