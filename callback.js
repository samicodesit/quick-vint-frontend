// callback.js

const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";

const loadingStateDiv = document.getElementById("loadingState");
const successStateDiv = document.getElementById("successState");
const errorStateDiv = document.getElementById("errorState");
const errorMessageParagraph = document.getElementById("errorMessage");

let supabase;

if (typeof supabaseJs !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("Callback Auth Event:", event, session);

    if (loadingStateDiv) loadingStateDiv.classList.add("hidden");

    if (event === "SIGNED_IN" && session) {
      console.log(
        "Successfully signed in via magic link callback!",
        session.user
      );
      // The Supabase client library has now stored the session.
      // Your background.js script's onAuthStateChange listener will also pick this up
      // and update the global authentication state for the extension.
      // The user's profile should have been created by the Supabase trigger.

      if (successStateDiv) successStateDiv.classList.remove("hidden");
      if (errorStateDiv) errorStateDiv.classList.add("hidden");

      // Optional: Attempt to close the tab after a delay
      setTimeout(() => {
        // Check if the tab is still focused or active before closing might be a good UX,
        // but for simplicity, we'll just try to close.
        // Note: Extensions can only close tabs they opened, or their own specific pages like this one.
        window.close();
      }, 3000); // Close after 3 seconds
    } else if (
      event === "SIGN_IN_ERROR" ||
      (event === "INITIAL_SESSION" && !session)
    ) {
      // INITIAL_SESSION without a session can sometimes occur if the token is invalid/expired
      // right from the start or already processed and cleared.
      console.error(
        "Magic link authentication error in callback. Event:",
        event,
        "Session:",
        session
      );
      if (errorMessageParagraph) {
        let msg =
          "Authentication failed. The link may have expired or already been used. Please try signing in again from the extension.";
        if (session && session.error && session.error.message) {
          // 'session' might be error object here
          msg = session.error.message;
        }
        errorMessageParagraph.textContent = msg;
      }
      if (successStateDiv) successStateDiv.classList.add("hidden");
      if (errorStateDiv) errorStateDiv.classList.remove("hidden");
    } else if (event === "INITIAL_SESSION" && session) {
      // This can happen if the page reloads or if Supabase processes the hash very quickly
      // and fires INITIAL_SESSION with a valid session before explicitly firing SIGNED_IN.
      console.log("Initial session established in callback!", session.user);
      if (successStateDiv) successStateDiv.classList.remove("hidden");
      if (errorStateDiv) errorStateDiv.classList.add("hidden");
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  });
} else {
  console.error(
    "Callback: Supabase client (supabaseJs) not found or configuration missing."
  );
  if (loadingStateDiv) loadingStateDiv.classList.add("hidden");
  if (successStateDiv) successStateDiv.classList.add("hidden");
  if (errorStateDiv) errorStateDiv.classList.remove("hidden");
  if (errorMessageParagraph)
    errorMessageParagraph.textContent =
      "Critical error: Could not initialize authentication service. Please contact support.";
}
