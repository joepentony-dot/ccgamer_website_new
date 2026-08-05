/* ============================================================
   CCG MEMBER HUB — PRIVATE COLLECTION INSIGHTS
   Read-only statistics and random selection for custom collections.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_MEMBER_COLLECTION_INSIGHTS_READY) return;
  window.CCG_MEMBER_COLLECTION_INSIGHTS_READY = true;

  const STORAGE_KEY = "ccgPersonalGameLibraryV1";
  const CSS_PATH = "/resources/css/member-collection-insights.css";
  let lastRandomSlug = "";
  let observer = null;

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function readLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function normalizeName(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
  }

  function collectionKey(value) {
    return normalizeName(value).toLocaleLowerCase("en-GB");
  }

  function customNames(entry) {
    const values = Array.isArray(entry?.customLists)
      ? entry.customLists
      : Array.isArray(entry?.custom_lists) ? entry.custom_lists : [];
    return values.map(normalizeName).filter(Boolean);
  }

  function activeCollectionName() {
    const activeTab = document.querySelector(".member-custom-collections__tab.is-active");
    const tabName = activeTab?.querySelector("span")?.textContent;
    if (normalizeName(tabName)) return normalizeName(tabName);
    return normalizeName(document.getElementById("memberCustomCollectionRename")?.value);
  }

  function activeGames() {
    const activeName = activeCollectionName();
    if (!activeName) return [];
    const target = collectionKey(activeName);
    return Object.entries(readLibrary())
      .filter(([, entry]) => customNames(entry).some((name) => collectionKey(name) === target))
      .map(([slug, entry]) => ({ slug, ...entry }));
  }

  function systemCounts(games) {
    return games.reduce((counts, game) => {
      const system = String(game.system || "").trim().toLowerCase();
      if (system === "c64" || system === "commodore 64") counts.c64 += 1;
      else if (system === "amiga" || system === "commodore amiga") counts.amiga += 1;
      else counts.other += 1;
      return counts;
    }, { c64: 0, amiga: 0, other: 0 });
  }

  function yearRange(games) {
    const years = games
      .map((game) => Number.parseInt(game.year, 10))
      .filter((year) => Number.isInteger(year) && year >= 1970 && year <= 2100)
      .sort((a, b) => a - b);
    if (!years.length) return "Not recorded";
    return years[0] === years[years.length - 1]
      ? String(years[0])
      : `${years[0]}–${years[years.length - 1]}`;
  }

  function ratingAverage(games) {
    const ratings = games
      .map((game) => Number(game.rating))
      .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 10);
    if (!ratings.length) return "No ratings";
    const average = ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
    return `${average.toFixed(1)}/10`;
  }

  function ensurePanel() {
    const manager = document.getElementById("memberCustomCollectionManager");
    const title = document.getElementById("memberCustomCollectionActiveTitle");
    if (!manager || !title) return null;

    let panel = document.getElementById("memberCollectionInsights");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.className = "member-collection-insights";
    panel.id = "memberCollectionInsights";
    panel.setAttribute("aria-labelledby", "memberCollectionInsightsTitle");
    panel.innerHTML = `
      <div class="member-collection-insights__header">
        <div>
          <p class="member-collection-insights__kicker">Collection snapshot</p>
          <h5 id="memberCollectionInsightsTitle">Private Collection Insights</h5>
        </div>
        <button type="button" class="auth-btn" id="memberCollectionRandomButton">Choose a random game</button>
      </div>
      <div class="member-collection-insights__stats" id="memberCollectionInsightStats"></div>
      <div class="member-collection-insights__random" id="memberCollectionRandomResult" hidden></div>
    `;
    title.insertAdjacentElement("afterend", panel);
    document.getElementById("memberCollectionRandomButton")?.addEventListener("click", chooseRandomGame);
    return panel;
  }

  function stat(label, value) {
    const item = document.createElement("article");
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    return item;
  }

  function render() {
    const panel = ensurePanel();
    const manager = document.getElementById("memberCustomCollectionManager");
    const host = document.getElementById("memberCollectionInsightStats");
    if (!panel || !manager || !host) return;

    panel.hidden = manager.hidden;
    if (manager.hidden) return;

    const games = activeGames();
    const systems = systemCounts(games);
    const systemSummary = [
      systems.c64 ? `${systems.c64} C64` : "",
      systems.amiga ? `${systems.amiga} Amiga` : "",
      systems.other ? `${systems.other} other` : ""
    ].filter(Boolean).join(" · ") || "Not recorded";

    host.replaceChildren(
      stat("Games", String(games.length)),
      stat("Systems", systemSummary),
      stat("Release years", yearRange(games)),
      stat("Average personal rating", ratingAverage(games))
    );

    const randomButton = document.getElementById("memberCollectionRandomButton");
    if (randomButton) randomButton.disabled = games.length === 0;

    const currentRandom = document.getElementById("memberCollectionRandomResult");
    if (currentRandom && lastRandomSlug && !games.some((game) => game.slug === lastRandomSlug)) {
      currentRandom.hidden = true;
      currentRandom.replaceChildren();
      lastRandomSlug = "";
    }
  }

  function chooseRandomGame() {
    const games = activeGames();
    if (!games.length) return;

    const candidates = games.length > 1
      ? games.filter((game) => game.slug !== lastRandomSlug)
      : games;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    lastRandomSlug = selected.slug;

    const host = document.getElementById("memberCollectionRandomResult");
    if (!host) return;
    host.hidden = false;
    host.replaceChildren();

    const label = document.createElement("span");
    label.textContent = "Random pick";
    const link = document.createElement("a");
    link.href = `/games/${encodeURIComponent(selected.slug)}/`;
    link.textContent = selected.title || selected.slug;
    const meta = document.createElement("small");
    meta.textContent = [selected.system, selected.year, selected.rating ? `${selected.rating}/10` : ""]
      .filter(Boolean)
      .join(" · ") || "Open game page";

    host.append(label, link, meta);
  }

  function bindEvents() {
    document.addEventListener("ccg:personal-library-updated", () => window.setTimeout(render, 0));
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".member-custom-collections__tab")) window.setTimeout(render, 0);
    });
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) render();
    });
  }

  function initObserver() {
    if (ensurePanel()) {
      render();
      return;
    }
    if (observer) return;

    observer = new MutationObserver(() => {
      if (!ensurePanel()) return;
      observer.disconnect();
      observer = null;
      render();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => {
      observer?.disconnect();
      observer = null;
    }, 10000);
  }

  function init() {
    if (!document.getElementById("memberHub")) return;
    ensureCss();
    bindEvents();
    initObserver();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
