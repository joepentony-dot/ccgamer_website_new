/* ============================================================
   CCG COLLECTION LOADER — OMEGA STABLE (GENRE-BACKED)
   ------------------------------------------------------------
   • Collections are genre-backed (e.g. "Cartridge Games")
   • Uses ccg-card-builder.js
   • Mirrors genre-loader behaviour
   • ZERO impact on genres, index or single-game pages
============================================================ */

function ccgGetPageSlug() {
    try {
        return (window.location.pathname.split("/").pop() || "")
            .replace(/\.html?$/, "")
            .toLowerCase();
    } catch {
        return "";
    }
}

function ccgExtractKey(slug) {
    if (!slug) return "";

    return slug
        .replace(/-games$/, "")
        .replace(/-indexed$/, "")
        .replace(/-collection$/, "")
        .replace(/^genre-/, "")
        .trim();
}

function ccgRunCollectionLoader() {
    if (document.body?.dataset?.collection === 'Retro Events' || document.body?.dataset?.collection === 'Retro Specials') {
        console.info('[CCG] Skipping legacy collection renderer for curated retro video collections');
        return;
    }

    const collectionName = document.body.dataset.collection;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");
    const isMobile = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 820px)").matches
        : window.innerWidth <= 820;

    if (!collectionName || !grid) {
        console.warn("[CCG COLLECTION] Missing data-collection or grid");
        return;
    }

    const loadCards = async () => {
        try {
            // collections live in /games/collections/
            const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
            const url = `${root}games/games.json`;
            const response = await fetch(url, { cache: "no-store" });
            const games = await response.json();

            if (!Array.isArray(games)) {
                console.error("[CCG DATA] games.json is not an array");
                return;
            }

            const pageSlug = ccgGetPageSlug();
            const key = ccgExtractKey(pageSlug);

            const filtered = games.filter(game =>
                Array.isArray(game.collections) &&
                game.collections.includes(key)
            );

            if (!filtered.length) {
                console.warn("[CCG COLLECTION] 0 matches", {
                    collectionName,
                    key
                });
            }

            if (countEl) {
                countEl.textContent = filtered.length;
            }

            const cards = filtered.map(ccgBuildGameCard).join("");

            if (cards) {
                grid.innerHTML = cards;
            } else {
                grid.innerHTML = `
                    <div class="ccg-genre-empty">
                        <h3>No collection entries yet</h3>
                        <p>We&apos;re refreshing this set — check back soon or browse every game.</p>
                        <div class="ccg-genre-empty__actions">
                            <a class="ccg-btn ccg-btn--primary" href="../index.html">Browse All Games</a>
                            <a class="ccg-btn ccg-btn--secondary" href="../genres/index.html">Browse by Genre</a>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            console.error("[CCG COLLECTION] Loader failed:", err);
        }
    };

    if (typeof window.ccgBuildGameCard === "function") {
        loadCards();
    } else {
        window.addEventListener("ccg-card-builder-ready", loadCards, { once: true });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ccgRunCollectionLoader, { once: true });
} else {
    ccgRunCollectionLoader();
}
