/* ============================================================
   GENRE LOADER — STABLE + URL SAFE IDS (THUMB PATH FIX)
============================================================ */

function ccgSlugify(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function ccgRunGenreLoader() {
    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");
    const isMobile = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 820px)").matches
        : window.innerWidth <= 820;

    if (!genreName || !grid) return;

    const loadCards = async () => {
        try {
            const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
            const url = `${root}games/games.json`;
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load games.json");

            const games = await res.json();

            const genreKey = ccgSlugify(genreName);

            const filtered = games.filter(game =>
                Array.isArray(game.genres) &&
                game.genres.some(g => ccgSlugify(g) === genreKey)
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
