// callback.js
// PUT THIS LINE ABSOLUTELY FIRST:
debugger; // This will pause execution as SOON as DevTools for this page are opened.

console.log(
  "Callback.js: Top of script reached. Execution paused by debugger (if DevTools are open for this page)."
);

const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";

const loadingStateDiv = document.getElementById("loadingState");
const successStateDiv = document.getElementById("successState");
const errorStateDiv = document.getElementById("errorState");
const errorMessageParagraph = document.getElementById("errorMessage");

let supabaseClient;

// Function to update UI, ensures it's always callable
function updateCallbackUI(state, message = "") {
  if (loadingStateDiv) loadingStateDiv.classList.add("hidden");
  if (successStateDiv) successStateDiv.classList.add("hidden");
  if (errorStateDiv) errorStateDiv.classList.add("hidden");

  if (state === "success") {
    if (successStateDiv) successStateDiv.classList.remove("hidden");
    const p = successStateDiv ? successStateDiv.querySelector("p") : null;
    if (p)
      p.innerHTML =
        message +
        "<br/><em>(DEBUG: Page deliberately kept open. Close manually.)</em>";
  } else if (state === "error") {
    if (errorStateDiv) errorStateDiv.classList.remove("hidden");
    if (errorMessageParagraph) errorMessageParagraph.textContent = message;
  } else if (state === "loading") {
    if (loadingStateDiv) loadingStateDiv.classList.remove("hidden");
  }
}

try {
  if (
    typeof supabase !== "undefined" &&
    typeof supabase.createClient === "function" &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  ) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log(
      "Callback: Supabase client initialized using global 'supabase' object."
    );
  } else if (
    typeof supabaseJs !== "undefined" &&
    typeof supabaseJs.createClient === "function" &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  ) {
    supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log(
      "Callback: Supabase client initialized using global 'supabaseJs' object."
    );
  } else {
    throw new Error(
      "Supabase client factory (global 'supabase' or 'supabaseJs') not found."
    );
  }

  if (supabaseClient) {
    console.log("Callback: Attaching onAuthStateChange listener.");
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log("Callback Auth Event:", event, "Session:", session);
      // debugger; // Pause here too

      if (event === "SIGNED_IN" && session) {
        console.log(
          "Successfully signed in via magic link callback!",
          session.user
        );
        updateCallbackUI("success", "Authentication Successful!");
        // NO window.close() HERE FOR DEBUGGING
        console.log("DEBUG: SIGNED_IN event - Page should stay open.");
      } else if (
        event === "SIGN_IN_ERROR" ||
        (event === "INITIAL_SESSION" && !session)
      ) {
        console.error(
          "Magic link authentication error/no session in callback. Event:",
          event
        );
        let msg =
          "Authentication failed. The link may have expired, been used, or no session was established.";
        const errorDetail =
          session?.error?.message ||
          (session && typeof session.message === "string"
            ? session.message
            : null);
        if (errorDetail) msg = `Authentication error: ${errorDetail}`;
        updateCallbackUI("error", msg);
        console.log(
          "DEBUG: SIGN_IN_ERROR or INITIAL_SESSION (no session) - Page should stay open."
        );
      } else if (event === "INITIAL_SESSION" && session) {
        console.log(
          "Initial session established in callback (already logged in elsewhere perhaps)!",
          session.user
        );
        updateCallbackUI("success", "Session already active or established!");
        // NO window.close() HERE FOR DEBUGGING
        console.log(
          "DEBUG: INITIAL_SESSION (with session) event - Page should stay open."
        );
      }
    });
  } else {
    throw new Error(
      "Supabase client instance is null after initialization attempt."
    );
  }
} catch (e) {
  console.error(
    "Callback: CRITICAL - Failed to initialize Supabase client or attach listener."
  );
  console.error("Error name:", e.name);
  console.error("Error message:", e.message);
  console.error("Error stack:", e.stack);
  updateCallbackUI(
    "error",
    "Critical error: Auth service could not start. " + e.message
  );
}

console.log(
  "Callback.js: Script finished initial execution. Waiting for auth events."
);
