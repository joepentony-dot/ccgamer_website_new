import { searchCatalogEntries, catalogGameIdentity } from "./game-catalog.js";

// Browse only owner-approved games. The optional metadata index is factual
// catalogue information: it does not alter game IDs, media selection, CRT
// priority, validation, or the emulator's load/autoplay path.
const METADATA_URL = "/emulator/c64/catalogue-metadata.json";

function publisherIdentity(name) {
  const key = String(name || "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^ocean(software)?(ltd)?$/.test(key)) return "oceansoftware";
  if (/^usgold(ltd)?$/.test(key)) return "usgold";
  if (/^mastertronic(ltd)?$/.test(key)) return "mastertronic";
  return key;
}

const PREFERRED_LABELS = Object.freeze({
  oceansoftware: "Ocean Software",
  usgold: "US Gold",
  mastertronic: "Mastertronic",
});
const LABEL_SORT = new Intl.Collator("en-GB", { sensitivity: "base", numeric: true });
const UNKNOWN = "__unlisted__";

function parseMetadata(payload) {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.entries) ||
      payload.entries.length > 20000) {
    throw new Error("Invalid C64 catalogue metadata index.");
  }
  const index = new Map();
  for (const row of payload.entries) {
    if (!Array.isArray(row) || row.length < 3 || row.length > 4 ||
        typeof row[0] !== "string" || !row[0] || row[0].length > 160 ||
        !Array.isArray(row[1]) || row[1].length > 8 ||
        row[1].some(name => typeof name !== "string" || !name.trim() || name.length > 110) ||
        (row[2] !== null && (!Number.isInteger(row[2]) || row[2] < 1982 || row[2] > 2100)) ||
        index.has(row[0])) {
      throw new Error("Invalid C64 catalogue metadata record.");
    }
    index.set(row[0], { publishers: row[1], year: row[2] });
  }
  return index;
}

export function mountCatalogueBrowser({ games, play }) {
  const opener = document.querySelector("[data-catalogue-open]");
  const dialog = document.querySelector("[data-catalogue-dialog]");
  if (!opener || !dialog) return { refresh() {} };

  const closeButton = dialog.querySelector("[data-catalogue-close-button]");
  const input = dialog.querySelector("[data-catalogue-query]");
  const publisher = dialog.querySelector("[data-catalogue-publisher]");
  const year = dialog.querySelector("[data-catalogue-year]");
  const letter = dialog.querySelector("[data-catalogue-letter]");
  const results = dialog.querySelector("[data-catalogue-results]");
  const count = dialog.querySelector("[data-catalogue-count]");
  const pageLabel = dialog.querySelector("[data-catalogue-page]");
  const previous = dialog.querySelector("[data-catalogue-previous]");
  const next = dialog.querySelector("[data-catalogue-next]");
  const PAGE_SIZE = 60;
  let page = 0;
  let returnFocus = null;
  let metadata = new Map();
  let metadataLoaded = false;
  let metadataPromise = null;
  let lastCatalogue = null;

  function kind(entry) {
    return typeof entry.url === "string" &&
      entry.url.startsWith("/emulator/c64/media/") ? "hosted" : "archive";
  }

  function details(entry) {
    const record = metadata.get(catalogGameIdentity(entry.title));
    const directPublishers = Array.isArray(entry.publisher) ? entry.publisher :
      typeof entry.publisher === "string" ? [entry.publisher] : [];
    const publishers = directPublishers.filter(name =>
      typeof name === "string" && name.trim()) ;
    const directYear = Number(entry.year);
    return {
      publishers: publishers.length ? publishers : (record?.publishers || []),
      year: Number.isInteger(directYear) && directYear >= 1982 && directYear <= 2100
        ? directYear : (record?.year || null),
    };
  }

  function setOptions(select, choices, allLabel) {
    const old = select.value;
    const fragment = document.createDocumentFragment();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = allLabel;
    fragment.append(all);
    for (const [value, label] of choices) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = label;
      fragment.append(option);
    }
    select.replaceChildren(fragment);
    select.value = [...select.options].some(option => option.value === old) ? old : "all";
  }

  function populateFilters(catalogue) {
    if (!metadataLoaded || lastCatalogue === catalogue) return;
    lastCatalogue = catalogue;
    const publishers = new Map();
    const years = new Set();
    let unknownPublisher = false;
    let unknownYear = false;
    for (const entry of catalogue) {
      if (!entry?.title || !entry.id) continue;
      const data = details(entry);
      if (!data.publishers.length) unknownPublisher = true;
      for (const name of data.publishers) {
        const id = publisherIdentity(name);
        if (id && !publishers.has(id)) publishers.set(id, PREFERRED_LABELS[id] || name);
      }
      if (data.year) years.add(data.year);
      else unknownYear = true;
    }
    const publisherChoices = [...publishers.entries()].sort((a, b) =>
      LABEL_SORT.compare(a[1], b[1]));
    if (unknownPublisher) publisherChoices.push([UNKNOWN, "Publisher not listed"]);
    setOptions(publisher, publisherChoices, "All publishers");
    const yearChoices = [...years].sort((a, b) => a - b)
      .map(value => [String(value), String(value)]);
    if (unknownYear) yearChoices.push([UNKNOWN, "Year not listed"]);
    setOptions(year, yearChoices, "All years");
    publisher.disabled = false;
    year.disabled = false;
  }

  async function loadMetadata() {
    if (metadataLoaded) return;
    if (metadataPromise) return metadataPromise;
    metadataPromise = (async () => {
      const response = await fetch(METADATA_URL, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("C64 catalogue metadata unavailable.");
      const parsed = parseMetadata(await response.json());
      metadata = parsed;
      metadataLoaded = true;
      lastCatalogue = null;
      refresh(true);
    })().catch(error => {
      console.warn("[ccg-c64] Publisher/year metadata could not be loaded:", error);
      publisher.disabled = true;
      year.disabled = true;
      setOptions(publisher, [], "Publisher data unavailable");
      setOptions(year, [], "Year data unavailable");
      // The game browser, title search and A–Z filter remain fully functional.
      metadataPromise = null;
    });
    return metadataPromise;
  }

  function refresh(reset = false) {
    if (reset) page = 0;
    const catalogue = games() || [];
    opener.disabled = catalogue.length === 0;
    opener.textContent = catalogue.length
      ? "BROWSE ALL " + catalogue.length.toLocaleString("en-GB") + " GAMES"
      : "LIBRARY LOADING...";
    if (dialog.hidden) return;

    populateFilters(catalogue);
    const query = String(input.value || "").trim();
    const wantedPublisher = publisher.value || "all";
    const wantedYear = year.value || "all";
    const initial = letter.value;
    const visible = catalogue.filter(entry => {
      if (!entry || !entry.title || !entry.id) return false;
      const first = entry.title.trim().charAt(0).toLocaleUpperCase();
      if (initial !== "all" && (initial === "#" ? /^[A-Z]$/.test(first) : first !== initial)) {
        return false;
      }
      if (wantedPublisher !== "all" || wantedYear !== "all") {
        const data = details(entry);
        if (wantedPublisher === UNKNOWN && data.publishers.length) return false;
        if (wantedPublisher !== "all" && wantedPublisher !== UNKNOWN &&
            !data.publishers.some(name => publisherIdentity(name) === wantedPublisher)) return false;
        if (wantedYear === UNKNOWN && data.year !== null) return false;
        if (wantedYear !== "all" && wantedYear !== UNKNOWN &&
            String(data.year) !== wantedYear) return false;
      }
      return true;
    });
    const matches = searchCatalogEntries(visible, query);

    const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    page = Math.max(0, Math.min(page, pages - 1));
    count.textContent = matches.length.toLocaleString("en-GB") +
      " games found" + (query ? ' for "' + input.value.trim() + '"' : "");
    pageLabel.textContent = "PAGE " + (page + 1) + " / " + pages;
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pages;
    const fragment = document.createDocumentFragment();
    for (const entry of matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "ccg-c64-catalogue-item";
      item.dataset.catalogueGame = entry.id;
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const meta = document.createElement("span");
      const diskCount = Array.isArray(entry.disks) ? entry.disks.length : 0;
      const info = metadataLoaded ? details(entry) : null;
      const credits = info ? [
        info.publishers.length ? info.publishers.join(" / ") : "",
        info.year ? String(info.year) : "",
      ].filter(Boolean).join(" · ") : "";
      meta.textContent = String(entry.format || "C64").toUpperCase() +
        (diskCount > 1 ? " · " + diskCount + " DISKS" : "") +
        (credits ? " · " + credits : "") +
        " · " + (kind(entry) === "hosted" ? "CCG COLLECTION" : "ARCHIVE") +
        "  → PLAY";
      item.append(title, meta);
      fragment.append(item);
    }
    results.replaceChildren(fragment);
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "ccg-c64-catalogue-empty";
      empty.textContent = "No games match those filters. Try a different publisher, year, title or letter.";
      results.append(empty);
    }
    results.scrollTop = 0;
  }

  function close() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove("ccg-c64-catalogue-open");
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function open() {
    if (!games().length) return;
    returnFocus = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add("ccg-c64-catalogue-open");
    input.value = "";
    publisher.value = "all";
    year.value = "all";
    letter.value = "all";
    refresh(true);
    void loadMetadata();
    input.focus({ preventScroll: true });
  }

  opener.addEventListener("click", open);
  closeButton?.addEventListener("click", close);
  dialog.querySelector("[data-catalogue-backdrop]")?.addEventListener("click", close);
  input.addEventListener("input", () => refresh(true));
  publisher.addEventListener("change", () => refresh(true));
  year.addEventListener("change", () => refresh(true));
  letter.addEventListener("change", () => refresh(true));
  previous.addEventListener("click", () => { page--; refresh(); });
  next.addEventListener("click", () => { page++; refresh(); });
  results.addEventListener("click", event => {
    const id = event.target.closest("[data-catalogue-game]")?.dataset.catalogueGame;
    if (!id) return;
    close();
    play(id);
  });
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
    )).filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault();
      focusable[focusable.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
      event.preventDefault();
      focusable[0].focus();
    }
  });
  refresh();
  return { refresh, close };
}
