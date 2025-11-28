/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE/COLLECTION PAGE LOADER
   FINAL VERSION — PERMANENT, STABLE, FUTURE-PROOF
   ---------------------------------------------------------------
   This script powers ALL genre pages AND ALL collection pages.
   Once installed, you NEVER need to rewrite the 19 HTML files again.
   ================================================================ */

async function loadGenrePage() {

    const container = document.getElementById("genre-results");
    const emptyMessage = document.getElementById("empty-message");
    const summaryText = document.getElementById("summary-text");
    const summaryCount = document.getElementById("summary-count");

    // Detect whether this is a genre OR a collection page
    const genreName      = document.body.getAttribute("data-genre");
    const collectionName = document.body.getAttribute("data-collection");

    const filterName = genreName || collectionName;

    summaryText.textContent = "Loading “" + filterName + "” games…";
    summaryCount.textContent = "";

    try {
        // Because page is inside /games/genres/ or /games/collections/
        const response = await fetch("../games.json");
        if (!response.ok) {
            throw new Error("Failed to load games.json (" + response.status + ")");
        }

        const games = await response.json();

        // Normalise thumbnails: thumblink → thumbnail
        games.forEach(g => {
            if (g.thumblink && !g.thumbnail) {
                g.thumbnail = g.thumblink;
            }
        });

        // Convert videoid into full YouTube URL
        games.forEach(g => {
            if (g.videoid && !g.video) {
                g.video = "https://www.youtube.com/watch?v=" + g.videoid;
            }
        });

        // Function to match genre/collection names from JSON
        function matchesCategory(game, name) {
            const target = (name || "").toLowerCase().trim();
            if (!target) return false;

            // Support both "genre": "X" and "genre": ["X","Y"]
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

        const allCount = games.length;
        const matches = games.filter(g => matchesCategory(g, filterName));
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

            const thumbWrapper = document.createElement("div");
            thumbWrapper.className = "thumb-wrapper";

            const img = document.createElement("img");
            if (game.thumbnail) {
                img.src = "../" + game.thumbnail;
                img.alt = game.title ? (game.title + " thumbnail") : "Thumbnail";
            } else {
                img.alt = "No thumbnail";
            }

            const playOverlay = document.createElement("div");
            playOverlay.className = "card-play-icon";
            playOverlay.innerHTML = `<span>▶</span>`;

            thumbWrapper.appendChild(img);
            thumbWrapper.appendChild(playOverlay);

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
            const infoBits = [];
            if (game.composer) infoBits.push("Music: " + game.composer);
            if (game.developer) infoBits.push("Dev: " + game.developer);
            meta.textContent = infoBits.join(" · ");

            const footer = document.createElement("div");
            footer.className = "card-footer";

            const system = document.createElement("span");
            system.textContent = game.system || "C64";

            const link = document.createElement("a");
            link.className = "open-link";
            const id = encodeURIComponent(game.id);
            link.href = "../game.html?id=" + id;
            link.innerHTML = `<span class="icon">↪</span><span>Open</span>`;

            footer.appendChild(system);
            footer.appendChild(link);

            body.appendChild(titleRow);
            if (meta.textContent !== "") body.appendChild(meta);
            body.appendChild(footer);

            card.appendChild(thumbWrapper);
            card.appendChild(body);
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        summaryText.textContent = "Error loading games.";
        summaryCount.textContent = "";
        emptyMessage.style.display = "block";
        emptyMessage.textContent =
            "Could not load games.json — check console for details.";
    }
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
