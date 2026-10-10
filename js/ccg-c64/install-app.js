/* Install the emulator as its own PWA without touching the general CCG app,
   the isolated C64 runtime worker or the desktop emulator layout. */
(() => {
  "use strict";
  const panel = document.querySelector("[data-c64-app-install]");
  const installButton = document.querySelector("[data-c64-app-install-button]");
  const help = document.querySelector("[data-c64-app-install-help]");
  const status = document.querySelector("[data-c64-app-install-status]");
  if (!panel || !installButton || !help || !status) return;

  let deferredPrompt = null;
  let busy = false;
  const installedMode = window.matchMedia?.("(display-mode: standalone)");
  // The main Cheeky Commodore Gamer PWA also runs in standalone mode.
  // Only the dedicated C64 launch URL identifies *this* standalone app.
  // Do not hide the C64 install option inside the separate website PWA.
  const isDedicatedC64Launch = () =>
    new URLSearchParams(window.location.search).get("source") === "installed-c64-app";
  const isInstalled = () =>
    isDedicatedC64Launch() && Boolean(installedMode?.matches || navigator.standalone === true);

  function refresh() {
    panel.hidden = isInstalled();
    if (panel.hidden) return;
    installButton.disabled = busy;
    installButton.textContent = busy ? "INSTALLING…" :
      deferredPrompt ? "INSTALL C64 APP" : "HOW TO INSTALL";
  }

  async function install() {
    if (busy || isInstalled()) return;
    if (!deferredPrompt) {
      help.open = true;
      status.textContent = "Follow the steps for your phone or tablet below.";
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    busy = true;
    refresh();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      status.textContent = choice?.outcome === "accepted"
        ? "Installation accepted. Look for CCG C64 on your home screen."
        : "Installation cancelled. You can install the C64 app another time.";
    } catch {
      help.open = true;
      status.textContent = "Use your browser's Add to Home Screen or Install app option.";
    } finally {
      busy = false;
      refresh();
    }
  }

  installButton.addEventListener("click", () => { void install(); });
  window.addEventListener("beforeinstallprompt", event => {
    // This event is not provided by Safari. Its manual instructions remain
    // available regardless of browser prompts or installer eligibility.
    event.preventDefault();
    deferredPrompt = event;
    refresh();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    status.textContent = "CCG C64 is installed on this device.";
    panel.hidden = true;
  });
  installedMode?.addEventListener?.("change", refresh);
  refresh();
})();
