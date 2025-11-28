/* ================================================================
   CHEEKY COMMODORE GAMER – UNIVERSAL GENRE / COLLECTION LOADER
   FINAL VERSION — FOR ALL GENRE & COLLECTION PAGES
   ---------------------------------------------------------------
   Supports:
   - data-page-type="genre" with data-genre="Adventure Games"
   - data-page-type="collection" with data-collection="BPJS Games"
   Loads:
   - Thumbnail
   - Developer only
   - Video button (thumbnail click)
   - ➜ Game Info button
   ============================================================== */

async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    if (!container) return console.error("Missing #genre-results container");

    const body = document.body;
    const pageType = body.dataset.pageType;
    const pageGenre = body.dataset.genre || null;
    const pageCollection = body.dataset.collection || null;

    let filterValue = null;

    if (pageType === "genre" && pageGenre) {
        filterValue = pageGenre;
    } else if (pageType === "collection" && pageCollection) {
        filterValue = pageCollection;
    } else {
        console.error("No data-genre or data-collection found.");
        return;
    }

    // Update auto title
    const titleEl = document.getElementById("page-title");
    if (titleEl && titleEl.dataset.autoTitle === "true") {
        titleEl.textContent = filterValue;
    }

    try {
        const response = await fetch("../../games/games.json");
        const games = await response.json();

        // Filter by genre/collection (same field)
        const matches = games.filter(game =>
            game.genre && Array.isArray(game.genre) &&
            game.genre.includes(filterValue)
        );

        container.innerHTML = "";

        if (matches.length === 0) {
            container.innerHTML = `<div class="no-results">No games found in ${filterValue}.</div>`;
            return;
        }

        matches.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";

            // Thumbnail
            const thumb = document.createElement("img");
            thumb.className = "game-thumb";
            thumb.src = "../../" + game.thumbnail;
            thumb.alt = game.title;
            thumb.loading = "lazy";

            // Video support
            if (game.video && game.video !== "") {
                thumb.classList.add("clickable-thumb");
                thumb.addEventListener("click", () => openVideoModal(game.video));
            }

            // Title
            const title = document.createElement("h3");
            title.className = "game-title";
            title.textContent = game.title;

            // Developer only
            const dev = document.createElement("p");
            dev.className = "game-dev";
            dev.textContent = game.developer ? game.developer : "Unknown Developer";

            // Game Info button
            const infoBtn = document.createElement("a");
            infoBtn.className = "btn btn-info";
            infoBtn.textContent = "➜ Game Info";
            infoBtn.href = `../game.html?id=${encodeURIComponent(game.id)}`;

            // Assemble card
            card.appendChild(thumb);
            card.appendChild(title);
            card.appendChild(dev);
            card.appendChild(infoBtn);

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading games.json:", err);
        container.innerHTML = `<div class="error">Error loading game data.</div>`;
    }
}

/* ======================
   UNIVERSAL VIDEO MODAL
   ====================== */

function openVideoModal(videoID) {
    const modal = document.getElementById("video-modal");
    const iframe = document.getElementById("video-frame");

    iframe.src = `https://www.youtube.com/embed/${videoID}?autoplay=1`;
    modal.classList.remove("hidden");
}

document.addEventListener("click", (e) => {
    if (e.target.dataset.modalClose !== undefined) {
        closeVideoModal();
    }
});

function closeVideoModal() {
    const modal = document.getElementById("video-modal");
    const iframe = document.getElementById("video-frame");

    iframe.src = "";
    modal.classList.add("hidden");
}
