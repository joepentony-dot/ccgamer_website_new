/* ============================================================
   CCG GAMES LIBRARY — OMEGA ACCORDION EDITION (JS LOCK STABLE)
   ------------------------------------------------------------
   • Original behaviour preserved
   • Added: ID validation, duplicate detection, safe linking
   • Added: Debounced search (prevents rapid re-render)
   • Added: Thumbnail JS-lock (prevents cancelled loads)
   • Console-only diagnostics (no UI impact)
   ============================================================ */

let CCG_ALL_GAMES = [];
let CCG_FILTERED_GAMES = [];

/* 1x1 transparent GIF — used as stable placeholder src */
const CCG_IMG_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

document.addEventListener("DOMContentLoaded", () => {
  initGamesLibrary();
});

async function initGamesLibrary() {
  try {
    // Correct depth: /games/index.html → /games/games.json
    const response = await fetch("games.json", { cache: "no-store" });
    const games = await response.json();

    CCG_ALL_GAMES = Array.isArray(games) ? games.slice() : [];

    runIntegrityChecks(CCG_ALL_GAMES);

    // Sort master list for consistent alphabetical grouping
    CCG_ALL_GAMES.sort((a, b) => {
      const ta = (a.title || "").toLowerCase();
      const tb = (b.title || "").toLowerCase();
      return ta.localeCompare(tb);
    });

    CCG_FILTERED_GAMES = CCG_ALL_GAMES.slice();

    bindGamesUI();
    renderAlphabetStrip();
    renderGamesAccordion();
    updateStats();

  } catch (err) {
    console.error("[CCG] Error loading games.json:", err);
  }
}

/* ============================================================
   INTEGRITY CHECKS (CONSOLE ONLY)
   ============================================================ */

function runIntegrityChecks(games) {
  const seenIds = new Set();

  games.forEach((game, index) => {
    // ID checks
    if (game.id === undefined || game.id === null || game.id === "") {
      console.warn(`[CCG DATA WARNING] Game missing ID at index ${index}:`, game);
    } else {
      const idStr = String(game.id);
      if (seenIds.has(idStr)) {
        console.warn(`[CCG DATA WARNING] Duplicate game ID detected: ${idStr}`, game);
      }
      seenIds.add(idStr);
    }

    // Title check
    if (!game.title || !String(game.title).trim()) {
      console.warn(`[CCG DATA WARNING] Game missing title (ID: ${game.id})`, game);
    }
  });
}

/* ============================================================
   UI BINDINGS
   ============================================================ */

function bindGamesUI() {
  const searchInput = document.getElementById("gamesSearchInput");
  const clearBtn = document.getElementById("gamesSearchClear");
  const accordion = document.getElementById("gamesAccordion");

  // Debounced filter so we don’t rebuild the accordion 20x per second
  const debouncedFilter = debounce((value) => {
    applySearchFilter(value || "");
  }, 160);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      debouncedFilter(searchInput.value);
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      applySearchFilter("");
      searchInput.focus();
    });
  }

  if (accordion) {
    accordion.addEventListener("click", (e) => {
      const header = e.target.closest(".games-accordion__header");
      if (!header) return;

      const section = header.closest(".games-accordion__section");
      if (!section) return;

      section.classList.toggle("games-accordion__section--open");

      // If opening, unlock images inside that section only (fast + stable)
      if (section.classList.contains("games-accordion__section--open")) {
        unlockImagesInNode(section);
      }
    });
  }
}

/* ============================================================
   SEARCH FILTER
   ============================================================ */

function applySearchFilter(rawTerm) {
  const term = String(rawTerm || "").toLowerCase().trim();

  if (!term) {
    CCG_FILTERED_GAMES = CCG_ALL_GAMES.slice();
    renderGamesAccordion({ expandAll: false });
    updateStats();
    return;
  }

  CCG_FILTERED_GAMES = CCG_ALL_GAMES.filter(g => {
    const title = (g.title || "").toLowerCase();
    const system = (g.system || "").toLowerCase();
    const dev = (g.developer || "").toLowerCase();

    return (
      title.includes(term) ||
      system.includes(term) ||
      dev.includes(term)
    );
  });

  // Expand all when searching (existing behaviour)
  renderGamesAccordion({ expandAll: true });
  updateStats();
}

/* ============================================================
   STATS
   ============================================================ */

function updateStats() {
  const totalEl = document.getElementById("gamesTotalCount");
  const resultsEl = document.getElementById("gamesResultsCount");
  const emptyState = document.getElementById("gamesEmptyState");

  if (totalEl) totalEl.textContent = CCG_ALL_GAMES.length.toString();
  if (resultsEl) resultsEl.textContent = CCG_FILTERED_GAMES.length.toString();

  if (emptyState) {
    emptyState.hidden = CCG_FILTERED_GAMES.length > 0;
  }
}

/* ============================================================
   GROUPING HELPERS
   ============================================================ */

function getGameLetter(game) {
  const title = (game.title || "").trim();
  if (!title) return "#";

  const first = title[0].toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
}

function buildGroupedGames() {
  const groups = {};

  CCG_FILTERED_GAMES.forEach(game => {
    const letter = getGameLetter(game);
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(game);
  });

  Object.keys(groups).forEach(letter => {
    groups[letter].sort((a, b) => {
      const ta = (a.title || "").toLowerCase();
      const tb = (b.title || "").toLowerCase();
      return ta.localeCompare(tb);
    });
  });

  return groups;
}

/* ============================================================
   ALPHABET STRIP
   ============================================================ */

function renderAlphabetStrip() {
  const strip = document.getElementById("gamesAlphaStrip");
  if (!strip) return;

  const letters = [
    "#",
    "A","B","C","D","E","F","G","H","I","J","K","L","M",
    "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
  ];

  strip.innerHTML = letters.map(letter => `
    <button type="button"
            class="games-alpha__btn"
            data-alpha-jump="${letter}">
      ${letter}
    </button>
  `).join("");

  strip.addEventListener("click", (e) => {
    const btn = e.target.closest(".games-alpha__btn");
    if (!btn) return;

    const letter = btn.getAttribute("data-alpha-jump");
    if (!letter) return;

    const section = document.querySelector(
      `.games-accordion__section[data-letter="${letter}"]`
    );
    if (!section) return;

    section.classList.add("games-accordion__section--open");

    // Unlock thumbnails for that section immediately
    unlockImagesInNode(section);

    const rect = section.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + rect.top - 100,
      behavior: "smooth"
    });
  });
}

/* ============================================================
   RENDER — ACCORDION
   ============================================================ */

function renderGamesAccordion(options = {}) {
  const { expandAll = false } = options;
  const accordion = document.getElementById("gamesAccordion");
  if (!accordion) return;

  const groups = buildGroupedGames();

  const lettersOrder = [
    "#",
    "A","B","C","D","E","F","G","H","I","J","K","L","M",
    "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
  ];

  let html = "";

  lettersOrder.forEach(letter => {
    const games = groups[letter];
    if (!games || games.length === 0) return;

    const openClass = expandAll ? " games-accordion__section--open" : "";
    const count = games.length;

    const cardsHtml = games.map(g => renderGameCard(g)).join("");

    html += `
      <div class="games-accordion__section${openClass}" data-letter="${letter}">
        <div class="games-accordion__header">
          <div class="games-accordion__left">
            <div class="games-accordion__letter">${letter}</div>
            <div class="games-accordion__count">
              <span>${count}</span> game${count !== 1 ? "s" : ""}
            </div>
          </div>
          <div class="games-accordion__chevron">▶</div>
        </div>
        <div class="games-accordion__body">
          <div class="games-grid">
            ${cardsHtml}
          </div>
        </div>
      </div>
    `;
  });

  accordion.innerHTML = html;

  // JS LOCK: unlock visible/open sections safely (prevents cancelled loads)
  requestAnimationFrame(() => {
    if (expandAll) {
      unlockImagesInNode(accordion); // all open
    } else {
      // only unlock first open sections (none by default)
      // but unlock anything already open (if user navigates back)
      accordion.querySelectorAll(".games-accordion__section--open").forEach(sec => {
        unlockImagesInNode(sec);
      });
    }
  });
}

/* ============================================================
   CARD GENERATION — SAFE LINKING
   ============================================================ */

function resolveGameThumbForIndex(rawThumb) {
  const FALLBACK = "../resources/images/thumbnails/all/1942.jpg";
  if (!rawThumb) return FALLBACK;

  let t = String(rawThumb).trim().replace(/^\/+/, "");

  if (t.startsWith("resources/")) return `../${t}`;
  if (!t.includes("/")) return `../resources/images/thumbnails/all/${t}`;

  return FALLBACK;
}

function buildGameMetaLine(game) {
  return [game.year, game.system, game.developer]
    .filter(Boolean)
    .join(" · ");
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderGameCard(game) {
  if (game.id === undefined || game.id === null || game.id === "") {
    return "";
  }

  const realThumb = resolveGameThumbForIndex(
    game.thumbnail || game.thumb || game.cover
  );

  const meta = buildGameMetaLine(game);

  // JS LOCK: render stable placeholder src + data-src for real
  // This prevents rapid accordion DOM changes cancelling real image requests.
  return `
    <a href="game.html?id=${encodeURIComponent(String(game.id))}" class="ccg-game-card">
      <div class="ccg-game-card__thumb">
        <img
          src="${CCG_IMG_PLACEHOLDER}"
          data-src="${realThumb}"
          alt="${escapeHtml(game.title || "Game artwork")}"
          loading="lazy"
          decoding="async"
        >
      </div>
      <div class="ccg-game-card__body">
        <h3 class="ccg-game-card__title">${escapeHtml(game.title || "Unknown Game")}</h3>
        <div class="ccg-game-card__meta">${escapeHtml(meta)}</div>
      </div>
    </a>
  `;
}

/* ============================================================
   THUMBNAIL UNLOCK (JS LOCK)
   ============================================================ */

function unlockImagesInNode(root) {
  if (!root) return;

  const imgs = Array.from(root.querySelectorAll('img[data-src]'));
  if (!imgs.length) return;

  // Batch unlock to avoid hammering the network all at once
  const BATCH = 24;
  let i = 0;

  function runBatch() {
    const slice = imgs.slice(i, i + BATCH);
    slice.forEach(img => {
      const src = img.getAttribute("data-src");
      if (!src) return;

      // Already unlocked?
      if (img.getAttribute("data-unlocked") === "1") return;

      img.setAttribute("data-unlocked", "1");

      // On error: fallback so we don’t spam network / console forever
      img.onerror = () => {
        img.onerror = null;
        img.removeAttribute("data-src");
        img.src = "../resources/images/thumbnails/all/1942.jpg";
      };

      img.src = src;
    });

    i += BATCH;
    if (i < imgs.length) {
      // Yield to the browser to keep scrolling smooth
      setTimeout(runBatch, 20);
    }
  }

  // Start next tick for stability
  setTimeout(runBatch, 0);
}

/* ============================================================
   UTILS
   ============================================================ */

function debounce(fn, wait = 150) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
