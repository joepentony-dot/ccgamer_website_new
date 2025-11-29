/* ============================================================
   CCG – COMPLETE INDEX LOADER (NEW JSON FORMAT)
   ------------------------------------------------------------
   - Loads /games/games.json from ROOT
   - Sorts by sorttitle (fallback: title)
   - Renders clickable list of all games
   - Safe with missing fields
   ============================================================ */

async function loadCompleteIndex() {
  const container = document.getElementById("complete-results");
  const statusEl = document.getElementById("complete-status");

  if (!container) {
    console.error("complete-results container not found.");
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Loading game index...";
  }

  try {
    const response = await fetch("games/games.json");
    if (!response.ok) throw new Error("HTTP " + response.status);

    const games = await response.json();

    // Sort by sorttitle, then title
    games.sort((a, b) => {
      const sa = (a.sorttitle || a.title || "").toLowerCase();
      const sb = (b.sorttitle || b.title || "").toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    });

    container.innerHTML = "";

    games.forEach(game => {
      const title = game.title || "Untitled";
      const year = game.year || "";
      const system = game.system || "";

      const row = document.createElement("div");
      row.className = "index-row";

      const link = document.createElement("a");
      link.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
      link.textContent = title;

      row.appendChild(link);

      // Optional extra info
      const metaSpan = document.createElement("span");
      metaSpan.className = "index-meta";
      const bits = [];
      if (year) bits.push(year);
      if (system) bits.push(system);
      if (bits.length) metaSpan.textContent = "  (" + bits.join(" • ") + ")";
      row.appendChild(metaSpan);

      container.appendChild(row);
    });

    if (statusEl) {
      statusEl.textContent = `Loaded ${games.length} games.`;
    }
  } catch (err) {
    console.error("Error loading complete index:", err);
    if (statusEl) {
      statusEl.textContent = "Error loading game index.";
    } else {
      container.textContent = "Error loading game index.";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
