/* ============================================================
   CCG MEMBER HUB — PERSONAL GAME LISTS
   ------------------------------------------------------------
   Renders the member's private browser-backed lists. Master game
   archive data is read-only. Safe CSV export is provided by the
   Member Hub data-safety module.
============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "ccgPersonalGameLibraryV1";
  const TOMBSTONE_KEY = "ccgPersonalGameLibraryTombstonesV1";
  const TABS = [
    ["played", "Played"],
    ["want", "Want to Play"],
    ["owned", "Owned as a Kid"],
    ["still", "Still Own"]
  ];

  const query = (selector) => document.querySelector(selector);
  let active = "played";
  const gameIndex = new Map();

  function readJson(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function readLibrary() {
    return readJson(STORAGE_KEY);
  }

  function readTombstones() {
    return readJson(TOMBSTONE_KEY);
  }

  function writeTombstones(value) {
    try {
      localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(value));
    } catch (error) {}
  }

  function markDeleted(slug, deletedAt = new Date().toISOString()) {
    const tombstones = readTombstones();
    const current = new Date(tombstones[slug] || 0).getTime();
    const requested = new Date(deletedAt || 0).getTime();
    if (!Number.isFinite(requested) || requested <= 0) return;
    if (!Number.isFinite(current) || requested >= current) {
      tombstones[slug] = new Date(requested).toISOString();
      writeTombstones(tombstones);
    }
  }

  function clearDeleted(slug) {
    const tombstones = readTombstones();
    if (!(slug in tombstones)) return;
    delete tombstones[slug];
    writeTombstones(tombstones);
  }

  function writeLibrary(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      document.dispatchEvent(new Event("ccg:personal-library-updated"));
    } catch (error) {}
  }

  function customLists(entry) {
    return Array.isArray(entry?.customLists)
      ? entry.customLists
      : Array.isArray(entry?.custom_lists) ? entry.custom_lists : [];
  }

  function entryIsEmpty(entry) {
    return !(Array.isArray(entry?.lists) ? entry.lists : []).length
      && !customLists(entry).length
      && !entry?.note
      && !entry?.rating;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function entriesFor(listKey) {
    return Object.entries(readLibrary())
      .filter(([, entry]) => Array.isArray(entry?.lists) && entry.lists.includes(listKey))
      .sort((a, b) => String(a[1]?.title || a[0]).localeCompare(String(b[1]?.title || b[0]), "en-GB"));
  }

  function removeFromList(slug, listKey) {
    const library = readLibrary();
    const item = library[slug];
    if (!item) return;

    const changedAt = new Date().toISOString();
    item.lists = (Array.isArray(item.lists) ? item.lists : []).filter((value) => value !== listKey);
    item.updatedAt = changedAt;

    if (entryIsEmpty(item)) {
      delete library[slug];
      markDeleted(slug, changedAt);
    } else {
      clearDeleted(slug);
    }

    writeLibrary(library);
    render();
  }

  function render() {
    const list = query("#personalGameLibraryList");
    const tabs = document.querySelectorAll("[data-profile-list-tab]");
    if (!list) return;

    tabs.forEach((button) => {
      const selected = button.dataset.profileListTab === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const rows = entriesFor(active);
    list.replaceChildren();

    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "profile-library__empty";
      empty.textContent = "No games in this list yet. Add them from any game page.";
      list.appendChild(empty);
      return;
    }

    rows.forEach(([slug, item]) => {
      const game = gameIndex.get(slug) || {};
      const listItem = document.createElement("li");
      listItem.className = "profile-library-card";
      listItem.innerHTML = `
        <div>
          <div class="profile-library-card__title">
            <a href="/games/${encodeURIComponent(slug)}/">${escapeHtml(item.title || game.title || slug)}</a>
          </div>
          <p class="profile-library-card__meta">${escapeHtml(
            [item.system || game.system, item.year || game.year].filter(Boolean).join(" · ") || "CCG archive game"
          )}</p>
          ${item.note ? `<p class="profile-library-card__note">${escapeHtml(item.note)}</p>` : ""}
        </div>
        <div class="profile-library-card__actions">
          ${item.rating ? `<span class="profile-library-card__rating">${escapeHtml(item.rating)}/10</span>` : ""}
          <button type="button" class="auth-btn">Remove</button>
        </div>
      `;
      listItem.querySelector("button")?.addEventListener("click", () => removeFromList(slug, active));
      list.appendChild(listItem);
    });
  }

  function clearAll() {
    if (!window.confirm("Clear all personal game lists, ratings, notes and private custom collections on this browser?")) return;
    const deletedAt = new Date().toISOString();
    Object.keys(readLibrary()).forEach((slug) => markDeleted(slug, deletedAt));
    localStorage.removeItem(STORAGE_KEY);
    document.dispatchEvent(new Event("ccg:personal-library-updated"));
    render();
  }

  async function loadIndex() {
    try {
      const response = await fetch("/games/games-search.json", { cache: "no-store" });
      if (!response.ok) return;
      const games = await response.json();
      (Array.isArray(games) ? games : []).forEach((game) => {
        if (game?.slug) gameIndex.set(String(game.slug), game);
      });
    } catch (error) {}
  }

  async function init() {
    if (!query("#personalGameLibrary")) return;
    await loadIndex();

    document.querySelectorAll("[data-profile-list-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        active = button.dataset.profileListTab;
        render();
      });
    });

    query("#clearPersonalLibrary")?.addEventListener("click", clearAll);
    document.addEventListener("ccg:personal-library-updated", render);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();
