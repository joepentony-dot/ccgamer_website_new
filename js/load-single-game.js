/* ================================================================
   CHEEKY COMMODORE GAMER — SINGLE GAME PAGE LOADER (FINAL VERSION)
   Fixes:
   ✔ ERROR LOADING GAME for valid IDs
   ✔ Handles id OR gameid
   ✔ Handles genre OR genres OR tags
   ✔ Shows proper data always
   ================================================================ */

function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// Normalise ID for matching
function cleanId(str) {
    return (str || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

async function loadGamePage() {
    const rawId = getQueryId();
    const queryId = cleanId(rawId);

    const titleEl = document.getElementById("game-title");
    const thumbEl = document.getElementById("game-thumb");
    const detailsEl = document.getElementById("game-details");

    if (!rawId) {
        titleEl.textContent = "Game Not Specified";
        return;
    }

    try {
        // GAME.JSON IS LOCATED IN SAME FOLDER
        const response = await fetch("games.json");
        if (!response.ok) throw new Error("Could not load games.json");

        const games = await response.json();

        // ==============================
        // FINAL ID-MATCHING LOGIC
        // ==============================
        const game = games.find(g => {
            const gid = cleanId(g.gameid) || cleanId(g.id);
            return gid === queryId;
        });

        if (!game) {
            titleEl.textContent = "Game Not Found";
            detailsEl.textContent = `No entry in games.json for ID: ${rawId}`;
            return;
        }

        // ==============================
        // TITLE
        // ==============================
        titleEl.textContent = game.title || "Untitled Game";

        // ==============================
        // THUMBNAIL
        // ==============================
        if (thumbEl) {
            if (game.thumbnail) {
                thumbEl.src = game.thumbnail;
            } else {
                thumbEl.src = "../resources/images/genres/miscellaneous.png";
            }
        }

        // ==============================
        // GENRES (genre / genres / tags)
        // ==============================
        let genres = [];

        if (Array.isArray(game.genre)) genres.push(...game.genre);
        if (Array.isArray(game.genres)) genres.push(...game.genres);
        if (Array.isArray(game.tags)) genres.push(...game.tags);

        genres = genres.filter(x => x && x.trim() !== "");

        const genreText = genres.length ? genres.join(", ") : "-";

        // ==============================
        // DETAILS DISPLAY
        // ==============================
        detailsEl.innerHTML = `
            <strong>Year:</strong> ${game.year || "-"}<br>
            <strong>Developer:</strong> ${game.developer || "-"}<br>
            <strong>Genre:</strong> ${genreText}
        `;

        // ==============================
        // VIDEO BUTTON
        // ==============================
        const videoBtn = document.getElementById("btn-video");
        if (videoBtn) {
            if (game.videoid) {
                videoBtn.href = `https://www.youtube.com/watch?v=${game.videoid}`;
                videoBtn.classList.remove("disabled");
            } else {
                videoBtn.classList.add("disabled");
            }
        }

    } catch (err) {
        console.error(err);
        titleEl.textContent = "Error Loading Game";
        detailsEl.textContent = err.message;
    }
}

document.addEventListener("DOMContentLoaded", loadGamePage);
