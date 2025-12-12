/* ============================================================
   OMEGA GENRE / COLLECTION LOADER — DATA INTEGRITY EDITION
   ----------------------------------------------------------------
   • Supports standard genres + collection genres
   • Zero visual or layout changes
   • Console-only diagnostics
   • Robust genre normalisation
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreRaw = document.body.dataset.genre;
    const genreName = decodeURIComponent((genreRaw || "").toString()).trim();
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("[CCG GENRE] Missing genre name or grid container");
        return;
    }

    try {
        // Correct depth for /games/genres/* and /games/collections/*
        const response = await fetch("../games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG DATA] games.json is not an array");
            return;
        }

        const genreKey = genreName.toLowerCase();

        const filtered = games.filter(game => {
            if (!Array.isArray(game.genres)) {
                console.warn("[CCG DATA WARNING] Game missing genres:", game);
                return false;
            }

            const normalisedGenres = game.genres.map(g =>
                String(g).toLowerCase().trim()
            );

            return normalisedGenres.includes(genreKey);
        });

        if (countEl) {
            countEl.textContent = filtered.length.toString();
        }

        if (filtered.length === 0) {
            console.warn(
                `[CCG COLLECTION WARNING] No games found for "${genreName}"`
            );

            console.info(
                "[CCG DEBUG] Available genre tags in data:",
                [...new Set(
                    games
                        .flatMap(g => Array.isArray(g.genres) ? g.genres : [])
                        .map(g => String(g).toLowerCase().trim())
                )].sort()
            );
        }

        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

    } catch (err) {
        console.error("[CCG GENRE] Loader error:", err);
    }
});

/* ------------------------------------------------------------
   Thumbnail sanitiser — returns VALID 16:9 thumbnail path
------------------------------------------------------------ */
function resolveGenreThumb(raw) {
    if (!raw) return "../../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim();

    t = t.replace("resources/images/thumbnails/all/", "");
    t = t.replace("resources/images/thumbnails/", "");
    t = t.replace("resources/images/", "");
    t = t.replace(/^\/+/, "");

    if (!t) t = "1942.jpg";

    return `../../resources/images/thumbnails/all/${t}`;
}

/* ------------------------------------------------------------
   Build game card (Omega 16:9 card system)
------------------------------------------------------------ */
function generateGenreCard(game) {

    if (!game || game.id === undefined) {
        console.warn("[CCG DATA WARNING] Game missing ID:", game);
    }

    if (!game.title) {
        console.warn("[CCG DATA WARNING] Game missing title:", game);
    }

    const finalThumb = resolveGenreThumb(
        game.thumbnail || game.thumb || game.cover
    );

    const meta = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean).join(" · ");

    const gameId = game.id !== undefined ? String(game.id) : "";

    return `
        <div class="ccg-game-card genre-card">
            <a href="../game.html?id=${gameId}" class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title || "Game artwork"}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title || "Unknown Game"}</h3>
                <div class="ccg-game-card__meta">${meta}</div>

                <a href="../game.html?id=${gameId}"
                   class="ccg-btn ccg-btn--primary">View Game</a>
            </div>
        </div>
    `;
}
