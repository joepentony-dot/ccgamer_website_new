// CCG Browser C64 bootstrap.
// GitHub Pages cannot emit custom COOP/COEP response headers, so the emulator
// installs a route-scoped service worker and reloads once under its isolated
// document response before importing the actual emulator application.

const WORKER_URL = "/emulator/c64/coi-service-worker.js";
const WORKER_SCOPE = "/emulator/c64/";
const RELOAD_KEY = "ccg.c64.coi.reloadCount";
const MAX_RELOADS = 2;

const machineState = document.querySelector("[data-machine-state]");
const stageNote = document.querySelector("[data-stage-note]");

function isolated() {
  return window.crossOriginIsolated === true && typeof SharedArrayBuffer !== "undefined";
}

function setStatus(title, note) {
  if (machineState) machineState.textContent = title;
  if (stageNote) stageNote.textContent = note;
}

function reloadCount() {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) || "0") || 0;
  } catch {
    return 0;
  }
}

function bumpReloadCount() {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(reloadCount() + 1));
  } catch {}
}

function clearReloadCount() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {}
}

function waitForState(worker, wanted, timeoutMs = 8000) {
  if (!worker || worker.state === wanted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener("statechange", changed);
      reject(new Error("Isolation service worker activation timed out."));
    }, timeoutMs);

    function changed() {
      if (worker.state === wanted) {
        clearTimeout(timer);
        worker.removeEventListener("statechange", changed);
        resolve();
      }
    }

    worker.addEventListener("statechange", changed);
  });
}

async function start() {
  if (isolated()) {
    clearReloadCount();
    await import("/js/ccg-c64/app.js");
    return;
  }

  if (!window.isSecureContext || !("serviceWorker" in navigator)) {
    setStatus(
      "BROWSER ISOLATION UNAVAILABLE",
      "This browser session cannot enable SharedArrayBuffer. Open the HTTPS page in a current Chrome, Edge or Firefox tab."
    );
    return;
  }

  if (reloadCount() >= MAX_RELOADS) {
    setStatus(
      "BROWSER ISOLATION FAILED",
      "The emulator could not enable SharedArrayBuffer after reloading. Close this tab, reopen the emulator and try again."
    );
    return;
  }

  setStatus(
    "PREPARING C64 RUNTIME",
    "Enabling the isolated browser runtime required by SID audio. The emulator will reload once automatically."
  );

  try {
    const registration = await navigator.serviceWorker.register(WORKER_URL, {
      scope: WORKER_SCOPE,
      updateViaCache: "none",
    });

    if (registration.installing) {
      await waitForState(registration.installing, "activated");
    } else if (registration.waiting) {
      const waiting = registration.waiting;
      waiting.postMessage({ type: "SKIP_WAITING" });
      await waitForState(waiting, "activated");
    }

    // The current document was received before the nested worker could stamp
    // COOP/COEP, so a reload is required even if clients.claim() has already
    // changed the controller. The next navigation is inside the worker's scope.
    bumpReloadCount();
    location.reload();
  } catch (error) {
    console.error("[ccg-c64] Could not prepare isolated runtime:", error);
    setStatus(
      "BROWSER ISOLATION FAILED",
      "The emulator could not prepare its SharedArrayBuffer runtime. Reload the page once; if it persists, reopen it in a current Chrome, Edge or Firefox tab."
    );
  }
}

void start();
