/* CCG visitor statistics — public GoatCounter counters, no API token.
 *
 * The archive-wide EVENT is counted once per eight-hour GoatCounter session,
 * when Sessions is enabled; it is not a lifetime count of unique people.
 * Game views use GoatCounter's existing per-path visit counts.
 *
 * Public display needs GoatCounter Settings -> Site settings ->
 * "Allow adding visitor counts on your website" enabled.
 */
(function () {
  "use strict";

  if (window.CCGVisitorMetricsInitialized) return;
  window.CCGVisitorMetricsInitialized = true;

  var COUNTER_BASE = "https://cheekycommodoregamer.goatcounter.com/counter/";
  var SESSION_EVENT = "ccg-archive-session";
  var STARTED = false;

  function isPublicPage() {
    var path = window.location.pathname || "/";
    return !/^\/(?:admin|auth)(?:\/|$)/i.test(path) &&
      !document.querySelector('meta[http-equiv="refresh" i]') &&
      document.documentElement.getAttribute("data-ccg-page") !== "admin";
  }

  function getGamePath() {
    if (document.documentElement.getAttribute("data-ccg-page") !== "single-game") {
      return null;
    }
    var canonical = document.querySelector('link[rel="canonical"][href]');
    if (!canonical) return null;
    try {
      var url = new URL(canonical.href, location.origin);
      if (url.origin !== location.origin ||
        !/^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname)) return null;
      return url.pathname;
    } catch (_) {
      return null;
    }
  }

  function fetchPublicCount(path, node) {
    if (!node || !window.fetch) return;
    // Only URLs from a validated canonical game path or a fixed event name.
    var url = COUNTER_BASE + encodeURIComponent(path) + ".json";
    fetch(url, { credentials: "omit", mode: "cors" })
      .then(function (response) {
        if (!response.ok) throw new Error("GoatCounter public counter unavailable");
        return response.json();
      })
      .then(function (result) {
        if (!result || typeof result.count !== "string" ||
          !/^\d[\d,.\s]*$/.test(result.count)) {
          throw new Error("Invalid GoatCounter public count");
        }
        node.textContent = result.count;
        node.setAttribute("data-ccg-counter-loaded", "true");
      })
      .catch(function () {
        // Privacy settings, blockers, network failures and not-yet-created
        // counters leave the neutral placeholder; never invent a number.
        node.textContent = "—";
        node.setAttribute("data-ccg-counter-loaded", "false");
      });
  }

  function addGameCounter() {
    var path = getGamePath();
    if (!path || document.getElementById("gameNotFound")?.hidden === false) return;

    var content = document.querySelector(".game-hero__content");
    if (!content || document.getElementById("ccg-game-view-count")) return;

    var badge = document.createElement("div");
    badge.className = "ccg-game-views";
    badge.setAttribute("aria-label", "Recognised visits to this game page");
    badge.title = "Visits to this game; repeat visits during one eight-hour session are not counted again when GoatCounter Sessions is enabled.";

    var label = document.createElement("span");
    label.className = "ccg-game-views__label";
    label.textContent = "Game views";

    var count = document.createElement("span");
    count.className = "ccg-game-views__count";
    count.id = "ccg-game-view-count";
    count.textContent = "—";

    badge.appendChild(label);
    badge.appendChild(count);

    var actions = content.querySelector(".game-hero__actions");
    if (actions) content.insertBefore(badge, actions);
    else content.appendChild(badge);

    fetchPublicCount(path, count);
  }

  function countArchiveSessionOnce() {
    // This is an EVENT with the same identifier on every public page. GoatCounter
    // deduplicates an event path once per session when Sessions is enabled.
    // No browser ID, cookie, localStorage fingerprint or long-lived identifier.
    if (!isPublicPage() || STARTED) return;

    var tries = 0;
    var handle = window.setInterval(function () {
      tries++;
      if (window.goatcounter && typeof window.goatcounter.count === "function") {
        window.clearInterval(handle);
        STARTED = true;
        try {
          window.goatcounter.count({
            path: SESSION_EVENT,
            title: "CCG Archive Visitor Sessions",
            event: true
          });
        } catch (_) {
          // Tracking blockers and network failures must not affect the archive.
        }
      } else if (tries >= 32) {
        window.clearInterval(handle);
      }
    }, 250);
  }

  function initialize() {
    if (!isPublicPage()) return;

    var homeCount = document.getElementById("ccg-visit-count");
    if (homeCount) {
      // Starts when this shared archive session event is first deployed. Existing
      // historical page-view totals cannot be converted to unique people.
      fetchPublicCount(SESSION_EVENT, homeCount);
    }

    addGameCounter();
    countArchiveSessionOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
