/* ============================================================
   CCG GENRE INDEX LOADER — OMEGA ORDERED BUILD
   ------------------------------------------------------------
   • Adds per-genre game counts
   • Orders genres by:
       1) Game count (DESC)
       2) Genre name (A–Z)
   • Reads visible genre titles (no HTML edits)
   • Zero impact on genre / collection pages
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const grid = document.querySelector(".genre-grid");
    const cards = Array.from(grid?.querySelectorAll(".ccg-card") || []);

    if (!grid || !cards.length) return;

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG GENRE INDEX] games.json is not an array");
            return;
        }

        /* --------------------------------------------------------
           Build genre → count map
        -------------------------------------------------------- */
        const genreCounts = {};

        games.forEach(game => {
            if (!Array.isArray(game.genres)) return;

            game.genres.forEach(g => {
                const key = String(g).trim();
                if (!key) return;
                genreCounts[key] = (genreCounts[key] || 0) + 1;
            });
        });

        /* --------------------------------------------------------
           Decorate cards with counts + cache metadata
        -------------------------------------------------------- */
        const enriched = cards.map(card => {
            const titleEl = card.querySelector(".ccg-card__title");
            if (!titleEl) return null;

            const genreName = titleEl.textContent.trim();
            const count = genreCounts[genreName] || 0;

            // Append count (idempotent-safe)
            if (!titleEl.querySelector(".ccg-genre-count")) {
                const countEl = document.createElement("div");
                countEl.className = "ccg-genre-count";
                countEl.textContent = `${count} game${count === 1 ? "" : "s"}`;
                titleEl.appendChild(countEl);
            }

            if (count === 0) {
                console.warn(
                    `[CCG GENRE INDEX WARNING] No games found for genre "${genreName}"`
                );
            }

            return {
                card,
                genreName,
                count
            };
        }).filter(Boolean);

        /* --------------------------------------------------------
           ORDERING LOGIC
           1) Count DESC
           2) Genre name A–Z
        -------------------------------------------------------- */
        enriched.sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.genreName.localeCompare(b.genreName);
        });

        /* --------------------------------------------------------
           Re-append cards in sorted order (safe DOM move)
        -------------------------------------------------------- */
        enriched.forEach(item => grid.appendChild(item.card));

    } catch (err) {
        console.error("[CCG GENRE INDEX] Loader failed:", err);
    }
});
