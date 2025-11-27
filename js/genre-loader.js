document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const fileName = path.substring(path.lastIndexOf("/") + 1); // e.g. "arcade-games.html"
    const slug = fileName.replace(/\.html$/i, "");              // e.g. "arcade-games"

    const genreName = slugToGenreName(slug);

    // Update visible heading + document title
    const headingEl = document.getElementById("genre-name");
    if (headingEl) headingEl.textContent = genreName;

    if (document.title.includes("Cheeky Commodore Gamer")) {
        document.title = `Cheeky Commodore Gamer | ${genreName}`;
    }

    const countEl = document.getElementById("genre-count");
    if (countEl) countEl.textContent = "Loading games…";

    loadGamesForGenre(genreName);
});

/**
 * Convert filename slug → JSON genre name.
 *
 * Examples:
 *  "action-adventure"     -> "Action Adventure Games"
 *  "adventure-games"      -> "Adventure Games"
 *  "arcade-games"         -> "Arcade Games"
 *  "miscellaneous"        -> "Miscellaneous"
 */
function slugToGenreName(slug) {
    // Special-case genres that do NOT end with "Games"
    const specials = {
        "miscellaneous": "Miscellaneous",
        "quiz-games": "Quiz Games" // already correct
    };

    if (specials[slug]) {
        return specials[slug];
    }

    // Convert "action-adventure" → "Action Adventure"
    let name = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());

    // Ensure it ends with "Games"
    if (!name.endsWith("Games")) {
        name += " Games";
    }

    return name;
}

async function loadGamesForGenre(genreName) {
    const gridEl = document.getElementById("games-grid");
    const countEl = document.getElementById("genre-count");
    const noGamesEl = document.getElementById("no-games");

    if (!gridEl) return;

    try {
        // CORRECT PATH for your repo:
        // /games/genres/page.html → ../games.json
        const res = await fetch("../games.json", { cache: "no-store" });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const games = await res.json();

        // Case-insensitive matching
        const matches = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.some(g => g.toLowerCase() === genreName.toLowerCase())
        );

        renderGames(matches, gridEl);

        if (matches.length === 0) {
            if (noGamesEl) noGamesEl.classList.remove("hidden");
            if (countEl) countEl.textContent = "0 games found.";
        } else {
            if (noGamesEl) noGamesEl.classList.add("hidden");
            const label = matches.length === 1 ? "game" : "games";
            if (countEl) countEl.textContent = `${matches.length} ${label} found in this genre.`;
        }

    } catch (err) {
        console.error("Error loading games:", err);
        if (countEl) countEl.textContent = "Error loading games.";
        if (noGamesEl) {
            noGamesEl.textContent = "ERROR LOADING GAME DATA.";
            noGamesEl.classList.remove("hidden");
        }
    }
}

function renderGames(games, container) {
    container.innerHTML = "";

    games.forEach(game => {
        const card = document.createElement("article");
        card.className = "game-card";

        const videoId = game.video || "";
        const youtubeUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : "#";

        const thumb = game.thumb || "";
        const systemLabel = (game.system || "").toUpperCase();
        const genreTags = Array.isArray(game.genres)
            ? game.genres.join(" • ")
            : "";

        card.innerHTML = `
            <a class="thumb-wrapper" href="${youtubeUrl}" target="_blank" rel="noopener">
                <img src="${thumb}" alt="${escapeHtml(game.title || "C64 / Amiga game")}" loading="lazy">
                <div class="play-badge">▶</div>
            </a>

            <div class="game-meta">
                <h2 class="game-title">${escapeHtml(game.title || "Untitled Game")}</h2>
                <p class="system-tag">${escapeHtml(systemLabel)}</p>
                <p class="genre-tags">${escapeHtml(genreTags)}</p>

                <div class="card-footer">
                    <a class="watch-btn" href="${youtubeUrl}" target="_blank" rel="noopener">
                        Watch on YouTube
                    </a>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
