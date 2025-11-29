/* ============================================================
   CCG – SINGLE GAME PAGE LOADER (NEW JSON FORMAT)
   ------------------------------------------------------------
   - Used by /games/game.html?id=GAMEID
   - Looks up game.id in games.json
   - Fills in title, year, developer, genres, thumbnail
   - Handles YouTube, Lemon, PDF, and Disk links
   - Safe if some fields are missing
   ============================================================ */

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute(attr, value);
}

function showElement(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? "" : "none";
}

async function loadSingleGame() {
  const gameId = getQueryParam("id");
  const statusEl = document.getElementById("game-status");

  if (!gameId) {
    if (statusEl) statusEl.textContent = "No game ID specified.";
    console.error("No game ID in query string.");
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Loading game data...";
  }

  try {
    // From /games/game.html → games.json
    const response = await fetch("games.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const games = await response.json();

    const game = games.find(g => String(g.id) === String(gameId));

    if (!game) {
      if (statusEl) statusEl.textContent = "Game not found.";
      console.error("Game not found in JSON for id:", gameId);
      return;
    }

    // Title
    const title = game.title || "Unknown Game";
    setText("game-title", title);

    // If your big heading is the first H1 and initially says LOADING...
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent.toLowerCase().includes("loading")) {
      h1.textContent = title;
    }

    // Meta fields
    setText("game-year", game.year ? String(game.year) : "-");
    setText("game-developer", game.developer || "-");
    setText(
      "game-genres",
      Array.isArray(game.genres) && game.genres.length
        ? game.genres.join(", ")
        : "-"
    );

    // Thumbnail
    if (game.thumbnail) {
      const thumbEl = document.getElementById("game-thumbnail");
      if (thumbEl && thumbEl.tagName.toLowerCase() === "img") {
        thumbEl.src = game.thumbnail;
        thumbEl.alt = title + " thumbnail";
      }
    }

    // Video (YouTube)
    if (game.videoid) {
      const videoLink = document.getElementById("game-video-link");
      if (videoLink) {
        videoLink.href = `https://www.youtube.com/watch?v=${game.videoid}`;
        showElement("game-video-link", true);
      }
    } else {
      showElement("game-video-link", false);
    }

    // Lemon links (if you want to show them)
    const lemonContainer = document.getElementById("game-lemon-links");
    if (lemonContainer && Array.isArray(game.lemon) && game.lemon.length) {
      lemonContainer.innerHTML = "";
      game.lemon.forEach((url, index) => {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = index === 0 ? "Lemon64" : `Lemon64 (${index + 1})`;
        lemonContainer.appendChild(a);
        if (index < game.lemon.length - 1) {
          const sep = document.createTextNode(" | ");
          lemonContainer.appendChild(sep);
        }
      });
      lemonContainer.style.display = "";
    } else if (lemonContainer) {
      lemonContainer.style.display = "none";
    }

    // PDF manual
    if (game.pdf) {
      const pdfLink = document.getElementById("game-pdf-link");
      if (pdfLink) {
        pdfLink.href = game.pdf;
        showElement("game-pdf-link", true);
      }
    } else {
      showElement("game-pdf-link", false);
    }

    // Disk downloads (combine into one button)
    const diskBtn = document.getElementById("game-disk-link");
    if (diskBtn && Array.isArray(game.disk) && game.disk.length) {
      // Click → open all disk urls in new tabs
      diskBtn.onclick = function (e) {
        e.preventDefault();
        game.disk.forEach(url => {
          if (url) window.open(url, "_blank", "noopener");
        });
      };
      showElement("game-disk-link", true);
    } else if (diskBtn) {
      showElement("game-disk-link", false);
    }

    if (statusEl) {
      statusEl.textContent = "";
    }
  } catch (err) {
    console.error("Error loading single game:", err);
    if (statusEl) {
      statusEl.textContent = "Error loading game data.";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadSingleGame);
