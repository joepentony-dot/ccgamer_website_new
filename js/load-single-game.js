/* ============================================================
   LOAD SINGLE GAME — OMEGA MISSION E7-B
   Stabilised Hero Thumbnail + Correct Paths + Background Blur
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    /* ------------------------------------------------------------
       1) Get ID from URL
    ------------------------------------------------------------- */
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("Missing ?id= parameter in URL.");
        return;
    }

    /* ------------------------------------------------------------
       2) Fetch games.json (NEVER MODIFY JSON)
    ------------------------------------------------------------- */
    let games;

    try {
        const response = await fetch("./games.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        games = await response.json();
    } catch (err) {
        console.error("Failed to load games.json:", err);
        return;
    }

    /* ------------------------------------------------------------
       3) Find the requested game
    ------------------------------------------------------------- */
    const game = games.find(g => String(g.id) === String(gameId));

    if (!game) {
        console.error(`Game with ID ${gameId} not found.`);
        return;
    }

    /* ------------------------------------------------------------
       4) Cache all required DOM nodes
    ------------------------------------------------------------- */
    const titleEl        = document.getElementById("game-title");
    const yearEl         = document.getElementById("game-year");
    const systemEl       = document.getElementById("game-system");
    const developerEl    = document.getElementById("game-developer");
    const descEl         = document.getElementById("game-description");

    const heroImg        = document.getElementById("game-hero-image");
    const heroBG         = document.querySelector(".game-hero-bg");

    const videoSection   = document.getElementById("game-video-section");
    const videoEmbed     = document.getElementById("game-video-embed");

    const relatedGrid    = document.getElementById("related-games-grid");

    /* ------------------------------------------------------------
       5) Populate text fields
    ------------------------------------------------------------- */
    if (titleEl)     titleEl.textContent     = game.title || "";
    if (yearEl)      yearEl.textContent      = game.year || "—";
    if (systemEl)    systemEl.textContent    = game.system || "—";
    if (developerEl) developerEl.textContent = game.developer || "—";
    if (descEl)      descEl.textContent      = game.description || "";

    /* ------------------------------------------------------------
       6) HERO THUMBNAIL — MISSION E7-B FIX
          - Stable path
          - Deferred load
          - Activates cinematic BG blur
          - Prevents collapsed preview
    ------------------------------------------------------------- */
    if (heroImg && game.thumbnail) {

        // Correct depth-aware path (game.html is inside /games/)
        const thumbPath = `../resources/images/thumbnails/all/${game.thumbnail}`;

        heroImg.onload = () => {
            heroImg.classList.add("loaded");      // enables fade-in CSS
            if (heroBG) {
                heroBG.style.backgroundImage = `url('${thumbPath}')`;
                heroBG.classList.add("game-hero-bg--active");
            }
        };

        heroImg.src = thumbPath;
        heroImg.alt = game.title;
    }

    /* ------------------------------------------------------------
       7) Handle YouTube video (optional)
    ------------------------------------------------------------- */
    if (videoEmbed && game.youtube) {
        videoEmbed.src = `https://www.youtube.com/embed/${game.youtube}`;
    } else if (videoSection) {
        videoSection.style.display = "none";
    }

    /* ------------------------------------------------------------
       8) RELATED GAMES — Omega Cinematic Grid
    ------------------------------------------------------------- */
    if (relatedGrid) {
        const sameGenre = games.filter(g => {
            if (g.id === game.id) return false;

            // Works with both "genre" and "genres[]"
            const match1 = typeof g.genre === "string"
                && typeof game.genre === "string"
                && g.genre.trim().toLowerCase() === game.genre.trim().toLowerCase();

            const match2 = Array.isArray(g.genres) && Array.isArray(game.genres)
                && g.genres.some(gen =>
                    game.genres.includes(gen)
                );

            return match1 || match2;
        });

        relatedGrid.innerHTML = sameGenre.slice(0, 8).map(rel => {
            const relThumb = `../resources/images/thumbnails/all/${rel.thumbnail}`;
            return `
                <div class="ccg-game-card">
                    <a href="game.html?id=${rel.id}" class="ccg-game-card__thumb">
                        <img src="${relThumb}" alt="${rel.title}">
                    </a>
                    <div class="ccg-game-card__body">
                        <h3 class="ccg-game-card__title">${rel.title}</h3>
                        <div class="ccg-game-card__meta">
                            <span>${rel.year || "—"}</span> · 
                            <span>${rel.system || "—"}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

});
