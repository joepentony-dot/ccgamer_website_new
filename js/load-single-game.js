/* ============================================================
   CCG LOAD SINGLE GAME — ULTRA-STABLE OMEGA EDITION (FINAL)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL");
        return;
    }

    try {
        // ★ FIXED PATH — correct JSON location
        const response = await fetch("../games/games.json");
        const games = await response.json();

        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            console.error("Game not found:", gameId);
            return;
        }

        renderGame(game);
    } catch (err) {
        console.error("Error loading games.json:", err);
    }
});

function renderGame(game) {

    /* -------------- THUMBNAIL PATH FIX -------------- */
    let thumb = game.thumbnail || "";

    if (thumb.startsWith("resources/images/")) {
        thumb = thumb.replace("resources/images/thumbnails/all/", "")
                     .replace("resources/images/thumbnails/", "")
                     .replace("resources/images/", "");
    }

    const finalThumb = `resources/images/thumbnails/all/${thumb}`;

    /* ---------- HERO ---------- */
    document.getElementById("game-title").textContent = game.title;
    document.getElementById("game-system").textContent = game.system || "Unknown";
    document.getElementById("game-year").textContent = game.year || "—";
    document.getElementById("game-developer").textContent = game.developer || "Unknown";

    const img = document.getElementById("game-hero-image");
    img.src = finalThumb;
    img.alt = game.title;

    const bg = document.querySelector(".game-hero-bg");
    if (bg) {
        bg.style.backgroundImage = `url('${finalThumb}')`;
        bg.classList.add("game-hero-bg--active");
    }

    /* ---------- DESCRIPTION ---------- */
    const desc = document.getElementById("game-description");
    if (game.description && desc) {
        desc.textContent = game.description;
        document.getElementById("game-description-section").hidden = false;
    }

    /* ---------- VIDEO ---------- */
    const vid = document.getElementById("game-video-embed");
    if (game.video && vid) {
        vid.src = `https://www.youtube.com/embed/${game.video}`;
        document.getElementById("game-video-section").hidden = false;
    }

    /* ---------- RELATED ---------- */
    renderRelatedGames(game);
}

function renderRelatedGames(game) {
    const container = document.getElementById("related-games-grid");
    if (!container) return;

    fetch("../games/games.json")
        .then(res => res.json())
        .then(allGames => {

            const mainGenre = (game.genres && game.genres[0]) || null;

            const related = allGames.filter(g =>
                g.id !== game.id &&
                g.genres &&
                g.genres.includes(mainGenre)
            ).slice(0, 6);

            container.innerHTML = related.map(g => {
                let t = g.thumbnail || "";

                if (t.startsWith("resources/images/")) {
                    t = t.replace("resources/images/thumbnails/all/", "");
                }

                const finalT = `resources/images/thumbnails/all/${t}`;

                return `
                    <a href="game.html?id=${g.id}" class="ccg-game-card">
                        <div class="ccg-game-card__thumb">
                            <img src="${finalT}" alt="${g.title}">
                        </div>
                        <div class="ccg-game-card__body">
                            <h3 class="ccg-game-card__title">${g.title}</h3>
                            <div class="ccg-game-card__meta">${g.year || ""} · ${g.system || ""}</div>
                        </div>
                    </a>
                `;
            }).join("");
        });
}
