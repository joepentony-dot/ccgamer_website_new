// ================================================================
// CHEEKY COMMODORE GAMER
// UNIVERSAL GENRE / COLLECTION LOADER — V4 (FINAL)
// ------------------------------------------------
// - Powers ALL /games/genres/*.html & future collections
// - Uses canonical genre keys via <body data-genre="arcade">
// - Works on GitHub Pages AND Fasthosts hosting
// - Automatically matches game.genres[] OR game.genre
// - Supports thumbnail fallback, sorting, hero images
// ================================================================


const GENRE_CONFIG = {
  "action-adventure": {
    label: "Action Adventure Games",
    matchTags: ["Action Adventure Games"],
    heroImage: "resources/images/genres/action-adventure.png"
  },
  "adventure": {
    label: "Adventure Games",
    matchTags: ["Adventure Games"],
    heroImage: "resources/images/genres/adventure.png"
  },
  "arcade": {
    label: "Arcade Games",
    matchTags: ["Arcade Games"],
    heroImage: "resources/images/genres/arcade.png"
  },
  "bpjs": {
    label: "BPjS Indexed Games",
    matchTags: ["BPJS Games", "BPjS Games", "BPJS Indexed Games"],
    heroImage: "resources/images/genres/bpjs.png"
  },
  "casino": {
    label: "Casino Games",
    matchTags: ["Casino Games"],
    heroImage: "resources/images/genres/casino.png"
  },
  "cartridge": {
    label: "C64 Cartridge Games",
    matchTags: ["C64 Cartridge Games", "Cartridge Games"],
    heroImage: "resources/images/genres/cartridge.png"
  },
  "fighting": {
    label: "Fighting Games",
    matchTags: ["Fighting Games"],
    heroImage: "resources/images/genres/fighting.png"
  },
  "horror": {
    label: "Horror Games",
    matchTags: ["Horror Games"],
    heroImage: "resources/images/genres/horror.png"
  },
  "licensed": {
    label: "Licensed Games",
    matchTags: ["Licensed Games"],
    heroImage: "resources/images/genres/licensed.png"
  },
  "miscellaneous": {
    label: "Miscellaneous",
    matchTags: ["Miscellaneous"],
    heroImage: "resources/images/genres/miscellaneous.png"
  },
  "platform": {
    label: "Platform Games",
    matchTags: ["Platform Games"],
    heroImage: "resources/images/genres/platform.png"
  },
  "puzzle": {
    label: "Puzzle Games",
    matchTags: ["Puzzle Games"],
    heroImage: "resources/images/genres/puzzle.png"
  },
  "quiz": {
    label: "Quiz Games",
    matchTags: ["Quiz Games"],
    heroImage: "resources/images/genres/quiz.png"
  },
  "racing": {
    label: "Racing Games",
    matchTags: ["Racing Games"],
    heroImage: "resources/images/genres/racing.png"
  },
  "role-playing": {
    label: "Role-Playing Games",
    matchTags: ["Role-Playing Games", "RPG", "RPG Games"],
    heroImage: "resources/images/genres/role-playing.png"
  },
  "shooting": {
    label: "Shooting Games",
    matchTags: ["Shooting Games"],
    heroImage: "resources/images/genres/shooting.png"
  },
  "sports": {
    label: "Sports Games",
    matchTags: ["Sports Games"],
    heroImage: "resources/images/genres/sports.png"
  },
  "strategy": {
    label: "Strategy Games",
    matchTags: ["Strategy Games"],
    heroImage: "resources/images/genres/strategy.png"
  },
  "top-picks": {
    label: "Top Picks",
    matchTags: ["Top Picks"],
    heroImage: "resources/images/genres/top-picks.png"
  }
};


// ================================================================
// GENRE KEY DETECTION
// ================================================================

function getCanonicalKey() {
  const bodyKey = document.body.dataset.genre;
  if (bodyKey && GENRE_CONFIG[bodyKey]) return bodyKey;

  const file = window.location.pathname.toLowerCase();

  if (file.includes("action-adventure")) return "action-adventure";
  if (file.includes("adventure-")) return "adventure";
  if (file.includes("arcade-")) return "arcade";
  if (file.includes("bpjs")) return "bpjs";
  if (file.includes("casino-")) return "casino";
  if (file.includes("cartridge-")) return "cartridge";
  if (file.includes("fighting-")) return "fighting";
  if (file.includes("horror-")) return "horror";
  if (file.includes("licensed-")) return "licensed";
  if (file.includes("miscellaneous")) return "miscellaneous";
  if (file.includes("platform-")) return "platform";
  if (file.includes("puzzle-")) return "puzzle";
  if (file.includes("quiz-")) return "quiz";
  if (file.includes("racing-")) return "racing";
  if (file.includes("role-playing-")) return "role-playing";
  if (file.includes("shooting-")) return "shooting";
  if (file.includes("sports-")) return "sports";
  if (file.includes("strategy-")) return "strategy";
  if (file.includes("top-picks")) return "top-picks";

  return null;
}


// ================================================================
// GAME TAG NORMALISATION
// ================================================================

function normaliseTags(tags) {
  if (!tags) return [];
  if (!Array.isArray(tags)) tags = [tags];
  return tags
    .filter(Boolean)
    .map(t => t.toString().trim().toLowerCase());
}


// ================================================================
// CHECK WHETHER A GAME BELONGS TO THIS GENRE
// ================================================================

function gameMatchesGenre(game, canonical) {
  const cfg = GENRE_CONFIG[canonical];
  if (!cfg) return false;

  const gameTags = normaliseTags(game.genres || game.genre);
  if (!gameTags.length) return false;

  const wanted = cfg.matchTags.map(t => t.toLowerCase());
  return gameTags.some(tag => wanted.includes(tag));
}


// ================================================================
// BUILD A GAME CARD ELEMENT
// ================================================================

function buildGameCard(game, canonical) {
  const container = document.createElement("div");
  container.className = "game-card";

  const gameId = game.gameid || game.id;

  const link = document.createElement("a");
  link.className = "game-card-link";
  link.href = "../game.html?id=" + encodeURIComponent(gameId);

  const thumbWrapper = document.createElement("div");
  thumbWrapper.className = "game-thumb-wrapper";

  const img = document.createElement("img");
  img.className = "game-thumb";

  let thumbPath = (game.thumbnail || "").replace(/^\.?\//, "");
  if (thumbPath) {
    img.src = "../../" + thumbPath;
  } else {
    img.src = "../../" + GENRE_CONFIG[canonical].heroImage;
  }
  img.alt = game.title || "Game thumbnail";

  const play = document.createElement("div");
  play.className = "play-icon";
  play.textContent = "▶";

  thumbWrapper.appendChild(img);
  thumbWrapper.appendChild(play);
  link.appendChild(thumbWrapper);

  const meta = document.createElement("div");
  meta.className = "game-card-meta";

  const titleEl = document.createElement("h3");
  titleEl.className = "game-card-title";
  titleEl.textContent = game.title || "Untitled";

  const infoEl = document.createElement("p");
  infoEl.className = "game-card-info";

  let bits = [];
  if (game.year) bits.push(game.year);
  if (game.developer) bits.push(game.developer);
  if (game.system) bits.push(game.system);
  infoEl.textContent = bits.join(" • ");

  meta.appendChild(titleEl);
  if (bits.length) meta.appendChild(infoEl);

  container.appendChild(link);
  container.appendChild(meta);

  return container;
}


// ================================================================
// LOAD GENRE PAGE
// ================================================================

async function loadGenrePage() {
  const canonical = getCanonicalKey();
  const resultsEl = document.getElementById("genre-results");
  const heroTitle = document.getElementById("genre-title");
  const heroImage = document.getElementById("genre-image");

  if (!resultsEl) return;

  if (!canonical || !GENRE_CONFIG[canonical]) {
    resultsEl.innerHTML = "<p>Genre not configured.</p>";
    return;
  }

  const cfg = GENRE_CONFIG[canonical];

  if (heroTitle && !heroTitle.dataset.locked) {
    heroTitle.textContent = cfg.label;
  }

  if (heroImage && cfg.heroImage) {
    heroImage.src = "../../" + cfg.heroImage;
    heroImage.alt = cfg.label;
  }

  try {
    const response = await fetch("../games.json");
    const games = await response.json();

    const matches = games.filter(g => gameMatchesGenre(g, canonical));

    matches.sort((a, b) => {
      const ta = (a.sorttitle || a.title || a.id || "").toString().toLowerCase();
      const tb = (b.sorttitle || b.title || b.id || "").toString().toLowerCase();
      return ta.localeCompare(tb);
    });

    resultsEl.innerHTML = "";

    if (!matches.length) {
      resultsEl.innerHTML = "<p>No games found.</p>";
      return;
    }

    matches.forEach(game => {
      resultsEl.appendChild(buildGameCard(game, canonical));
    });

  } catch (err) {
    console.error("Genre load error:", err);
    resultsEl.innerHTML = "<p>Error loading games.</p>";
  }
}


// ================================================================
// INIT
// ================================================================

document.addEventListener("DOMContentLoaded", loadGenrePage);
