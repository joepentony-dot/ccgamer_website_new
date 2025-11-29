<script>
// ================================================================
// CHEEKY COMMODORE GAMER
// SINGLE GAME PAGE LOADER — FINAL
// ------------------------------------------------
// - URL: /games/game.html?id=game_id
// - Loads from /games/games.json (same directory as game.html)
// - Populates #game-detail with thumbnail, metadata & links
// ================================================================

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function normaliseId(value) {
  if (!value) return "";
  return decodeURIComponent(value.toString().trim());
}

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
    // game.html is inside /games so games.json is just "games.json"
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
    container.innerHTML = "<p>There was a problem loading this game. Please try again later.</p>";
  }
}

function safeText(value) {
  return (value || "").toString();
}

function renderGame(container, game) {
  const title = safeText(game.title);
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
  const diskLinks = Array.isArray(game.disk) ? game.disk : (game.disk ? [game.disk] : []);
  const tapeLinks = Array.isArray(game.tape) ? game.tape : (game.tape ? [game.tape] : []);
  const pdfLinks  = Array.isArray(game.pdflink) ? game.pdflink : (game.pdflink ? [game.pdflink] : []);

  const thumbPath = (game.thumbnail || "").replace(/^\.?\//, "");
  const thumbSrc = thumbPath ? ("../" + thumbPath) : "../resources/images/genres/miscellaneous.png";

  // Update page title
  document.title = `${title} | Cheeky Commodore Gamer`;

  const genreText = genres.join(" • ");

  let videoBlock = "";
  if (videoId) {
    const ytUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    videoBlock = `
      <div class="game-video">
        <h2>Watch on YouTube</h2>
        <a class="btn-cta" href="${ytUrl}" target="_blank" rel="noopener noreferrer">
          Open Gameplay Video
        </a>
      </div>
    `;
  }

  const downloadItems = [];

  diskLinks.forEach((url, idx) => {
    downloadItems.push(`
      <li>
        <a href="${url}" target="_blank" rel="noopener noreferrer">
          Disk ${diskLinks.length > 1 ? idx + 1 : ""}
        </a>
      </li>
    `);
  });

  tapeLinks.forEach((url, idx) => {
    downloadItems.push(`
      <li>
        <a href="${url}" target="_blank" rel="noopener noreferrer">
          Tape ${tapeLinks.length > 1 ? idx + 1 : ""}
        </a>
      </li>
    `);
  });

  let downloadsBlock = "";
  if (downloadItems.length) {
    downloadsBlock = `
      <div class="game-downloads">
        <h2>Downloads</h2>
        <ul>
          ${downloadItems.join("")}
        </ul>
      </div>
    `;
  }

  let manualsBlock = "";
  if (pdfLinks.length) {
    manualsBlock = `
      <div class="game-manuals">
        <h2>Manuals / Extras</h2>
        <ul>
          ${pdfLinks.map((url, i) => `
            <li>
              <a href="${url}" target="_blank" rel="noopener noreferrer">
                Manual ${pdfLinks.length > 1 ? i + 1 : ""}
              </a>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  const infoRows = [];

  if (system) infoRows.push(`<div><span>System</span><strong>${system}</strong></div>`);
  if (year) infoRows.push(`<div><span>Year</span><strong>${year}</strong></div>`);
  if (developer) infoRows.push(`<div><span>Developer</span><strong>${developer}</strong></div>`);
  if (publisher) infoRows.push(`<div><span>Publisher</span><strong>${publisher}</strong></div>`);
  if (composer) infoRows.push(`<div><span>Music</span><strong>${composer}</strong></div>`);
  if (genres.length) infoRows.push(`<div><span>Genres</span><strong>${genreText}</strong></div>`);

  container.innerHTML = `
    <article class="game-layout">
      <div class="game-main">
        <div class="game-hero-card">
          <img class="game-hero-thumb" src="${thumbSrc}" alt="${title}">
          <div class="game-hero-text">
            <h1>${title}</h1>
            ${year || system ? `
              <p class="game-hero-meta">
                ${system ? system : ""}${system && year ? " • " : ""}${year ? year : ""}
              </p>
            ` : ""}
            ${genres.length ? `<p class="game-hero-genres">${genreText}</p>` : ""}
          </div>
        </div>

        ${description ? `
          <section class="game-description">
            <h2>About this game</h2>
            <p>${description}</p>
          </section>
        ` : ""}

        ${videoBlock}
        ${downloadsBlock}
        ${manualsBlock}
      </div>

      <aside class="game-sidebar">
        <div class="game-info-grid">
          ${infoRows.join("")}
        </div>

        <div class="game-back-link">
          <a href="../complete-index.html">← Back to complete index</a>
        </div>
      </aside>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", loadSingleGame);
</script>
