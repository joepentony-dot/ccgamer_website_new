/* ================================================================
   CHEEKY COMMODORE GAMER — SINGLE GAME PAGE LOADER (FINAL w/VIEWER)
   ---------------------------------------------------------------
   Enhancements:
   ✔ Direct-download disk links
   ✔ PDF opens inside branded viewer
   ✔ ID matching improved
   ✔ Full support for genre/pdf/disk fields
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

function extractDriveId(url) {
    // Matches: /d/<ID>/ OR id=<ID>
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    return match ? match[1] : "";
}

function convertToDirectDownload(url) {
    const id = extractDriveId(url);
    if (!id) return url;
    return `https://drive.google.com/uc?export=download&id=${id}`;
}

function convertToViewerLink(url) {
    const id = extractDriveId(url);
    if (!id) return url;

    // Use our branded viewer HTML page
    return `../viewer/manual.html?file=${id}`;
}

function setButtonState(btn, link) {
    if (!btn) return;
    if (link) {
        btn.href = link;
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

        const game = games.find(g => cleanId(g.gameid || g.id) === targetId);

        if (!game) {
            titleEl.textContent = "Game Not Found";
            detailsEl.textContent = `No entry found for ID: ${rawId}`;
            return;
        }

        // Title
        titleEl.textContent = game.title || "Untitled Game";

        // Thumbnail
        thumbEl.src = game.thumbnail || "../resources/images/genres/miscellaneous.png";

        // Genres
        let genres = [];
        if (Array.isArray(game.genre)) genres.push(...game.genre);
        if (Array.isArray(game.genres)) genres.push(...game.genres);
        if (Array.isArray(game.tags)) genres.push(...game.tags);
        genres = genres.filter(x => x && x.trim().length > 0);

        detailsEl.innerHTML = `
            <strong>Year:</strong> ${game.year || "-"}<br>
            <strong>Developer:</strong> ${game.developer || "-"}<br>
            <strong>Genre:</strong> ${genres.length ? genres.join(", ") : "-"}
        `;

        // BUTTONS
        const videoBtn = document.getElementById("btn-video");
        const pdfBtn   = document.getElementById("btn-pdf");
        const diskBtn  = document.getElementById("btn-disk");

        // VIDEO
        if (game.videoid) {
            setButtonState(videoBtn, `https://www.youtube.com/watch?v=${game.videoid}`);
        }

        // PDF viewer inside CCG frame
        const pdfField = game.pdf || game.pdflink || game.manual || game.manualpdf;
        if (pdfField) {
            setButtonState(pdfBtn, convertToViewerLink(pdfField));
        }

        // DISK (always direct download)
        let diskField = "";

        if (Array.isArray(game.disk) && game.disk.length) diskField = game.disk[0];
        else if (typeof game.disk === "string") diskField = game.disk;
        else diskField = game.diskimage || game.download || game.downloadlink || game.d64 || game.t64;

        if (diskField) {
            setButtonState(diskBtn, convertToDirectDownload(diskField));
        }

    } catch (err) {
        console.error(err);
        titleEl.textContent = "Error Loading Game";
        detailsEl.textContent = err.message;
    }
}

document.addEventListener("DOMContentLoaded", loadGamePage);
