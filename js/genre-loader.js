/* ============================================================
   GENRE LOADER — STABLE + URL SAFE IDS
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) return;

    try {
        const res = await fetch("../games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        const games = await res.json();

        const filtered = games.filter(g =>
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        grid.innerHTML = filtered.map(game => {
            const id = encodeURIComponent(game.id);
            const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

            return `
                <a href="../game.html?id=${id}" class="ccg-game-card">
                    <div class="ccg-game-card__thumb">
                        <img src="${thumb}" alt="${game.title}">
                    </div>
                    <div class="ccg-game-card__body">
                        <h3 class="ccg-game-card__title">${game.title}</h3>
                        <div class="ccg-game-card__meta">
                            ${(game.year || "")} · ${(game.system || "")}
                        </div>
                    </div>
                </a>
            `;
        }).join("");

        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("[CCG] Genre load failed:", err);
    }
});

function resolveGameThumb(raw) {
    if (!raw) return "../../resources/images/thumbnails/all/1942.jpg";
    let t = String(raw).replace(/^\/+/, "");
    return `../../resources/images/thumbnails/all/${t}`;
}
