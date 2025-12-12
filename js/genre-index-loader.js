/* ============================================================
   CCG GENRE INDEX LOADER — OMEGA SAFE BUILD
   ------------------------------------------------------------
   • Adds per-genre game counts to genres index ONLY
   • Reads visible genre titles (no HTML changes required)
   • Ignores collection-style tags
   • Console-only diagnostics
   • Zero impact on genre / collection pages
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const cards = Array.from(document.querySelectorAll(".genre-grid .ccg-card"));
    if (!cards.length) return;

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG GENRE INDEX] games.json is not an array");
            return;
        }

        // Build genre → count map
        const genreCounts = {};

        games.forEach(game => {
            if (!Array.isArray(game.genres)) return;

            game.genres.forEach(g => {
                const key = String(g).trim();
                if (!key) return;

                genreCounts[key] = (genreCounts[key] || 0) + 1;
            });
        });

        // Apply counts to visible genre cards
        cards.forEach(card => {
            const titleEl = card.querySelector(".ccg-card__title");
            if (!titleEl) return;

            const genreName = titleEl.textContent.trim();
            const count = genreCounts[genreName] || 0;

            // Append count (safe, non-destructive)
            const countEl = document.createElement("div");
            countEl.className = "ccg-genre-count";
            countEl.textContent = `${count} game${count === 1 ? "" : "s"}`;

            titleEl.appendChild(countEl);

            if (count === 0) {
                console.warn(
                    `[CCG GENRE INDEX WARNING] No games found for genre "${genreName}"`
                );
            }
        });

    } catch (err) {
        console.error("[CCG GENRE INDEX] Loader failed:", err);
    }
});
