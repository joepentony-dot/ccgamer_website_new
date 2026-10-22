/* CCG visitor statistics — public GoatCounter counters, no API token.
 *
 * Archive visitors: one event per browser per rolling 60-minute window,
 * across all public pages. This is not a count of lifetime unique humans.
 * Game views: all recorded game page loads, including refreshes.
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
  var SESSION_KEY = "ccg-archive-hourly-visit-v1";
  var SESSION_WINDOW_MS = 60 * 60 * 1000;
  var STARTED = false;

  function claimHourlyVisit() {
    // No individual ID is stored: only a timestamp local to this browser.
    // Fail closed when local storage is blocked; otherwise frequent page loads
    // would inflate the visitor number instead of respecting the one-hour rule.
    try {
      var now = Date.now();
      var last = Number(window.localStorage.getItem(SESSION_KEY));
      if (Number.isFinite(last) && last > 0 && now >= last &&
          (now - last) < SESSION_WINDOW_MS) return false;
      window.localStorage.setItem(SESSION_KEY, String(now));
      return true;
    } catch (_) {
      return false;
    }
  }

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
        // GoatCounter returns JSON with count "0" and HTTP 404 for new paths.
        if (!response.ok && response.status !== 404) throw new Error("GoatCounter public counter unavailable");
        return response.json();
      })
      .then(function (result) {
        if (!result || typeof result.count !== "string" ||
          !/^\d[\d,.\s\u2019\u0027]*$/.test(result.count)) {
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

    var footer = document.querySelector(".ccg-footer--game");
    if (!footer || document.getElementById("ccg-game-view-count")) return;

    var badge = document.createElement("div");
    badge.className = "ccg-game-views";
    badge.setAttribute("aria-label", "Total recorded views of this game page");
    badge.title = "Page loads for this game, including repeated visits and refreshes. Browser blocking can prevent tracking.";

    var label = document.createElement("span");
    label.className = "ccg-game-views__label";
    label.textContent = "Game views";

    var count = document.createElement("span");
    count.className = "ccg-game-views__count";
    count.id = "ccg-game-view-count";
    count.textContent = "—";

    badge.appendChild(label);
    badge.appendChild(count);

    footer.appendChild(badge);

    fetchPublicCount(path, count);
  }

  function countArchiveSessionOnce() {
    // All public pages contribute to the same archive event. Our browser-local
    // timestamp enforces a rolling one-hour window. no_session tells GoatCounter
    // to count each permitted event even while its built-in 8-hour sessions are on.
    if (!isPublicPage() || STARTED) return;

    var tries = 0;
    var handle = window.setInterval(function () {
      tries++;
      if (window.goatcounter && typeof window.goatcounter.count === "function") {
        window.clearInterval(handle);
        STARTED = true;
        try {
          if (!claimHourlyVisit()) return;
          window.goatcounter.count({
            path: SESSION_EVENT,
            title: "CCG Archive Hourly Visits",
            event: true,
            no_session: true
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
      var homeLabel = document.querySelector(".ccg-footer-home__status");
      if (homeLabel) {
        homeLabel.textContent = "Archive visits";
        homeLabel.title = "Approximate visitor sessions across the archive, at most one per browser per rolling hour. Not distinct lifetime people.";
      }
      // This event began with the new counter. Historical pageviews cannot be
      // retrospectively translated into unique visitors.
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
