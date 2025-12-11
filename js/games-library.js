/* ============================================================
   CCG GAMES LIBRARY — OMEGA ULTRA-STABLE EDITION (FINAL META)
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    try {
        // Correct path — index.html lives inside /games/
        const response = await fetch("games.json");
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

/* ============================================================
   CARD RENDERER — NOW SHOWS YEAR · SYSTEM · DEVELOPER
============================================================ */
function renderGameCard(game) {

    let thumb = game.thumbnail || "";

    const finalThumb = `../${thumb}`;

    const meta = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean).join(" · ");

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">${meta}</div>
            </div>
        </a>
    `;
}
