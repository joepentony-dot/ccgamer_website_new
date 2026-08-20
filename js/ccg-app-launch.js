/* ============================================================
   CCG INSTALLED APP LAUNCH HANDOFF
   ------------------------------------------------------------
   Keeps the branded launch bridge short, preserves query intent,
   and hands control to the public home page without history noise.
============================================================ */

(function () {
  "use strict";

  const HOME_URL = "/home.html?source=pwa";
  const DEFAULT_DELAY = 1150;
  const REDUCED_DELAY = 350;

  let handoffTimer = null;
  let handedOff = false;

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }

  function handoff() {
    if (handedOff) return;
    handedOff = true;
    window.location.replace(HOME_URL);
  }

  function scheduleHandoff() {
    window.clearTimeout(handoffTimer);
    handoffTimer = window.setTimeout(
      handoff,
      prefersReducedMotion() ? REDUCED_DELAY : DEFAULT_DELAY
    );
  }

  const enter = document.querySelector("[data-ccg-app-launch-enter]");
  if (enter) {
    enter.addEventListener("click", function () {
      window.clearTimeout(handoffTimer);
      handedOff = true;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleHandoff, { once: true });
  } else {
    scheduleHandoff();
  }

  window.addEventListener("pageshow", function (event) {
    if (event.persisted && !handedOff) scheduleHandoff();
  });
})();
