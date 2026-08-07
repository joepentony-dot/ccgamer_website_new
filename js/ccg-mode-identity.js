/* ============================================================
   CCG COMMODORE MODE IDENTITIES
   ------------------------------------------------------------
   Adds one compact mode-status strip and shared mode markers.
   It complements, rather than replaces, the existing Amiga
   window treatment and established mode toggle.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_MODE_IDENTITY_READY) return;
  window.CCG_MODE_IDENTITY_READY = true;

  const CSS_PATH = "/resources/css/ccg-mode-identity.css";
  const BAR_ID = "ccgModeIdentityBar";
  const EXCLUDED_PATH = /^\/(admin|auth|community)\//i;
  const root = document.documentElement;
  const state = {
    mode: "",
    observer: null,
    bodyObserver: null,
    timer: null
  };

  const MODE_COPY = Object.freeze({
    c64: {
      eyebrow: "COMMODORE 64 MODE",
      primary: "READY.",
      secondary: "64K RAM SYSTEM",
      tertiary: "C64 ARCHIVE ONLINE"
    },
    amiga: {
      eyebrow: "COMMODORE AMIGA MODE",
      primary: "WORKBENCH",
      secondary: "DF0: CCG ARCHIVE",
      tertiary: "AMIGA DESKTOP ONLINE"
    }
  });

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function modeFromDom() {
    const values = [
      root.getAttribute("data-ccg-mode"),
      root.getAttribute("data-mode"),
      document.body?.getAttribute("data-ccg-mode"),
      document.body?.getAttribute("data-mode")
    ].map((value) => String(value || "").toLowerCase());

    return values.some((value) => value.includes("amiga")) ? "amiga" : "c64";
  }

  function createStatusItem(className, label) {
    const item = document.createElement("span");
    item.className = className;
    item.textContent = label;
    return item;
  }

  function createIcon() {
    const icon = document.createElement("span");
    icon.className = "ccg-mode-identity__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
      <span class="ccg-mode-identity__c64-mark"><i></i><i></i><i></i><i></i></span>
      <span class="ccg-mode-identity__amiga-mark"><i></i></span>
    `;
    return icon;
  }

  function createBar() {
    const existing = document.getElementById(BAR_ID);
    if (existing) return existing;

    const header = document.querySelector("[data-ccg-header], .ccg-header");
    if (!header?.parentNode) return null;

    const bar = document.createElement("aside");
    bar.id = BAR_ID;
    bar.className = "ccg-mode-identity";
    bar.setAttribute("role", "status");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", "Current Commodore display mode");

    const inner = document.createElement("div");
    inner.className = "ccg-mode-identity__inner";

    const identity = document.createElement("div");
    identity.className = "ccg-mode-identity__name";
    identity.append(
      createIcon(),
      createStatusItem("ccg-mode-identity__eyebrow", ""),
      createStatusItem("ccg-mode-identity__primary", "")
    );

    const details = document.createElement("div");
    details.className = "ccg-mode-identity__details";
    details.append(
      createStatusItem("ccg-mode-identity__secondary", ""),
      createStatusItem("ccg-mode-identity__separator", "•"),
      createStatusItem("ccg-mode-identity__tertiary", "")
    );

    inner.append(identity, details);
    bar.appendChild(inner);
    header.parentNode.insertBefore(bar, header.nextSibling);
    return bar;
  }

  function updateBar() {
    const mode = modeFromDom();
    const copy = MODE_COPY[mode];
    const bar = createBar();
    if (!bar) return;

    const changed = Boolean(state.mode && state.mode !== mode);
    state.mode = mode;
    root.dataset.ccgIdentityMode = mode;
    bar.dataset.mode = mode;
    bar.querySelector(".ccg-mode-identity__eyebrow").textContent = copy.eyebrow;
    bar.querySelector(".ccg-mode-identity__primary").textContent = copy.primary;
    bar.querySelector(".ccg-mode-identity__secondary").textContent = copy.secondary;
    bar.querySelector(".ccg-mode-identity__tertiary").textContent = copy.tertiary;

    if (changed) {
      bar.classList.remove("is-changing");
      void bar.offsetWidth;
      bar.classList.add("is-changing");
      window.setTimeout(() => bar.classList.remove("is-changing"), 500);
    }
  }

  function scheduleUpdate() {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(updateBar, 40);
  }

  function observeModes() {
    if (!("MutationObserver" in window)) return;

    const options = {
      attributes: true,
      attributeFilter: ["data-mode", "data-ccg-mode"]
    };

    state.observer = new MutationObserver(scheduleUpdate);
    state.observer.observe(root, options);

    if (document.body) {
      state.bodyObserver = new MutationObserver(scheduleUpdate);
      state.bodyObserver.observe(document.body, options);
    }
  }

  function init() {
    if (EXCLUDED_PATH.test(window.location.pathname)) return;
    ensureCss();
    updateBar();
    observeModes();
    window.addEventListener("ccg:mode-changed", scheduleUpdate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
