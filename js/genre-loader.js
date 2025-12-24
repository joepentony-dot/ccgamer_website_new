/* ============================================================
   GENRE LOADER — STABLE + URL SAFE IDS (THUMB PATH FIX)
============================================================ */

function ccgRunGenreLoader() {
    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) return;

    const loadCards = async () => {
        try {
            const res = await fetch("../games.json", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load games.json");

            const games = await res.json();

            const filtered = games.filter(g =>
                Array.isArray(g.genres) &&
                g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
            );

            const cards = filtered.map(ccgBuildGameCard).join("");

            if (countEl) countEl.textContent = filtered.length;

            if (cards) {
                grid.innerHTML = cards;
            } else {
                grid.innerHTML = `
                    <div class="ccg-genre-empty">
                        <h3>No games found yet</h3>
                        <p>We&apos;re tuning this genre — check back soon or browse all titles.</p>
                        <div class="ccg-genre-empty__actions">
                            <a class="ccg-btn ccg-btn--primary" href="../index.html">Browse All Games</a>
                            <a class="ccg-btn ccg-btn--secondary" href="../collections/index.html">Explore Collections</a>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            console.error("[CCG] Genre load failed:", err);
        }
    };

    if (typeof window.ccgBuildGameCard === "function") {
        loadCards();
    } else {
        window.addEventListener("ccg-card-builder-ready", loadCards, { once: true });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ccgRunGenreLoader, { once: true });
} else {
    ccgRunGenreLoader();
}
