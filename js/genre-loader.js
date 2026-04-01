/* ============================================================
   GENRE LOADER — STABLE + URL SAFE IDS (THUMB PATH FIX)
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

function ccgRunGenreLoader() {
    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");
    const initialBatch = 16;
    const batchSize = 24;

    if (!genreName || !grid) return;

    const loadCards = async () => {
        try {
            const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
            const url = `${root}games/games.json`;
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load games.json");

            const games = await res.json();

            const pageSlug = ccgGetPageSlug();
            const key = ccgExtractKey(pageSlug);

            const filtered = games.filter(game =>
                Array.isArray(game.genres) &&
                game.genres.includes(key)
            );

            if (!filtered.length) {
                console.warn("[CCG GENRE] 0 matches", { genreName, key });
            }

            if (countEl) countEl.textContent = filtered.length;
            if (filtered.length) {
                renderGenreCardsInBatches(grid, filtered, { initialBatch, batchSize });
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

function renderGenreCardsInBatches(container, games, opts = {}) {
    const initialBatch = Number(opts.initialBatch) > 0 ? Number(opts.initialBatch) : 16;
    const batchSize = Number(opts.batchSize) > 0 ? Number(opts.batchSize) : 24;
    let cursor = 0;
    const existingControls = container.parentElement?.querySelector(".ccg-list-load-more");
    if (existingControls) existingControls.remove();

    const controls = document.createElement("div");
    controls.className = "ccg-list-load-more";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ccg-btn ccg-btn--secondary ccg-list-load-more__btn";
    controls.appendChild(btn);

    const updateButton = () => {
        const remaining = games.length - cursor;
        if (remaining <= 0) {
            controls.remove();
            return;
        }
        btn.textContent = `Load More (${remaining} remaining)`;
    };

    const appendBatch = (size) => {
        const next = games.slice(cursor, cursor + size);
        if (!next.length) return;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = next.map(ccgBuildGameCard).join("");
        const fragment = document.createDocumentFragment();
        Array.from(wrapper.children).forEach(node => fragment.appendChild(node));
        container.appendChild(fragment);
        cursor += next.length;
        updateButton();
    };

    container.innerHTML = "";
    appendBatch(initialBatch);

    if (cursor < games.length) {
        container.insertAdjacentElement("afterend", controls);
        btn.addEventListener("click", () => appendBatch(batchSize));
        updateButton();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ccgRunGenreLoader, { once: true });
} else {
    ccgRunGenreLoader();
}
