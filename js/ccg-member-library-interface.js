/* ============================================================
   CCG MEMBER HUB — PERSONAL LIBRARY INTERFACE RESTORATION
   ------------------------------------------------------------
   Restores the personal game-library surface expected by the
   existing profile-list, account-sync, custom-collection and
   member-data-safety modules without replacing newer Member Hub
   ratings/reviews or notification features.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_MEMBER_LIBRARY_INTERFACE_READY) return;
  window.CCG_MEMBER_LIBRARY_INTERFACE_READY = true;

  const PROFILE_LISTS_SRC = "/resources/js/auth/profile-lists.js";

  function isMemberHub() {
    return Boolean(
      document.getElementById("memberHub") ||
      document.documentElement.getAttribute("data-ccg-page") === "member-hub"
    );
  }

  function ensureNavLink() {
    const nav = document.querySelector(".member-hub-nav");
    if (!nav || nav.querySelector('a[href="#personalGameLibrary"]')) return;

    const link = document.createElement("a");
    link.href = "#personalGameLibrary";
    link.textContent = "My Games";

    const reviewsLink = nav.querySelector('a[href="#memberReviews"]');
    if (reviewsLink) nav.insertBefore(link, reviewsLink);
    else nav.appendChild(link);
  }

  function addStat(stats, id, label) {
    if (!stats || document.getElementById(id)) return;
    const link = document.createElement("a");
    link.className = "member-stat";
    link.href = "#personalGameLibrary";

    const value = document.createElement("strong");
    value.className = "member-stat__value";
    value.id = id;
    value.textContent = "0";

    const text = document.createElement("span");
    text.className = "member-stat__label";
    text.textContent = label;

    link.append(value, text);

    const ratings = document.getElementById("memberStatRatings")?.closest(".member-stat");
    if (ratings?.parentElement === stats) stats.insertBefore(link, ratings);
    else stats.appendChild(link);
  }

  function ensureStats() {
    const stats = document.getElementById("memberOverview");
    if (!stats) return;
    addStat(stats, "memberStatPlayed", "Played");
    addStat(stats, "memberStatWant", "Want to Play");
    addStat(stats, "memberStatOwned", "Owned as a Kid");
    addStat(stats, "memberStatStill", "Still Own");
  }

  function ensureLibrarySection() {
    const existing = document.getElementById("personalGameLibrary");
    if (existing) return existing;

    const reviews = document.getElementById("memberReviews");
    const favourites = document.getElementById("memberFavourites");
    const parent = reviews?.parentElement || favourites?.parentElement;
    if (!parent) return null;

    const section = document.createElement("section");
    section.id = "personalGameLibrary";
    section.className = "profile-library";
    section.setAttribute("aria-labelledby", "personalGameLibraryTitle");
    section.innerHTML = `
      <div class="profile-library__header">
        <div>
          <p class="member-panel__kicker">Your private collection</p>
          <h2 id="personalGameLibraryTitle" class="profile-library__title">My Personal Game Library</h2>
          <p class="profile-library__note">Record what you played, what you want to try and the games you owned. Your browser copy remains private while account synchronisation keeps the same personal library available on signed-in devices.</p>
        </div>
        <div class="profile-library__actions">
          <button type="button" class="auth-btn" id="clearPersonalLibrary">Clear personal lists</button>
        </div>
      </div>
      <div class="profile-library__tabs" role="group" aria-label="Personal game list">
        <button type="button" class="profile-library__tab is-active" data-profile-list-tab="played" aria-pressed="true">Played</button>
        <button type="button" class="profile-library__tab" data-profile-list-tab="want" aria-pressed="false">Want to Play</button>
        <button type="button" class="profile-library__tab" data-profile-list-tab="owned" aria-pressed="false">Owned as a Kid</button>
        <button type="button" class="profile-library__tab" data-profile-list-tab="still" aria-pressed="false">Still Own</button>
      </div>
      <ul id="personalGameLibraryList" class="profile-library__list"></ul>
    `;

    if (reviews?.parentElement === parent) parent.insertBefore(section, reviews);
    else if (favourites?.nextSibling) parent.insertBefore(section, favourites.nextSibling);
    else parent.appendChild(section);

    return section;
  }

  function ensureProfileListsScript() {
    const alreadyLoaded = Array.from(document.scripts).some((script) => {
      try {
        return new URL(script.src || "", window.location.href).pathname === PROFILE_LISTS_SRC;
      } catch (error) {
        return false;
      }
    });
    if (alreadyLoaded) return;

    const script = document.createElement("script");
    script.src = PROFILE_LISTS_SRC;
    script.async = false;
    script.setAttribute("data-ccg-profile-lists-restored", "true");
    script.addEventListener("load", () => {
      document.dispatchEvent(new Event("ccg:personal-library-updated"));
    }, { once: true });
    document.body.appendChild(script);
  }

  function restore() {
    if (!isMemberHub()) return false;
    ensureNavLink();
    ensureStats();
    const section = ensureLibrarySection();
    if (!section) return false;
    ensureProfileListsScript();
    document.dispatchEvent(new CustomEvent("ccg:member-library-interface-ready"));
    window.requestAnimationFrame(() => {
      document.dispatchEvent(new Event("ccg:personal-library-updated"));
    });
    return true;
  }

  function init() {
    if (restore()) return;

    const root = document.getElementById("memberHub") || document.body;
    const observer = new MutationObserver(() => {
      if (!restore()) return;
      observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
