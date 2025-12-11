/* ============================================================
   CCG LOAD SINGLE GAME — ULTRA-STABLE OMEGA EDITION (FIXED)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL");
        return;
    }

    try {
        // CORRECT PATH — game.html lives inside /games/
        const response = await fetch("games.json");
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

/* ============================================================
   RENDER GAME
   ============================================================ */

function renderGame(game) {

    let thumb = game.thumbnail || "";

    if (thumb.startsWith("resources/images/")) {
        thumb = thumb.replace("resources/images/thumbnails/all/", "");
        thumb = thumb.replace("resources/images/thumbnails/", "");
        thumb = thumb.replace("resources/images/", "");
    }

    const finalThumb = `resources/images/thumbnails/all/${thumb}`;

    document.getElementById("game-title").textContent = game.title;
    document.getElementById("game-system-label").textContent = game.system || "Unknown";
    document.getElementById("game-hero-image").src = finalThumb;

    const bg = document.querySelector(".game-hero-bg");
    if (bg) {
        bg.style.backgroundImage = `url('${finalThumb}')`;
        bg.classList.add("game-hero-bg--active");
    }

    document.getElementById("game-year").textContent = game.year || "—";
    document.getElementById("game-system").textContent = game.system || "—";
    document.getElementById("game-developer").textContent = game.developer || "Unknown";

    const genresEl = document.getElementById("game-genres");
    if (genresEl && game.genres?.length) {
        genresEl.textContent = game.genres.join(", ");
        genresEl.hidden = false;
    }

    document.getElementById("game-description").textContent =
        game.description || "No description available.";

    /* VIDEO */
    const embedEl = document.getElementById("game-video-embed");
    const videoSection = document.getElementById("game-video-section");

    if (game.video && embedEl) {
        embedEl.src = `https://www.youtube.com/embed/${game.video}`;
        videoSection.hidden = false;
    }

    /* MANUAL / DISK */
    const pdfBtn = document.getElementById("pdf-button");
    if (pdfBtn) {
        if (game.manual) {
            pdfBtn.href = game.manual;
            pdfBtn.hidden = false;
        }
    }

    const diskBtn = document.getElementById("disk-button");
    if (diskBtn) {
        if (game.disk) {
            diskBtn.href = game.disk;
            diskBtn.hidden = false;
        }
    }

    /* RELATED GAMES */
    renderRelatedGames(game);
}

/* ============================================================
   RELATED GAMES
   ============================================================ */

function renderRelatedGames(game) {
    const container = document.getElementById("related-games-grid");
    if (!container) return;

    fetch("games.json")
        .then(res => res.json())
        .then(allGames => {

            const primary = game.genres?.[0] || null;

            const related = allGames.filter(g =>
                g.id !== game.id &&
                g.genres &&
                g.genres.includes(primary)
            ).slice(0, 6);

            container.innerHTML = related.map(g => {
                let t = g.thumbnail || "";
                if (t.startsWith("resources/images/")) {
                    t = t.replace("resources/images/thumbnails/all/", "");
                }
                const final = `resources/images/thumbnails/all/${t}`;

                return `
                    <a href="game.html?id=${g.id}" class="ccg-game-card">
                        <div class="ccg-game-card__thumb">
                            <img src="${final}" alt="${g.title}">
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
