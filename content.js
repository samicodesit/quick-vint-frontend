// content.js

function injectGenerateButton() {
    if (document.getElementById("vinted-gen-btn")) return;
  
    const titleInput = document.querySelector("#title");
    const descTextarea = document.querySelector("#description");
    if (!titleInput || !descTextarea) return;
  
    // Build the button
    const btn = document.createElement("button");
    btn.id = "vinted-gen-btn";
    btn.textContent = "🪄 Generate";
    Object.assign(btn.style, {
      marginTop: "6px",
      padding: "6px 12px",
      background: "#4f46e5",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px"
    });
  
    // Insert under the Title field
    titleInput.parentElement.appendChild(btn);
  
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "⏳ Generating…";
  
      // 1) collect uploaded photo URLs
      const images = document.querySelectorAll('[data-testid="media-select-grid"] img');
      const urls = Array.from(images).map(i => i.src).filter(Boolean);
      if (!urls.length) {
        alert("No photos found. Upload at least one image first.");
        btn.disabled = false;
        btn.textContent = "🪄 Generate";
        return;
      }
  
      try {
        // 2) call your backend (replace with your real URL)
        const res = await fetch("https://quick-vint.vercel.app/api/generate.ts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: urls[0] })
        });
        if (!res.ok) throw new Error(await res.text());
        const { title, description } = await res.json();
  
        // 3) fill in the form
        titleInput.value = title;
        descTextarea.value = description;
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
  const observer = new MutationObserver(() => {
    injectGenerateButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  