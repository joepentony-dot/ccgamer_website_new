/* ============================================================
   CCG GAMES LIBRARY — OMEGA ULTRA-STABLE EDITION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {

        // ★ FIXED PATH — index.html → games/games.json
        const response = await fetch("games/games.json");
        const games = await response.json();

        const grid = document.getElementById("gamesGrid");
        const countEl = document.getElementById("gamesCount");

        if (!grid) return;

        grid.innerHTML = games.map(g => renderGameCard(g)).join("");

        if (countEl) countEl.textContent = games.length;

    } catch (err) {
        console.error("Error loading games.json:", err);
    }
});

function renderGameCard(game) {

    let thumb = game.thumbnail || "";

    if (thumb.startsWith("resources/images/")) {
        thumb = thumb.replace("resources/images/thumbnails/all/", "");
    }

    const finalThumb = `../resources/images/thumbnails/all/${thumb}`;

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">${game.year || ""} · ${game.system || ""}</div>
            </div>
        </a>
    `;
}
