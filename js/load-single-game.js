/* ================================================================
   CHEEKY COMMODORE GAMER — SINGLE GAME PAGE LOADER (FINAL VERSION)
   ----------------------------------------------------------------
   Fixes:
   ✔ Games failing to load from complete-index.html
   ✔ Missing genres
   ✔ Missing developer/year data
   ✔ Corrects ID lookup using gameid OR id
   ================================================================ */

function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadGamePage() {
    const id = getQueryId();

    const titleEl = document.getElementById("game-title");
    const thumbEl = document.getElementById("game-thumb");
    const detailsEl = document.getElementById("game-details");

    if (!id) {
        titleEl.textContent = "Game Not Found";
        return;
    }

    try {
        const response = await fetch("games.json");
        if (!response.ok) throw new Error("Failed to load games.json");

        const games = await response.json();

        // FIXED: Correct match logic
        const game = games.find(g =>
            String(g.gameid).toLowerCase() === String(id).toLowerCase() ||
            String(g.id).toLowerCase() === String(id).toLowerCase()
        );

        if (!game) {
            titleEl.textContent = "Game Not Found";
            detailsEl.textContent = `No entry found for "${id}".`;
            return;
        }

        // Title
        titleEl.textContent = game.title || "Untitled Game";

        // Thumbnail
        if (thumbEl) {
            const img = game.thumbnail ? "../" + game.thumbnail : "../resources/images/genres/miscellaneous.png";
            thumbEl.src = img;
            thumbEl.alt = game.title || "";
        }

        // Genre Handling (FIXED)
        let genres = [];

        if (Array.isArray(game.genre)) genres = game.genre;
        if (Array.isArray(game.genres)) genres = game.genres;
        if (Array.isArray(game.tags)) genres = [...genres, ...game.tags];

        genres = genres.filter(g => g && g.trim().length > 0);

        const genresText = genres.length ? genres.join(", ") : "-";

        // Developer / Year / Genre block
        detailsEl.innerHTML = `
            <strong>Year:</strong> ${game.year || "-"}<br>
            <strong>Developer:</strong> ${game.developer || "-"}<br>
            <strong>Genre:</strong> ${genresText}
        `;

        // YOUTUBE BUTTON (Working)
        const videoBtn = document.getElementById("btn-video");
        if (videoBtn && game.videoid) {
            videoBtn.href = `https://www.youtube.com/watch?v=${game.videoid}`;
            videoBtn.classList.remove("disabled");
        }

    } catch (err) {
        console.error(err);
        titleEl.textContent = "Error Loading Game";
    }
}

document.addEventListener("DOMContentLoaded", loadGamePage);
