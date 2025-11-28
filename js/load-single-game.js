/* ===========================================================================
   CHEEKY COMMODORE GAMER — SINGLE GAME LOADER (FINAL)
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
   ========================================================================== */

console.log("Single Game Loader active...");

// Auto-detect base URL on any domain (GitHub, Fasthosts, custom domain)
const BASE = window.location.origin + "/ccgamer_website_new/";
const JSON_URL = BASE + "games/games.json";

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

        const game = games.find(g => g.id.toLowerCase() === id.toLowerCase());

        if (!game) {
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
    document.getElementById("game-title").textContent = game.title;

    // Subline (year + developer)
    let subline = "";
    if (game.year) subline += game.year;
    if (game.developer) subline += " · " + game.developer;
    document.getElementById("game-subline").textContent = subline;

    // Metadata
    if (game.year) {
        const y = document.getElementById("meta-year");
        y.style.display = "inline-block";
        y.textContent = "Year: " + game.year;
    }

    if (game.developer) {
        const d = document.getElementById("meta-developer");
        d.style.display = "inline-block";
        d.textContent = "Developer: " + game.developer;
    }

    const idMeta = document.getElementById("meta-id");
    idMeta.style.display = "inline-block";
    idMeta.textContent = "ID: " + game.id;

    // Genres (your JSON uses `genre`, not `genres`)
    const genreRow = document.getElementById("genres-row");
    genreRow.innerHTML = "";

    if (Array.isArray(game.genre)) {
        game.genre.forEach(g => {
            const chip = document.createElement("span");
            chip.className = "genre-chip";
            chip.textContent = g;
            genreRow.appendChild(chip);
        });
    }

    // Thumbnail
    if (game.thumblink) {
        document.getElementById("game-thumbnail").src = game.thumblink;
        document.getElementById("thumb-open-link").href = game.thumblink;
        document.getElementById("thumb-label").textContent = "Box / Title Screen Art";
    }

    // YouTube
    if (game.videoid) {
        const shell = document.getElementById("video-shell");
        shell.style.display = "block";

        const iframe = document.getElementById("game-video");
        iframe.src = "https://www.youtube.com/embed/" + game.videoid;
    }

    // Buttons
    setupButton("btn-disk", game.disklink);
    setupButton("btn-manual", game.pdflink);
    setupButton("btn-lemon", game.lemonlink);
    setupButton("btn-youtube", game.videoid ? "https://www.youtube.com/watch?v=" + game.videoid : null);

    // Footer ID
    document.getElementById("bottom-id").textContent = "ID: " + game.id;
}

/* ===========================================================================
   Button helper
=========================================================================== */
function setupButton(id, url) {
    const btn = document.getElementById(id);
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
    box.style.display = "block";
    box.textContent = msg;
}

/* ===========================================================================
   INIT
=========================================================================== */
document.addEventListener("DOMContentLoaded", loadSingleGame);
