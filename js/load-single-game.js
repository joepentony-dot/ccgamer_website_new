/* ============================================================
   load-single-game.js — Omega Single Game Loader (Ultra Edition)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    /* ------------------------------------------------------------
       1) Extract game ID from URL
       ------------------------------------------------------------ */
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");

    if (!gameId) {
        console.error("CCG Single Game Loader: No game ID in URL.");
        return;
    }

    /* ------------------------------------------------------------
       2) Fetch games database
       ------------------------------------------------------------ */
    let gamesData = [];
    try {
        const response = await fetch("../games/games.json");
        gamesData = await response.json();
    } catch (err) {
        console.error("CCG Single Game Loader: Failed to load games.json", err);
        return;
    }

    const game = gamesData.find(g => String(g.id) === String(gameId));

    if (!game) {
        console.error(`CCG Single Game Loader: Game ${gameId} not found.`);
        return;
    }

    /* ------------------------------------------------------------
       3) Populate Basic Fields: Title, Meta, Developer, System
       ------------------------------------------------------------ */
    const titleEl = document.getElementById("game-title");
    const yearEl = document.getElementById("game-year");
    const systemEl = document.getElementById("game-system");
    const devEl = document.getElementById("game-developer");
    const kickerEl = document.getElementById("game-system-label");

    titleEl.textContent = game.title || "Untitled";
    yearEl.textContent = game.year || "—";
    systemEl.textContent = game.system || "—";
    devEl.textContent = game.developer || "Unknown";

    kickerEl.textContent = game.system === "Amiga" ? "AMIGA" : "COMMODORE 64";

    /* Set document title */
    const metaTitle = document.getElementById("game-meta-title");
    if (metaTitle) {
        metaTitle.textContent = `${game.title} | Cheeky Commodore Gamer`;
    }

    /* Body class for C64 / Amiga glow */
    const pageBody = document.querySelector("[data-ccg-page='single-game']");
    if (pageBody) {
        pageBody.classList.toggle("single-game--amiga", game.system === "Amiga");
        pageBody.classList.toggle("single-game--c64", game.system !== "Amiga");
    }

    /* ------------------------------------------------------------
       4) HERO BACKGROUND + THUMBNAIL
       ------------------------------------------------------------ */
    const heroBg = document.querySelector(".game-hero-bg");
    const heroImg = document.getElementById("game-hero-image");
    const heroThumbLink = document.getElementById("game-hero-video-link");

    if (game.thumbnail) {
        heroImg.src = `../${game.thumbnail}`;
        heroBg.style.backgroundImage = `url("../${game.thumbnail}")`;
        heroBg.classList.add("game-hero-bg--active");
    }

    /* ------------------------------------------------------------
       5) Description block (hide if empty)
       ------------------------------------------------------------ */
    const descSection = document.getElementById("game-description-section");
    const descBody = document.getElementById("game-description");

    if (game.description && game.description.trim() !== "") {
        descBody.textContent = game.description;
        descSection.hidden = false;
    } else {
        descSection.hidden = true;
    }

    /* ------------------------------------------------------------
       6) Genres => "Action, Shooter" converted to a pill
       ------------------------------------------------------------ */
    const genresEl = document.getElementById("game-genres");

    if (game.genre && typeof game.genre === "string") {
        genresEl.textContent = game.genre;
    } else if (Array.isArray(game.genre)) {
        genresEl.textContent = game.genre.join(", ");
    } else {
        genresEl.textContent = "—";
    }

    /* ------------------------------------------------------------
       7) Downloads Panel (Manual, Disk)
       ------------------------------------------------------------ */
    const pdfBtn = document.getElementById("pdf-button");
    const diskBtn = document.getElementById("disk-button");

    if (game.manual) {
        pdfBtn.href = `../${game.manual}`;
        pdfBtn.hidden = false;
    }

    if (game.disk) {
        diskBtn.href = `../${game.disk}`;
        diskBtn.hidden = false;
    }

    /* ------------------------------------------------------------
       8) YouTube Video Button + Thumbnail Clickthrough (NEW)
       ------------------------------------------------------------ */
    const videoBtn = document.getElementById("game-play-video");

    if (game.video) {
        const youtubeUrl = game.video.startsWith("http")
            ? game.video
            : `https://www.youtube.com/watch?v=${game.video}`;

        /* Show main video button */
        videoBtn.href = youtubeUrl;
        videoBtn.hidden = false;

        /* Make thumbnail clickable */
        heroThumbLink.href = youtubeUrl;

        /* Enable thumbnail hover-play overlay */
        heroThumbLink.style.pointerEvents = "auto";

        /* Enable video section */
        const videoSection = document.getElementById("game-video-section");
        const videoEmbed = document.getElementById("game-video-embed");

        videoSection.hidden = false;
        videoEmbed.src = youtubeUrl.replace("watch?v=", "embed/");
    } else {
        videoBtn.hidden = true;
        heroThumbLink.style.pointerEvents = "none";

        const videoSection = document.getElementById("game-video-section");
        videoSection.hidden = true;
    }

    /* ------------------------------------------------------------
       9) Lemon / External Links
       ------------------------------------------------------------ */
    const lemonBlock = document.getElementById("lemon-links-block");
    const lemonList = document.getElementById("lemon-links-list");

    if (game.links && Array.isArray(game.links) && game.links.length > 0) {
        lemonBlock.hidden = false;

        game.links.forEach(linkObj => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = linkObj.url;
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = linkObj.label || "External Link";
            li.appendChild(a);
            lemonList.appendChild(li);
        });
    } else {
        lemonBlock.hidden = true;
    }

    /* ------------------------------------------------------------
       10) Related Games (Genre + Developer Priority)
       ------------------------------------------------------------ */
    const relatedGrid = document.getElementById("related-games-grid");
    const relatedTitle = document.getElementById("related-games-title");

    let related = [];

    if (game.developer) {
        relatedTitle.textContent = `More from ${game.developer}`;
        related = gamesData.filter(
            g => g.developer === game.developer && g.id !== game.id
        );
    }

    if (related.length < 3 && game.genre) {
        const genreMatches = gamesData.filter(g =>
            g.genre === game.genre && g.id !== game.id
        );
        related = [...related, ...genreMatches];
    }

    related = [...new Map(related.map(g => [g.id, g])).values()];
    related = related.slice(0, 12);

    if (related.length === 0) {
        document.querySelector(".game-related-section").hidden = true;
    } else {
        related.forEach(rGame => {
            const card = document.createElement("a");
            card.className = "ccg-game-card";
            card.href = `game.html?id=${rGame.id}`;

            const thumb = document.createElement("div");
            thumb.className = "ccg-game-card__thumb";

            const img = document.createElement("img");
            img.src = `../${rGame.thumbnail}`;
            img.alt = `${rGame.title} thumbnail`;

            thumb.appendChild(img);

            const body = document.createElement("div");
            body.className = "ccg-game-card__body";

            const t = document.createElement("div");
            t.className = "ccg-game-card__title";
            t.textContent = rGame.title;

            const meta = document.createElement("div");
            meta.className = "ccg-game-card__meta";
            meta.textContent = `${rGame.year} • ${rGame.system}`;

            body.appendChild(t);
            body.appendChild(meta);

            card.appendChild(thumb);
            card.appendChild(body);

            relatedGrid.appendChild(card);
        });
    }
});
