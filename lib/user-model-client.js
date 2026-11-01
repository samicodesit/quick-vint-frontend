(function (root) {
  "use strict";
  async function request(owner, method = "GET", body) {
    const result = await chrome.runtime.sendMessage({
      type: "USER_MODEL_REQUEST",
      expectedUserId: owner,
      method,
      body,
    });
    if (!result?.ok) {
      const e = new Error(
        result?.error || "Your model could not be loaded. Try again.",
      );
      e.status = result?.status;
      throw e;
    }
    return result.data;
  }
  function modal(owner, invite = false) {
    const dialog = document.createElement("dialog");
    dialog.className = "um-modal";
    dialog.setAttribute("aria-label", "Your model");
    const view = document.createElement("div");
    dialog.append(view);
    document.body.append(dialog);
    let dispose = () => {};
    const close = () => {
      dispose();
      dialog.close();
      dialog.remove();
      chrome.storage.onChanged.removeListener(changed);
    };
    const dismiss = () => {
      void request(owner, "POST", { action: "dismiss" }).catch(() => {});
      close();
    };
    const form = () => {
      dispose();
      dispose = root.AutoListerModelUI.mount(view, {
        request: (method, body) => request(owner, method, body),
        onClose: close,
        onSkip: dismiss,
        backLabel: "Close",
      });
    };
    function changed(changes, area) {
      if (
        area === "local" &&
        changes.supabaseSession &&
        changes.supabaseSession.newValue?.user?.id !== owner
      )
        close();
    }
    chrome.storage.onChanged.addListener(changed);
    if (invite) {
      view.className = "um-view";
      view.innerHTML =
        '<header class="um-header"><h2>Create your model</h2></header><div class="um-pending">' +
        root.AutoListerModelUI.mirrorIcon +
        '</div><p class="um-message">Create once. Keep it in your account.</p><div class="um-actions"><button type="button" class="um-primary">Create my model</button><button type="button" class="um-secondary">Not now</button></div>';
      view.querySelector(".um-primary").addEventListener("click", form);
      view.querySelector(".um-secondary").addEventListener("click", dismiss);
    } else form();
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      dismiss();
    });
    dialog.showModal();
    dialog.querySelector("button")?.focus();
    return close;
  }
  function startContent({ isBusy = () => false } = {}) {
    let owner,
      checkedOwner,
      checking = false,
      available = false,
      close;
    const eligible = () =>
      /^\/items\/(?:new|[^/]+\/edit)\/?$/.test(location.pathname);
    const obstructed = () =>
      isBusy() ||
      Array.from(
        document.querySelectorAll(
          'dialog[open],[aria-modal="true"],[id^="quickvint-"][id$="-modal"]:not([hidden])',
        ),
      ).some((el) => el.getClientRects().length > 0);
    const loadOwner = async () => {
      const data = await chrome.storage.local.get("supabaseSession");
      owner = data.supabaseSession?.user?.id;
    };
    const change = (changes, area) => {
      if (area !== "local" || !changes.supabaseSession) return;
      const next = changes.supabaseSession.newValue?.user?.id;
      if (next !== owner) {
        owner = next;
        checkedOwner = undefined;
        available = false;
        close?.();
        document.getElementById("quickvint-model-btn")?.remove();
        void tick();
      }
    };
    chrome.storage.onChanged.addListener(change);
    async function tick() {
      if (!eligible()) {
        close?.();
        close = undefined;
        return;
      }
      if (!owner || checking) return;
      if (available && !document.getElementById("quickvint-model-btn")) {
        const anchor = document.getElementById(
          "quickvint-description-footer-edit-btn",
        )?.parentElement;
        if (anchor) {
          const b = document.createElement("button");
          b.id = "quickvint-model-btn";
          b.className = "um-settings-entry";
          b.type = "button";
          b.title = "Your model";
          b.setAttribute("aria-label", "Your model");
          b.innerHTML = root.AutoListerModelUI.mirrorIcon;
          b.addEventListener("click", () => {
            close?.();
            close = modal(owner);
          });
          anchor.after(b);
        }
      }
      if (checkedOwner === owner || obstructed()) return;
      checking = true;
      const expected = owner;
      try {
        const state = await request(expected);
        if (owner !== expected || !eligible()) return;
        available = true;
        if (state.model || state.invitationState !== "unseen") {
          checkedOwner = owner;
          return;
        }
        if (obstructed()) return;
        const claim = await request(expected, "POST", { action: "invite" });
        if (owner !== expected || !eligible()) return;
        checkedOwner = owner;
        if (claim.claimed) close = modal(owner, true);
      } catch (e) {
        if (e.status === 404) checkedOwner = owner;
      } finally {
        checking = false;
      }
    }
    void loadOwner().then(tick);
    const timer = setInterval(tick, 3000);
    window.addEventListener(
      "pagehide",
      () => {
        clearInterval(timer);
        close?.();
        chrome.storage.onChanged.removeListener(change);
      },
      { once: true },
    );
  }
  function startPopup() {
    const entry = document.getElementById("userModelButton"),
      settings = document.getElementById("settingsView");
    if (!entry || !settings) return;
    let cleanup,
      owner,
      requestId = 0;
    const close = () => {
      cleanup?.();
      cleanup = undefined;
      settings.classList.remove("um-popup-active");
    };
    async function availability() {
      const serial = ++requestId;
      const data = await chrome.storage.local.get("supabaseSession");
      const next = data.supabaseSession?.user?.id;
      if (owner !== next) close();
      owner = next;
      entry.hidden = true;
      if (!owner) return;
      try {
        await request(owner);
        if (serial === requestId) entry.hidden = false;
      } catch {}
    }
    entry.innerHTML = root.AutoListerModelUI.mirrorIcon + "Your model";
    entry.addEventListener("click", () => {
      if (!owner) return;
      close();
      settings.classList.add("um-popup-active");
      const view = document.createElement("section");
      view.className = "um-popup-view";
      settings.append(view);
      const dispose = root.AutoListerModelUI.mount(view, {
        request: (method, body) => request(owner, method, body),
        onClose: close,
        backLabel: "Settings",
      });
      cleanup = () => {
        dispose();
        view.remove();
      };
    });
    document
      .getElementById("settingsToggleBtn")
      ?.addEventListener("click", close);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.supabaseSession) {
        if (changes.supabaseSession.newValue?.user?.id !== owner) close();
        void availability();
      }
    });
    window.addEventListener("pagehide", close, { once: true });
    void availability();
  }
  root.AutoListerModels = { request, startContent, startPopup };
})(globalThis);
