/* ============================================================
   CCG GAMES LIBRARY — OMEGA A–Z NEON EDITION (FINAL)
   - Fetches /games/games.json (unchanged path)
   - Groups games by first letter of title
   - Renders A–Z sections with neon letter bars
   - Uses shared 16:9 Omega cards (ccg-game-card classes)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    try {
        // CORRECT PATH — index.html lives inside /games/
        const response = await fetch("games.json");
        const games = await response.json();

        // Total count (for hero)
        const countEl = document.getElementById("gamesCount");
        if (countEl) {
            countEl.textContent = games.length;
        }

        const azContainer = document.getElementById("gamesAtoZContainer");
        const legacyGrid = document.getElementById("gamesGrid"); // safety fallback

        // If we have the new A–Z container, use upgraded layout
        if (azContainer) {
            renderAtoZLibrary(games, azContainer);
        }
        // Otherwise, fall back gracefully to the older single grid behaviour
        else if (legacyGrid) {
            legacyGrid.innerHTML = games.map(g => renderGameCard(g)).join("");
        }

    } catch (err) {
        console.error("Error loading games.json:", err);
    }
});

/* ============================================================
   A–Z GROUPING & RENDERING
   ============================================================ */

function getTitleFirstLetter(game) {
    const title = (game.title || "").trim();
    if (!title) return "#";

    const letter = title.charAt(0).toUpperCase();

    // A–Z letters stay as-is; numbers / symbols → "#"
    if (letter >= "A" && letter <= "Z") return letter;
    return "#";
}

function renderAtoZLibrary(games, container) {
    // Sort by title first (stable for everything we do after)
    const sorted = [...games].sort((a, b) => {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
    });

    // Group by letter
    const groups = new Map();

    for (const g of sorted) {
        const letter = getTitleFirstLetter(g);
        if (!groups.has(letter)) {
            groups.set(letter, []);
        }
        groups.get(letter).push(g);
    }

    const letters = [];
    for (let c = 65; c <= 90; c++) {
        const l = String.fromCharCode(c);
        if (groups.has(l)) letters.push(l);
    }
    // "#" group (0–9 / symbols) at the end if present
    if (groups.has("#")) {
        letters.push("#");
    }

    const html = letters.map(letter => {
        const list = groups.get(letter) || [];
        return renderLetterBlock(letter, list);
    }).join("");

    container.innerHTML = html;
}

/* ------------------------------------------------------------
   Render a single letter block
------------------------------------------------------------ */

function renderLetterBlock(letter, games) {
    const heading = (letter === "#") ? "0–9 & Symbols" : letter;

    return `
        <section class="games-letter-block">
            <header class="games-letter-header">
                <div class="games-letter-bar">
                    <span class="games-letter-label">${heading}</span>
                </div>
            </header>

            <div class="games-letter-grid">
                ${games.map(g => renderGameCard(g)).join("")}
            </div>
        </section>
    `;
}

/* ============================================================
   RENDERER — CARD (16:9 via ccg-cards.css)
   - JSON thumbnail paths stay as-is (source of truth)
   - We simply add "../" for correct depth from /games/
   - Meta line: Year · System · Developer
   ============================================================ */

function renderGameCard(game) {

    let thumb = game.thumbnail || "";

    // JSON thumbnails are root-relative ("resources/images/thumbnails/all/*.jpg")
    // Convert to correct depth for /games/
    const finalThumb = thumb ? `../${thumb}` : "../resources/images/thumbnails/all/1942.jpg";

    const metaParts = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean);

    const metaText = metaParts.join(" · ");

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${escapeHtml(game.title || "Game artwork")}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${escapeHtml(game.title || "Unknown Game")}</h3>
                <div class="ccg-game-card__meta">${metaText}</div>
            </div>
        </a>
    `;
}

/* ============================================================
   SMALL HELPER — BASIC HTML ESCAPE
   (Keeps titles/meta safe inside attributes / HTML)
   ============================================================ */

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
