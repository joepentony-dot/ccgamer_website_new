/* ==============================================================
   CHEEKY COMMODORE GAMER — GAME PAGE LOADER (FINAL VERSION)
   Loads a single game from games.json based on ?id= in the URL.
   Fully compatible with the new thumbnail + JSON structure.
   ============================================================== */

async function loadSingleGame() {
    // Get game ID from URL
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        document.getElementById("game-title").textContent = "Game not found.";
        return;
    }

    try {
        // Load JSON
        const response = await fetch("games.json");
        const games = await response.json();

        // Find game entry
        const game = games.find(g => (g.id || "").toLowerCase() === gameId.toLowerCase());

        if (!game) {
            document.getElementById("game-title").textContent = "Game not found.";
            return;
        }

        /* --------------------------
           BASIC GAME DETAILS
        -------------------------- */

        document.getElementById("game-title").textContent = game.title;

        document.getElementById("game-year").textContent =
            game.year ? game.year : "Unknown";

        document.getElementById("game-developer").textContent =
            game.developer ? game.developer : "Unknown";

        document.getElementById("game-genres").textContent =
            game.genres && game.genres.length > 0
                ? game.genres.join(", ")
                : "None";

        /* --------------------------
           THUMBNAIL
        -------------------------- */

        const thumb = document.getElementById("game-thumbnail");
        thumb.src = "../" + game.thumbnail;
        thumb.alt = game.title;

        /* --------------------------
           PDF MANUAL
        -------------------------- */

        const pdfBtn = document.getElementById("pdf-link");
        if (game.pdf && game.pdf.trim() !== "") {
            pdfBtn.href = game.pdf;
            pdfBtn.style.display = "inline-block";
        }

        /* --------------------------
           DISK DOWNLOADS
        -------------------------- */

        const diskBtn = document.getElementById("disk-link");
        if (game.disk && Array.isArray(game.disk) && game.disk.length > 0) {
            diskBtn.href = game.disk[0]; // First disk link
            diskBtn.style.display = "inline-block";
        }

        /* --------------------------
           LEMON64 LINKS
        -------------------------- */

        const lemonBtn = document.getElementById("lemon-link");
        if (game.lemon && Array.isArray(game.lemon) && game.lemon.length > 0) {
            lemonBtn.href = game.lemon[0]; // First lemon URL
            lemonBtn.style.display = "inline-block";
        }

        /* --------------------------
           YOUTUBE VIDEO
        -------------------------- */

        const videoSection = document.getElementById("video-section");
        const videoFrame = document.getElementById("game-video");

        if (game.videoid && game.videoid.trim() !== "") {
            videoFrame.src = "https://www.youtube.com/embed/" + game.videoid;
            videoSection.style.display = "block";
        }

    } catch (err) {
        console.error("Error loading game:", err);
        document.getElementById("game-title").textContent =
            "Error loading game details.";
    }
}

// Initialise loader
document.addEventListener("DOMContentLoaded", loadSingleGame);
