/* CCG DEVICE-LOCAL PROFILE GAME LISTS */
(function () {
  "use strict";

  const KEY = "ccgPersonalGameLibraryV1";
  const $ = (selector) => document.querySelector(selector);
  let active = "played";
  const index = new Map();

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function write(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
      document.dispatchEvent(new Event("ccg:personal-library-updated"));
    } catch (error) {}
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function customLists(item) {
    if (Array.isArray(item?.customLists)) return item.customLists;
    if (Array.isArray(item?.custom_lists)) return item.custom_lists;
    return [];
  }

  function isEmpty(item) {
    return !(Array.isArray(item?.lists) ? item.lists : []).length
      && !customLists(item).length
      && !item?.note
      && !item?.rating;
  }

  function entriesFor(listName) {
    return Object.entries(read())
      .filter(([, value]) => Array.isArray(value.lists) && value.lists.includes(listName))
      .sort((a, b) => String(a[1].title || a[0]).localeCompare(String(b[1].title || b[0]), "en-GB"));
  }

  function remove(gameSlug, listName) {
    const data = read();
    const item = data[gameSlug];
    if (!item) return;

    item.lists = (Array.isArray(item.lists) ? item.lists : []).filter((value) => value !== listName);
    item.updatedAt = new Date().toISOString();
    if (isEmpty(item)) delete data[gameSlug];

    write(data);
    render();
  }

  function render() {
    const list = $("#personalGameLibraryList");
    const tabs = document.querySelectorAll("[data-profile-list-tab]");
    if (!list) return;

    tabs.forEach((button) => {
      const selected = button.dataset.profileListTab === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const rows = entriesFor(active);
    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = '<li class="profile-library__empty">No games in this list yet. Add them from any game page.</li>';
      return;
    }

    rows.forEach(([gameSlug, item]) => {
      const game = index.get(gameSlug) || {};
      const row = document.createElement("li");
      row.className = "profile-library-card";
      row.innerHTML = `
        <div>
          <div class="profile-library-card__title"><a href="/games/${encodeURIComponent(gameSlug)}/">${escapeHtml(item.title || game.title || gameSlug)}</a></div>
          <p class="profile-library-card__meta">${escapeHtml([item.system || game.system, item.year || game.year].filter(Boolean).join(" · ") || "CCG archive game")}</p>
          ${item.note ? `<p class="profile-library-card__note">${escapeHtml(item.note)}</p>` : ""}
        </div>
        <div class="profile-library-card__actions">
          ${item.rating ? `<span class="profile-library-card__rating">${escapeHtml(item.rating)}/10</span>` : ""}
          <button type="button" class="auth-btn">Remove</button>
        </div>`;
      row.querySelector("button")?.addEventListener("click", () => remove(gameSlug, active));
      list.appendChild(row);
    });
  }

  function clearAll() {
    if (!window.confirm("Clear all personal game lists, ratings, notes and custom collections on this browser?")) return;
    localStorage.removeItem(KEY);
    document.dispatchEvent(new Event("ccg:personal-library-updated"));
    render();
  }

  async function loadIndex() {
    try {
      const response = await fetch("/games/games-search.json", { cache: "no-store" });
      if (!response.ok) return;
      const games = await response.json();
      (Array.isArray(games) ? games : []).forEach((game) => {
        if (game.slug) index.set(String(game.slug), game);
      });
    } catch (error) {}
  }

  async function init() {
    if (!$("#personalGameLibrary")) return;
    await loadIndex();
    document.querySelectorAll("[data-profile-list-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        active = button.dataset.profileListTab;
        render();
      });
    });
    $("#clearPersonalLibrary")?.addEventListener("click", clearAll);
    document.addEventListener("ccg:personal-library-updated", render);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();