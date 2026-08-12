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

function ccgNormaliseCollectionValue(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-")
        .replace(/-+/g, "-");
}

function ccgCollectionValueMatchesKey(value, key) {
    const normalizedValue = ccgNormaliseCollectionValue(value);
    const normalizedKey = ccgNormaliseCollectionValue(key);

    if (normalizedValue === normalizedKey) return true;
    if (normalizedKey === "top-picks") return normalizedValue === "top-picks";
    if (normalizedKey === "bpjs") return normalizedValue === "banned" || normalizedValue === "bpjm";
    return false;
}

function ccgRunCollectionLoader() {
    if (document.body?.dataset?.collection === 'Retro Events' || document.body?.dataset?.collection === 'Retro Specials') {
        console.info('[CCG] Skipping legacy collection renderer for curated retro video collections');
        return;
    }

    const collectionName = document.body.dataset.collection;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");
    const initialBatch = 16;
    const batchSize = 24;
    const staticFallbackCount = grid.querySelectorAll('.ccg-game-card--fallback, a[href^="../"]').length;

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
                game.collections.some(value => ccgCollectionValueMatchesKey(value, key))
            );

            if (!filtered.length) {
                console.warn("[CCG COLLECTION] 0 matches", {
                    collectionName,
                    key
                });
            }

            if (countEl) {
                countEl.textContent = filtered.length || staticFallbackCount || "Available";
            }

            if (typeof window.ccgSchemaCollection === "function") {
                window.ccgSchemaCollection({
                    title: collectionName,
                    items: filtered
                });
            }

            if (typeof window.ccgSchemaBreadcrumb === "function") {
                const collectionPath = window.location.pathname.endsWith('/')
                    ? window.location.pathname
                    : `${window.location.pathname.replace(/\.html?$/, '')}.html`;
                window.ccgSchemaBreadcrumb([
                    { name: "Home", url: "https://www.cheekycommodoregamer.co.uk/" },
                    { name: "Collections", url: "https://www.cheekycommodoregamer.co.uk/games/collections/" },
                    { name: collectionName, url: `https://www.cheekycommodoregamer.co.uk${collectionPath}` }
                ]);
            }

            if (filtered.length) {
                renderCollectionCardsInBatches(grid, filtered, { initialBatch, batchSize });
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

function renderCollectionCardsInBatches(container, games, opts = {}) {
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
    document.addEventListener("DOMContentLoaded", ccgRunCollectionLoader, { once: true });
} else {
    ccgRunCollectionLoader();
}
