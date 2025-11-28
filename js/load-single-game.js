/* ===========================================================================
   CHEEKY COMMODORE GAMER — SINGLE GAME LOADER (SAFE, FINAL)
   ---------------------------------------------------------------------------
   Matches your JSON fields exactly:
   - id
   - title
   - year
   - developer
   - genre (array)
   - thumblink
   - videoid
   - pdflink
   - disklink
   - lemonlink
   Uses a simple relative path: "games.json" (no BASE conflicts).
   ========================================================================== */

console.log("Single Game Loader active...");

// Path to JSON: game.html is in /games/, JSON is /games/games.json
const JSON_URL = "games.json";

/* ===========================================================================
   Helper: get ID from URL
=========================================================================== */
function getGameId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/* ===========================================================================
   Main Loader
=========================================================================== */
async function loadSingleGame() {
    const id = getGameId();

    if (!id) {
        showError("No game ID provided.");
        return;
    }

    try {
        const response = await fetch(JSON_URL);
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("games.json is not an array:", games);
            showError("Invalid game database format.");
            return;
        }

        const game = games.find(g => String(g.id).toLowerCase() === String(id).toLowerCase());

        if (!game) {
            console.warn("Game not found for ID:", id);
            showError("Game not found in database.");
            return;
        }

        console.log("Loaded game:", game);
        renderGame(game);

    } catch (err) {
        console.error("Error loading game data:", err);
        showError("Could not load game data.");
    }
}

/* ===========================================================================
   Renderer
=========================================================================== */
function renderGame(game) {

    // Title
    const titleEl = document.getElementById("game-title");
    if (titleEl) titleEl.textContent = game.title || "Unknown title";

    // Subline (year + developer)
    let subline = "";
    if (game.year) subline += game.year;
    if (game.developer) subline += (subline ? " · " : "") + game.developer;

    const sublineEl = document.getElementById("game-subline");
    if (sublineEl) sublineEl.textContent = subline;

    // Metadata
    if (game.year) {
        const y = document.getElementById("meta-year");
        if (y) {
            y.style.display = "inline-block";
            y.textContent = "Year: " + game.year;
        }
    }

    if (game.developer) {
        const d = document.getElementById("meta-developer");
        if (d) {
            d.style.display = "inline-block";
            d.textContent = "Developer: " + game.developer;
        }
    }

    const idMeta = document.getElementById("meta-id");
    if (idMeta) {
        idMeta.style.display = "inline-block";
        idMeta.textContent = "ID: " + game.id;
    }

    // Genres (your JSON uses `genre`)
    const genreRow = document.getElementById("genres-row");
    if (genreRow) {
        genreRow.innerHTML = "";
        if (Array.isArray(game.genre)) {
            game.genre.forEach(g => {
                const chip = document.createElement("span");
                chip.className = "genre-chip";
                chip.textContent = g;
                genreRow.appendChild(chip);
            });
        }
    }

    // Thumbnail (thumblink)
    if (game.thumblink) {
        const thumbImg = document.getElementById("game-thumbnail");
        if (thumbImg) {
            thumbImg.src = game.thumblink;
            thumbImg.alt = game.title || "Game thumbnail";
        }

        const thumbOpen = document.getElementById("thumb-open-link");
        if (thumbOpen) thumbOpen.href = game.thumblink;

        const thumbLabel = document.getElementById("thumb-label");
        if (thumbLabel) thumbLabel.textContent = "Box / Title Screen Artwork";
    }

    // YouTube video (videoid)
    if (game.videoid) {
        const shell = document.getElementById("video-shell");
        if (shell) shell.style.display = "block";

        const iframe = document.getElementById("game-video");
        if (iframe) iframe.src = "https://www.youtube.com/embed/" + game.videoid;
    }

    // Buttons
    setupButton("btn-disk", game.disklink);
    setupButton("btn-manual", game.pdflink);
    setupButton("btn-lemon", game.lemonlink);
    setupButton("btn-youtube", game.videoid ? "https://www.youtube.com/watch?v=" + game.videoid : null);

    // Footer ID
    const bottomId = document.getElementById("bottom-id");
    if (bottomId) bottomId.textContent = "ID: " + game.id;
}

/* ===========================================================================
   Button helper
=========================================================================== */
function setupButton(id, url) {
    const btn = document.getElementById(id);
    if (!btn) return;

    if (url && url !== "" && url !== null) {
        btn.classList.remove("disabled");
        btn.href = url;
    } else {
        btn.classList.add("disabled");
        btn.href = "#";
    }
}

/* ===========================================================================
   Error Display
=========================================================================== */
function showError(msg) {
    const box = document.getElementById("error-box");
    if (box) {
        box.style.display = "block";
        box.textContent = msg;
    }
}

/* ===========================================================================
   INIT
=========================================================================== */
document.addEventListener("DOMContentLoaded", loadSingleGame);
