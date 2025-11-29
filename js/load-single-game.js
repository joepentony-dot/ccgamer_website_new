/* ================================================================
   CHEEKY COMMODORE GAMER — SINGLE GAME PAGE LOADER (FINAL VERSION)
   ---------------------------------------------------------------
   Supports:
   ✔ id / gameid
   ✔ genre / genres / tags
   ✔ pdf / pdflink / manual / manualpdf
   ✔ disk[] / disk / diskimage / download / downloadlink / d64 / t64
   ================================================================ */

function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function cleanId(str) {
    return (str || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function normalizeLink(value) {
    if (!value) return "";

    // Already a full URL
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    // Otherwise treat as relative path (usually not needed)
    return "../" + value.replace(/^\/+/, "");
}

function setButtonState(btn, href) {
    if (!btn) return;

    if (href) {
        btn.href = href;
        btn.classList.remove("disabled");
        btn.removeAttribute("aria-disabled");
    } else {
        btn.href = "#";
        btn.classList.add("disabled");
        btn.setAttribute("aria-disabled", "true");
    }
}

async function loadGamePage() {
    const rawId = getQueryId();
    const targetId = cleanId(rawId);

    const titleEl = document.getElementById("game-title");
    const thumbEl = document.getElementById("game-thumb");
    const detailsEl = document.getElementById("game-details");

    if (!rawId) {
        titleEl.textContent = "Game Not Specified";
        return;
    }

    try {
        const response = await fetch("games.json");
        if (!response.ok) throw new Error("Could not load games.json");

        const games = await response.json();

        // ============================================================
        // FINAL ID MATCHING LOGIC
        // ============================================================
        const game = games.find(g => {
            const gid = cleanId(g.gameid || g.id);
            return gid === targetId;
        });

        if (!game) {
            titleEl.textContent = "Game Not Found";
            detailsEl.textContent = `No entry found for ID: ${rawId}`;
            return;
        }

        // ============================================================
        // SET TITLE
        // ============================================================
        titleEl.textContent = game.title || "Untitled Game";

        // ============================================================
        // THUMBNAIL
        // ============================================================
        if (game.thumbnail) {
            thumbEl.src = game.thumbnail;
            thumbEl.alt = game.title;
        } else {
            thumbEl.src = "../resources/images/genres/miscellaneous.png";
        }

        // ============================================================
        // GENRES (genre / genres / tags)
        // ============================================================
        let genres = [];

        if (Array.isArray(game.genre)) genres.push(...game.genre);
        if (Array.isArray(game.genres)) genres.push(...game.genres);
        if (Array.isArray(game.tags)) genres.push(...game.tags);

        genres = genres.filter(g => g && g.trim() !== "");

        const genreText = genres.length ? genres.join(", ") : "-";

        // ============================================================
        // DETAILS BLOCK
        // ============================================================
        detailsEl.innerHTML = `
            <strong>Year:</strong> ${game.year || "-"}<br>
            <strong>Developer:</strong> ${game.developer || "-"}<br>
            <strong>Genre:</strong> ${genreText}
        `;

        // ============================================================
        // BUTTONS (VIDEO / PDF / DISK)
        // ============================================================

        // VIDEO
        const videoBtn = document.getElementById("btn-video");
        if (game.videoid) {
            setButtonState(videoBtn, `https://www.youtube.com/watch?v=${game.videoid}`);
        } else {
            setButtonState(videoBtn, "");
        }

        // PDF
        const pdfBtn = document.getElementById("btn-pdf");
        const pdfField =
            game.pdf ||
            game.pdflink ||
            game.manual ||
            game.manualpdf;

        setButtonState(pdfBtn, pdfField ? normalizeLink(pdfField) : "");

        // DISK
        const diskBtn = document.getElementById("btn-disk");

        let diskField = "";

        // disk as array
        if (Array.isArray(game.disk) && game.disk.length > 0) {
            diskField = game.disk[0];
        }

        // disk as string
        if (typeof game.disk === "string") {
            diskField = game.disk;
        }

        // fallback fields
        if (!diskField) {
            diskField =
                game.diskimage ||
                game.download ||
                game.downloadlink ||
                game.d64 ||
                game.t64;
        }

        setButtonState(diskBtn, diskField ? normalizeLink(diskField) : "");

    } catch (err) {
        console.error(err);
        titleEl.textContent = "Error Loading Game";
        detailsEl.textContent = err.message;
    }
}

document.addEventListener("DOMContentLoaded", loadGamePage);
