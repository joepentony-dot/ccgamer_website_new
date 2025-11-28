/* ================================================================
   CHEEKY COMMODORE GAMER - SINGLE GAME LOADER (Retro Deluxe)
   ---------------------------------------------------------------
   Loads one game from games.json based on ?id= in the URL and
   populates game.html with all available data.
   ================================================================ */

function getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function normaliseGameRecord(game) {
    // Map thumblink → thumbnail if needed
    if (game.thumblink && !game.thumbnail) {
        game.thumbnail = game.thumblink;
    }

    // Build a video URL from videoid if not already present
    if (game.videoid && !game.video) {
        game.video = "https://www.youtube.com/watch?v=" + game.videoid;
    }

    return game;
}

async function loadSingleGame() {
    const id = getGameIdFromUrl();

    const titleEl       = document.getElementById("game-title");
    const sublineEl     = document.getElementById("game-subline");
    const thumbImg      = document.getElementById("game-thumbnail");
    const thumbLabel    = document.getElementById("thumb-label");
    const thumbOpenLink = document.getElementById("thumb-open-link");
    const videoShell    = document.getElementById("video-shell");
    const videoFrame    = document.getElementById("game-video");
    const metaYear      = document.getElementById("meta-year");
    const metaDev       = document.getElementById("meta-developer");
    const metaId        = document.getElementById("meta-id");
    const genresRow     = document.getElementById("genres-row");
    const btnDisk       = document.getElementById("btn-disk");
    const btnManual     = document.getElementById("btn-manual");
    const btnLemon      = document.getElementById("btn-lemon");
    const btnYouTube    = document.getElementById("btn-youtube");
    const bottomId      = document.getElementById("bottom-id");
    const errorBox      = document.getElementById("error-box");

    if (!id) {
        titleEl.textContent = "Game not specified";
        sublineEl.textContent = "No ID was provided in the URL.";
        errorBox.style.display = "block";
        errorBox.textContent = "Missing ?id= parameter. Please access this page via the site’s links.";
        return;
    }

    try {
        // game.html is inside /games/, so games.json is in the same folder
        const response = await fetch("games.json");
        if (!response.ok) {
            throw new Error("Failed to load games.json (" + response.status + ")");
        }

        const games = await response.json();
        const game = games.map(normaliseGameRecord).find(g => String(g.id) === String(id));

        if (!game) {
            titleEl.textContent = "Game not found";
            sublineEl.textContent = "ID: " + id;
            errorBox.style.display = "block";
            errorBox.textContent = "No game with this ID exists in games.json.";
            return;
        }

        // Title and subline
        titleEl.textContent = game.title || "Untitled Game";

        const metaBits = [];
        if (game.year) metaBits.push(game.year);
        if (game.developer) metaBits.push(game.developer);
        sublineEl.textContent = metaBits.join(" · ") || "";

        // Meta pills
        if (game.year) {
            metaYear.style.display = "inline-flex";
            metaYear.textContent = "Year: " + game.year;
        } else {
            metaYear.style.display = "none";
        }

        if (game.developer) {
            metaDev.style.display = "inline-flex";
            metaDev.textContent = "Developer: " + game.developer;
        } else {
            metaDev.style.display = "none";
        }

        metaId.style.display = "inline-flex";
        metaId.textContent = "ID: " + game.id;

        if (bottomId) {
            bottomId.textContent = "Game ID: " + game.id;
        }

        // Thumbnail
        if (game.thumbnail) {
            thumbImg.src = game.thumbnail;
            thumbImg.alt = (game.title || "Game") + " thumbnail";
            thumbLabel.textContent = "Box / Title Screen Artwork";
            thumbOpenLink.href = game.thumbnail;
        } else {
            thumbImg.alt = "No thumbnail available";
            thumbLabel.textContent = "No thumbnail available";
            thumbOpenLink.classList.add("disabled");
        }

        // Genres
        genresRow.innerHTML = "";
        let genres = [];

        if (Array.isArray(game.genre)) {
            genres = game.genre;
        } else if (typeof game.genre === "string" && game.genre.trim() !== "") {
            genres = [game.genre];
        }

        if (genres.length > 0) {
            genres.forEach(gName => {
                const chip = document.createElement("span");
                chip.className = "genre-chip";
                chip.textContent = gName;
                genresRow.appendChild(chip);
            });
        }

        // Buttons helper
        function wireButton(button, url, labelWhenMissing) {
            if (url && typeof url === "string" && url.trim() !== "") {
                button.href = url;
                button.classList.remove("disabled");
            } else {
                button.href = "#";
                button.classList.add("disabled");
                if (labelWhenMissing) {
                    button.title = labelWhenMissing;
                }
            }
        }

        // Disk / download
        wireButton(btnDisk, game.disklink, "No disk/download link available for this entry.");

        // Manual / PDF
        wireButton(btnManual, game.pdflink, "No manual / PDF link for this entry.");

        // Lemon
        wireButton(btnLemon, game.lemonlink, "No Lemon64 link for this entry.");

        // Video / YouTube
        let youtubeUrl = game.video || "";
        if (!youtubeUrl && game.videoid) {
            youtubeUrl = "https://www.youtube.com/watch?v=" + game.videoid;
        }
        if (youtubeUrl) {
            wireButton(btnYouTube, youtubeUrl, "");
            // Embedded video
            if (videoShell && videoFrame) {
                videoShell.style.display = "block";
                // Use embed URL for iframe
                const urlObj = new URL(youtubeUrl);
                const vidId = urlObj.searchParams.get("v") || game.videoid;
                if (vidId) {
                    videoFrame.src = "https://www.youtube.com/embed/" + vidId;
                } else {
                    videoShell.style.display = "none";
                }
            }
        } else {
            btnYouTube.classList.add("disabled");
            if (videoShell) videoShell.style.display = "none";
        }

    } catch (err) {
        console.error(err);
        if (errorBox) {
            errorBox.style.display = "block";
            errorBox.textContent = "Error loading game data. Please check the console or try again later.";
        }
    }
}

/* ================================================================
   C64 / Amiga mode toggle
   --------------------------------------------------------------- */

function setupModeToggle() {
    const buttons = document.querySelectorAll(".mode-toggle button");
    const body = document.body;

    function setMode(mode) {
        if (mode === "amiga") {
            body.classList.remove("mode-c64");
            body.classList.add("mode-amiga");
        } else {
            body.classList.remove("mode-amiga");
            body.classList.add("mode-c64");
        }

        buttons.forEach(btn => {
            if (btn.getAttribute("data-mode") === mode) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.getAttribute("data-mode");
            setMode(mode);
        });
    });

    // Default mode
    setMode("c64");
}

/* ================================================================
   (Optional future step)
   Easter egg hooks could be added here later, e.g. listening for
   certain key sequences like "PACMAN" or "LEMMINGS" and toggling
   small animations or overlays. Keeping it out for now so we stay
   on target with core functionality.
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    setupModeToggle();
    loadSingleGame();
});
