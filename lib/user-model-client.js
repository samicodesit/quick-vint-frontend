(function (root) {
  "use strict";
  const interacted = new Set();
  const exposed = new Set();
  function track(owner, event, context = {}) {
    try { Promise.resolve(root.AutoListerTelemetry?.track(event, context, location.protocol === "chrome-extension:" ? "extension_popup" : "extension_content", false, owner)).catch(() => {}); } catch {}
  }
  let languageRequest = 0;
  async function loadLanguage() {
    const serial = ++languageRequest;
    const storage = await chrome.storage.local.get([
      "selectedLanguage",
      "selectedTitleLanguage",
      "selectedDescriptionLanguage",
      "quickvintLanguagePreferenceTouched",
    ]);
    if (serial !== languageRequest) return;
    const locale =
      root.AutoListerLanguageDefaults?.resolvePreferredUiLanguage(storage).code;
    if (locale) {
      const previous = root.AutoListerModelCopy.getLocale();
      root.AutoListerModelCopy.setLocale(locale);
      if (previous !== root.AutoListerModelCopy.getLocale()) {
        root.dispatchEvent(new CustomEvent("autolister-ui-language-change"));
      }
    }
  }
  function acknowledge(owner) {
    if (interacted.has(owner)) return;
    interacted.add(owner);
    document.querySelectorAll(".um-discover").forEach((button) => {
      button.classList.remove("um-discover");
      button.querySelector(".um-entry-new")?.remove();
    });
    void request(owner, "POST", { action: "dismiss" }).catch(() => {});
  }
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
    if (typeof result.data?.enabled === 'boolean') {
      if (method === 'PATCH') track(owner, result.data.enabled ? 'model_enabled' : 'model_disabled');
      root.dispatchEvent(new CustomEvent('autolister-model-state', {detail:{owner,state:result.data}}));
    }
    return result.data;
  }
  function modal(owner, invite = false, onAddPhotos) {
    const dialog = document.createElement("dialog");
    dialog.className = "um-modal";
    dialog.setAttribute("aria-label", root.AutoListerModelUI.t("Your model"));
    const view = document.createElement("div");
    dialog.append(view);
    document.body.append(dialog);
    let dispose = () => {};
    let invitationOpen = invite;
    const close = () => {
      dispose();
      dialog.close();
      dialog.remove();
      chrome.storage.onChanged.removeListener(changed);
    };
    const dismiss = () => {
      if (invitationOpen) { invitationOpen = false; track(owner, "model_invitation_dismissed", { entryPoint: "invitation" }); }
      void request(owner, "POST", { action: "dismiss" }).catch(() => {});
      close();
    };
    const form = () => {
      if (invitationOpen) { invitationOpen = false; track(owner, "model_invitation_opened", { entryPoint: "invitation" }); }
      acknowledge(owner);
      dispose();
      dispose = root.AutoListerModelUI.mount(view, {
        track: (event, context) => track(owner, event, { entryPoint: invite ? "invitation" : "toolbar", ...context }),
        request: (method, body) => request(owner, method, body),
        onClose: close,
        onSkip: dismiss,
        backLabel: "Close",
        onAddPhotos: onAddPhotos ? async () => { await onAddPhotos(owner); close(); } : undefined,
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
      view.lang = root.AutoListerModelUI.locale();
      view.innerHTML = root.AutoListerModelUI.invitation();
      view.querySelector(".um-primary").addEventListener("click", form);
      view.querySelector(".um-secondary").addEventListener("click", dismiss);
    } else form();
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      dismiss();
    });
    dialog.showModal();
    if (invite) track(owner, "model_invitation_shown", { entryPoint: "invitation" });
    dialog.querySelector("button")?.focus();
    return close;
  }
  function startContent({ isBusy = () => false, onAddPhotos } = {}) {
    let owner,
      checkedOwner,
      checking = false,
      available = false,
      currentState,
      close;
    function syncToggle() {
      const button=document.getElementById('quickvint-model-toggle');
      if(button)button.setAttribute('aria-checked',String(Boolean(currentState?.model?.state==='ready'&&currentState.enabled)));
    }
    function stateChanged(event) {
      if(event.detail?.owner!==owner)return;
      currentState=event.detail.state;syncToggle();
    }
    root.addEventListener('autolister-model-state',stateChanged);
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
      await loadLanguage();
      const data = await chrome.storage.local.get("supabaseSession");
      owner = data.supabaseSession?.user?.id;
      if(owner && (await chrome.storage.local.get('modelToolbarSeen:'+owner))['modelToolbarSeen:'+owner])interacted.add(owner);
    };
    const change = (changes, area) => {
      if (area !== "local") return;
      if (["selectedLanguage", "selectedTitleLanguage", "selectedDescriptionLanguage", "quickvintLanguagePreferenceTouched"].some(key => changes[key])) {
        void loadLanguage().catch(() => {});
      }
      if (!changes.supabaseSession) return;
      const next = changes.supabaseSession.newValue?.user?.id;
      if (next !== owner) {
        owner = next;
        checkedOwner = undefined;
        available = false;
        currentState = undefined;
        close?.();
        document.getElementById("quickvint-model-control")?.remove();
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
          const control=document.createElement('div');
          control.id='quickvint-model-control';
          control.className='quickvint-model-control';
          const b = document.createElement("button");
          b.id = "quickvint-model-btn";
          b.className = "um-settings-entry";
          b.type = "button";
          b.title = root.AutoListerModelUI.t("Your model");
          b.setAttribute("aria-label", root.AutoListerModelUI.t("Your model"));
          b.innerHTML =
            '<img class="al-model-photo" src="' + chrome.runtime.getURL('images/user-model-female.webp') + '" width="34" height="38" alt="">' +
            '<span>' + root.AutoListerModelUI.t("Your model") + '</span>' +
            (!interacted.has(owner) ? '<span class="um-entry-new">' + root.AutoListerModelUI.t("New") + '</span>' : '');
          const openModel = async () => {
            await loadLanguage();
            close?.();
            b.querySelector('.um-entry-new')?.remove();
            void chrome.storage.local.set({['modelToolbarSeen:'+owner]:true});
            close = modal(owner, false, /\/items\/[^/]+\/edit\/?$/.test(location.pathname) ? onAddPhotos : undefined);
          };
          b.addEventListener("click", openModel);
          const toggle=document.createElement('button');
          toggle.id='quickvint-model-toggle';toggle.type='button';toggle.className='quickvint-binary-toggle';
          toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',root.AutoListerModelUI.t('Enable your model'));
          toggle.innerHTML='<span class="quickvint-toggle-switch" aria-hidden="true"><span class="quickvint-toggle-knob"></span></span>';
          const error=document.createElement('span');error.className='um-toolbar-error';error.setAttribute('role','status');error.hidden=true;
          toggle.addEventListener('click',async()=>{
            if(currentState?.model?.state!=='ready'){await openModel();return;}
            const expected=owner;toggle.disabled=true;toggle.setAttribute('aria-busy','true');error.hidden=true;
            try{
              const next=await request(expected,'PATCH',{enabled:!currentState.enabled});
              if(owner!==expected)return;
              currentState=next;syncToggle();b.querySelector('.um-entry-new')?.remove();
              void chrome.storage.local.set({['modelToolbarSeen:'+owner]:true});
            }catch(e){if(owner===expected){error.textContent=root.AutoListerModelCopy.error(e);error.hidden=false;}}
            finally{if(owner===expected){toggle.disabled=false;toggle.removeAttribute('aria-busy');}}
          });
          control.append(b,toggle,error);anchor.after(control);syncToggle();
          root.AutoListerListingTools?.enhance(document.querySelector('.quickvint-tools'));
          document.getElementById('quickvint-release-update-widget')?.remove();
        }
      }
      if (document.getElementById("quickvint-model-btn")?.getClientRects().length && !document.hidden && !interacted.has(owner) && !exposed.has(owner)) {
        exposed.add(owner); track(owner, "model_invitation_shown", { entryPoint: "toolbar" });
      }
      if (checkedOwner === owner || obstructed()) return;
      checking = true;
      const expected = owner;
      try {
        const state = await request(expected);
        if (owner !== expected || !eligible()) return;
        available = true;
        currentState = state;syncToggle();
        // The optional listing tour and model badge replace a competing auto-modal.
        if (root.AutoListerListingTools) { checkedOwner = owner; return; }
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
        root.removeEventListener('autolister-model-state',stateChanged);
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
      currentState,
      requestId = 0;
    const close = () => {
      cleanup?.();
      cleanup = undefined;
      settings.classList.remove("um-popup-active");
    };
    async function availability() {
      const serial = ++requestId;
      await loadLanguage();
      const data = await chrome.storage.local.get("supabaseSession");
      const next = data.supabaseSession?.user?.id;
      if (owner !== next) close();
      owner = next;
      entry.hidden = true;
      if (!owner) return;
      try {
        const state = await request(owner);
        if (serial === requestId) {
          currentState = state;
          root.AutoListerModelUI.entry(
            entry,
            state,
            !interacted.has(owner) &&
              ["unseen", "seen"].includes(state.invitationState),
          );
          entry.hidden = false;
        }
      } catch {}
    }
    entry.addEventListener("click", () => {
      if (!owner) return;
      const expected = owner;
      acknowledge(expected);
      root.AutoListerModelUI.entry(entry, currentState, false);
      close();
      settings.classList.add("um-popup-active");
      const view = document.createElement("section");
      view.className = "um-popup-view";
      settings.append(view);
      const dispose = root.AutoListerModelUI.mount(view, {
        track: (event, context) => track(expected, event, { entryPoint: "settings", ...context }),
        request: async (method, body) => {
          const state = await request(expected, method, body);
          if (owner === expected) {
            currentState = state;
            root.AutoListerModelUI.entry(entry, state, false);
          }
          return state;
        },
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
      if (
        area === "local" &&
        [
          "selectedLanguage",
          "selectedTitleLanguage",
          "selectedDescriptionLanguage",
          "quickvintLanguagePreferenceTouched",
        ].some((key) => changes[key])
      ) {
        close();
        void availability();
      }
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
