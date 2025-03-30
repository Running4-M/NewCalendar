import { db } from "../backend/firebase.js"; // Import Firestore instance from firebase.js
import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth
const auth = getAuth();
// Utility: Display error messages
function displayError(errorCode) {
  const errorMessages = {
    "auth/email-already-in-use": "This email is already in use. Please log in instead.",
    "auth/invalid-email": "Invalid email format. Please provide a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters long.",
    "auth/user-not-found": "No account found with this email. Please sign up first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
  };
  return errorMessages[errorCode] || "An error occurred. Please try again.";
}
// Handle signup
document.getElementById("signupButton").addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  if (!email || !password) {
    alert("Please provide both email and password.");
    return;
  }
  try {
    // Create a new user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Add the new user to Firestore
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email,
    });
    alert("Signup successful. Welcome!");
    window.location.href = "../Calendar/calendarMain.html"; // Redirect to Calendar page
  } catch (error) {
    alert(displayError(error.code));
    console.error("Error during signup:", error);
  }
});
// Handle login
document.getElementById("loginButton").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  if (!email || !password) {
    alert("Please provide both email and password.");
    return;
  }
  try {
    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful. Welcome back!");
    window.location.href = "../Calendar/calendarMain.html"; // Redirect to Calendar page
  } catch (error) {
    alert(displayError(error.code));
    console.error("Error during login:", error);
  }
});
// Toggle between signup and login forms
document.getElementById("toggleFormButton").addEventListener("click", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  const toggleFormButton = document.getElementById("toggleFormButton");
  if (signupForm.style.display === "none") {
    signupForm.style.display = "block";
    loginForm.style.display = "none";
    toggleFormButton.textContent = "Already have an account? Login";
  } else {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
    toggleFormButton.textContent = "Don't have an account? Signup";
  }
});
// Check if the user is already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "../Calendar/calendarMain.html"; // Redirect if logged in
  }
});
