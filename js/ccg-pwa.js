/* ============================================================
   CCG INSTALLABLE APP
   ------------------------------------------------------------
   Registers the public offline service worker, injects manifest
   metadata and presents restrained install/update controls.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_PWA_READY) return;
  window.CCG_PWA_READY = true;

  const MANIFEST_PATH = "/manifest.webmanifest";
  const SERVICE_WORKER_PATH = "/service-worker.js";
  const ICON_PATH = "/resources/images/ccg-app-icon.svg";
  const CSS_PATH = "/resources/css/ccg-pwa.css";
  const VISIT_KEY = "ccg_pwa_public_visits";
  const DISMISS_KEY = "ccg_pwa_dismissed_until";
  const UPDATE_CHECK_KEY = "ccg_pwa_last_update_check";
  const INSTALL_DELAY = 9000;
  const DISMISS_DAYS = 14;
  const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
  const PRIVATE_AREAS = ["/admin/", "/community/", "/auth/"];

  const state = {
    deferredPrompt: null,
    registration: null,
    installPanel: null,
    updatePanel: null,
    reloadingForUpdate: false,
    installTimer: null,
    updateCheckPromise: null
  };

  function isPrivateArea() {
    const path = String(window.location.pathname || "/");
    return PRIVATE_AREAS.some((prefix) => path.startsWith(prefix));
  }

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)").matches
      || window.matchMedia?.("(display-mode: fullscreen)").matches
      || window.navigator.standalone === true;
  }

  function isIosSafari() {
    const agent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const ios = /iPad|iPhone|iPod/.test(agent)
      || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const webkit = /WebKit/.test(agent);
    const excluded = /CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
    return ios && webkit && !excluded;
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {}
  }

  function ensureLink(rel, href, attributes = {}) {
    let link = document.querySelector(`link[rel="${rel}"][href="${href}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
      document.head.appendChild(link);
    }
    return link;
  }

  function ensureMeta(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    }
    return meta;
  }

  function ensureMetadata() {
    ensureLink("manifest", MANIFEST_PATH);
    ensureLink("icon", ICON_PATH, { type: "image/svg+xml" });
    ensureLink("apple-touch-icon", ICON_PATH);
    ensureLink("stylesheet", CSS_PATH);
    ensureMeta("application-name", "Cheeky Commodore Gamer");
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("apple-mobile-web-app-title", "CCG");
    ensureMeta("mobile-web-app-capable", "yes");
  }

  function publicVisitCount() {
    const current = Number.parseInt(storageGet(VISIT_KEY) || "0", 10);
    const next = Number.isFinite(current) ? Math.min(current + 1, 50) : 1;
    storageSet(VISIT_KEY, next);
    return next;
  }

  function promptDismissed() {
    const until = Number.parseInt(storageGet(DISMISS_KEY) || "0", 10);
    return Number.isFinite(until) && until > Date.now();
  }

  function dismissForDays(days = DISMISS_DAYS) {
    storageSet(DISMISS_KEY, Date.now() + (days * 24 * 60 * 60 * 1000));
  }

  function removePanel(panel) {
    if (!panel) return;
    panel.classList.add("is-leaving");
    window.setTimeout(() => panel.remove(), 180);
  }

  function closeInstallPanel({ remember = false } = {}) {
    if (remember) dismissForDays();
    removePanel(state.installPanel);
    state.installPanel = null;
  }

  function buildPanel(kind, titleText, messageText) {
    const panel = document.createElement("aside");
    panel.className = `ccg-pwa-panel ccg-pwa-panel--${kind}`;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", titleText);

    const icon = document.createElement("img");
    icon.className = "ccg-pwa-panel__icon";
    icon.src = ICON_PATH;
    icon.alt = "";
    icon.width = 58;
    icon.height = 58;

    const copy = document.createElement("div");
    copy.className = "ccg-pwa-panel__copy";

    const title = document.createElement("strong");
    title.className = "ccg-pwa-panel__title";
    title.textContent = titleText;

    const message = document.createElement("p");
    message.className = "ccg-pwa-panel__message";
    message.textContent = messageText;

    copy.append(title, message);

    const actions = document.createElement("div");
    actions.className = "ccg-pwa-panel__actions";

    panel.append(icon, copy, actions);
    return { panel, actions, message };
  }

  async function runInstallPrompt(button) {
    const promptEvent = state.deferredPrompt;
    if (!promptEvent) return;

    button.disabled = true;
    button.textContent = "Opening…";

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      state.deferredPrompt = null;
      if (choice?.outcome === "accepted") {
        closeInstallPanel();
      } else {
        dismissForDays(7);
        closeInstallPanel();
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = "Install CCG";
    }
  }

  function showIosInstructions(messageNode, installButton) {
    messageNode.textContent = "In Safari, tap Share and choose Add to Home Screen. CCG will then open from its own icon.";
    installButton.textContent = "Instructions shown";
    installButton.disabled = true;
  }

  function showInstallPanel() {
    if (state.installPanel || isStandalone() || isPrivateArea() || promptDismissed()) return;
    if (!state.deferredPrompt && !isIosSafari()) return;

    const { panel, actions, message } = buildPanel(
      "install",
      "Install Cheeky Commodore Gamer",
      "Add CCG to your device for faster access and a public offline fallback."
    );

    const install = document.createElement("button");
    install.type = "button";
    install.className = "ccg-pwa-button ccg-pwa-button--primary";
    install.textContent = "Install CCG";
    install.addEventListener("click", () => {
      if (state.deferredPrompt) void runInstallPrompt(install);
      else showIosInstructions(message, install);
    });

    const later = document.createElement("button");
    later.type = "button";
    later.className = "ccg-pwa-button";
    later.textContent = "Not now";
    later.addEventListener("click", () => closeInstallPanel({ remember: true }));

    actions.append(install, later);
    document.body.appendChild(panel);
    state.installPanel = panel;
    window.requestAnimationFrame(() => panel.classList.add("is-visible"));
  }

  function scheduleInstallPanel(visits) {
    window.clearTimeout(state.installTimer);
    if (visits < 2 || promptDismissed() || isStandalone() || isPrivateArea()) return;
    state.installTimer = window.setTimeout(showInstallPanel, INSTALL_DELAY);
  }

  function closeUpdatePanel() {
    removePanel(state.updatePanel);
    state.updatePanel = null;
  }

  function activateUpdate(button) {
    const waiting = state.registration?.waiting;
    if (!waiting) {
      closeUpdatePanel();
      return;
    }
    button.disabled = true;
    button.textContent = "Updating…";
    state.reloadingForUpdate = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  function showUpdatePanel() {
    if (state.updatePanel || !state.registration?.waiting) return;

    const { panel, actions } = buildPanel(
      "update",
      "CCG update ready",
      "A newer version of the website is available. Reload when convenient."
    );

    const update = document.createElement("button");
    update.type = "button";
    update.className = "ccg-pwa-button ccg-pwa-button--primary";
    update.textContent = "Reload now";
    update.addEventListener("click", () => activateUpdate(update));

    const later = document.createElement("button");
    later.type = "button";
    later.className = "ccg-pwa-button";
    later.textContent = "Later";
    later.addEventListener("click", closeUpdatePanel);

    actions.append(update, later);
    document.body.appendChild(panel);
    state.updatePanel = panel;
    window.requestAnimationFrame(() => panel.classList.add("is-visible"));
  }

  function showNetworkNotice(online) {
    let notice = document.getElementById("ccgPwaNetworkNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "ccgPwaNetworkNotice";
      notice.className = "ccg-pwa-network";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      document.body.appendChild(notice);
    }

    notice.textContent = online
      ? "Connection restored."
      : "You are offline. Cached public pages may remain available.";
    notice.dataset.state = online ? "online" : "offline";
    notice.classList.add("is-visible");

    window.clearTimeout(notice._ccgTimer);
    notice._ccgTimer = window.setTimeout(() => notice.classList.remove("is-visible"), online ? 2600 : 5200);
  }

  function watchRegistration(registration) {
    state.registration = registration;
    if (registration.waiting && navigator.serviceWorker.controller) showUpdatePanel();

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdatePanel();
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!state.reloadingForUpdate) return;
      state.reloadingForUpdate = false;
      window.location.reload();
    });
  }

  function updateCheckDue(force = false) {
    if (force) return true;
    const last = Number.parseInt(storageGet(UPDATE_CHECK_KEY) || "0", 10);
    return !Number.isFinite(last) || Date.now() - last >= UPDATE_CHECK_INTERVAL;
  }

  async function checkForServiceWorkerUpdate(registration, { force = false } = {}) {
    if (!registration || !navigator.onLine || !updateCheckDue(force)) return;
    if (state.updateCheckPromise) return state.updateCheckPromise;

    storageSet(UPDATE_CHECK_KEY, Date.now());
    state.updateCheckPromise = registration.update()
      .then(() => {
        if (registration.waiting && navigator.serviceWorker.controller) showUpdatePanel();
      })
      .catch((error) => {
        console.warn("[ccg-pwa] Service worker update check unavailable", error);
      })
      .finally(() => {
        state.updateCheckPromise = null;
      });

    return state.updateCheckPromise;
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext && !/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)) return;

    try {
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
        scope: "/",
        updateViaCache: "none"
      });
      watchRegistration(registration);
      await checkForServiceWorkerUpdate(registration);
      window.addEventListener("focus", () => {
        void checkForServiceWorkerUpdate(registration);
      }, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void checkForServiceWorkerUpdate(registration);
        }
      });
    } catch (error) {
      console.warn("[ccg-pwa] Service worker registration unavailable", error);
    }
  }

  function bindInstallEvents(visits) {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
      scheduleInstallPanel(visits);
    });

    window.addEventListener("appinstalled", () => {
      state.deferredPrompt = null;
      storageSet(DISMISS_KEY, 0);
      storageSet(UPDATE_CHECK_KEY, 0);
      closeInstallPanel();
      document.dispatchEvent(new CustomEvent("ccg:pwa-installed"));
    });
  }

  function init() {
    ensureMetadata();
    void registerServiceWorker();

    if (isPrivateArea()) return;
    const visits = publicVisitCount();
    bindInstallEvents(visits);
    if (isIosSafari()) scheduleInstallPanel(visits);

    window.addEventListener("online", () => {
      showNetworkNotice(true);
      if (state.registration) void checkForServiceWorkerUpdate(state.registration, { force: true });
    });
    window.addEventListener("offline", () => showNetworkNotice(false));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
