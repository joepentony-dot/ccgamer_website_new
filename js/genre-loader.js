/* ============================================================
   GENRE LOADER — STABLE FUNCTIONAL RESTORE
   ------------------------------------------------------------
   • Deterministic genre filtering
   • Local card rendering (NO shared builder dependency)
   • A–Z default sort
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("[CCG] Genre loader aborted — missing genre or grid");
        return;
    }

    try {
        const res = await fetch("../games.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`games.json ${res.status}`);

        const games = await res.json();
        if (!Array.isArray(games)) throw new Error("games.json is not an array");

        const filtered = games.filter(g =>
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        filtered.sort((a, b) =>
            (a.title || "").localeCompare(b.title || "")
        );

        grid.innerHTML = filtered.map(renderGenreCard).join("");

        if (countEl) countEl.textContent = filtered.length;

        console.log(`[CCG] Genre "${genreName}" loaded: ${filtered.length} games`);

    } catch (err) {
        console.error("[CCG] Failed to load genre games:", err);
    }
});

/* ============================================================
   LOCAL CARD RENDERER (GENRE-SAFE)
============================================================ */

function renderGenreCard(game) {
    const thumb = resolveGenreThumb(game.thumbnail || game.thumb || game.cover);
    const title = game.title || "Unknown";

    return `
        <a href="../game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${title}</h3>
                <div class="ccg-game-card__meta">
                    ${game.year || ""} · ${game.system || ""}
                </div>
            </div>
        </a>
    `;
}

function resolveGenreThumb(raw) {
    if (!raw) return "../../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).replace(/^\/+/, "");
    if (!t.startsWith("resources/")) {
        t = `resources/images/thumbnails/all/${t}`;
    }

    return `../../${t}`;
}
