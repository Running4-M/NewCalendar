import { Timestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { fetchEventFromFirebase, fetchEvents, saveEvent, updateEvent, deleteEvent, fetchEventsForToday, saveResponse, getResponsesByDateAndTitle, db, getCurrentUserId, saveEventToFirebase, updateResponse } from "../backend/firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth
import { fetchChatGPTResponse } from "../AI/chatgpt.js"; // Import the AI response function
import { initializeFirebase } from "../backend/firebase.js"; // Import the initializeFirebase function
let selectedEvent = null;
export let calendar; // Declare globally to be used in just_chat.js

window.addEventListener("load", async () => {
      // Function to show the notification
      function showDragSuccess() {
        console.log("showDragSuccess called");
        let popup = document.getElementById("dragSuccessPopup");
      
        if (!popup) {
          popup = document.createElement("div");
          popup.id = "dragSuccessPopup";
          popup.innerText = "Event Successfully saved!";
      
          // Style the popup: centered horizontally, 64px from the top, and a limited width
          popup.style.position = "fixed";
          popup.style.top = "64px"; // 64px from the top
          popup.style.left = "50%"; // center horizontally
          popup.style.transform = "translateX(-50%)"; // adjust for centering
          popup.style.padding = "10px 20px";
          popup.style.backgroundColor = "rgba(0, 128, 0, 0.8)";
          popup.style.color = "#fff";
          popup.style.borderRadius = "4px";
          popup.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          popup.style.transition = "opacity 0.5s ease";
          popup.style.zIndex = "1000"; // Ensure it appears above other elements
          popup.style.opacity = "0"; // Start hidden
          popup.style.maxWidth = "300px"; // Prevent it from being too wide
          popup.style.textAlign = "center"; // Center text
      
          document.body.appendChild(popup);
        }
      
        // Show the popup
        popup.style.display = "block";
        setTimeout(() => {
          popup.style.opacity = "1";
        }, 10);
      
        // Hide the popup after 2 seconds
        setTimeout(() => {
          popup.style.opacity = "0";
          setTimeout(() => {
            popup.style.display = "none";
          }, 500);
        }, 2000);
      }
      function showAIProcessingPopup() {
        console.log("showAIProcessingPopup called");
        let popup = document.getElementById("aiProcessingPopup");
      
        if (!popup) {
          popup = document.createElement("div");
          popup.id = "aiProcessingPopup";
          popup.innerText = "AI is processing today's events. Check responses shortly.";
          
          // Style the popup similarly, centered horizontally and 64px from the top
          popup.style.position = "fixed";
          popup.style.top = "64px";
          popup.style.left = "50%";
          popup.style.transform = "translateX(-50%)";
          popup.style.padding = "10px 20px";
          popup.style.backgroundColor = "rgba(0, 128, 0, 0.8)";
          popup.style.color = "#fff";
          popup.style.borderRadius = "4px";
          popup.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          popup.style.transition = "opacity 0.5s ease";
          popup.style.zIndex = "1000";
          popup.style.opacity = "0";
          popup.style.maxWidth = "300px";
          popup.style.textAlign = "center";
          
          document.body.appendChild(popup);
        }
      
        // Show the popup
        popup.style.display = "block";
        setTimeout(() => {
          popup.style.opacity = "1";
        }, 10);
      
        // Hide the popup after 2 seconds (adjust the timing as needed)
        setTimeout(() => {
          popup.style.opacity = "0";
          setTimeout(() => {
            popup.style.display = "none";
          }, 500);
        }, 2000);
      }
      
      
  const calendarEl = document.getElementById("calendar");
  const deleteButton = document.getElementById("deleteEvent");
  const completeButton = document.getElementById("completeTask"); // Add a button for marking the task as completed

  // Wait for Firebase to be initialized first (await your initialization here)
  await initializeFirebase(); // Make sure Firebase is initialized first
  
  // Now safely use Firebase Auth
  const auth = getAuth();
  let userId = null;


  let templatesLoaded = false;

  async function loadTemplates(callback) {
    if (templatesLoaded) {
      console.log("✅ Templates already loaded.");
      if (callback) callback();
      return;
    }
  
    try {
      console.log("📥 Fetching templates...");
      const response = await fetch('./templates.html'); // Ensure the correct path
      if (!response.ok) {
        throw new Error('❌ Failed to load templates.');
      }
  
      const templatesHTML = await response.text();
      const container = document.createElement('div');
      container.id = 'templateContainer';
      container.style.display = 'none'; // Keep hidden initially
      container.innerHTML = templatesHTML;
  
      // Append container to the modal or fallback to body
      const modal = document.getElementById("modal");
      if (modal) {
        modal.appendChild(container);
        console.log("✅ templateContainer added inside modal.");
      } else {
        console.error("❌ Modal not found! Appending to body as fallback.");
        document.body.appendChild(container);
      }
  
      templatesLoaded = true;
      console.log("✅ Templates loaded successfully.");
  
      // Now that the template is injected, attach event listeners:
      attachTemplateEvents();
  
      if (callback) callback();
    } catch (error) {
      console.error("❌ Error loading templates:", error);
    }
  }
  
  
  

  

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;
    } else {
      window.location.href = "../Login/login.html";
      return;
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      selectable: true,
      editable: true,
      headerToolbar: false,
      dayMaxEvents: 2, // allow "more" link when too many events

      events: async (info, successCallback, failureCallback) => {
        try {
          if (!userId) throw new Error("User not authenticated.");
          const events = await fetchEvents();
          
          // Assign colors from Firebase's groupColor field
          events.forEach(event => {
            event.color = event.groupColor || '"#77DD77"'; // Use groupColor or default to white if not set
          });
          
          successCallback(events);
        } catch (error) {
          console.error("Error fetching events: ", error.message);
          failureCallback(error);
        }
      },
      dateClick: function (info) {
        selectedEvent = null;
        resetModal(); // Reset the modal to show only the option container

        // Update the event date input field with the clicked date
        const eventDateInput = document.querySelector("#eventDate");
        if (eventDateInput) {
          eventDateInput.value = info.dateStr; // `info.dateStr` provides the clicked date in YYYY-MM-DD format
        }

        // Show the modal overlay
        document.querySelector("#modalOverlay").style.display = "block";
      },
      eventClick: function (info) {
        const clickedEvent = info.event;
        console.log("Event clicked:", clickedEvent);  // Log the clicked event
        
        selectedEvent = {
            id: clickedEvent.id,
            title: clickedEvent.title,
            description: clickedEvent.extendedProps.description || "",
            date: clickedEvent.start,
            time: clickedEvent.extendedProps.time || "",
            aiType: clickedEvent.extendedProps.aiType || "manual",
            data: clickedEvent.extendedProps.data || {},
            completed: clickedEvent.extendedProps.completed || false,
            color: clickedEvent.extendedProps.color || "",  // Ensure color is retrieved
            notifications: clickedEvent.extendedProps.notification ?? false, // Fix notifications retrieval
            aiResponseEnabled: clickedEvent.extendedProps.aiResponseEnabled ?? true, // Fix AI response retrieval
        };
    
        console.log("Selected event:", selectedEvent);
    
        // Populate modal with event details
        populateModal(selectedEvent);
        // Hide the aiInputs element (assuming it's in the DOM)
  const aiInputsElement = document.getElementById("aiInputs");
  if (aiInputsElement) {
    aiInputsElement.style.display = "none";
    console.log("aiInputs element hidden.");
  } else {
    console.error("aiInputs element not found.");
  }
        document.querySelector("#modalOverlay").style.display = "block";
        console.log("Modal displayed");  // Log when modal is shown
      },
      
      eventDrop: async (info) => {
        const droppedEvent = info.event;
        try {
          const eventId = droppedEvent.id;
      
          // Fetch the event snapshot from Firebase
          const eventSnapshot = await fetchEventFromFirebase(eventId);
          if (!eventSnapshot.exists()) {
            throw new Error("Event not found in Firebase");
          }
          // Extract the plain object from the snapshot
          const firebaseData = eventSnapshot.data();
      
          // Log the fetched Firebase data for debugging
          console.log("Fetched Firebase Data:", firebaseData);
      
          // Now correctly use the fields from the plain object
          const groupColor = firebaseData.groupColor || "#77DD77"; // Use groupColor or default color
          console.log("Using groupColor:", groupColor);
          const groupId = firebaseData.group_id || firebaseData.group_Id || null;
      
          const eventDate = droppedEvent.start 
              ? droppedEvent.start.toISOString().slice(0, 10) 
              : firebaseData.date || "";
          const description = droppedEvent.extendedProps.description || firebaseData.description || "";
          const aiType = droppedEvent.extendedProps.aiType || firebaseData.aiType || "manual";
          const completed = droppedEvent.extendedProps.completed !== undefined 
              ? droppedEvent.extendedProps.completed 
              : firebaseData.completed || false;
          const time = droppedEvent.extendedProps.time || firebaseData.time || "";
          const notifications = droppedEvent.extendedProps.notifications || firebaseData.notifications || false;
          const aiResponseEnabled = droppedEvent.extendedProps.aiResponseEnabled !== undefined 
              ? droppedEvent.extendedProps.aiResponseEnabled 
              : firebaseData.aiResponseEnabled || true; // Ensure AI response state is preserved
      
          // Construct the updated event object
          const updatedEvent = {
            title: droppedEvent.title,
            date: eventDate,
            description: description,
            aiType: aiType,
            completed: completed,
            groupColor: groupColor,
            groupId: groupId,
            time: time,
            notifications: notifications,
            aiResponseEnabled: aiResponseEnabled // Include AI response preference
          };
      
          // Include 'data' field if it exists
          if (droppedEvent.extendedProps.data) {
            updatedEvent.data = droppedEvent.extendedProps.data;
          }
          
          // Include 'fileResponse' if it exists on the dropped event or in Firebase
          if (droppedEvent.extendedProps.fileResponse !== undefined) {
            updatedEvent.fileResponse = droppedEvent.extendedProps.fileResponse;
          } else if (firebaseData.fileResponse !== undefined) {
            updatedEvent.fileResponse = firebaseData.fileResponse;
          }
      
          // Include 'urlResponse' if it exists on the dropped event or in Firebase
          if (droppedEvent.extendedProps.urlResponse !== undefined) {
            updatedEvent.urlResponse = droppedEvent.extendedProps.urlResponse;
          } else if (firebaseData.urlResponse !== undefined) {
            updatedEvent.urlResponse = firebaseData.urlResponse;
          }
            
          // Log the updated event data for debugging
          console.log("Updated Event Data:", updatedEvent);
            
          // Update the event in Firebase
          await updateEvent(eventId, updatedEvent);
            
          // Show success notification
          console.log("Event update success, showing notification");
          showDragSuccess(); // Show the success popup
        } catch (error) {
          console.error("Error updating event on drag-and-drop:", error.message);
          showNotification("Failed to update the event. Please try again.", true);
          info.revert();
        }
      },
      
      
      
      
      
    });

  
    calendar.render();

    // Function to update the header title to show the current month and year
function updateCalendarTitle() {
  const currentDate = calendar.getDate(); // Returns a Date object representing the current calendar view's date
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  document.getElementById("calendar-title").textContent = month + " " + year;
}

// Initial title update after calendar render
updateCalendarTitle();

// Add event listeners for custom header buttons
document.getElementById("prev-btn").addEventListener("click", function() {
  calendar.prev(); // Navigate to previous period
  updateCalendarTitle();
});

document.getElementById("next-btn").addEventListener("click", function() {
  calendar.next(); // Navigate to next period
  updateCalendarTitle();
});

document.getElementById("today-btn").addEventListener("click", function() {
  calendar.today(); // Jump to today's date
  updateCalendarTitle();
});

// Listen for changes in the view select dropdown
document.getElementById("view-select").addEventListener("change", function(event) {
  calendar.changeView(event.target.value); // Change the view (e.g., dayGridMonth or listWeek)
  updateCalendarTitle();
});
  
    // Calling showTemplate() with AI Type
console.log("Calling showTemplate() with AI Type:", aiType);


let timePicker = document.getElementById('taskTime');
  
    // Reset modal for new event
    function resetModal() {
      // Hide all modal sections
      document.querySelector("#loadingOverlay").style.display = "none";
      document.querySelector("#aiInputs").style.display = "none";
      document.querySelector("#overall-wrapper").style.display = "none";
      document.querySelectorAll(".template").forEach((template) => {
        template.style.display = "none"; // Hide all templates
      });
    
      // Reset input fields
      document.querySelector("#eventTitle").value = "";
      document.querySelector("#eventDescription").value = "";
      document.querySelector("#eventDate").value = "";
      // Reset Flatpickr time input correctly
    if (timePicker && timePicker._flatpickr) {
      timePicker._flatpickr.clear();  // This properly clears Flatpickr value
  }
      
      // Fixing issue with checkbox selection
    const receiveNotifications = document.getElementById("receiveNotifications");
    if (receiveNotifications) {
        receiveNotifications.checked = false; // Uncheck notifications checkbox safely
    }

    const receiveAIResponse = document.getElementById("receiveAIResponse");
    if (receiveAIResponse) {
        receiveAIResponse.checked = false; // Uncheck AI response checkbox safely
    }
      // Show option container
      const optionContainer = document.querySelector("#optionContainer");
      if (optionContainer) {
        optionContainer.style.display = "flex"; // Ensure it displays correctly
      }
    
      // Hide buttons for completed and delete actions
      completeButton.style.display = "none";

      // Reset the modal and hide AI Inputs initially
      modal.classList.remove('large'); // Remove 'large' class to reset modal size
      modal.classList.remove('extra-large'); // Remove 'large' class to reset modal size
      modal.classList.remove('aiInputs'); // Remove 'large' class to reset modal size
      
      
      // Set up event listeners for Manual and AI options
      document.querySelector("#simpleTask").addEventListener('click', () => {
        transitionToSimpleTaskInputs();
      });

      document.querySelector("#aiOption").addEventListener('click', () => {
        // Call transitionToInputs to show AI Inputs with transition
        transitionToInputs();
      });
    }
    
  
    async function populateModal(event) {
      await loadTemplates();
      console.log("Populating modal with event data:", event);
    
      const modal = document.getElementById("modal");
      if (!modal) {
        console.error("Modal container not found.");
        return;
      }
      modal.classList.add("extra-large");
      document.getElementById("optionContainer").style.display = "none";
      document.getElementById("overall-wrapper").style.display = "none";
    
      // --- Ensure our custom styles are added (for the title underline) ---
      if (!document.getElementById("customStyles")) {
        const style = document.createElement("style");
        style.id = "customStyles";
        style.innerHTML = `
          /* Style ONLY the dynamically created event title */
          #eventTitle.dynamic-event-title {
            font-size: 45px;
            padding: 0px;
            color: #333;
            text-align: center;
            margin-bottom: 0px;
            position: relative;
            font-weight: 600;
            border: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          
          /* Underline effect for ONLY this event title */
          #eventTitle.dynamic-event-title::after {
            content: "";
            display: block;
            width: 50%;
            height: 3px;
            background: linear-gradient(90deg, #55e868, #498c5d);
            border-radius: 2px;
            margin-top: 2px;
            margin-bottom: 15px;
            transition: width 0.3s ease;
          }
          
          /* Expanding underline when focused */
          #eventTitle.dynamic-event-title.focused::after {
            width: 80%;
          }
        `;
        document.head.appendChild(style);
      }
    
      // --- Title Wrapper (Dynamic Event Title) ---
      let titleWrapper = document.querySelector("#eventTitle.dynamic-event-title");
      if (titleWrapper) {
        // Update the existing title input value
        const titleInput = titleWrapper.querySelector("input");
        if (titleInput) {
          titleInput.value = event.title || "";
        }
      } else {
        // Create new title wrapper if it doesn't exist
        titleWrapper = document.createElement("div");
        titleWrapper.id = "eventTitle";
        titleWrapper.classList.add("dynamic-event-title");
    
        const titleInput = document.createElement("input");
        titleInput.id = "eventTitle";
        titleInput.type = "text";
        titleInput.value = event.title || "";
        titleInput.style.fontSize = "2rem";
        titleInput.style.textAlign = "center";
        titleInput.style.width = "100%";
        titleInput.style.border = "none";
        titleInput.style.background = "transparent";
        titleInput.style.outline = "none";
        titleInput.style.fontWeight = "bold";
        titleInput.addEventListener("focus", () => {
          titleWrapper.classList.add("focused");
        });
        titleInput.addEventListener("blur", () => {
          titleWrapper.classList.remove("focused");
        });
        titleWrapper.appendChild(titleInput);
        modal.prepend(titleWrapper);
      }
    
      // --- Dynamic Checkbox & Time Input ---
      let dynamicCheckboxContainer = document.getElementById("dynamicCheckboxContainer");
      if (dynamicCheckboxContainer) {
        const notificationsCheckbox = dynamicCheckboxContainer.querySelector("#receiveNotifications");
        if (notificationsCheckbox) {
          notificationsCheckbox.checked = event.notifications === true;
        }
        const timeInput = dynamicCheckboxContainer.querySelector("#taskTime");
        if (timeInput) {
          timeInput.value = event.time || "";
        }
        const aiResponseCheckbox = dynamicCheckboxContainer.querySelector("#receiveAIResponse");
        if (aiResponseCheckbox) {
          aiResponseCheckbox.checked = event.aiResponseEnabled === true;
        }
      } else {
        dynamicCheckboxContainer = document.createElement("div");
        dynamicCheckboxContainer.id = "dynamicCheckboxContainer";
        dynamicCheckboxContainer.style.display = "flex";
        dynamicCheckboxContainer.style.justifyContent = "space-evenly";
        dynamicCheckboxContainer.style.marginBottom = "20px";
        // Insert checkboxes immediately after the dynamic event title
        titleWrapper.insertAdjacentElement("afterend", dynamicCheckboxContainer);
    
        // Notifications checkbox wrapper
        const notificationWrapper = document.createElement("div");
        notificationWrapper.style.display = "flex";
        notificationWrapper.style.flexDirection = "column";
        notificationWrapper.style.alignItems = "center";
        notificationWrapper.style.flex = "1";
    
        const notificationsLabel = document.createElement("label");
        notificationsLabel.className = "circle-checkbox";
        notificationsLabel.style.width = "100%";
        notificationsLabel.style.textAlign = "center";
        notificationsLabel.innerHTML = `
          <input type="checkbox" id="receiveNotifications" ${event.notifications === true ? "checked" : ""}>
          <div class="icon-circle"><i class="fas fa-bell"></i></div>
          <span class="label-text">Notifications</span>
        `;
        notificationWrapper.appendChild(notificationsLabel);
    
        // Time input container (hidden by default)
        const timeInputContainer = document.createElement("div");
        timeInputContainer.id = "timeInputContainer";
        timeInputContainer.style.display = "none";
        timeInputContainer.style.marginTop = "10px";
        const timeInput = document.createElement("input");
        timeInput.type = "text";
        timeInput.id = "taskTime";
        timeInput.value = event.time || "";
        timeInput.placeholder = "Select Time";
        timeInput.style.width = "100%";
        timeInput.style.padding = "5px";
        timeInput.style.border = "1px solid #ccc";
        timeInput.style.borderRadius = "10px";
        timeInput.style.textAlign = "center";
        timeInputContainer.appendChild(timeInput);
        notificationWrapper.appendChild(timeInputContainer);
    
        // Toggle time input display based on checkbox change
        const notificationsCheckbox = notificationsLabel.querySelector("input[type='checkbox']");
        notificationsCheckbox.addEventListener("change", () => {
          timeInputContainer.style.display = notificationsCheckbox.checked ? "block" : "none";
        });
        dynamicCheckboxContainer.appendChild(notificationWrapper);
    
        // AI Response checkbox wrapper
        const aiResponseWrapper = document.createElement("div");
        aiResponseWrapper.style.display = "flex";
        aiResponseWrapper.style.flexDirection = "column";
        aiResponseWrapper.style.alignItems = "center";
        aiResponseWrapper.style.flex = "1";
    
        const aiResponseLabel = document.createElement("label");
        aiResponseLabel.className = "circle-checkbox";
        aiResponseLabel.style.width = "100%";
        aiResponseLabel.style.textAlign = "center";
        aiResponseLabel.innerHTML = `
          <input type="checkbox" id="receiveAIResponse" ${event.aiResponseEnabled === true ? "checked" : ""}>
          <div class="icon-circle"><i class="fas fa-robot"></i></div>
          <span class="label-text">AI Response</span>
        `;
        aiResponseWrapper.appendChild(aiResponseLabel);
        dynamicCheckboxContainer.appendChild(aiResponseWrapper);
      }
    
      // --- Template Section ---
      const templateContainer = document.getElementById("templateContainer");
      if (!templateContainer) {
        console.error("Template container not found.");
        return;
      }
      templateContainer.style.width = "100%";
      templateContainer.style.display = "flex";
      templateContainer.style.justifyContent = "center";
      if (!templateContainer.parentElement || templateContainer.parentElement !== modal) {
        modal.appendChild(templateContainer);
      }
      const allTemplates = templateContainer.querySelectorAll(".template");
      allTemplates.forEach(template => {
        template.style.display = "none";
      });
    
      // --- Determine AI Type & Setup ---
      const aiTypeRaw = event.aiType || "manual";
      const aiType = (typeof aiTypeRaw === "string") ? aiTypeRaw : aiTypeRaw.value;
      let aiTypeInput = document.querySelector("#aiType");
      if (aiTypeInput) {
        aiTypeInput.value = aiType;
      } else {
        aiTypeInput = document.createElement("input");
        aiTypeInput.type = "hidden";
        aiTypeInput.id = "aiType";
        aiTypeInput.value = aiType;
        modal.appendChild(aiTypeInput);
      }
    
      if (aiType === "manual") {
        if (!document.getElementById("customStylesDescription")) {
          const style = document.createElement("style");
          style.id = "customStylesDescription";
          style.innerHTML = `
            /* Style for the dynamically created event description */
            #eventDescription.dynamic-event-description {
              width: 100%;
              padding: 20px;
              border: 2px solid #90caf9;
              border-radius: 20px;
              background-color: #e3f2fd;
              font-size: 15px;
              color: #333;
              transition: box-shadow 0.3s ease, transform 0.3s ease, background-color 0.3s ease;
              box-sizing: border-box;
              resize: vertical;
              font-family: "Open Sans", sans-serif;
              outline: none;
            }
      
            /* Hover and focus effects */
            #eventDescription.dynamic-event-description:focus {
              border-color: #42a5f5;
              box-shadow: 0 0 10px rgba(66, 165, 245, 0.5);
            }
          `;
          document.head.appendChild(style);
        }
      
        let descriptionField = document.querySelector("#eventDescription.dynamic-event-description");
        if (!descriptionField) {
          descriptionField = document.createElement("textarea");
          descriptionField.id = "eventDescription";
          descriptionField.classList.add("dynamic-event-description");
          descriptionField.placeholder = "Enter event description...";
          descriptionField.value = event.description || "";
        }
      
        let dynamicCheckboxContainer = document.getElementById("dynamicCheckboxContainer");
        if (dynamicCheckboxContainer) {
          dynamicCheckboxContainer.parentNode.insertBefore(descriptionField, dynamicCheckboxContainer.nextSibling);
        } else {
          modal.appendChild(descriptionField);
        }
        descriptionField.style.display = "block";
      
      } else {
        let descriptionField = document.getElementById("eventDescription");
        if (descriptionField) {
          descriptionField.style.display = "none";
        }
        const selectedTemplate = document.querySelector(`#template-${aiType}`);
        if (selectedTemplate) {
          selectedTemplate.style.display = "block";
          selectedTemplate.style.visibility = "visible";
          selectedTemplate.style.opacity = "1";
          console.log(`✅ Displayed template: template-${aiType}`);
          insertButtonsAfter(selectedTemplate);
        } else {
          console.warn(`❌ No template found for AI type: ${aiType}`);
        }
      }
      
      // --- Overlay Wrapper ---
      const overlayWrapper = document.getElementById("overlay-wrapper");
      if (overlayWrapper) {
        if (!overlayWrapper.parentElement || overlayWrapper.parentElement !== modal) {
          modal.appendChild(overlayWrapper);
        }
        overlayWrapper.style.display = "none";
      }
      
      const uploadContainers = document.querySelectorAll('.upload-container[data-template-id]');
      uploadContainers.forEach(container => {
        container.style.display = "none";
      });
      
      populateTemplateData(aiType, event.data);
      
      // --- Save Button ---
      let saveButton = document.getElementById("saveEventButton");
      if (!saveButton) {
        saveButton = document.createElement("button");
        saveButton.id = "saveEventButton";
        saveButton.innerText = "Save";
        saveButton.style.padding = "10px 20px";
        saveButton.style.marginTop = "10px";
        saveButton.style.fontSize = "16px";
        saveButton.style.border = "none";
        saveButton.style.backgroundColor = "#55e868";
        saveButton.style.color = "#fff";
        saveButton.style.cursor = "pointer";
        saveButton.style.justifyContent = "center";
        saveButton.style.alignItems = "center";
        saveButton.style.width = "100%";
        saveButton.style.borderRadius = "15px";
      
        saveButton.addEventListener("click", async () => {
          // Retrieve event details
          const titleWrapper = document.querySelector("#eventTitle.dynamic-event-title");
          const titleInput = titleWrapper ? titleWrapper.querySelector("input") : null;
          const title = titleInput ? titleInput.value : "";
        
          const descriptionField = document.querySelector("#eventDescription.dynamic-event-description");
          const description = descriptionField ? descriptionField.value : "";
        
          const notificationsCheckbox = document.querySelector("#receiveNotifications");
          const notification = notificationsCheckbox ? notificationsCheckbox.checked : false;
        
          const aiResponseCheckbox = document.querySelector("#receiveAIResponse");
          const aiResponseEnabled = aiResponseCheckbox ? aiResponseCheckbox.checked : true;
        
          const timeInput = document.querySelector("#taskTime");
          const time = timeInput ? timeInput.value : "";
        
          const aiTypeRaw = event.aiType || "manual";
          const aiType = typeof aiTypeRaw === "string" ? aiTypeRaw : aiTypeRaw.value;
        
          if (!title || !aiType) {
            alert("Please fill in all required fields before saving the event.");
            return;
          }
        
          const data = collectTemplateData(aiType);
          const eventData = { title, aiType, data, time, notification, aiResponseEnabled, description, userId };
        
          try {
            let eventId;
        
            // **Step 1: Save or Update the Event**
            if (selectedEvent && selectedEvent.id) {
              eventId = selectedEvent.id;
              await updateEvent(eventId, eventData);
              
            } else {
              eventId = await saveEvent(eventData);
              console.log("New event saved with id:", eventId);
            }
        
            // **Step 2: Refresh Calendar with Updated Events**
            console.log("Fetching all events from Firebase...");
            const events = await fetchEvents(userId);
        
            if (!events || events.length === 0) {
              console.warn("No events found in Firebase.");
            }
        
            // Ensure color grouping if applicable
            events.forEach(event => {
              if (event.groupColor) {
                event.color = event.groupColor;
              }
            });
        
            console.log("Updating calendar with new events...");
            calendar.removeAllEvents();
            calendar.addEventSource(events);
        
            // **Step 3: Hide Modal and Show Success Feedback**
            document.querySelector("#modalOverlay").style.display = "none";
            showDragSuccess();
        
            // **Step 4: Cleanup dynamic elements**
            cleanupDynamicElements();
          } catch (error) {
            console.error("Error saving event:", error.message);
            alert("Failed to save event. Please try again.");
          }
        });
        
        
        
        
      
        if (templateContainer) {
          templateContainer.insertAdjacentElement("afterend", saveButton);
        } else {
          modal.appendChild(saveButton);
        }
      } else {
        saveButton.style.display = "flex";
      }
      
      // --- Delete Button ---
      let deleteButton = document.getElementById("deleteEventButton");
      if (!deleteButton) {
        deleteButton = document.createElement("button");
        deleteButton.id = "deleteEventButton";
        deleteButton.innerText = "Delete";
        deleteButton.style.padding = "10px 20px";
        deleteButton.style.marginTop = "10px";
        deleteButton.style.fontSize = "16px";
        deleteButton.style.border = "none";
        deleteButton.style.backgroundColor = "#e74c3c";
        deleteButton.style.color = "#fff";
        deleteButton.style.cursor = "pointer";
        deleteButton.style.borderRadius = "15px";
        deleteButton.style.width = "100%";
        deleteButton.style.justifyContent = "center";
      
        deleteButton.addEventListener("click", async () => {
          if (!selectedEvent || !selectedEvent.id) {
            alert("No event selected to delete.");
            return;
          }
      
         
      
          try {
            await deleteEvent(selectedEvent.id);
            const toast = document.createElement("div");
            toast.innerText = "Event deleted";
            toast.style.position = "fixed";
            toast.style.top = "70px";
            toast.style.right = "20px";
            toast.style.backgroundColor = "#e74c3c";
            toast.style.color = "#fff";
            toast.style.padding = "10px 20px";
            toast.style.borderRadius = "5px";
            toast.style.zIndex = "10000";
            document.body.appendChild(toast);
            setTimeout(() => {
              toast.remove();
            }, 2000);
      
            calendar.getEventById(selectedEvent.id)?.remove();
            console.log("Event deleted with id:", selectedEvent.id);
      
            document.querySelector("#modalOverlay").style.display = "none";
            const overlayWrapper = document.getElementById("overlay-wrapper");
            if (overlayWrapper) {
              overlayWrapper.style.display = "none";
            }
            cleanupDynamicElements(); // Cleanup after deletion
          } catch (error) {
            console.error("Error deleting event:", error.message);
            alert("Failed to delete event. Please try again.");
          }
        });
      
        if (templateContainer) {
          templateContainer.insertAdjacentElement("afterend", deleteButton);
        } else {
          modal.appendChild(deleteButton);
        }
      } else {
        deleteButton.style.display = "flex";
      }
      
      // --- Helper Function for Button Placement ---
      function insertButtonsAfter(templateElement) {
        const deleteButton = document.querySelector("#deleteEvent");
        const completeButton = document.querySelector("#completeTask");
        const completionPopup = document.querySelector("#completionPopup");
        const closeButton = document.querySelector("#closeModal");
      
        if (!deleteButton || !completeButton || !completionPopup || !closeButton) {
          console.warn("One or more buttons are missing in the DOM.");
          return;
        }
      
        deleteButton.style.display = event.id ? "inline-block" : "none";
        completeButton.style.display = event.completed ? "none" : "inline-block";
        completionPopup.style.display = "none";
      
        templateElement.insertAdjacentElement("afterend", closeButton);
        templateElement.insertAdjacentElement("afterend", completionPopup);
        templateElement.insertAdjacentElement("afterend", completeButton);
        templateElement.insertAdjacentElement("afterend", deleteButton);
      }
      
      // --- Cleanup Function ---
      function cleanupDynamicElements() {
        const selectorsToRemove = [
          "#eventTitle.dynamic-event-title",
          "#dynamicCheckboxContainer",
          "#eventDescription.dynamic-event-description",
          "#saveEventButton",
          "#deleteEventButton",
          "#aiType"
        ];
        selectorsToRemove.forEach(selector => {
          const element = document.querySelector(selector);
          if (element) {
            element.remove();
          }
        });
        const templateContainer = document.getElementById("templateContainer");
        if (templateContainer) {
          templateContainer.style.display = "none";
        }
      }
      
      // --- Attach Cleanup to Clicks Outside the Modal ---
      function outsideClickHandler(e) {
        if (!modal.contains(e.target)) {
          cleanupDynamicElements();
          document.removeEventListener("click", outsideClickHandler);
        }
      }
      setTimeout(() => {
        document.addEventListener("click", outsideClickHandler);
      }, 100);
      
      // --- Also trigger cleanup when Save or Delete is clicked ---
      // (These listeners ensure that clicking Save or Delete will remove dynamic elements even if modal closing logic fails.)
      saveButton.addEventListener("click", () => {
        cleanupDynamicElements();
      }, { once: true });
      
      deleteButton.addEventListener("click", () => {
        cleanupDynamicElements();
      }, { once: true });
    }
    
    
    
    
    
    
    

    
    


  
  
    // collectTemplateData function
    function collectTemplateData(aiType) {
      const data = {};
      console.log("Collecting data for AI Type:", aiType);
      const activeTemplate = document.querySelector(`#template-${aiType}`);
    
      if (!activeTemplate) {
        console.warn(`No active template found for AI type: ${aiType}`);
        return data;
      }
    
      console.log(`Active Template ID: template-${aiType}`, activeTemplate);
      
      activeTemplate.querySelectorAll("input, textarea, select").forEach((input) => {
        if (input.name === "urlInput") {  // Specifically handle urlInput
          if (input.value.trim()) {
            data[input.name] = input.value.trim(); // Ensure the URL is valid
          }
        } else if (input.type === "checkbox") {
          if (!data[input.name]) data[input.name] = [];
          if (input.checked) data[input.name].push(input.value);
        } else if (input.type === "radio") {
          if (input.checked) {
            data[input.name] = input.value.trim();
          }
        } else if (input.name && input.value.trim() !== "") {
          data[input.name] = input.value.trim();
        }
      });
    
      console.log(`Collected data for AI type ${aiType}:`, data); // Debugging log
      return data;
    }
    
    
    
    function populateTemplateData(aiType, data) {
      const activeTemplate = document.querySelector(`#template-${aiType}`);
      if (!activeTemplate) return;
    
      // Process each input, textarea, and select element
      activeTemplate.querySelectorAll("input, textarea, select").forEach((input) => {
        if (input.type === "checkbox") {
          input.checked = data[input.name]?.includes(input.value) || false;
        } else if (input.type === "file") {
          const filePathElement = activeTemplate.querySelector(`#file-path-${input.name}`);
          if (filePathElement) {
            filePathElement.textContent = data[input.name] || "No file selected";
          }
          const existingFileElement = activeTemplate.querySelector(`#file-display-${input.name}`);
          if (existingFileElement) {
            existingFileElement.remove();
          }
        } else if (input.name) {
          input.value = data[input.name] || "";
        }
      });
    
      // Check if a file-info div already exists; if so, clear it; if not, create one
      let fileInfoDiv = activeTemplate.querySelector(".file-info");
      if (!fileInfoDiv) {
        fileInfoDiv = document.createElement("div");
        fileInfoDiv.className = "file-info";
        activeTemplate.appendChild(fileInfoDiv);
      } else {
        fileInfoDiv.innerHTML = "";
      }
    
      // Apply inline styles similar to .custom-textarea for a pleasing appearance
      fileInfoDiv.style.width = "100%";
      fileInfoDiv.style.padding = "20px";
      fileInfoDiv.style.border = "2px solid #90caf9";
      fileInfoDiv.style.borderRadius = "20px";
      fileInfoDiv.style.backgroundColor = "#e3f2fd";
      fileInfoDiv.style.fontSize = "17px"; // Increased font size
      fileInfoDiv.style.color = "#333";
      fileInfoDiv.style.boxSizing = "border-box";
      fileInfoDiv.style.transition = "box-shadow 0.3s ease, transform 0.3s ease, background-color 0.3s ease";
      fileInfoDiv.style.fontFamily = '"Open Sans", sans-serif';
    
// Process file attachment info using data.listAttachments
const attachmentDiv = document.createElement("div");
attachmentDiv.className = "attachment-info";
attachmentDiv.style.marginBottom = "1em"; // Increased spacing below
attachmentDiv.style.fontSize = "inherit"; // Inherit the increased font size from fileInfoDiv
attachmentDiv.style.color = "#000"; // Force black color

if (data.listAttachments && data.listAttachments !== "C:\\fakepath\\") {
  const fileName = data.listAttachments.split("\\").pop();
  
  // Create label span (bold)
  const labelSpan = document.createElement("span");
  labelSpan.style.fontWeight = "bold";
  labelSpan.textContent = "Attachment: ";
  
  // Create file name span (normal)
  const fileNameSpan = document.createElement("span");
  fileNameSpan.style.fontWeight = "normal";
  fileNameSpan.textContent = fileName;
  
  attachmentDiv.appendChild(labelSpan);
  attachmentDiv.appendChild(fileNameSpan);
} else {
  // If no file, simply show the message in bold
  const noFileSpan = document.createElement("span");
  noFileSpan.style.fontWeight = "bold";
  noFileSpan.textContent = "No file selected";
  attachmentDiv.appendChild(noFileSpan);
}
fileInfoDiv.appendChild(attachmentDiv);

// Process URL/link info using data.listLinks
if (data.listLinks) {
  const linkDiv = document.createElement("div");
  linkDiv.className = "link-info";
  linkDiv.style.marginTop = "1em"; // Increased spacing above
  linkDiv.style.fontSize = "inherit"; // Inherit font size
  linkDiv.style.color = "#000"; // Black color for container text
  
  // Create label span (bold)
  const linkLabelSpan = document.createElement("span");
  linkLabelSpan.style.fontWeight = "bold";
  linkLabelSpan.textContent = "Link: ";
  
  // Create anchor element (normal weight, black color)
  const anchor = document.createElement("a");
  anchor.href = data.listLinks;
  anchor.target = "_blank";
  anchor.textContent = data.listLinks;
  anchor.style.color = "#000"; // Override blue color, set to black
  anchor.style.textDecoration = "none";
  anchor.style.fontWeight = "normal";
  
  linkDiv.appendChild(linkLabelSpan);
  linkDiv.appendChild(anchor);
  fileInfoDiv.appendChild(linkDiv);
}

    }
    
    
    



// Global object to store selected files keyed by the parent template id (e.g. "revisionHelp")
let selectedFiles = {};

// --- File Input Change Listener ---
document.addEventListener("change", async (event) => {
  if (event.target.matches("input[name='listAttachments']")) {
    const fileInput = event.target;
    const file = fileInput.files[0];

    // Instead of using the upload container’s data attribute,
    // get the parent template's id (e.g., "template-revisionHelp") and derive the key.
    const parentTemplate = fileInput.closest(".template");
    if (!parentTemplate) {
      console.error("Parent template not found for file input.");
      return;
    }
    const activeTemplateId = parentTemplate.id.replace("template-", "");
    // Store file using the parent template id as key
    selectedFiles[activeTemplateId] = file;
    console.log("File selected for template", activeTemplateId, ":", file);

    // Update file name display within the upload container
    const container = fileInput.closest(".upload-container");
    const displayElement = container.querySelector(".file-name-display");
    if (displayElement && file) {
      displayElement.textContent = file.name;
    }

    // If in edit mode (existing event), trigger extraction immediately.
    if (selectedEvent && selectedEvent.id && file) {
      console.log("Triggering immediate file extraction for event", selectedEvent.id);
      const fileResponse = await extractTextFromFile(selectedEvent.id, file);
      console.log("Immediate file extraction response:", fileResponse);
    }
  }
});

// --- URL Button Click Listener ---
document.addEventListener("click", (event) => {
  if (event.target.matches(".upload-button.url-button")) {
    const container = event.target.closest(".upload-container");
    const urlInput = container.querySelector("input[name='listLinks']");
    // Reveal and focus on the URL input
    urlInput.hidden = false;
    urlInput.focus();
    console.log("URL input revealed for container:", container);
  }
});

// --- URL Input Change Listener ---
document.addEventListener("change", async (event) => {
  if (event.target.matches("input[name='listLinks']")) {
    const urlInput = event.target;
    const container = urlInput.closest(".upload-container");
    const displayElement = container.querySelector(".url-display");
    if (displayElement) {
      displayElement.textContent = urlInput.value;
    }

    const urlValue = urlInput.value.trim();
    // If in edit mode and a URL is provided, trigger extraction immediately.
    if (selectedEvent && selectedEvent.id && urlValue) {
      console.log("Triggering immediate URL extraction for event", selectedEvent.id, "with URL:", urlValue);
      const urlResponse = await extractTextFromURL(selectedEvent.id, urlValue);
      console.log("Immediate URL extraction response:", urlResponse);
    }
  }
});


document.querySelector("#saveEvent").addEventListener("click", async () => {
  const title = document.querySelector("#eventTitle").value;
  const date = document.querySelector("#eventDate").value;
  const description = document.querySelector("#eventDescription").value;
  const notification = document.querySelector("#receiveNotifications").checked;
  
  const aiResponseElement = document.querySelector("#receiveAIResponse");
  let aiResponseEnabled = aiResponseElement ? aiResponseElement.checked : undefined;
  if (!aiResponseEnabled) {
    aiResponseEnabled = true;
  }
  
  const time = document.querySelector("#taskTime").value;
  const suggestedTaskTypeElement = document.querySelector("#suggestedTaskType");
  const aiTypeDropdown = document.querySelector("#aiType");

  // Determine active template (assumed to be the aiType)
  const aiType = (suggestedTaskTypeElement && suggestedTaskTypeElement.textContent.trim())
    ? suggestedTaskTypeElement.textContent.trim()
    : aiTypeDropdown.value;

  console.log("Task Type being saved (template id):", aiType);

  if (!title || !date || !aiType) {
    alert("Please fill in all required fields before saving the event.");
    return;
  }

  // Collect additional template data
  const data = collectTemplateData(aiType);
  const eventData = { title, date, aiType, description, data, time, notification, aiResponseEnabled, userId };
  // Instead of searching by data-template-id, find the upload container within the displayed template.
  const containerSelector = `#template-${aiType} .upload-container`;
  const container = document.querySelector(containerSelector);
  let urlValue = "";
  if (container) {
    console.log("Found upload container for template", aiType, container);
    // Get URL from the container’s URL input
    const urlInputElement = container.querySelector("input[name='listLinks']");
    urlValue = urlInputElement ? urlInputElement.value.trim() : "";
  } else {
    console.warn("Upload container not found for template", aiType, "- skipping URL extraction.");
  }

  // Get file (if any) from our global storage using the active template key
  const file = selectedFiles[aiType] || null;

  let eventId;
  try {
    // Save or update the event (without extraction responses)
    if (selectedEvent && selectedEvent.id) {
      await updateEvent(selectedEvent.id, eventData);
      eventId = selectedEvent.id;
      alert("Event updated successfully!");
      console.log("Event updated with id:", eventId);
    } else {
      eventId = await saveEvent(eventData);
      console.log("New event saved with id:", eventId);
    }
  } catch (error) {
    console.error("Error saving event:", error.message);
    alert("Failed to save event. Please try again.");
    return;
  }

  // For new events (when selectedEvent is not defined), process extraction after saving.
  if (!selectedEvent) {
    if (file) {
      console.log("Triggering file extraction for new event", eventId, "with file:", file);
      const fileResponse = await extractTextFromFile(eventId, file);
      console.log("File extraction response for new event:", fileResponse);
    } else {
      console.log("No file selected for extraction.");
    }

    if (urlValue) {
      console.log("Triggering URL extraction for new event", eventId, "with URL:", urlValue);
      const urlResponse = await extractTextFromURL(eventId, urlValue);
      console.log("URL extraction response for new event:", urlResponse);
    } else {
      console.log("No URL provided for extraction.");
    }
  } else {
    console.log("Extraction already triggered on change for existing event.");
  }

  // Update events in the calendar
  const events = await fetchEvents(userId);
  events.forEach(event => {
    if (event.groupColor) {
      event.color = event.groupColor;
    }
  });
  calendar.removeAllEvents();
  calendar.addEventSource(events);

  // Hide modal and show success feedback
  document.querySelector("#modalOverlay").style.display = "none";
  showDragSuccess();
});


// --- Extraction Functions (with added logs) ---
async function extractTextFromFile(eventId, file) {
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
    console.log("Starting text extraction from file:", file.name, "using endpoint:", endpoint);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "apy-token": "APY0kRziwHo31PQas6rRbJoz22HTeO3DIDYn3SD4Sg5Jtmjur04Jih3GTl8qd9KLfxvVRFikupWS" },
      body: form,
    });

    if (!response.ok) {
      console.error("HTTP error during file extraction! Status:", response.status);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("File extraction result:", result.data);

    // Update Firebase with the fileResponse
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    const updatedData = { fileResponse: result.data || null, userId: getCurrentUserId() };
    console.log("Updating Firebase for event", eventId, "with data:", updatedData);
    await updateEvent(eventId, updatedData);

    return result.data || null;
  } catch (error) {
    console.error("Error extracting text from file:", error);
    return null;
  }
}

async function extractTextFromURL(eventId, url) {
  try {
    console.log("Starting URL extraction for URL:", url);
    const response = await fetch(`https://api.apyhub.com/extract/text/webpage?url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: { "apy-token": "APY0kRziwHo31PQas6rRbJoz22HTeO3DIDYn3SD4Sg5Jtmjur04Jih3GTl8qd9KLfxvVRFikupWS" },
    });

    if (!response.ok) {
      console.error("HTTP error during URL extraction! Status:", response.status);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("URL extraction result:", result.data);

    // Update Firebase with the urlResponse
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("Updating Firebase for event", eventId, "with urlResponse:", result.data);
    await updateEvent(eventId, { urlResponse: result.data || null });

    return result.data || null;
  } catch (error) {
    console.error("Error extracting text from URL:", error);
    return null;
  }
}






    
    // Task Completed button functionality (now deletes event and shows popup)
    completeButton.addEventListener("click", async () => {
      if (!selectedEvent || !selectedEvent.id) return;
    
      try {
        // Delete the event (similar to delete button)
        await deleteEvent(selectedEvent.id);
        calendar.getEventById(selectedEvent.id).remove();
        document.querySelector("#eventModal").style.display = "none";
    
        // Show green "Well done!" popup
        const popup = document.createElement("div");
        popup.textContent = "Well done with task completed!";
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.backgroundColor = "green";
        popup.style.color = "white";
        popup.style.padding = "20px";
        popup.style.fontSize = "20px";
        popup.style.borderRadius = "5px";
        popup.style.zIndex = "9999";
        document.body.appendChild(popup);
    
        // Remove the popup after 3 seconds
        setTimeout(() => {
          popup.remove();
        }, 3000);
      } catch (error) {
        console.error("Error marking task as completed: ", error.message);
        alert("Failed to mark the task as completed. Please try again.");
      }
    });



  console.log("✅ calendarMain.js is loaded!");
  function showSpinner() {
    let spinnerOverlay = document.getElementById("spinner-overlay");
    if (!spinnerOverlay) {
      // Create the overlay container
      spinnerOverlay = document.createElement("div");
      spinnerOverlay.id = "spinner-overlay";
      spinnerOverlay.style.position = "fixed";
      spinnerOverlay.style.top = "0";
      spinnerOverlay.style.left = "0";
      spinnerOverlay.style.width = "100%";
      spinnerOverlay.style.height = "100%";
      spinnerOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.3)"; // Semi-transparent background
      spinnerOverlay.style.zIndex = "1000";
      
      // Add the loader markup
      spinnerOverlay.innerHTML = `
        <div class="loader-container">
          <div class="ripple"></div>
        </div>
      `;
      
      document.body.appendChild(spinnerOverlay);
      
      // Append loader CSS if not already present
      if (!document.getElementById("loader-style")) {
        const style = document.createElement("style");
        style.id = "loader-style";
        
        document.head.appendChild(style);
      }
    } else {
      spinnerOverlay.style.display = "flex";
    }
  }
  
  function hideSpinner() {
    const spinnerOverlay = document.getElementById("spinner-overlay");
    if (spinnerOverlay) {
      spinnerOverlay.style.display = "none";
    }
  }
  






// Function to clean and format the task type
function formatTaskType(taskType) {
  if (!taskType) return { formattedTaskType: "Unknown Task", cleanedTaskType: "Unknown Task" }; // Handle null/undefined cases

  let cleanedTaskType = taskType.replace(/^"|"$/g, "");  // Remove surrounding quotes

  // Removing surrounding stars and quotes from formatted task type
  let formattedTaskType = taskType.replace(/^Task type:\s*/i, "").trim();
  formattedTaskType = formattedTaskType.replace(/^\*{2}(.*)\*{2}$/, "$1");  // Remove surrounding stars
  formattedTaskType = formattedTaskType.replace(/^"|"$/g, "");  // Remove surrounding quotes

  console.log("Raw AI Task Type:", taskType); // Debugging
  console.log("Formatted Task Type:", formattedTaskType); // Debugging
  console.log("Cleaned Task Type:", cleanedTaskType); // Debugging

  // Return formatted task type based on the mapping, or the cleaned task type if not found
  return {
    
    cleanedTaskType: cleanedTaskType
  };
}





async function handleSubmit() {
  console.log("Submit button clicked");

  const eventTitleInput = document.getElementById("eventTitle");
  const eventDescriptionInput = document.getElementById("eventDescription");

  const taskTitle = eventTitleInput?.value.trim();
  const taskDescription = eventDescriptionInput?.value.trim();

  if (!taskTitle || !taskDescription) {
    alert("Please fill out both the task title and description.");
    return;
  }

  // Show spinner while processing
  showSpinner();

  // Small delay to allow spinner to render
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const result = await getSuggestedTaskType();
    console.log("AI task categorization result:", result.taskType.replace("Task Type: ", "").trim());

    if (result) {
      const { cleanedTaskType } = formatTaskType(result.taskType);
      await transitionToTemplateDisplay(cleanedTaskType);
    }
  } catch (error) {
    console.error("Error during AI task categorization:", error.message || error);
    alert("Failed to fetch the task type. Please try again later.");
  } finally {
    // Add a delay after async operations before hiding the spinner
    await new Promise(resolve => setTimeout(resolve, 500));
    hideSpinner();
  }
}

// ✅ Attach function to window (Ensure logging)
window.handleSubmit = handleSubmit;
console.log("handleSubmit has been attached to window:", window.handleSubmit);




// Function to send task title and description to the AI for categorization
async function getSuggestedTaskType() {
  const title = document.getElementById("eventTitle").value.trim();
  const description = document.getElementById("eventDescription").value.trim();
  
  const prompt = `
    Based on the following task title and description, pick the most appropriate category and task type from the list below:

    Categories and Task Types:
    1. generateList
    2. speechWriting
    3. presentationCreation
    4. meetingPreparation
    5. resumeWriting
    6. coverLetterDraft
    7. interviewPreparation
    8. emailFollowUp
    9. researchSummary
    10. businessPlan
    11. reportWriting
    12. academicEssayWriting
    13. socialMediaPost
    14. productLaunchPlan
    15. salesPitch
    16. brainstormSuggestions
    17. creativeWritingPrompt
    18. healthyRecipeIdeas
    19. diyProjects
    20. conductResearch
    21. learningHelp
    22. emailDraft
    23. revisionHelp
    24. informationSummarise

    Task Title: ${title}
    Task Description: ${description}

    Respond with the most suitable task type (e.g., "brainstormSuggestions") and a brief reason for your choice.
  `;

  // Update the URL to use the Vercel endpoint
  const backendUrl = "https://my-backend-three-pi.vercel.app/api/taskCategory";

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error from backend API:", error.message || "Unknown error");
      throw new Error("Failed to fetch task type from backend");
    }

    const data = await response.json();

    if (!data.taskType || !data.reason) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid response format from backend");
    }

    return {
      taskType: data.taskType.trim(), // Ensure taskType is clean
      reason: data.reason.trim(),     // Clean up reason as well
      
    };
  } catch (error) {
    console.error("Error during AI task categorization:", error.message || error);
    throw error;
  }
}



async function showTemplate(taskType) {
  // Remove the "Task Type: " prefix if it exists
  taskType = taskType.replace("Task Type: ", "").trim();

  // Ensure templates are loaded
  await loadTemplates();

  // Hide all currently visible templates
  const allTemplates = document.querySelectorAll("#templateContainer .template");
  allTemplates.forEach((template) => {
    template.style.display = "none";
  });

  console.log("Looking for template with ID: template-" + taskType);
  // Query inside the container
  const selectedTemplate = document.querySelector(`#templateContainer #template-${taskType}`);
  if (selectedTemplate) {
    selectedTemplate.style.display = "block";
  } else {
    console.warn(`No template found for task type: ${taskType}`);
  }
}






// Dropdown menu event listener
document.getElementById('aiType').addEventListener('change', function () {
  const selectedOption = this.value;

  // Map dropdown values to template IDs
  const taskTypeMap = {
    brainstorm: 'brainstormIdeas',
    outline: 'outlineIdeas',
    list: 'generateList',
    content: 'contentCreation',
    summary: 'summarizeInfo',
    rewrite: 'rewriteText',
    email: 'emailDraft',
    creative: 'creativeWriting',
    learn: 'learningHelp',
    answer: 'answerQuestions',
    translate: 'translation',
    other: 'otherIdeas'
  };

  // If "manual" is selected, hide all templates
  if (selectedOption === 'manual') {
    hideAllTemplates();
    return;
  }

  async function showTemplate(taskType) {
    // Remove the "Task Type: " prefix if it exists
    taskType = taskType.replace("Task Type: ", "").trim();
  
    // Ensure templates are loaded
    await loadTemplates();
  
    // Clean taskType to remove unwanted characters
    const cleanedTaskType = taskType.replace(/[^\w-]/g, ""); // Removes special characters except hyphens
  
    // Hide all currently visible templates
    const allTemplates = document.querySelectorAll("#templateContainer .template");
    allTemplates.forEach((template) => {
      template.style.display = "none";
    });
  
    console.log("Looking for template with ID: template-" + cleanedTaskType);
    
    // Query inside the container
    const selectedTemplate = document.querySelector(`#templateContainer #template-${cleanedTaskType}`);
    
    if (selectedTemplate) {
      selectedTemplate.style.display = "block";
    } else {
      console.warn(`No template found for task type: ${cleanedTaskType}`);
    }
  }
  

  
});



// Function to hide all templates
function hideAllTemplates() {
  const allTemplates = document.querySelectorAll('.template');
  allTemplates.forEach(template => {
    template.style.display = 'none';
  });
}
    



function showAIProcessingPopup() {
  console.log("showAIProcessingPopup called");
  let popup = document.getElementById("aiProcessingPopup");

  if (!popup) {
    popup = document.createElement("div");
    popup.id = "aiProcessingPopup";
    popup.innerText = "AI is processing today's events. Check responses shortly.";
    
    // Style the popup similarly, centered horizontally and 64px from the top
    popup.style.position = "fixed";
    popup.style.top = "64px";
    popup.style.left = "50%";
    popup.style.transform = "translateX(-50%)";
    popup.style.padding = "10px 20px";
    popup.style.backgroundColor = "rgba(0, 128, 0, 0.8)";
    popup.style.color = "#fff";
    popup.style.borderRadius = "4px";
    popup.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    popup.style.transition = "opacity 0.5s ease";
    popup.style.zIndex = "1000";
    popup.style.opacity = "0";
    popup.style.maxWidth = "300px";
    popup.style.textAlign = "center";
    
    document.body.appendChild(popup);
  }

  // Show the popup
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.opacity = "1";
  }, 10);

  // Hide the popup after 2 seconds (adjust the timing as needed)
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.style.display = "none";
    }, 500);
  }, 3000);
}



saveButton.addEventListener("click", (event) => {
  const eventDateInput = document.getElementById("eventDate");
  const eventDate = eventDateInput.value; // Get the event date from input
  const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
  const receiveAIResponseCheckbox = document.getElementById("receiveAIResponse");

  // Determine aiResponseEnabled: default to true unless the checkbox exists and is explicitly unchecked (false)
  const aiResponseEnabled = (receiveAIResponseCheckbox && receiveAIResponseCheckbox.checked === false)
    ? false
    : true;

  // Debug logs
  console.log("Save button clicked");
  console.log("Event Date:", eventDate);
  console.log("Today's Date:", today);
  console.log("Receive AI Response Enabled:", aiResponseEnabled);

  // Show the first popup immediately
  showDragSuccess();

  // If the event is today AND AI responses are enabled, show the AI processing popup after a delay
  if (eventDate === today && aiResponseEnabled) {
    console.log("Conditions met - showing AI processing popup");
    setTimeout(() => {
      showAIProcessingPopup();
    }, 2000); // 2-second delay before showing AI processing popup
  } else {
    console.log("Conditions NOT met - AI processing popup will NOT show");
  }
});

// Directly execute the code since the DOM is already loaded
(async () => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Fetch today's events for the user.
    const todaysEvents = await fetchEventsForToday(today, userId);

    for (const event of todaysEvents) {
      // Check if AI responses are enabled for this event.
      if (event.aiResponseEnabled) {
        // Optionally, show a processing popup.
        showAIProcessingPopup();

        // Check for an existing response.
        const existingResponse = await getResponsesByDateAndTitle(event.date, event.title, userId);
        if (!existingResponse) {
          // Save a placeholder response so Firestore generates a unique ID.
          const placeholderDoc = await saveResponse({
            date: event.date,
            eventTitle: event.title,
            response: "loading", // Default placeholder response
            isLoading: true,
            userId,
          });

          // Prepare the event data object for OpenAI.
          const eventData = {
            title: event.title,
            date: event.date,
            description: event.description,
            aiType: event.aiType,
          };

          // Get the AI response using the updated function.
          const aiResponse = await fetchChatGPTResponse(eventData);

          // Update the Firestore document with the final AI response.
          await updateResponse(placeholderDoc.id, { response: aiResponse, isLoading: false });
        } else {
          console.log(`Response already exists for event "${event.title}"`);
        }
      } else {
        // Log that AI processing was skipped for this event.
        console.log(`AI processing skipped for event "${event.title}" because aiResponseEnabled is false.`);
      }
    }
  } catch (error) {
    console.error("Error processing AI responses: ", error.message);
  }
})();





  });
  
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
  // Get elements from the DOM
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("menuOptions");
const closeSidebar = document.getElementById("closeSidebar");
const overlay = document.getElementById("overlay");
const helpButton = document.getElementById("helpButton");



// Close the sidebar when clicking the overlay
overlay.addEventListener("click", () => {
  sidebar.classList.remove("open"); // Remove the open class
  overlay.style.display = "none"; // Hide the overlay
});

// Redirect to the help page when the help button is clicked
helpButton.addEventListener("click", () => {
  window.location.href = "../help/help.html"; // Redirect to the help page
});

document.addEventListener("DOMContentLoaded", function() {
  var openBtn = document.getElementById("openSidebar");
  var closeBtn = document.getElementById("closeSidebar");
  var sidebar = document.getElementById("sidebar");
  var mainContent = document.getElementById("main-content");
  
  openBtn.addEventListener("click", function() {
    console.log("Open Sidebar clicked");
    sidebar.classList.add("active");
    mainContent.classList.add("shifted");
  });
  
  closeBtn.addEventListener("click", function() {
    console.log("Close Sidebar clicked");
    sidebar.classList.remove("active");
    mainContent.classList.remove("shifted");
  });
});


// Select elements
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const loadingOverlay = document.getElementById('loadingOverlay');
const optionContainer = document.getElementById('optionContainer');
const aiInputs = document.getElementById('aiInputs');
const aiOption = document.getElementById('aiOption');
const simpleTask = document.getElementById('simpleTask');
const manualSelection = document.getElementById("manualSelection");
const declineSuggestion = document.getElementById("declineSuggestion");
const aiTypeDropdown = document.getElementById('aiType');
const submitButton = document.getElementById('submit-button');
const aiSuggestedOutput = document.getElementById("aiSuggestedOutput");
const saveButton = document.getElementById("saveEvent");
const time = document.getElementById("taskTime");
const notification = document.getElementById("notification");
const aiResponse = document.getElementById("aiResponseNotification");
const backButton = document.getElementById("back-button");

// Event listeners for AI Option and Manual Option

document.querySelector("#back-button").addEventListener('click', () => {
  optionModal();
});




// Handle Decline AI Suggestion Click
declineSuggestion.addEventListener("click", () => {
  console.log("User declined AI suggestion and chose manual option.");
  transitionToManualInputs();
});

// Display Template Dynamically Based on User's Dropdown Selection
aiTypeDropdown.addEventListener("change", (event) => {
  const selectedTaskType = event.target.value;
  console.log("User selected task type:", selectedTaskType);

  // Hide all templates first
  const templates = document.querySelectorAll(".template");
  templates.forEach((template) => (template.style.display = "none"));

  // Show the selected template if it exists
  const selectedTemplate = document.getElementById(`template-${selectedTaskType}`);
  if (selectedTemplate) {
    selectedTemplate.style.display = "block";
  } else {
    console.warn("No template found for the selected task type:", selectedTaskType);
  }
});

function optionModal() {
  setTimeout(() => {
  
  modalOverlay.style.display = 'block';
  optionContainer.style.display = 'flex';
  modal.classList.remove("large");
  modal.classList.remove("aiInputs");
  modal.classList.remove("extra-large");
    document.getElementById("back-button").style.display = "none"; // Show the AI Suggested Task Type section
    aiInputs.style.display = "none"; // Show the event title and description inputs
    document.getElementById("overall-wrapper").style.display = "none"; // Show the manual selection dropdown
    
  }, 500);
}

// Transition to Inputs (step 1)
function transitionToInputs() {


  loadingOverlay.classList.add('active');
  const submitButton = document.getElementById('submit-button')
  const backButton = document.getElementById('back-button');

  setTimeout(() => {
    document.getElementById('modalOverlay').style.display = 'block';
    loadingOverlay.classList.remove('active');
    modal.classList.add('aiInputs');
    optionContainer.style.display = 'none';
    
    backButton.style.display = 'flex';
    
    aiInputs.style.display = 'flex';
    submitButton.style.display = 'block';
    console.log("Transitioned to Inputs. Submit button display:", submitButton.style.display);
    const templateContainer = document.getElementById("templateContainer");
    templateContainer.style.display = "none"; // Hide the template container
    document.getElementById("aiSuggestedOutput").style.display = "none"; // Hide the AI Suggested Output (if it's visible)
  }, 500);
}

// Transition to Manual Input Section
function transitionToSimpleTaskInputs() {
  loadingOverlay.classList.add("active");
  const overallwrapper = document.getElementById("overall-wrapper");
  

  setTimeout(() => {
    // First, remove it to force a reapply
    loadingOverlay.classList.remove("active");
    modal.classList.add("large");
    backButton.style.display = "block"; // Show the back button after transitioning
    optionContainer.style.display = "none";
    document.getElementById("back-button").style.display = "block"; // Show the AI Suggested Task Type section
    aiInputs.style.display = "flex"; // Show the event title and description inputs
    overallwrapper.style.display = "flex"; // Show the manual selection dropdown
    notification.style.display = "flex"; // Show the notification checkbox
    
    aiResponse.style.display = "flex"; // Show the AI Response checkbox
    submitButton.style.display = "none"; // Show the submit button
    aiSuggestedOutput.style.display = "none"; // Hide the AI Suggested Output (if it's visible)

    saveButton.style.display = "block"; // Show the save button after transitioning
    

    

    
    
  }, 500);
}

// Transition to Manual Input Section
function transitionToManualInputs() {

  loadingOverlay.classList.add("active");
  

  setTimeout(() => {
    // Add event listener to transition back when clicked
// Add event listener to transition back and show aiSuggestedOutput
backButton.addEventListener("click", () => {
  transitionToInputs();
  document.getElementById("aiSuggestedOutput").style.display = "block"; // Show the AI Suggested Task Type section again
});
    loadingOverlay.classList.remove("active");
    modal.classList.add("large");
    optionContainer.style.display = "none";
    aiInputs.style.display = "flex"; // Show the event title and description inputs
    manualSelection.style.display = "flex"; // Show the manual selection dropdown
    notification.style.display = "flex"; // Show the notification checkbox
    time.style.display = "flex"; // Show the time input
    submitButton.style.display = "none"; // Show the submit button
    aiSuggestedOutput.style.display = "none"; // Hide the AI Suggested Output (if it's visible)

    saveButton.style.display = "block"; // Show the save button after transitioning
    

    

    
    
  }, 2000);
}




async function transitionToTemplateDisplay(cleanedTaskType) {
  
  await loadTemplates(); // Ensure templates are loaded first
  const customStylesEl = document.getElementById("customStyles");
  if (customStylesEl) {
    customStylesEl.style.display = "none";
  } else {
    console.error("❌ customStyles element not found.");
  }
  
  const dynamicCheckboxContainerEl = document.getElementById("dynamicCheckboxContainer");
  if (dynamicCheckboxContainerEl) {
    dynamicCheckboxContainerEl.style.display = "none";
  } else {
    console.error("❌ dynamicCheckboxContainer element not found.");
  }
  
  const modal = document.getElementById("modal");
  const templateContainer = document.getElementById("templateContainer");
  const overallwrapper = document.getElementById("overall-wrapper");

  if (!modal || !templateContainer || !overallwrapper) {
    console.error("❌ Missing required elements.");
    hideSpinner();
    return;
  }

  // Create a simple back button in the top-left if it doesn't exist
  let backButton = document.getElementById("back-button");
  if (!backButton) {
    backButton = document.createElement("button");
    backButton.id = "back-button";
    backButton.textContent = "← Back";
    backButton.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 8px 12px;
      background-color: #f0f0f0;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;
    backButton.addEventListener("click", transitionToInputs);
    modal.insertBefore(backButton, modal.firstChild);
  } else {
    backButton.style.display = "block";
    modal.insertBefore(backButton, modal.firstChild);
  }

  // Ensure templateContainer and overallwrapper are inside the modal
  if (!modal.contains(templateContainer)) {
    modal.appendChild(templateContainer);
  }
  
  if (!modal.contains(overallwrapper)) {
    modal.appendChild(overallwrapper);
  } else if (templateContainer.nextElementSibling !== overallwrapper) {
    modal.insertBefore(overallwrapper, templateContainer.nextElementSibling);
  }

  console.log("✅ Found templateContainer");

  // Clean up task type
  cleanedTaskType = cleanedTaskType.replace(/^["*]+|["*]+$/g, '').trim();
  console.log("cleanedTaskType:", cleanedTaskType);

  // Ensure spinner is shown until the transition is complete
  

  
    const aiSuggestedOutput = document.getElementById("aiSuggestedOutput");
    const suggestedTaskTypeElement = document.getElementById("suggestedTaskType");
    const aiInput = document.getElementById("aiInputs");
    const submitButton = document.getElementById("submit-button");
    const notification = document.getElementById("notification");
    const saveButton = document.getElementById("saveButton");

    if (!aiSuggestedOutput || !suggestedTaskTypeElement) {
      console.error("❌ Required elements missing.");
      
      return;
    }

    // Display the modal in extra-large mode
    modal.classList.add("extra-large");
    modal.style.display = "block";
    suggestedTaskTypeElement.textContent = cleanedTaskType;

    // Hide inputs and other unnecessary elements
    aiInput.style.display = "none";

    if (aiSuggestedOutput.style.display !== "none") {
      aiSuggestedOutput.style.display = "none";
    }

    // Hide all templates inside templateContainer
    const allTemplates = templateContainer.querySelectorAll(".template");
    allTemplates.forEach(template => {
      template.style.display = "none";
      console.log(`Hidden template: ${template.id}`);
    });

    // Construct and display the selected template
    const templateId = `template-${cleanedTaskType}`;
    const selectedTemplate = document.getElementById(templateId);
    if (selectedTemplate) {
      selectedTemplate.style.display = "block";
      selectedTemplate.style.visibility = "visible";
      selectedTemplate.style.opacity = "1";
      console.log(`✅ Displayed template: ${templateId}`);
    } else {
      console.error(`❌ Template with ID "${templateId}" not found.`);
    }

    // Ensure templateContainer is visible
    templateContainer.style.display = "block";

    // Now show the overall wrapper (with notification and save button)
    overallwrapper.style.display = "flex";
    notification.style.display = "flex";
    document.getElementById("aiResponseNotification").style.display = "none";
    
    // Hide the spinner after the transition is complete
    
  
}



















// Event listener for "Accept Suggestion" button
document.getElementById("acceptSuggestion").addEventListener("click", function () {
  const suggestedTaskTypeElement = document.getElementById("suggestedTaskTypeRaw");

  if (!suggestedTaskTypeElement) {
    console.error("Suggested task type element not found.");
    return;
  }

  // Dynamically fetch the cleaned task type from the UI
  const cleanedTaskType = suggestedTaskTypeElement.textContent.trim();

  if (!cleanedTaskType) {
    console.error("No task type found to transition to.");
    return;
  }

  // Call the transition function with the cleaned task type
  transitionToTemplateDisplay(cleanedTaskType);
});


// Close modal on overlay click
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.style.display = 'none';
  }
});
// Function to show the spinner (via loading overlay)






// Service worker
// Ensure service worker registration only happens once
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
      navigator.serviceWorker.register('../service-worker/service-worker.js', {
          scope: '/' // This makes sure the service worker can control the entire website
      })
      .then(function(registration) {
          console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(function(error) {
          console.error('Service Worker registration failed:', error);
      });
  });
}

  
});















