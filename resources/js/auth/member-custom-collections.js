/* ============================================================
   CCG MEMBER HUB — PRIVATE CUSTOM COLLECTIONS
   ------------------------------------------------------------
   Manages named collections stored inside the existing personal
   game library. The account sync module already synchronises the
   customLists field; this module adds the private management UI.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_MEMBER_CUSTOM_COLLECTIONS_READY) return;
  window.CCG_MEMBER_CUSTOM_COLLECTIONS_READY = true;

  const STORAGE_KEY = "ccgPersonalGameLibraryV1";
  const CSS_PATH = "/resources/css/member-custom-collections.css";
  const NAME_LIMIT = 40;
  let activeCollection = "";

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function readLibrary() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function writeLibrary(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      document.dispatchEvent(new Event("ccg:personal-library-updated"));
    } catch (error) {}
  }

  function normalizeName(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, NAME_LIMIT);
  }

  function customNames(entry) {
    const source = Array.isArray(entry?.customLists)
      ? entry.customLists
      : Array.isArray(entry?.custom_lists) ? entry.custom_lists : [];
    const seen = new Set();
    return source.map(normalizeName).filter((name) => {
      const key = name.toLocaleLowerCase("en-GB");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function collectionMap(library = readLibrary()) {
    const map = new Map();
    Object.entries(library).forEach(([slug, entry]) => {
      customNames(entry).forEach((name) => {
        const key = name.toLocaleLowerCase("en-GB");
        if (!map.has(key)) map.set(key, { name, games: [] });
        map.get(key).games.push({ slug, ...entry });
      });
    });
    return new Map(
      [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "en-GB"))
    );
  }

  function entryIsEmpty(entry) {
    return !(Array.isArray(entry?.lists) ? entry.lists : []).length
      && !customNames(entry).length
      && !entry?.rating
      && !entry?.note;
  }

  function setStatus(message, mode = "") {
    const node = document.getElementById("memberCustomCollectionStatus");
    if (!node) return;
    node.textContent = message;
    node.dataset.state = mode;
  }

  function ensureStat() {
    const stats = document.getElementById("memberOverview");
    if (!stats || document.getElementById("memberStatCustomCollections")) return;
    const link = document.createElement("a");
    link.className = "member-stat";
    link.href = "#memberCustomCollections";
    link.innerHTML = '<strong class="member-stat__value" id="memberStatCustomCollections">0</strong><span class="member-stat__label">Custom Collections</span>';
    stats.appendChild(link);
  }

  function ensureInterface() {
    const librarySection = document.getElementById("personalGameLibrary");
    if (!librarySection || document.getElementById("memberCustomCollections")) return;

    const section = document.createElement("section");
    section.className = "member-custom-collections";
    section.id = "memberCustomCollections";
    section.setAttribute("aria-labelledby", "memberCustomCollectionsTitle");
    section.innerHTML = `
      <div class="member-custom-collections__header">
        <div>
          <p class="member-panel__kicker">Your own categories</p>
          <h3 class="member-custom-collections__title" id="memberCustomCollectionsTitle">Custom Collections</h3>
          <p class="member-custom-collections__intro">Create a named collection from any game page, then manage its games here. These remain private unless a later sharing option is deliberately enabled.</p>
        </div>
        <a class="auth-btn" href="/games/">Add games</a>
      </div>
      <div class="member-custom-collections__tabs" id="memberCustomCollectionTabs" role="tablist" aria-label="Custom collections"></div>
      <div class="member-custom-collections__manager" id="memberCustomCollectionManager" hidden>
        <h4 class="member-custom-collections__active-title" id="memberCustomCollectionActiveTitle"></h4>
        <div class="member-custom-collections__rename">
          <input id="memberCustomCollectionRename" type="text" maxlength="${NAME_LIMIT}" aria-label="Rename selected custom collection">
          <button type="button" class="auth-btn" id="memberCustomCollectionRenameButton">Rename collection</button>
        </div>
        <div class="member-custom-collections__actions">
          <button type="button" class="auth-btn" id="memberCustomCollectionDeleteButton">Delete collection</button>
        </div>
        <ul class="member-custom-collections__games" id="memberCustomCollectionGames"></ul>
      </div>
      <p class="member-custom-collections__status" id="memberCustomCollectionStatus" aria-live="polite"></p>
    `;

    librarySection.appendChild(section);
    ensureStat();

    document.getElementById("memberCustomCollectionRenameButton")?.addEventListener("click", renameActiveCollection);
    document.getElementById("memberCustomCollectionDeleteButton")?.addEventListener("click", deleteActiveCollection);
    document.getElementById("memberCustomCollectionRename")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      renameActiveCollection();
    });
  }

  function collectionKey(value) {
    return normalizeName(value).toLocaleLowerCase("en-GB");
  }

  function createTab(collection) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "member-custom-collections__tab";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(collection.name === activeCollection));
    button.classList.toggle("is-active", collection.name === activeCollection);

    const name = document.createElement("span");
    name.textContent = collection.name;
    const count = document.createElement("span");
    count.className = "member-custom-collections__tab-count";
    count.textContent = String(collection.games.length);
    button.append(name, count);
    button.addEventListener("click", () => {
      activeCollection = collection.name;
      render();
    });
    return button;
  }

  function removeGameFromActive(slug) {
    if (!activeCollection) return;
    const library = readLibrary();
    const entry = library[slug];
    if (!entry) return;
    const targetKey = collectionKey(activeCollection);
    entry.customLists = customNames(entry).filter((name) => collectionKey(name) !== targetKey);
    delete entry.custom_lists;
    entry.updatedAt = new Date().toISOString();
    if (entryIsEmpty(entry)) delete library[slug];
    writeLibrary(library);
    setStatus(`Removed ${entry.title || slug} from ${activeCollection}.`, "success");
    render();
  }

  function createGameRow(game) {
    const item = document.createElement("li");
    item.className = "member-custom-collections__game";

    const content = document.createElement("div");
    const link = document.createElement("a");
    link.href = `/games/${encodeURIComponent(game.slug)}/`;
    link.textContent = game.title || game.slug;
    const meta = document.createElement("span");
    meta.className = "member-custom-collections__game-meta";
    meta.textContent = [game.system, game.year, game.rating ? `${game.rating}/10` : ""].filter(Boolean).join(" · ") || "Personal library game";
    content.append(link, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "auth-btn";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeGameFromActive(game.slug));

    item.append(content, remove);
    return item;
  }

  function renderActiveCollection(collection) {
    const manager = document.getElementById("memberCustomCollectionManager");
    const title = document.getElementById("memberCustomCollectionActiveTitle");
    const rename = document.getElementById("memberCustomCollectionRename");
    const games = document.getElementById("memberCustomCollectionGames");
    if (!manager || !title || !rename || !games) return;

    if (!collection) {
      manager.hidden = true;
      games.replaceChildren();
      return;
    }

    manager.hidden = false;
    title.textContent = `${collection.name} · ${collection.games.length} ${collection.games.length === 1 ? "game" : "games"}`;
    rename.value = collection.name;
    games.replaceChildren();
    collection.games
      .sort((a, b) => String(a.title || a.slug).localeCompare(String(b.title || b.slug), "en-GB"))
      .forEach((game) => games.appendChild(createGameRow(game)));
  }

  function renameActiveCollection() {
    if (!activeCollection) return;
    const input = document.getElementById("memberCustomCollectionRename");
    const requested = normalizeName(input?.value);
    if (!requested) {
      setStatus("Enter a collection name.", "error");
      input?.focus();
      return;
    }

    const library = readLibrary();
    const map = collectionMap(library);
    const oldKey = collectionKey(activeCollection);
    const newKey = collectionKey(requested);
    if (newKey !== oldKey && map.has(newKey)) {
      setStatus("A collection with that name already exists.", "error");
      return;
    }

    Object.values(library).forEach((entry) => {
      const names = customNames(entry);
      if (!names.some((name) => collectionKey(name) === oldKey)) return;
      entry.customLists = names.map((name) => collectionKey(name) === oldKey ? requested : name);
      delete entry.custom_lists;
      entry.updatedAt = new Date().toISOString();
    });

    activeCollection = requested;
    writeLibrary(library);
    setStatus(`Collection renamed to ${requested}.`, "success");
    render();
  }

  function deleteActiveCollection() {
    if (!activeCollection) return;
    const confirmed = window.confirm(`Delete the custom collection “${activeCollection}”? Games will remain in any other personal lists.`);
    if (!confirmed) return;

    const library = readLibrary();
    const targetKey = collectionKey(activeCollection);
    Object.keys(library).forEach((slug) => {
      const entry = library[slug];
      entry.customLists = customNames(entry).filter((name) => collectionKey(name) !== targetKey);
      delete entry.custom_lists;
      entry.updatedAt = new Date().toISOString();
      if (entryIsEmpty(entry)) delete library[slug];
    });

    const deletedName = activeCollection;
    activeCollection = "";
    writeLibrary(library);
    setStatus(`Deleted ${deletedName}.`, "success");
    render();
  }

  function render() {
    ensureInterface();
    const tabs = document.getElementById("memberCustomCollectionTabs");
    const stat = document.getElementById("memberStatCustomCollections");
    if (!tabs) return;

    const map = collectionMap();
    const collections = [...map.values()];
    if (stat) stat.textContent = String(collections.length);

    if (activeCollection && !map.has(collectionKey(activeCollection))) activeCollection = "";
    if (!activeCollection && collections.length) activeCollection = collections[0].name;

    tabs.replaceChildren();
    if (!collections.length) {
      const empty = document.createElement("p");
      empty.className = "member-custom-collections__empty";
      empty.textContent = "No custom collections yet. Open a game page and add it to a new named collection.";
      tabs.appendChild(empty);
      renderActiveCollection(null);
      return;
    }

    collections.forEach((collection) => tabs.appendChild(createTab(collection)));
    renderActiveCollection(map.get(collectionKey(activeCollection)) || null);
  }

  function init() {
    if (!document.getElementById("memberHub")) return;
    ensureCss();
    ensureInterface();
    render();
    document.addEventListener("ccg:personal-library-updated", render);
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) render();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
