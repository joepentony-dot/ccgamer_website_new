let CCG_SINGLE_ALL_GAMES = [];

document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const gameId = decodeURIComponent((params.get("id") || "").trim());

    if (!gameId) return;

    try {
        const response = await fetch("games.json", { cache: "no-store" });
        if (!response.ok) throw new Error("games.json failed");

        CCG_SINGLE_ALL_GAMES = await response.json();

        const game = CCG_SINGLE_ALL_GAMES.find(g => String(g.id) === gameId);
        if (!game) return;

        renderGame(game);

    } catch (err) {
        console.error("[CCG] Single game load failed:", err);
    }
});

function resolveVideoId(game) {
    return (game.videoid || "").trim();
}

function resolveManualUrl(game) {
    return game.pdf || game.manual || "";
}

function resolveDiskUrl(game) {
    if (Array.isArray(game.disk)) return game.disk[0] || "";
    return game.disk || game.tape || "";
}

function renderGame(game) {

    document.getElementById("gameHeroTitle").textContent = game.title || "Unknown";
    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent =
        game.developer || game.publisher || "—";

    /* VIDEO */
    const vid = resolveVideoId(game);
    if (vid) {
        document.getElementById("game-video-embed").src =
            `https://www.youtube.com/embed/${vid}`;
        document.getElementById("game-video-section").hidden = false;
        document.getElementById("gameVideoBtn").href =
            `https://www.youtube.com/watch?v=${vid}`;
        document.getElementById("gameVideoBtn").hidden = false;
    }

    /* MANUAL — MODAL */
    const manual = resolveManualUrl(game);
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        btn.hidden = false;
        btn.addEventListener("click", e => {
            e.preventDefault();
            openModal(manual);
        });
        document.querySelector(".game-downloads").hidden = false;
    }

    /* DISK */
    const disk = resolveDiskUrl(game);
    if (disk) {
        const btn = document.getElementById("gameDiskBtn");
        btn.href = disk;
        btn.hidden = false;
        document.querySelector(".game-downloads").hidden = false;
    }
}

/* ============================================================
   MODAL CONTROLS — SG-E3
============================================================ */

const modal = document.getElementById("ccgModal");
const modalFrame = document.getElementById("ccgModalFrame");
const modalClose = document.querySelector(".ccg-modal-close");

function openModal(src) {
    modalFrame.src = src;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    modalFrame.src = "";
    document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
        closeModal();
    }
});
