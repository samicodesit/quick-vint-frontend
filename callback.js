(() => {
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
  const supabaseFactory = window.supabase || window.supabaseJs;
  const supabaseClient = supabaseFactory.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const loadingDiv = document.getElementById("loadingState");
  const successDiv = document.getElementById("successState");
  const errorDiv = document.getElementById("errorState");
  const errorMsg = document.getElementById("errorMessage");

  function show(state, msg = "") {
    [loadingDiv, successDiv, errorDiv].forEach(
      (el) => el && el.classList.add("hidden")
    );
    if (state === "loading") loadingDiv?.classList.remove("hidden");
    if (state === "success") {
      successDiv?.classList.remove("hidden");
      successDiv.querySelector(
        "p"
      ).innerHTML = `${msg}<br/><em>(Close this tab.)</em>`;
    }
    if (state === "error") {
      errorDiv?.classList.remove("hidden");
      errorMsg && (errorMsg.textContent = msg);
    }
  }

  show("loading");

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
      chrome.storage.local.set({ supabaseSession: session }, () => {
        chrome.runtime.sendMessage({ type: "AUTH_UPDATED" }); // ✅ notify background
        show("success", "Authentication successful!");
      });
    } else {
      show("error", "Authentication failed or expired.");
    }
  });
})();
