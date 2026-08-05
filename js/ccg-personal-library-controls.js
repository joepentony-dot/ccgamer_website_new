/* ============================================================
   CCG PERSONAL LIBRARY CONTROLS FOR SINGLE GAME PAGES
   ------------------------------------------------------------
   Stores private personal lists, ratings, notes and named custom
   collections. Account synchronisation is handled separately by
   the Member Hub sync module.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_PERSONAL_LIBRARY_CONTROLS_READY) return;
  window.CCG_PERSONAL_LIBRARY_CONTROLS_READY = true;

  const STORAGE_KEY = "ccgPersonalGameLibraryV1";
  const TOMBSTONE_KEY = "ccgPersonalGameLibraryTombstonesV1";
  const CSS_PATHS = [
    "/resources/css/profile-lists.css",
    "/resources/css/member-custom-collections.css"
  ];
  const LISTS = [
    ["played", "Played"],
    ["want", "Want to Play"],
    ["owned", "Owned as a Kid"],
    ["still", "Still Own"]
  ];
  const RESERVED = new Set([
    "genres", "collections", "publishers", "developers", "years",
    "platforms", "downloads", "compare", "discover", "index.html"
  ]);
  const CUSTOM_COLLECTION_LIMIT = 20;
  const CUSTOM_NAME_LIMIT = 40;

  function currentSlug() {
    const match = window.location.pathname.match(/\/games\/([^/]+)\/?(?:index\.html)?$/i);
    const value = match ? String(match[1]).toLowerCase() : "";
    return RESERVED.has(value) ? "" : value;
  }

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

  function markDeleted(slug, deletedAt) {
    if (!slug) return;
    const requested = new Date(deletedAt || Date.now()).getTime();
    if (!Number.isFinite(requested) || requested <= 0) return;
    const tombstones = readTombstones();
    const current = new Date(tombstones[slug] || 0).getTime();
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

  function persistEntry(library, slug, entry, changedAt = new Date().toISOString()) {
    entry.updatedAt = changedAt;
    if (isEntryEmpty(entry)) {
      delete library[slug];
      markDeleted(slug, changedAt);
    } else {
      clearDeleted(slug);
    }
    writeLibrary(library);
  }

  function ensureStylesheets() {
    CSS_PATHS.forEach((path) => {
      if (document.querySelector(`link[href="${path}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = path;
      document.head.appendChild(link);
    });
  }

  function insertionTarget() {
    return document.querySelector(
      ".game-quick-actions, .game-hero__actions, .game-hero__content, .game-hero, .ccg-page--single-game main"
    );
  }

  function gameTitle() {
    return document.getElementById("gameHeroTitle")?.textContent?.trim()
      || document.querySelector("h1")?.textContent?.trim()
      || currentSlug();
  }

  function gameMeta() {
    const pageText = document.body.innerText || "";
    const system = /\bAmiga\b/i.test(pageText)
      ? "Amiga"
      : /\bC64|Commodore 64\b/i.test(pageText) ? "C64" : "";
    const year = (pageText.match(/\b(19|20)\d{2}\b/) || [])[0] || "";
    return { system, year };
  }

  function normalizeCustomName(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, CUSTOM_NAME_LIMIT);
  }

  function uniqueNames(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map(normalizeCustomName)
      .filter((name) => {
        const key = name.toLocaleLowerCase("en-GB");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, CUSTOM_COLLECTION_LIMIT);
  }

  function allCustomCollectionNames(library = readLibrary()) {
    const names = [];
    Object.values(library).forEach((entry) => {
      uniqueNames(entry?.customLists || entry?.custom_lists).forEach((name) => names.push(name));
    });
    return uniqueNames(names).sort((a, b) => a.localeCompare(b, "en-GB"));
  }

  function canonicalCustomName(candidate, library) {
    const normalized = normalizeCustomName(candidate);
    const key = normalized.toLocaleLowerCase("en-GB");
    return allCustomCollectionNames(library)
      .find((name) => name.toLocaleLowerCase("en-GB") === key) || normalized;
  }

  function ensureEntry(library, slug) {
    if (library[slug]) {
      library[slug].lists = Array.isArray(library[slug].lists) ? library[slug].lists : [];
      library[slug].customLists = uniqueNames(library[slug].customLists || library[slug].custom_lists);
      delete library[slug].custom_lists;
      return library[slug];
    }

    const meta = gameMeta();
    library[slug] = {
      title: gameTitle(),
      system: meta.system,
      year: meta.year,
      lists: [],
      customLists: [],
      rating: "",
      note: "",
      updatedAt: ""
    };
    return library[slug];
  }

  function isEntryEmpty(entry) {
    return !(entry.lists || []).length
      && !(entry.customLists || []).length
      && !entry.rating
      && !entry.note;
  }

  function setStatus(message) {
    const status = document.getElementById("ccgPersonalStatus");
    if (status) status.textContent = message;
  }

  function buildCustomMembershipChip(name) {
    const chip = document.createElement("span");
    chip.className = "ccg-personal-library__custom-chip";

    const label = document.createElement("span");
    label.textContent = name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove from ${name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeFromCustomCollection(name));

    chip.append(label, remove);
    return chip;
  }

  function updateCustomCollectionUi(item, library) {
    const select = document.getElementById("ccgCustomCollectionSelect");
    const memberships = document.getElementById("ccgCustomCollectionMemberships");
    if (!select || !memberships) return;

    const previous = select.value;
    const names = allCustomCollectionNames(library);
    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = names.length ? "Choose an existing collection" : "No custom collections yet";
    select.appendChild(placeholder);

    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    if (names.includes(previous)) select.value = previous;

    memberships.replaceChildren();
    const assigned = uniqueNames(item?.customLists || item?.custom_lists);
    if (!assigned.length) {
      const empty = document.createElement("span");
      empty.className = "ccg-personal-library__status";
      empty.textContent = "This game is not in a custom collection.";
      memberships.appendChild(empty);
      return;
    }
    assigned.forEach((name) => memberships.appendChild(buildCustomMembershipChip(name)));
  }

  function syncUi() {
    const slug = currentSlug();
    const library = readLibrary();
    const item = library[slug] || {};
    const lists = Array.isArray(item.lists) ? item.lists : [];

    document.querySelectorAll("[data-personal-list]").forEach((button) => {
      button.classList.toggle("is-active", lists.includes(button.dataset.personalList));
    });

    const rating = document.getElementById("ccgPersonalRating");
    const note = document.getElementById("ccgPersonalNote");
    if (rating) rating.value = item.rating || "";
    if (note) note.value = item.note || "";
    updateCustomCollectionUi(item, library);
  }

  function toggleStandardList(listKey) {
    const slug = currentSlug();
    const library = readLibrary();
    const item = ensureEntry(library, slug);
    const lists = new Set(item.lists || []);
    if (lists.has(listKey)) lists.delete(listKey);
    else lists.add(listKey);
    item.lists = Array.from(lists);
    persistEntry(library, slug, item);
    syncUi();
    setStatus("Saved locally. Account sync runs when you open Member Hub.");
  }

  function saveDetails() {
    const slug = currentSlug();
    const library = readLibrary();
    const item = ensureEntry(library, slug);
    item.rating = document.getElementById("ccgPersonalRating")?.value || "";
    item.note = document.getElementById("ccgPersonalNote")?.value?.trim() || "";
    persistEntry(library, slug, item);
    syncUi();
    setStatus("Saved locally. Account sync runs when you open Member Hub.");
  }

  function addToCustomCollection() {
    const slug = currentSlug();
    const library = readLibrary();
    const selectValue = document.getElementById("ccgCustomCollectionSelect")?.value || "";
    const input = document.getElementById("ccgCustomCollectionName");
    const requested = normalizeCustomName(input?.value || selectValue);

    if (!requested) {
      setStatus("Choose a collection or enter a new collection name.");
      input?.focus();
      return;
    }

    const existingNames = allCustomCollectionNames(library);
    const matched = existingNames.find((name) => (
      name.toLocaleLowerCase("en-GB") === requested.toLocaleLowerCase("en-GB")
    ));
    if (!matched && existingNames.length >= CUSTOM_COLLECTION_LIMIT) {
      setStatus(`You can create up to ${CUSTOM_COLLECTION_LIMIT} custom collections.`);
      return;
    }

    const name = canonicalCustomName(requested, library);
    const item = ensureEntry(library, slug);
    item.customLists = uniqueNames([...(item.customLists || []), name]);
    persistEntry(library, slug, item);
    if (input) input.value = "";
    syncUi();
    setStatus(`Added to ${name}. Account sync runs when you open Member Hub.`);
  }

  function removeFromCustomCollection(name) {
    const slug = currentSlug();
    const library = readLibrary();
    const item = library[slug];
    if (!item) return;
    item.customLists = uniqueNames(item.customLists || item.custom_lists)
      .filter((entry) => entry.toLocaleLowerCase("en-GB") !== name.toLocaleLowerCase("en-GB"));
    delete item.custom_lists;
    persistEntry(library, slug, item);
    syncUi();
    setStatus(`Removed from ${name}.`);
  }

  function render() {
    const slug = currentSlug();
    if (!slug || document.querySelector("[data-ccg-personal-library]")) return;
    ensureStylesheets();

    const box = document.createElement("section");
    box.className = "ccg-personal-library";
    box.setAttribute("data-ccg-personal-library", "true");
    box.innerHTML = `
      <h2 class="ccg-personal-library__title">My Game Library</h2>
      <div class="ccg-personal-library__buttons">
        ${LISTS.map(([id, label]) => `<button type="button" class="ccg-personal-library__button" data-personal-list="${id}">${label}</button>`).join("")}
      </div>
      <div class="ccg-personal-library__details">
        <select id="ccgPersonalRating" aria-label="Personal rating">
          <option value="">No rating</option>
          ${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">${index + 1}/10</option>`).join("")}
        </select>
        <input id="ccgPersonalNote" type="text" maxlength="180" placeholder="Private note…" aria-label="Personal game note">
        <button type="button" class="ccg-personal-library__button" id="ccgPersonalSave">Save details</button>
      </div>
      <div class="ccg-personal-library__custom">
        <h3 class="ccg-personal-library__custom-title">Custom Collections</h3>
        <div class="ccg-personal-library__custom-controls">
          <select id="ccgCustomCollectionSelect" aria-label="Existing custom collection"></select>
          <input id="ccgCustomCollectionName" type="text" maxlength="${CUSTOM_NAME_LIMIT}" placeholder="Or enter a new collection name" aria-label="New custom collection name">
          <button type="button" class="ccg-personal-library__button" id="ccgCustomCollectionAdd">Add to collection</button>
        </div>
        <div class="ccg-personal-library__custom-memberships" id="ccgCustomCollectionMemberships"></div>
      </div>
      <p class="ccg-personal-library__status" id="ccgPersonalStatus">Saved on this browser. Open Member Hub to synchronise with your account.</p>
    `;

    insertionTarget()?.appendChild(box);
    box.querySelectorAll("[data-personal-list]").forEach((button) => {
      button.addEventListener("click", () => toggleStandardList(button.dataset.personalList));
    });
    box.querySelector("#ccgPersonalSave")?.addEventListener("click", saveDetails);
    box.querySelector("#ccgCustomCollectionAdd")?.addEventListener("click", addToCustomCollection);
    box.querySelector("#ccgCustomCollectionName")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      addToCustomCollection();
    });
    syncUi();
  }

  function init() {
    if (!currentSlug()) return;
    requestAnimationFrame(render);
    setTimeout(render, 700);
    setTimeout(render, 1800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
