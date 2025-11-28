/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE/COLLECTION PAGE LOADER
   FINAL VERSION — THUMBS + MODAL VIDEO + GAME INFO BUTTON
   ================================================================ */

async function loadGenrePage() {
    const container     = document.getElementById("genre-results");
    const emptyMessage  = document.getElementById("empty-message");
    const summaryText   = document.getElementById("summary-text");
    const summaryCount  = document.getElementById("summary-count");

    // Detect whether this is a genre OR a collection page
    const genreName      = document.body.getAttribute("data-genre");
    const collectionName = document.body.getAttribute("data-collection");
    const filterName     = genreName || collectionName || "";

    if (filterName) {
        summaryText.textContent = "Loading “" + filterName + "”…";
    } else {
        summaryText.textContent = "Loading games…";
    }
    summaryCount.textContent = "";

    try {
        // Page is inside /games/genres/ or /games/collections/
        const response = await fetch("../games.json");
        if (!response.ok) {
            throw new Error("Failed to load games.json (" + response.status + ")");
        }

        const games = await response.json();

        // Normalise thumbnails: if we ever add `thumbnail` later, keep it in sync
        games.forEach(g => {
            if (!g.thumbnail && g.thumblink) {
                g.thumbnail = g.thumblink;
            }
        });

        // Function to match genre/collection names from JSON
        function matchesCategory(game, name) {
            const target = (name || "").toLowerCase().trim();
            if (!target) return false;

            if (typeof game.genre === "string") {
                return game.genre.toLowerCase().trim() === target;
            }

            if (Array.isArray(game.genre)) {
                return game.genre.some(
                    g => (g || "").toLowerCase().trim() === target
                );
            }

            return false;
        }

        const allCount   = games.length;
        const matches    = filterName ? games.filter(g => matchesCategory(g, filterName)) : games;
        const matchCount = matches.length;

        summaryText.textContent =
            "Showing " + matchCount + " out of " + allCount + " games.";
        summaryCount.textContent = matchCount + " games";

        container.innerHTML = "";
        emptyMessage.style.display = matchCount === 0 ? "block" : "none";

        // Inject cards
        matches.forEach(game => {
            const card = document.createElement("article");
            card.className = "game-card";

            // Store video ID on the card for the modal
            if (game.videoid) {
                card.dataset.videoid = game.videoid;
            }

            // ---------- Thumbnail ----------
            const thumbWrapper = document.createElement("div");
            thumbWrapper.className = "thumb-wrapper";

            const img = document.createElement("img");
            const thumbUrl = game.thumbnail || game.thumblink;

            if (thumbUrl) {
                // thumblink is already a full URL (raw.githubusercontent…)
                img.src = thumbUrl;
                img.alt = game.title ? (game.title + " thumbnail") : "Thumbnail";
            } else {
                img.alt = "No thumbnail";
            }

            const playOverlay = document.createElement("div");
            playOverlay.className = "card-play-icon";
            playOverlay.innerHTML = `<span>▶</span>`;

            thumbWrapper.appendChild(img);
            thumbWrapper.appendChild(playOverlay);

            // ---------- Body ----------
            const body = document.createElement("div");
            body.className = "card-body";

            const titleRow = document.createElement("div");
            titleRow.className = "card-title-row";

            const title = document.createElement("div");
            title.className = "card-title";
            title.textContent = game.title || "Untitled";

            const year = document.createElement("div");
            year.className = "card-year";
            year.textContent = game.year || "";

            titleRow.appendChild(title);
            titleRow.appendChild(year);

            const meta = document.createElement("div");
            meta.className = "card-meta";

            // ✅ ONLY show developer name, no "Dev:", no composer
            if (game.developer) {
                meta.textContent = game.developer;
            } else {
                meta.textContent = "";
            }

            // ---------- Footer ----------
            const footer = document.createElement("div");
            footer.className = "card-footer";

            const system = document.createElement("span");
            system.textContent = game.system || "C64";

            const link = document.createElement("a");
            link.className = "open-link";
            const id = encodeURIComponent(game.id);
            link.href = "../game.html?id=" + id;

            // ✅ Change label to ➜ Game Info
            link.innerHTML = `<span class="icon">➜</span><span>Game Info</span>`;

            footer.appendChild(system);
            footer.appendChild(link);

            body.appendChild(titleRow);
            if (meta.textContent !== "") body.appendChild(meta);
            body.appendChild(footer);

            // ---------- Assemble card ----------
            card.appendChild(thumbWrapper);
            card.appendChild(body);
            container.appendChild(card);
        });

        // After cards are in the DOM, wire up the video modal
        setupVideoModal();

    } catch (err) {
        console.error(err);
        summaryText.textContent = "Error loading games.";
        summaryCount.textContent = "";
        emptyMessage.style.display = "block";
        emptyMessage.textContent =
            "Could not load games.json — check console for details.";
    }
}

/* ================================================================
   VIDEO MODAL: Thumbnail + ▶ open a resizable, fullscreen-capable
   YouTube embed using the game.videoid stored on each card.
   ================================================================ */
function setupVideoModal() {
    const modal    = document.getElementById("video-modal");
    const iframe   = document.getElementById("video-modal-iframe");
    const closeBtn = document.getElementById("video-modal-close");
    const backdrop = document.getElementById("video-modal-backdrop");

    if (!modal || !iframe) {
        // No modal on this page (fails silently)
        return;
    }

    function openModal(videoId) {
        if (!videoId) return;
        const embedUrl =
            "https://www.youtube.com/embed/" +
            encodeURIComponent(videoId) +
            "?autoplay=1&rel=0";
        iframe.src = embedUrl;
        modal.classList.add("open");
    }

    function closeModal() {
        iframe.src = "";
        modal.classList.remove("open");
    }

    if (closeBtn)   closeBtn.addEventListener("click", closeModal);
    if (backdrop)   backdrop.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    // ✅ Clicking thumbnail OR ▶ opens the modal
    document.querySelectorAll(".game-card").forEach(card => {
        const videoId = card.dataset.videoid;
        if (!videoId) return;

        const thumb  = card.querySelector(".thumb-wrapper");
        const icon   = card.querySelector(".card-play-icon");

        function hook(el) {
            if (!el) return;
            el.style.cursor = "pointer";
            el.addEventListener("click", () => openModal(videoId));
        }

        hook(thumb);
        hook(icon);
    });
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
