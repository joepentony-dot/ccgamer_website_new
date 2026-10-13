// CCG C64 full library browser. Uses the already verified in-page catalogue;
// it never scrapes external archives or downloads unapproved game media.
export function mountCatalogueBrowser({ games, play }) {
  const opener = document.querySelector("[data-catalogue-open]");
  const dialog = document.querySelector("[data-catalogue-dialog]");
  if (!opener || !dialog) return { refresh() {} };

  const closeButton = dialog.querySelector("[data-catalogue-close-button]");
  const input = dialog.querySelector("[data-catalogue-query]");
  const source = dialog.querySelector("[data-catalogue-source]");
  const letter = dialog.querySelector("[data-catalogue-letter]");
  const results = dialog.querySelector("[data-catalogue-results]");
  const count = dialog.querySelector("[data-catalogue-count]");
  const pageLabel = dialog.querySelector("[data-catalogue-page]");
  const previous = dialog.querySelector("[data-catalogue-previous]");
  const next = dialog.querySelector("[data-catalogue-next]");
  const PAGE_SIZE = 60;
  const collator = new Intl.Collator("en-GB", { sensitivity: "base", numeric: true });
  let page = 0;
  let returnFocus = null;

  function kind(entry) {
    return typeof entry.url === "string" &&
      entry.url.startsWith("/emulator/c64/media/") ? "hosted" : "archive";
  }

  function refresh(reset = false) {
    if (reset) page = 0;
    const catalogue = games() || [];
    opener.disabled = catalogue.length === 0;
    opener.textContent = catalogue.length
      ? "BROWSE ALL " + catalogue.length.toLocaleString("en-GB") + " GAMES"
      : "LIBRARY LOADING...";
    if (dialog.hidden) return;

    const query = String(input.value || "").trim().toLocaleLowerCase();
    const type = source.value;
    const initial = letter.value;
    const matches = catalogue.filter((entry) => {
      if (!entry || !entry.title || !entry.id) return false;
      if (type !== "all" && kind(entry) !== type) return false;
      const first = entry.title.trim().charAt(0).toLocaleUpperCase();
      if (initial !== "all" && !(initial === "#" ? !/^[A-Z]$/.test(first) : first === initial)) return false;
      return !query || entry.title.toLocaleLowerCase().includes(query);
    }).sort((a, b) => collator.compare(a.title, b.title));

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
      meta.textContent = String(entry.format || "C64").toUpperCase() +
        (diskCount > 1 ? " · " + diskCount + " DISKS" : "") +
        " · " + (kind(entry) === "hosted" ? "CCG COLLECTION" : "ARCHIVE") +
        "  → PLAY";
      item.append(title, meta);
      fragment.append(item);
    }
    results.replaceChildren(fragment);
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "ccg-c64-catalogue-empty";
      empty.textContent = "No games match those filters. Try a shorter title or another letter.";
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
    source.value = "all";
    letter.value = "all";
    refresh(true);
    input.focus({ preventScroll: true });
  }

  opener.addEventListener("click", open);
  closeButton?.addEventListener("click", close);
  dialog.querySelector("[data-catalogue-backdrop]")?.addEventListener("click", close);
  input.addEventListener("input", () => refresh(true));
  source.addEventListener("change", () => refresh(true));
  letter.addEventListener("change", () => refresh(true));
  previous.addEventListener("click", () => { page--; refresh(); });
  next.addEventListener("click", () => { page++; refresh(); });
  results.addEventListener("click", (event) => {
    const id = event.target.closest("[data-catalogue-game]")?.dataset.catalogueGame;
    if (!id) return;
    close();
    play(id);
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
    )).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault(); focusable[focusable.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
      event.preventDefault(); focusable[0].focus();
    }
  });
  refresh();
  return { refresh, close };
}
