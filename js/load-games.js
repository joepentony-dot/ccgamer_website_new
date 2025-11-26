// ============================================
// Cheeky Commodore Gamer - Game Loader
// Reads games.json and powers genres + specials
// ============================================

// Map spreadsheet labels (Column D) to internal keys
const CCG_GENRE_MAP = {
  "Arcade Games": "arcade",
  "Action Adventure Games": "action-adventure",
  "Adventure Games": "adventure",
  "Shooting Games": "shooting",
  "Racing Games": "racing",
  "Role Playing Games": "rpg",
  "Strategy Games": "strategy",
  "Casino Games": "casino",
  "Quiz Games": "quiz",
  "Puzzle Games": "puzzle",
  "Horror Games": "horror",
  "Platform Games": "platform",
  "Sports Games": "sports",
  "Fighting Games": "fighting",
  "Miscellaneous": "misc",

  // Specials (also stored in the same Column D)
  "BPJS Games": "bpjs",
  "Licensed Games": "licensed",
  "Top Picks": "top-picks",
  "Cartridge Games": "cartridge"
};

// Keys that are treated as "special collections"
const CCG_SPECIAL_KEYS = new Set(["bpjs", "licensed", "top-picks", "cartridge"]);

// --------------------------------------------
// Resolve the correct path to games.json
// --------------------------------------------
function ccgGetGamesJsonPath() {
  const p = window.location.pathname;

  // /games/genres/* or /games/collections/*
  if (p.includes("/games/genres/") || p.includes("/games/collections/")) {
    return "../games.json";
  }

  // Any /games/*.html (index, complete-index, etc.)
  if (p.includes("/games/")) {
    return "games.json";
  }

  // Root pages (e.g. /index.html)
  return "games/games.json";
}

// --------------------------------------------
// Fetch and normalise games data
// --------------------------------------------
async function ccgFetchGames() {
  if (window.CCG_GAMES_CACHE) {
    return window.CCG_GAMES_CACHE;
  }

  const url = ccgGetGamesJsonPath();
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch games.json from " + url);
  }

  const raw = await res.json();
  const list = Array.isArray(raw) ? raw : [];

  const normalised = list.map(entry => {
    const game = { ...entry };

    // Original labels from Column D (already split by CSV -> JSON)
    const labels = Array.isArray(game.genres)
      ? game.genres.filter(Boolean)
      : [];

    const genreKeys = [];
    const specials = [];

    labels.forEach(label => {
      const trimmed = String(label).trim();
      const key = CCG_GENRE_MAP[trimmed];
      if (!key) return;

      if (CCG_SPECIAL_KEYS.has(key)) {
        if (!specials.includes(key)) specials.push(key);
      } else {
        if (!genreKeys.includes(key)) genreKeys.push(key);
      }
    });

    // Store original labels for display
    game.genreLabels = labels;

    // Internal keys used for filtering
    game.genres = genreKeys;
    game.specials = specials;

    // Normalise system to lowercase (c64 / amiga)
    if (game.system) {
      game.system = String(game.system).trim().toLowerCase();
    } else {
      game.system = "";
    }

    // Ensure slug is a lowercase string
    if (game.slug) {
      game.slug = String(game.slug).trim().toLowerCase();
    }

    return game;
  });

  window.CCG_GAMES_CACHE = normalised;
  return normalised;
}

// --------------------------------------------
// Render a grid of game cards into a container
// --------------------------------------------
function ccgRenderGameGrid(container, games) {
  if (!container) return;

  if (!games || !games.length) {
    container.innerHTML = `
      <p style="text-align:center; color:var(--c64-light-blue); margin-top:20px;">
        NO GAMES FOUND FOR THIS CATEGORY.
      </p>
    `;
    return;
  }

  container.innerHTML = "";

  games.forEach(g => {
    const linkUrl =
      g.lemon ||
      (g.video ? `https://www.youtube.com/watch?v=${g.video}` : "#");

    const card = document.createElement("a");
    card.className = "game-card play-sound";
    card.href = linkUrl;
    card.target = linkUrl === "#" ? "_self" : "_blank";
    card.rel = linkUrl === "#" ? "" : "noopener";

    const systemLabel = g.system ? g.system.toUpperCase() : "";
    const genresText = (g.genreLabels || []).join(" · ");

    card.innerHTML = `
      <div class="game-thumb">
        ${
          g.thumb
            ? `<img src="${g.thumb}" alt="${escapeHtml(g.title || "")} thumbnail" loading="lazy">`
            : ""
        }
      </div>
      <div class="game-info">
        <h3>${escapeHtml(g.title || "")}</h3>
        ${
          systemLabel
            ? `<p class="game-system">[${systemLabel}]</p>`
            : ""
        }
        ${
          genresText
            ? `<p class="game-genres">${escapeHtml(genresText)}</p>`
            : ""
        }
      </div>
    `;

    container.appendChild(card);
  });
}

// Simple HTML escape for safety
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --------------------------------------------
// Auto-init on pages that need grids
// --------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const genreGrid = document.getElementById("genre-grid");
  const specialGrid = document.getElementById("special-grid");

  // If the page doesn't have any game grids, do nothing
  if (!genreGrid && !specialGrid) {
    return;
  }

  try {
    const games = await ccgFetchGames();

    // Genre pages
    if (genreGrid) {
      const key = (genreGrid.dataset.genre || "").toLowerCase();
      const filtered = games.filter(g =>
        (g.genres || []).includes(key)
      );
      ccgRenderGameGrid(genreGrid, filtered);
    }

    // Specials pages (BPJS, Licensed, Cartridge, Top Picks)
    if (specialGrid) {
      const collKey = (
        window.CCG_COLLECTION ||
        specialGrid.dataset.collection ||
        ""
      ).toLowerCase();

      const filtered = games.filter(g =>
        (g.specials || []).includes(collKey)
      );
      ccgRenderGameGrid(specialGrid, filtered);
    }

  } catch (err) {
    console.error("Error initialising game grids:", err);

    if (genreGrid) {
      genreGrid.innerHTML =
        "<p style='color:red; text-align:center;'>ERROR LOADING GAME DATA</p>";
    }
    if (specialGrid) {
      specialGrid.innerHTML =
        "<p style='color:red; text-align:center;'>ERROR LOADING GAME DATA</p>";
    }
  }
});
