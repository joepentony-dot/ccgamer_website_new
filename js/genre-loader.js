/* ============================================================
   OMEGA GENRE LOADER — ULTRA-STABLE VISUAL EDITION (FINAL)
   - Supports Omega 16:9 card system
   - Correct depth from /games/genres/
   - Sanitises thumbnails consistently
   - Meta line unified: Year · System · Developer
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("GENRE LOADER — Missing genreName or grid container");
        return;
    }

    try {
        // Correct depth: /games/genres/ → ../games.json
        const response = await fetch("../games.json");
        const games = await response.json();

        const filtered = games.filter(g =>
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        if (countEl) countEl.textContent = filtered.length;

        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

    } catch (err) {
        console.error("GENRE LOADER ERROR:", err);
    }
});

/* ------------------------------------------------------------
   Thumbnail sanitiser — returns VALID 16:9 thumbnail path
------------------------------------------------------------ */
function resolveGenreThumb(raw) {
    if (!raw) return "../../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim();

    // Remove all possible incorrect prefix variants
    t = t.replace("resources/images/thumbnails/all/", "");
    t = t.replace("resources/images/thumbnails/", "");
    t = t.replace("resources/images/", "");
    t = t.replace(/^\/+/, ""); // leading slashes

    if (!t) t = "1942.jpg";

    return `../../resources/images/thumbnails/all/${t}`;
}

/* ------------------------------------------------------------
   Build game card (Omega 16:9 card system)
------------------------------------------------------------ */
function generateGenreCard(game) {

    const finalThumb = resolveGenreThumb(
        game.thumbnail || game.thumb || game.cover
    );

    // Unified meta line: Year · System · Developer
    const meta = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean).join(" · ");

    return `
        <div class="ccg-game-card genre-card">
            <a href="../game.html?id=${game.id}" class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">${meta}</div>

                <a href="../game.html?id=${game.id}"
                   class="ccg-btn ccg-btn--primary">View Game</a>
            </div>
        </div>
    `;
}
