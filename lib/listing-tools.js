/* Contextual listing tools. Reuses existing controls and their event handlers. */
(function (root) {
  "use strict";
  const $ = (s, scope = document) => scope.querySelector(s);
  const t = (key) => root.AutoListerListingCopy?.text(key) || key;
  let tools,
    primary,
    styleDialog,
    moreDialog,
    tour,
    tourPath,
    tourEntryPoint,
    tourStartedAt,
    tourOwner,
    owner,
    checkedOwner,
    renderedLocale,
    photoLayout;
  let activeStep = 0,
    steps = [],
    previousFocus,
    canGuide = () => true,
    timer,
    busy = false,
    automaticSuppressed = false,
    listingInteracted = false,
    accountRevision = 0;
  const key = (id) => "listingTourV1:" + id;
  function track(event, context = {}, expectedOwner = owner) {
    try { Promise.resolve(root.AutoListerTelemetry?.track(event, { mode: "v1", ...context }, "extension_content", false, expectedOwner)).catch(() => {}); } catch {}
  }
  const icons = root.AutoListerListingIcons || {};
  function button(label, icon, className = "al-tool-button") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.innerHTML = (icons[icon] || "") + "<span></span>";
    b.lastElementChild.textContent = t(label);
    b.lastElementChild.dataset.alCopy = label;
    return b;
  }
  function closePanel(panel) {
    if (!panel?.open) return;
    panel.close();
    panel.__trigger?.setAttribute("aria-expanded", "false");
  }
  function panel(label, trigger) {
    const d = document.createElement("dialog");
    d.className = "al-tools-panel";
    d.setAttribute("aria-label", t(label));
    const header = document.createElement("header"),
      title = document.createElement("strong");
    title.textContent = t(label);
    title.dataset.alCopy = label;
    const close = button("Close", "x", "al-icon-button");
    close.setAttribute("aria-label", t("Close"));
    close.lastElementChild.hidden = true;
    header.append(title, close);
    d.append(header);
    tools.append(d);
    d.__trigger = trigger;
    close.onclick = () => closePanel(d);
    d.addEventListener("close", () => {
      trigger.setAttribute("aria-expanded", "false");
      if (!tour && trigger.isConnected) trigger.focus({ preventScroll: true });
    });
    d.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusable = [
        ...d.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex='0']",
        ),
      ].filter(visible);
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    });
    d.addEventListener("click", (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closePanel(d);
    });
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.onclick = () => {
      finishTour(false, "panel_opened");
      closePanel(styleDialog);
      closePanel(moreDialog);
      d.showModal();
      trigger.setAttribute("aria-expanded", "true");
      positionPanel(d);
    };
    return d;
  }
  function positionPanel(d) {
    if (!d?.open) return;
    if (innerWidth <= 600 && d !== moreDialog) {
      d.style.left = "12px";
      d.style.top = "auto";
      return;
    }
    const a = d.__trigger.getBoundingClientRect();
    d.style.left =
      Math.max(
        12,
        Math.min(a.right - d.offsetWidth, innerWidth - d.offsetWidth - 12),
      ) + "px";
    d.style.top =
      Math.max(12, Math.min(a.bottom + 8, innerHeight - d.offsetHeight - 12)) +
      "px";
  }
  function arrangeToolbar() {
    if (!primary) return;
    const style = $("#quickvint-style-btn"),
      generate = $("#quickvint-gen-btn"),
      menu = $("#quickvint-more-btn"),
      model = $("#quickvint-model-control");
    if (!style || !generate || !menu) return;
    tools.classList.remove("al-compact-tools", "al-narrow-actions");
    const previous = style.getAttribute("style");
    style.style.width = "max-content";
    style.style.maxWidth = "none";
    const styleWidth = style.getBoundingClientRect().width;
    if (previous === null) style.removeAttribute("style");
    else style.setAttribute("style", previous);
    const actionWidth =
      generate.getBoundingClientRect().width +
      styleWidth +
      menu.getBoundingClientRect().width +
      16;
    if (innerWidth <= 600)
      tools.classList.toggle(
        "al-narrow-actions",
        actionWidth > primary.clientWidth,
      );
    else
      tools.classList.toggle(
        "al-compact-tools",
        actionWidth + (model ? model.getBoundingClientRect().width + 8 : 0) >
          primary.clientWidth,
      );
  }
  function placePhotoButton() {
    const upload = $("#quickvint-phone-btn");
    if (!upload) return;
    const grid = $(
      '[data-testid="media-upload-grid"],[data-testid="media-select-grid"]',
    );
    if (!grid) return;
    let bar = $("#quickvint-photo-tools");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "quickvint-photo-tools";
      bar.className = "al-photo-tools";
    }
    if (upload.parentElement !== bar) bar.append(upload);
    const dropzone = grid.closest('[data-testid="dropzone"]') || grid;
    const box = dropzone.getBoundingClientRect();
    const field =
      $('[data-testid="title"]') || $('[data-testid="title--input"]');
    const edge = field?.getBoundingClientRect() || box;
    const layout = [
      grid,
      box.top + scrollY,
      box.left + scrollX,
      edge.width,
      upload.offsetHeight,
      upload.offsetWidth,
    ];
    if (
      bar.isConnected &&
      photoLayout &&
      layout.every((v, i) => v === photoLayout[i])
    )
      return;
    photoLayout = layout;
    // Search only visible text immediately above the photo area. Hidden
    // "Drop files here" overlays are not headings and must never be anchors.
    const heading = [...document.querySelectorAll("h2,h3,label,p,span")]
      .filter((e) => {
        if (
          dropzone.contains(e) ||
          bar.contains(e) ||
          tools?.contains(e) ||
          e.querySelector("input,textarea,button") ||
          !visible(e)
        )
          return false;
        const s = getComputedStyle(e),
          r = e.getBoundingClientRect();
        return (
          s.visibility !== "hidden" &&
          s.opacity !== "0" &&
          r.width > 0 &&
          r.height > 0 &&
          e.textContent.trim().length > 0 &&
          e.textContent.trim().length < 60 &&
          r.bottom <= box.top + 1 &&
          r.bottom >= box.top - 100 &&
          Math.abs(r.left - edge.left) < 40
        );
      })
      .sort(
        (a, b) =>
          b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom,
      )[0];
    upload.style.position = "";
    upload.style.top = "";
    upload.style.right = "";
    if (heading) {
      if (bar.parentElement !== document.body) document.body.append(bar);
      const rect = heading.getBoundingClientRect();
      bar.classList.add("al-with-heading");
      bar.style.cssText =
        "position:absolute;margin:0;height:auto;left:" +
        Math.round(edge.left + scrollX) +
        "px;width:" +
        Math.round(edge.width) +
        "px;top:" +
        Math.round(
          rect.top + scrollY + (rect.height - (upload.offsetHeight || 40)) / 2,
        ) +
        "px";
    } else {
      // Safe fallback for a host variation with no recognizable heading.
      bar.classList.remove("al-with-heading");
      bar.style.cssText = "margin-bottom:12px";
      if (bar.nextElementSibling !== dropzone) dropzone.before(bar);
    }
  }
  function enhance(wrapper, options = {}) {
    if (options.canGuide) canGuide = options.canGuide;
    if (!wrapper) return;
    if (tools !== wrapper) {
      finishTour(false, "tools_replaced");
      tools = wrapper;
      primary = $(".quickvint-primary-tools", tools);
      if (!primary) return;
      tools.classList.add("al-listing-tools");
      const style = button("Writing style", "settings-2");
      style.id = "quickvint-style-btn";
      const more = button("Help", "circle-help");
      more.id = "quickvint-more-btn";
      more.setAttribute("aria-label", t("Help"));
      primary.append(style, more);
      styleDialog = panel("Writing style", style);
      moreDialog = panel("Help", more);
      moreDialog.classList.add("al-help-panel");
      const preferences = $(".quickvint-tool-options", tools);
      if (preferences) styleDialog.append(preferences);
      const report = $("#quickvint-report-btn"),
        collapse = $(".quickvint-tools-collapse", tools);
      if (report) {
        report.classList.add("al-tool-button");
        report.innerHTML =
          (icons["message-square"] || "") +
          '<span data-al-copy="Send feedback"></span>';
        report.lastElementChild.textContent = t("Send feedback");
        moreDialog.append(report);
        report.addEventListener("click", () => closePanel(moreDialog));
      }
      const replay = button("Quick tour", "circle-play");
      replay.id = "quickvint-tour-replay";
      moreDialog.insertBefore(replay, report || null);
      replay.onclick = () => {
        closePanel(moreDialog);
        startTour();
      };
      if (collapse) {
        collapse.innerHTML = '<span data-al-copy="Hide controls"></span>';
        const divider = document.createElement("hr");
        moreDialog.append(divider);
        collapse.firstElementChild.textContent = t("Hide controls");
        moreDialog.append(collapse);
        collapse.addEventListener("click", () => closePanel(moreDialog));
      }
      const gen = $("#quickvint-gen-btn .icon");
      if (gen) gen.innerHTML = icons["wand-sparkles"] || gen.innerHTML;
      const upload = $("#quickvint-phone-btn");
      if (upload) {
        upload.innerHTML =
          (icons["image-plus"] || "") +
          '<span class="al-upload-copy"><strong data-al-copy="Add photos"></strong><small data-al-copy="Phone or computer"></small></span>' +
          (icons["chevron-down"] || "");
        $("strong", upload).textContent = t("Add photos");
        $("small", upload).textContent = t("Phone or computer");
      }
      // Replace the old format drawings with the exact web-app icon set.
      for (const [format, icon, label] of [
        ["paragraphs", "align-left", "Paragraphs"],
        ["bullets", "list", "Bullet points"],
      ]) {
        const b = $('[data-format="' + format + '"]', tools);
        if (b) {
          b.innerHTML = (icons[icon] || "") + "<span></span>";
          b.lastElementChild.textContent = t(label);
          b.lastElementChild.dataset.alCopy = label;
        }
      }
      // Opening the existing note editor must not leave it behind a modal dialog.
      for (const [id, icon, label] of [
        ["hashtags", "hash", "Hashtags"],
        ["emoji", "smile", "Emojis"],
        ["description-footer", "sticky-note", "Seller note"],
      ]) {
        const b = $(
            "#quickvint-" +
              id +
              (id === "description-footer" ? "-btn" : "-toggle"),
            tools,
          ),
          labelEl = b?.querySelector(".quickvint-toggle-label");
        if (labelEl) {
          labelEl.innerHTML = (icons[icon] || "") + "<span></span>";
          labelEl.lastElementChild.dataset.alCopy = label;
          labelEl.lastElementChild.textContent = t(label);
        }
      }
      for (const [length, label] of [
        ["short", "Short"],
        ["long", "Long"],
      ]) {
        const b = $('[data-length="' + length + '"]', tools);
        if (b) {
          b.dataset.alCopy = label;
          b.textContent = t(label);
        }
      }
      styleDialog.addEventListener("click", (e) => {
        if (
          e.target.closest(
            "#quickvint-description-footer-btn,#quickvint-description-footer-edit-btn",
          )
        )
          closePanel(styleDialog);
      });
      primary.addEventListener("click", (e) => {
        if (
          e.target.closest(
            "#quickvint-gen-btn,#quickvint-model-btn,#quickvint-model-toggle",
          )
        )
          finishTour(false, e.target.closest("#quickvint-gen-btn") ? "generate_clicked" : "model_clicked");
      });
      upload?.addEventListener("click", () => finishTour(false, "upload_clicked"));
      if (!timer) {
        timer = setInterval(tick, 1000);
        void tick(false);
      }
    }
    const model = $("#quickvint-model-control");
    if (model && model.parentElement !== primary)
      primary.insertBefore(model, $("#quickvint-style-btn"));
    placePhotoButton();
    refreshCopy(true);
  }
  function visible(e) {
    return e?.isConnected && e.getClientRects().length > 0;
  }
  function obstructionReason() {
    if (!canGuide()) return "flow_busy";
    if (document.hidden) return "document_hidden";
    return [
        ...document.querySelectorAll(
          'dialog[open],[aria-modal="true"],[id^="quickvint-"][id$="-modal"]',
        ),
      ].some((e) => e !== tour && visible(e)) ? "other_dialog" : null;
  }
  function obstructed() {
    return Boolean(obstructionReason());
  }
  function clearHighlight() {
    document
      .querySelectorAll(".al-tour-target")
      .forEach((e) => e.classList.remove("al-tour-target"));
  }
  function finishTour(restore = true, reason = "interrupted") {
    const existed = Boolean(tour);
    if (existed && !["skipped", "completed", "replay"].includes(reason)) {
      track("listing_tour_closed", {
        count: activeStep + 1, reason, entryPoint: tourEntryPoint,
        durationMs: Math.max(0, Math.round(performance.now() - tourStartedAt)),
      }, tourOwner);
    }
    clearHighlight();
    tour?.remove();
    tour = null;
    steps = [];
    if (existed && restore)
      (visible(previousFocus)
        ? previousFocus
        : $("#quickvint-more-btn")
      )?.focus({ preventScroll: true });
  }
  function dismiss(reason = "skipped") {
    const expected = owner;
    if (tour) {
      track(reason === "completed" ? "listing_tour_completed" : "listing_tour_skipped", { count: activeStep + 1 });
    }
    if (expected)
      void chrome.storage.local.set({ [key(expected)]: true }).catch(() => {});
    checkedOwner = expected;
    finishTour(Boolean(tour?.contains(document.activeElement)), reason);
  }
  function positionTour() {
    if (!tour) return;
    const target = steps[activeStep]?.target;
    if (!visible(target)) {
      finishTour(true, "target_unavailable");
      return;
    }
    const rect = target.getBoundingClientRect();
    if (innerWidth <= 600) {
      tour.style.left = "12px";
      tour.style.top = "auto";
      tour.style.bottom = "12px";
      return;
    }
    tour.style.bottom = "auto";
    const field =
      $('[data-testid="title"]') || $('[data-testid="title--input"]');
    const bounds = field?.getBoundingClientRect();
    const left = bounds
      ? Math.max(
          bounds.left,
          Math.min(rect.left, bounds.right - tour.offsetWidth),
        )
      : rect.left;
    tour.style.left =
      Math.max(12, Math.min(left, innerWidth - tour.offsetWidth - 12)) + "px";
    const below = rect.bottom + 12;
    tour.style.top =
      Math.max(
        12,
        below + tour.offsetHeight <= innerHeight - 12
          ? below
          : rect.top - tour.offsetHeight - 12,
      ) + "px";
  }
  function renderStep(moveFocus = true) {
    const focusedKey = tour?.contains(document.activeElement)
      ? document.activeElement.querySelector("[data-al-copy]")?.dataset.alCopy
      : null;
    clearHighlight();
    const step = steps[activeStep];
    if (!step) return finishTour(true, "step_unavailable");
    step.target.classList.add("al-tour-target");
    const r = step.target.getBoundingClientRect();
    if (moveFocus && (r.top < 24 || r.bottom > innerHeight - (innerWidth <= 600 ? 240 : 40)))
      step.target.scrollIntoView({ block: "center", behavior: "instant" });
    tour.replaceChildren();
    const head = document.createElement("header"),
      count = document.createElement("span");
    count.className = "al-tour-count";
    count.textContent = activeStep + 1 + " / " + steps.length;
    const skip = button("Skip", "", "al-text-button");
    skip.onclick = () => dismiss();
    head.append(count, skip);
    const title = document.createElement("h2");
    title.id = "al-tour-title";
    title.textContent = t(step.title);
    const body = document.createElement("p");
    body.id = "al-tour-copy";
    body.textContent = t(step.copy);
    const footer = document.createElement("footer");
    if (activeStep) {
      const back = button("Back", "", "al-text-button");
      back.onclick = () => {
        activeStep--;
        renderStep();
      };
      footer.append(back);
    }
    const next = button(
      activeStep === steps.length - 1 ? "Done" : "Next",
      "",
      "al-tour-next",
    );
    next.onclick = () => {
      if (activeStep === steps.length - 1) dismiss("completed");
      else {
        activeStep++;
        renderStep();
      }
    };
    footer.append(next);
    tour.append(head, title, body, footer);
    positionTour();
    if (moveFocus) next.focus({ preventScroll: true });
    else if (focusedKey)
      [...tour.querySelectorAll("[data-al-copy]")]
        .find((e) => e.dataset.alCopy === focusedKey)
        ?.closest("button")
        ?.focus({ preventScroll: true });
  }
  async function startTour(entryPoint = "help") {
    const requestedPath = location.pathname;
    if (!owner) {
      const revision = accountRevision;
      const data = await chrome.storage.local.get("supabaseSession");
      if (revision !== accountRevision) return false;
      owner = data.supabaseSession?.user?.id;
    }
    if (location.pathname !== requestedPath || !/^\/items\/(new|[^/]+\/edit)\/?$/.test(requestedPath)) return false;
    if (!owner || obstructed()) return false;
    const nextSteps = [
      {
        target: $("#quickvint-phone-btn"),
        title: "Start with your photos",
        copy: "Upload directly in Vinted, or use Add photos to send them from your phone or computer.",
      },
      {
        target: $("#quickvint-gen-btn"),
        title: "Generate, then review",
        copy: "Create your title and description. Languages sit beside each field; Writing style holds your preferences.",
      },
      {
        target: $("#quickvint-model-control"),
        title: "Your model is optional",
        copy: "Preview or set up your model here. Turn it on to add two model photos to suitable items.",
      },
    ].filter((s) => visible(s.target) &&
      (s.target.id !== "quickvint-model-control" ||
        s.target.querySelector("#quickvint-model-btn:not(:disabled)")));
    if (!nextSteps.length) return false;
    previousFocus = document.activeElement;
    finishTour(false, "replay");
    steps = nextSteps;
    activeStep = 0;
    tour = document.createElement("section");
    tour.id = "quickvint-listing-tour";
    tourPath = requestedPath;
    tourEntryPoint = entryPoint;
    tourStartedAt = performance.now();
    tourOwner = owner;
    tour.className = "al-tour-card";
    tour.lang = root.AutoListerModelCopy.getLocale();
    tour.setAttribute("role", "dialog");
    tour.setAttribute("aria-labelledby", "al-tour-title");
    tour.setAttribute("aria-describedby", "al-tour-copy");
    tour.setAttribute("aria-live", entryPoint === "automatic" ? "polite" : "off");
    tour.tabIndex = -1;
    tour.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    });
    document.body.append(tour);
    renderStep(entryPoint !== "automatic");
    if (!tour?.isConnected) return false;
    checkedOwner = owner;
    void chrome.storage.local.set({ [key(owner)]: true }).catch(() => {});
    if (entryPoint === "automatic") track("listing_tour_offered", { entryPoint });
    track("listing_tour_started", { entryPoint });
    return true;
  }
  function refreshCopy(force = false) {
    if (!tools) return;
    const locale = root.AutoListerModelCopy?.getLocale() || "en";
    if (force || locale !== renderedLocale) {
      renderedLocale = locale;
      document
        .querySelectorAll("[data-al-copy]")
        .forEach((e) => (e.textContent = t(e.dataset.alCopy)));
      for (const d of [styleDialog, moreDialog])
        if (d) {
          const label = $("header strong", d)?.dataset.alCopy;
          d.setAttribute("aria-label", t(label));
        }
      $("#quickvint-more-btn")?.setAttribute("aria-label", t("Help"));
      $("#quickvint-phone-btn")?.setAttribute(
        "aria-label",
        t("Add photos") + ", " + t("Phone or computer"),
      );
      $("#quickvint-report-btn")?.setAttribute(
        "aria-label",
        t("Send feedback"),
      );
      $(".quickvint-tools-collapse", tools)?.setAttribute(
        "aria-label",
        t("Hide controls"),
      );
      const modelLabel = $("#quickvint-model-btn>span:not(.um-entry-new)");
      if (modelLabel)
        modelLabel.textContent =
          root.AutoListerModelCopy?.text("Your model") || "Your model";
      document
        .querySelectorAll(".al-tools-panel header .al-icon-button")
        .forEach((b) => b.setAttribute("aria-label", t("Close")));
      if (tour) renderStep(false);
      for (const d of [styleDialog, moreDialog]) positionPanel(d);
      for (const element of document.querySelectorAll(
        ".al-listing-tools,.al-photo-tools,.al-tour-card",
      ))
        element.lang = locale;
      refreshControlText();
      arrangeToolbar();
    }
  }
  function refreshControlText(control) {
    const labels = {
      "quickvint-description-length-toggle": "Description length",
      "quickvint-output-shape-toggle": "Description format",
      "quickvint-title-language-select": "Title language",
      "quickvint-description-language-select": "Description language",
      "quickvint-hashtags-toggle": "Hashtags",
      "quickvint-emoji-toggle": "Emojis",
      "quickvint-description-footer-btn": "Seller note",
      "quickvint-description-footer-edit-btn": "Edit seller note",
    };
    for (const [id, label] of Object.entries(labels)) {
      const el = control ? (control.id === id ? control : null) : $("#" + id);
      if (!el) continue;
      el.setAttribute("aria-label", t(label));
      if (control || !el.dataset.alTitleKey) {
        const needsPlan = /available during the free trial/.test(el.title);
        const failed = /could not be loaded/.test(el.title);
        el.dataset.alTitleKey = needsPlan
          ? "Requires a free trial, Pro or Business."
          : failed
            ? "Settings could not be loaded."
            : label;
      }
      el.title = t(el.dataset.alTitleKey);
      if (id.endsWith("language-select"))
        el.closest(".quickvint-lang-field")?.setAttribute("title", t(label));
    }
    for (const el of document.querySelectorAll(".quickvint-format-option"))
      el.setAttribute(
        "aria-label",
        t(el.dataset.format === "bullets" ? "Bullet points" : "Paragraphs"),
      );
    const model = $("#quickvint-model-btn"),
      toggle = $("#quickvint-model-toggle"),
      badge = model?.querySelector(".um-entry-new");
    if (model) {
      const name = root.AutoListerModelCopy.text("Your model");
      model.title = name;
      model.setAttribute("aria-label", name);
    }
    if (toggle)
      toggle.setAttribute(
        "aria-label",
        root.AutoListerModelCopy.text("Enable your model"),
      );
    if (badge) badge.textContent = root.AutoListerModelCopy.text("New");
  }
  async function tick(allowAutomatic = true) {
    if (busy) return;
    busy = true;
    try {
      if (
        !tools?.isConnected ||
        !/^\/items\/(new|[^/]+\/edit)\/?$/.test(location.pathname)
      ) {
        finishTour(false, "page_left");
        $("#quickvint-photo-tools")?.remove();
        return;
      }
      placePhotoButton();
      if (tour && tourPath !== location.pathname) finishTour(false, "page_changed");
      const revision = accountRevision;
      const data = await chrome.storage.local.get([
        "supabaseSession",
        "userProfile",
      ]);
      if (revision !== accountRevision) return;
      refreshCopy();
      const next = data.supabaseSession?.user?.id;
      if (next !== owner) {
        finishTour(false, "account_changed");
        owner = next;
        checkedOwner = undefined;
      }
      if (tour) {
        const reason = obstructionReason();
        if (reason) finishTour(false, reason);
      }
      if (
        !allowAutomatic ||
        !owner ||
        automaticSuppressed ||
        checkedOwner === owner ||
        location.pathname !== "/items/new" ||
        obstructed() ||
        tools.classList.contains("is-collapsed")
      )
        return;
      const expected = owner,
        expectedTools = tools,
        state = await chrome.storage.local.get(key(expected));
      if (owner !== expected || tools !== expectedTools || !tools?.isConnected ||
        location.pathname !== "/items/new" || automaticSuppressed || obstructed() ||
        tools.classList.contains("is-collapsed")) return;
      if (state[key(expected)]) {
        checkedOwner = expected;
        return;
      }
      const focused = document.activeElement;
      if (focused?.matches("input,textarea,select,[contenteditable='true']")) return;
      const claim = await chrome.runtime.sendMessage({
        type: "CLAIM_LISTING_TOUR", expectedUserId: expected,
      });
      if (!claim?.claimed || owner !== expected || tools !== expectedTools ||
        !tools?.isConnected || location.pathname !== "/items/new" ||
        automaticSuppressed || obstructed() || tools.classList.contains("is-collapsed") ||
        document.activeElement?.matches("input,textarea,select,[contenteditable='true']")) return;
      await startTour("automatic");
    } catch {
    } finally {
      busy = false;
    }
  }
  function accountChanged(changes, area) {
    if (area !== "local" || !changes.supabaseSession) return;
    const next = changes.supabaseSession.newValue?.user?.id;
    if (next === owner) return;
    if (!owner && next && !listingInteracted) automaticSuppressed = false;
    accountRevision++;
    owner = next;
    checkedOwner = undefined;
    finishTour(false, "account_changed");
  }
  chrome.storage.onChanged.addListener(accountChanged);
  function recordInteraction(event) {
    if (event.target?.closest?.("#quickvint-signin-btn")) return;
    automaticSuppressed = true;
    if (owner || event.target?.closest?.("input,textarea,select,[contenteditable='true'],[data-testid='media-upload-grid'],[data-testid='media-select-grid']"))
      listingInteracted = true;
  }
  document.addEventListener(
    "pointerdown",
    (e) => {
      recordInteraction(e);
      if (
        tour &&
        !tour.contains(e.target) &&
        !e.target.closest(".al-tour-target")
      )
        finishTour(false, "outside_pointer");
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      recordInteraction(e);
      if (tour && e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    },
    true,
  );
  document.addEventListener("input", (event) => {
    automaticSuppressed = true;
    listingInteracted = true;
    if (tour && !tour.contains(document.activeElement)) finishTour(false, event.isTrusted ? "field_input" : "programmatic_input");
  }, true);
  window.addEventListener("resize", () => {
    arrangeToolbar();
    placePhotoButton();
    positionPanel(styleDialog);
    positionPanel(moreDialog);
    positionTour();
  });
  window.addEventListener("scroll", positionTour, true);
  window.addEventListener(
    "pagehide",
    () => {
      clearInterval(timer);
      chrome.storage.onChanged.removeListener(accountChanged);
      finishTour(false, "page_hidden");
    },
    { once: true },
  );
  root.addEventListener("autolister-ui-language-change", () =>
    refreshCopy(true),
  );
  root.AutoListerListingTools = {
    enhance,
    startTour,
    refreshCopy,
    refreshControlText,
  };
})(globalThis);
