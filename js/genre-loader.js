/* ============================================================
   CCG – UNIVERSAL GENRE / COLLECTION LOADER (NEW JSON FORMAT)
   ------------------------------------------------------------
   - Used by ALL /games/genres/*.html pages
   - Reads the <h1> text as the genre/collection name
   - Matches against game.genres[] (array of strings)
   - Renders clickable cards with thumbnail + meta
   ============================================================ */

async function loadGenrePage() {
  const container = document.getElementById("genre-results");
  const statusEl = document.getElementById("genre-status");
  const header = document.querySelector("h1");

  if (!container) {
    console.error("genre-results container not found.");
    return;
  }

  const pageLabel = header ? header.textContent.trim() : "";
  if (statusEl) {
    statusEl.textContent = "Loading games for: " + (pageLabel || "Unknown Category") + "...";
  }

  try {
    // From /games/genres/*.html → ../games.json
    const response = await fetch("../games.json");
    if (!response.ok) throw new Error("HTTP " + response.status);

    const games = await response.json();

    // Basic match: game.genres is an array of strings
    let matches = [];
    if (pageLabel) {
      matches = games.filter(game =>
        Array.isArray(game.genres) &&
        game.genres.some(g => g.trim().toLowerCase() === pageLabel.toLowerCase())
      );
    }

    // If something like "BPJS Indexed Games" page title doesn't match
    // the genre tag in JSON (e.g. "BPJS Games"), you can add aliases here:
    if (matches.length === 0 && pageLabel.toLowerCase() === "bpjs indexed games") {
      matches = games.filter(game =>
        Array.isArray(game.genres) &&
        game.genres.some(g => g.trim().toLowerCase() === "bpjs games")
      );
    }

    container.innerHTML = "";

    if (!matches.length) {
      container.textContent = "No games found for this category.";
      if (statusEl) statusEl.textContent = "No games found.";
      return;
    }

    matches.forEach(game => {
      const card = document.createElement("div");
      card.className = "game-card";

      const link = document.createElement("a");
      link.href = `../game.html?id=${encodeURIComponent(game.id)}`;
      link.className = "game-link";

      // Thumbnail
      if (game.thumbnail) {
        const img = document.createElement("img");
        img.className = "game-thumb";
        img.src = game.thumbnail;
        img.alt = game.title || "Game thumbnail";
        link.appendChild(img);
      }

      // Title + meta
      const info = document.createElement("div");
      info.className = "game-info";

      const titleEl = document.createElement("div");
      titleEl.className = "game-title";
      titleEl.textContent = game.title || "Untitled";

      const metaEl = document.createElement("div");
      metaEl.className = "game-meta";
      const bits = [];
      if (game.year) bits.push(game.year);
      if (game.developer) bits.push(game.developer);
      metaEl.textContent = bits.join(" • ");

      info.appendChild(titleEl);
      info.appendChild(metaEl);

      link.appendChild(info);
      card.appendChild(link);
      container.appendChild(card);
    });

    if (statusEl) {
      statusEl.textContent = `Loaded ${matches.length} games.`;
    }
  } catch (err) {
    console.error("Error loading genre page:", err);
    if (statusEl) {
      statusEl.textContent = "Could not load genre data.";
    } else {
      container.textContent = "Could not load genre data.";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
