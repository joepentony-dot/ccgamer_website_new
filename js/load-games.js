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

  // Specials (treated as collections)
  "BPJS Games": "bpjs",
  "Licensed Games": "licensed",
  "Top Picks": "top-picks",
  "Cartridge Games": "cartridge"
};

const CCG_SPECIAL_KEYS = new Set(["bpjs", "licensed", "top-picks", "cartridge"]);

// Work out where games.json is relative to current page
function ccgGetGamesJsonPath() {
  const p = window.location.pathname;

  // /games/genres/* or /games/collections/*
  if (p.includes("/games/genres/") || p.includes("/games/collections/")) {
    return "../../games.json";
  }

  // /games/*
  if (p.includes("/games/")) {
    return "../games.json";
  }

  // root index
  return "games.json";
}

// Cache so we only fetch once
async function ccgFetchGames() {
  if (window.CCG_GAMES_CACHE) {
    return window.CCG_GAMES_CACHE;
  }

  const url = ccgGetGamesJsonPath();

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch games.json from " + url);
  }

  const data = await res.json();
  // Expecting an array of objects with:
  // id, title, sortTitle, system, genres (internal keys),
  // genreLabels (original labels), video, thumb, lemon, pdf, disk, specials
  window.CCG_GAMES_CACHE = Array.isArray(data) ? data : [];
  return window.CCG_GAMES_CACHE;
}

// Render a grid of game cards into a container
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
    card.target = "_blank";
    card.rel = "noopener";

    const systemLabel = g.system ? g.system.toUpperCase() : "";
    const genresText = (g.genreLabels || []).join(" · ");

    card.innerHTML = `
      <div class="game-thumb">
        ${
          g.thumb
            ? `<img src="${g.thumb}" alt="${g.title} thumbnail" loading="lazy">`
            : ""
        }
      </div>
      <div class="game-info">
        <h3>${g.title}</h3>
        ${
          systemLabel
            ? `<p class="game-system">[${systemLabel}]</p>`
            : ""
        }
        ${
          genresText
            ? `<p class="game-genres">${genresText}</p>`
            : ""
        }
      </div>
    `;

    container.appendChild(card);
  });
}

// On page load, decide what to render
document.addEventListener("DOMContentLoaded", async () => {
  const genreGrid = document.getElementById("genre-grid");
  const specialGrid = document.getElementById("special-grid");

  if (!genreGrid && !specialGrid) {
    return; // nothing to do on this page
  }

  try {
    const games = await ccgFetchGames();

    // Genre pages: /games/genres/*
    if (genreGrid) {
      const key = (genreGrid.dataset.genre || "").toLowerCase();
      const filtered = games.filter(g =>
        (g.genres || []).includes(key)
      );
      ccgRenderGameGrid(genreGrid, filtered);
    }

    // Specials pages: /games/collections/*
    if (specialGrid) {
      const collKey = (window.CCG_COLLECTION || specialGrid.dataset.collection || "")
        .toLowerCase();
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
