// content.js
(function quickVintExtension() {
  const TITLE_SELECTOR = 'input[data-testid="title--input"]';
  const DESC_SELECTOR = 'textarea[data-testid="description--input"]';
  const BTN_ID = "quickvint-gen-btn";

  function injectGenerateButton() {
    if (document.getElementById(BTN_ID)) return;

    const titleInput = document.querySelector(TITLE_SELECTOR);
    const descTextarea = document.querySelector(DESC_SELECTOR);
    if (!titleInput || !descTextarea) return;

    // Build the button
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.textContent = "🪄 Generate";
    Object.assign(btn.style, {
      marginTop: "6px",
      padding: "6px 12px",
      background: "#4f46e5",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
    });

    // Insert under the Title field
    titleInput.parentElement.appendChild(btn);

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "⏳ Generating…";

      // 1) collect uploaded photo URLs
      const images = document.querySelectorAll(
        '[data-testid="media-select-grid"] img'
      );
      const urls = Array.from(images)
        .map((i) => i.src)
        .filter(Boolean);
      if (!urls.length) {
        alert("No photos found. Upload at least one image first.");
        btn.disabled = false;
        btn.textContent = "🪄 Generate";
        return;
      }

      try {
        // 2) call your backend (replace with your real URL)
        const res = await fetch("https://quick-vint.vercel.app/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls: urls }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { title, description } = await res.json();

        // 3) fill in the form
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));

        descTextarea.value = description;
        descTextarea.dispatchEvent(new Event("input", { bubbles: true }));

        btn.textContent = "✅ Done";
      } catch (err) {
        console.error(err);
        alert("Generation failed—see console");
        btn.textContent = "🪄 Generate";
      }
      btn.disabled = false;
    });
  }

  // watch for the form appearing/re-rendering
  const observer = new MutationObserver(debounce(injectGenerateButton, 300));
  observer.observe(document.body, { childList: true, subtree: true });

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // initial run
  injectGenerateButton();
})();
