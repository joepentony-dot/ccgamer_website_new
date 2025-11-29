/* ================================================================
   CCG – Load Single Game Page
   Updated for LOCAL thumbnails (Phase 4)
================================================================ */

async function loadGamePage() {

    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    const titleEl = document.getElementById("game-title");
    const imgEl = document.getElementById("game-thumbnail");
    const devEl = document.getElementById("game-developer");
    const yearEl = document.getElementById("game-year");
    const genreEl = document.getElementById("game-genres");
    const pdfBtn = document.getElementById("btn-pdf");
    const diskBtn = document.getElementById("btn-disk");
    const watchBtn = document.getElementById("btn-watch");

    try {
        const response = await fetch("games/games.json");
        const games = await response.json();

        const game = games.find(g => g.id === gameId);

        if (!game) {
            titleEl.textContent = "Game Not Found";
            return;
        }

        titleEl.textContent = game.title;
        imgEl.src = game.thumbnail.startsWith("http") ? game.thumbnail : game.thumbnail;
        imgEl.alt = game.title;

        devEl.textContent = game.developer || "Unknown";
        yearEl.textContent = game.year || "N/A";
        genreEl.textContent = game.genres ? game.genres.join(", ") : "Uncategorised";

        // WATCH BUTTON
        if (game.videoid) {
            watchBtn.href = `https://www.youtube.com/watch?v=${game.videoid}`;
            watchBtn.classList.remove("disabled");
        }

        // PDF BUTTON
        if (game.pdf) {
            pdfBtn.href = game.pdf;
            pdfBtn.classList.remove("disabled");
        }

        // DISK DOWNLOAD
        if (game.disk && game.disk.length > 0) {
            diskBtn.href = game.disk[0];
            diskBtn.classList.remove("disabled");
        }

    } catch (err) {
        console.error("Error loading single game:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadGamePage);
