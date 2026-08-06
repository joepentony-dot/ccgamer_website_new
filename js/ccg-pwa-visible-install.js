/* ============================================================
   CCG VISIBLE APP INSTALLATION
   ------------------------------------------------------------
   Adds a permanent navigation route and controls the dedicated
   installation page without changing the restrained prompt.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_PWA_VISIBLE_INSTALL_READY) return;
  window.CCG_PWA_VISIBLE_INSTALL_READY = true;

  const INSTALL_PAGE = "/install-app.html";
  const state = {
    deferredPrompt: null,
    installed: false
  };

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
    return ios && /WebKit/.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
  }

  function ensureNavigationLink() {
    if (document.querySelector("[data-ccg-pwa-install-nav]")) return;
    const list = document.querySelector("[data-ccg-nav-secondary]");
    if (!list) return;

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = INSTALL_PAGE;
    link.className = "ccg-nav__link";
    link.textContent = "Install CCG App";
    link.setAttribute("data-ccg-pwa-install-nav", "true");
    item.appendChild(link);
    list.appendChild(item);

    window.requestAnimationFrame(() => {
      window.CCGUnifiedNavCore?.applyNavGlowPatch?.();
      window.dispatchEvent(new Event("resize"));
    });
  }

  function statusNodes() {
    return {
      button: document.querySelector("[data-ccg-pwa-install-action]"),
      status: document.querySelector("[data-ccg-pwa-status]"),
      note: document.querySelector("[data-ccg-pwa-install-note]")
    };
  }

  function setStatus(message, buttonLabel, disabled = false) {
    const { button, status } = statusNodes();
    if (status) status.textContent = message;
    if (button && buttonLabel) button.textContent = buttonLabel;
    if (button) button.disabled = disabled;
  }

  function refreshInstallPage() {
    if (!document.querySelector("[data-ccg-pwa-install-page]")) return;

    if (state.installed || isStandalone()) {
      setStatus("CCG is already installed and running as an app on this device.", "CCG App Installed", true);
      return;
    }

    if (state.deferredPrompt) {
      setStatus("This browser is ready to install CCG.", "Install CCG App", false);
      return;
    }

    if (isIosSafari()) {
      setStatus("Use Safari's Share menu, then choose Add to Home Screen.", "Show iPhone/iPad Steps", false);
      return;
    }

    setStatus("Use your browser menu if the native install button is not available yet.", "Show Installation Help", false);
  }

  async function requestInstall() {
    const { button, note } = statusNodes();

    if (state.installed || isStandalone()) {
      refreshInstallPage();
      return;
    }

    if (state.deferredPrompt) {
      const promptEvent = state.deferredPrompt;
      if (button) {
        button.disabled = true;
        button.textContent = "Opening install prompt…";
      }

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        state.deferredPrompt = null;
        if (choice?.outcome === "accepted") {
          setStatus("Installation accepted. CCG will appear with your other apps.", "Installing CCG…", true);
        } else {
          setStatus("Installation was cancelled. You can return here at any time.", "Install CCG App", false);
        }
      } catch (error) {
        setStatus("The browser could not open its install prompt. Use the browser-menu instructions below.", "Show Installation Help", false);
      }
      return;
    }

    if (isIosSafari()) {
      setStatus("In Safari, tap Share and choose Add to Home Screen, then tap Add.", "Instructions Shown", true);
      if (note) note.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setStatus("Open the browser menu and choose Install app, Install this site as an app, or Add to Home screen.", "Instructions Shown", true);
    document.querySelector(".ccg-pwa-install-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindInstallPage() {
    const { button } = statusNodes();
    if (!button || button.dataset.ccgPwaBound === "true") return;
    button.dataset.ccgPwaBound = "true";
    button.addEventListener("click", () => { void requestInstall(); });
    refreshInstallPage();
  }

  function init() {
    ensureNavigationLink();
    bindInstallPage();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    refreshInstallPage();
  });

  window.addEventListener("appinstalled", () => {
    state.installed = true;
    state.deferredPrompt = null;
    refreshInstallPage();
  });

  window.CCGPWAInstall = Object.freeze({
    requestInstall,
    refresh: refreshInstallPage,
    isInstalled: () => state.installed || isStandalone()
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
