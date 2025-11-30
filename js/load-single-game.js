// ================================================================
// CHEEKY COMMODORE GAMER – SINGLE GAME PAGE LOADER (FINAL UNIVERSAL VERSION)
// ------------------------------------------------
// - Loads from /games/games.json
// - Auto-selects BEST available download file
// - ONE universal "Download Game" button
// - Supports disk/tape/cart/prg/pdf/t64/tap/extras/etc.
// - Safe for GitHub Pages & Fasthosts
// ================================================================


// ------------------------------------------------
// Helpers
// ------------------------------------------------

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function normaliseId(val) {
  if (!val) return "";
  return decodeURIComponent(val.toString().trim());
}

function safeText(v) {
  return (v || "").toString();
}

function toArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}


// ------------------------------------------------
// MAIN LOADER
// ------------------------------------------------

async function loadSingleGame() {
  const container = document.getElementById("game-detail");
  if (!container) return;

  container.innerHTML = "<p>Loading game data…</p>";

  const rawId = getQueryId();
  const id = normaliseId(rawId);

  if (!id) {
    container.innerHTML = "<p>No game ID provided.</p>";
    return;
  }

  try {
    const response = await fetch("games.json");
    const games = await response.json();

    const game = games.find(g => {
      const gid = normaliseId(g.gameid || g.id);
      return gid === id;
    });

    if (!game) {
      container.innerHTML = `<p>Game not found: <code>${id}</code></p>`;
      return;
    }

    renderGame(container, game);

  } catch (err) {
    console.error("Error loading single game:", err);
    container.innerHTML = "<p>Error loading game details.</p>";
  }
}


// ------------------------------------------------
// UNIVERSAL DOWNLOAD DETECTION
// ------------------------------------------------

function findBestDownload(game) {
  // Priority order (best → fallback)
  const fields = [
    "disk", "d64",
    "tape", "tap", "t64",
    "cart", "crt",
    "prg",
    "pdf", "pdflink",
    "extras", "manual", "docs", "files"
  ];

  for (const field of fields) {
    if (game[field]) {
      const arr = toArray(game[field]).filter(Boolean);
      if (arr.length) return arr[0];
    }
  }

  return ""; // no downloads at all
}


// ------------------------------------------------
// RENDER GAME BLOCK
// ------------------------------------------------

function renderGame(container, game) {
  const title = safeText(game.title);
  document.title = `${title} | Cheeky Commodore Gamer`;

  const year = safeText(game.year);
  const system = safeText(game.system);
  const developer = safeText(game.developer);
  const publisher = safeText(game.publisher);
  const composer = safeText(game.composer);

  const genres = Array.isArray(game.genres || game.genre)
    ? (game.genres || game.genre)
    : [];

  const description = safeText(game.description || game.summary);
  const videoId = safeText(game.videoid);

  // Thumbnail
  const thumbPath = (game.thumbnail || "").replace(/^\.?\//, "");
  const thumbSrc = thumbPath
    ? ("../" + thumbPath)
    : "../resources/images/genres/miscellaneous.png";

  // Genre display
  const genreText = genres.join(" • ");

  // Video block
  let videoBlock = "";
  if (videoId) {
    const ytUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    videoBlock = `
      <div class="game-video">
        <h2>Gameplay Video</h2>
        <a class="btn-cta" href="${ytUrl}" target="_blank">Watch on YouTube</a>
      </div>
    `;
  }

  // 🔥 UNIVERSAL DOWNLOAD BUTTON
  const bestDownload = findBestDownload(game);

  let downloadButton = "";
  if (bestDownload) {
    downloadButton = `
      <div class="game-download-single">
        <h2>Download</h2>
        <a class="btn-cta" href="${bestDownload}"
           target="_blank" rel="noopener noreferrer">
          Download Game
        </a>
      </div>
    `;
  }

  // Metadata grid
  const infoRows = [];
  if (system) infoRows.push(`<div><span>System</span><strong>${system}</strong></div>`);
  if (year) infoRows.push(`<div><span>Year</span><strong>${year}</strong></div>`);
  if (developer) infoRows.push(`<div><span>Developer</span><strong>${developer}</strong></div>`);
  if (publisher) infoRows.push(`<div><span>Publisher</span><strong>${publisher}</strong></div>`);
  if (composer) infoRows.push(`<div><span>Music</span><strong>${composer}</strong></div>`);
  if (genres.length) infoRows.push(`<div><span>Genres</span><strong>${genreText}</strong></div>`);


  // ------------------------------------------------
  // FULL PAGE TEMPLATE
  // ------------------------------------------------

  container.innerHTML = `
    <article class="game-layout">

      <div class="game-main">
        <div class="game-hero-card">
          <img class="game-hero-thumb" src="${thumbSrc}" alt="${title}">
          <div class="game-hero-text">
            <h1>${title}</h1>
            ${
              year || system
                ? `<p class="game-hero-meta">${system || ""}${system && year ? " • " : ""}${year || ""}</p>`
                : ""
            }
            ${
              genres.length
                ? `<p class="game-hero-genres">${genreText}</p>`
                : ""
            }
          </div>
        </div>

        ${
          description
            ? `
              <section class="game-description">
                <h2>About this Game</h2>
                <p>${description}</p>
              </section>
            `
            : ""
        }

        ${videoBlock}
        ${downloadButton}
      </div>

      <aside class="game-sidebar">
        <div class="game-info-grid">
          ${infoRows.join("")}
        </div>

        <div class="game-back-link">
          <a href="../complete-index.html">← Back to Complete Index</a>
        </div>
      </aside>

    </article>
  `;
}


// INIT
// ------------------------------------------------
document.addEventListener("DOMContentLoaded", loadSingleGame);
