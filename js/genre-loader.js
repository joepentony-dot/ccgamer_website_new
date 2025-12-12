/* ============================================================
   GENRE LOADER — OMEGA STABLE + DISCOVERABILITY (PHASE B3)
   ------------------------------------------------------------
   • Loads games for a single genre
   • Uses shared card builder
   • NEW: Client-side sort toggle (A–Z / Year)
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");
    const sortSelect = document.getElementById("genreSortSelect");

    if (!genreName || !grid) return;

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        const allGames = Array.isArray(games) ? games : [];

        let filtered = allGames.filter(g =>
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        function sortGames(mode) {
            const sorted = [...filtered];

            if (mode === "year") {
                sorted.sort((a, b) => {
                    const ay = parseInt(a.year) || 0;
                    const by = parseInt(b.year) || 0;
                    return by - ay;
                });
            } else {
                sorted.sort((a, b) =>
                    (a.title || "").localeCompare(b.title || "")
                );
            }

            return sorted;
        }

        function render(mode = "az") {
            const gamesToRender = sortGames(mode);

            grid.innerHTML = gamesToRender
                .map(game => buildGameCard(game))
                .join("");

            if (countEl) {
                countEl.textContent = gamesToRender.length;
            }
        }

        /* Initial render (A–Z default) */
        render("az");

        /* Wire sort toggle if present */
        if (sortSelect) {
            sortSelect.addEventListener("change", () => {
                render(sortSelect.value);
            });
        }

    } catch (err) {
        console.error("[CCG] Failed to load genre games:", err);
    }
});
