/* ================================================================
   CCG COMPLETE INDEX – Updated for local thumbnails (Phase 4)
================================================================ */

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");

    try {
        const response = await fetch("games/games.json");
        const games = await response.json();

        games.sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = "";

        games.forEach(game => {
            const row = document.createElement("div");
            row.className = "complete-index-row";

            const thumb = document.createElement("img");
            thumb.src = game.thumbnail.startsWith("http") ? game.thumbnail : game.thumbnail;
            thumb.alt = game.title;
            thumb.className = "index-thumb";

            const link = document.createElement("a");
            link.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
            link.textContent = game.title;

            row.appendChild(thumb);
            row.appendChild(link);

            container.appendChild(row);
        });

    } catch (err) {
        console.error("Error loading complete index:", err);
        container.innerHTML = `<p>Error loading index.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
