/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA STABLE + SG-E4.2
   ------------------------------------------------------------
   • Correct games.json path (LOCKED)
   • URL-safe ID decoding
   • FULL renderGame restored
   • Related-games smart fallback
   • SG-E2: Downloads panel
   • SG-E3: Modal viewer
   • SG-E4.1: Screenshot modal navigation (NEXT / PREV)
   • SG-E4.2: On-screen modal arrows
   • SG-E5: Related Games carousel behaviour
============================================================ */

let CCG_SINGLE_ALL_GAMES = [];
let CCG_SCREENSHOTS = [];
let CCG_SCREENSHOT_INDEX = 0;

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const gameId = decodeURIComponent(
        (params.get("id") || "").toString().trim()
    );

    if (!gameId) {
        console.error("[CCG] No game ID in URL");
        return;
    }

    try {
        const response = await fetch("games.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`games.json ${response.status}`);

        const games = await response.json();
        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        const game = CCG_SINGLE_ALL_GAMES.find(
            g => String(g.id) === gameId
        );

        if (!game) {
            console.error(`[CCG] Game not found for id="${gameId}"`);
            return;
        }

        renderGame(game);

    } catch (err) {
        console.error("[CCG] Single game load failed:", err);
    }
});

/* ============================================================
   RESOLVERS (LOCKED)
============================================================ */

function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim().replace(/^\/+/, "");
    t = t.replace("resources/images/thumbnails/all/", "")
         .replace("resources/images/thumbnails/", "")
         .replace("resources/images/", "");

    return `../resources/images/thumbnails/all/${t}`;
}

function resolveVideoId(game) {
    return (
        game.videoid ||
        game.video ||
        game.youtube ||
        ""
    ).toString().trim();
}

function resolvePrimaryLink(value) {
    if (Array.isArray(value) && value.length) {
        return value.find(Boolean) || "";
    }
    if (typeof value === "string") return value.trim();
    return "";
}

function resolveManualUrl(game) {
    return resolvePrimaryLink(game.pdf || game.manual || game.manuals);
}

function normaliseManualUrl(url) {
    if (!url) return "";
    const trimmed = String(url).trim();

    const driveMatch = trimmed.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
    if (driveMatch && driveMatch[1]) {
        // Preview-friendly embed that works without extra clicks
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    return trimmed;
}

function resolveDiskUrl(game) {
    return resolvePrimaryLink(game.disk || game.tape || game.download);
}

function resolvePlayUrl(game) {
    const disk = resolveDiskUrl(game);
    if (disk) return disk;

    const manual = resolveManualUrl(game);
    if (manual) return normaliseManualUrl(manual);

    const lemon = resolvePrimaryLink(game.lemon);
    if (lemon) return lemon;

    return "";
}

/* ============================================================
   RENDER GAME
============================================================ */

function renderGame(game) {

    updateMeta(game);

    /* HERO */
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);
    document.getElementById("gameHeroBG").style.backgroundImage = `url('${thumb}')`;
    document.getElementById("gameHeroThumb").src = thumb;
    document.getElementById("gameHeroThumb").alt = `${game.title || "Game"} cover art`;
    document.getElementById("gameHeroTitle").textContent = game.title || "Unknown";
    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent =
        game.publisher || game.developer || "—";

    const playUrl = resolvePlayUrl(game);
    if (playUrl) {
        const playBtn = document.getElementById("gamePlayBtn");
        playBtn.href = playUrl;
        playBtn.hidden = false;

        const cta = document.getElementById("gamePlayCta");
        const playText = document.getElementById("gamePlayText");
        playText.textContent = `Jump into ${game.title || "this classic"} on ${game.system || "your favourite system"}.`;
        cta.hidden = false;
    }

    /* DESCRIPTION */
    if (game.description) {
        document.getElementById("gameDescription").innerHTML = game.description;
        document.getElementById("game-description-section").hidden = false;
    }

    /* VIDEO */
    const vid = resolveVideoId(game);
    if (vid) {
        document.getElementById("game-video-embed").src =
            `https://www.youtube.com/embed/${vid}`;
        document.getElementById("game-video-section").hidden = false;

        const btn = document.getElementById("gameVideoBtn");
        btn.href = `https://www.youtube.com/watch?v=${vid}`;
        btn.hidden = false;
    }

    /* DOWNLOADS */
    const manual = normaliseManualUrl(resolveManualUrl(game));
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        btn.href = manual;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.hidden = false;
        document.querySelector(".game-downloads").hidden = false;

        btn.addEventListener("click", e => {
            // Open inline for PDFs/Drive; fall back to normal links
            if (!manual.includes(".pdf") && !manual.includes("drive.google.com")) return;
            e.preventDefault();
            openDocumentModal(manual);
        });
    }

    const disk = resolveDiskUrl(game);
    if (disk) {
        const btn = document.getElementById("gameDiskBtn");
        btn.href = disk;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.hidden = false;
        document.querySelector(".game-downloads").hidden = false;
    }

    /* SCREENSHOTS */
    if (Array.isArray(game.screenshots) && game.screenshots.length) {
        renderScreenshots(game.screenshots);
    }

    renderRelatedGames(game, CCG_SINGLE_ALL_GAMES);
}

function updateMeta(game) {
    const title = game.title || "Game";
    document.title = `${title} | Cheeky Commodore Gamer`;

    const metaTitle = document.getElementById("game-meta-title");
    if (metaTitle) metaTitle.textContent = document.title;

    const desc = (game.description || "").replace(/<[^>]*>?/gm, "").slice(0, 160);
    const metaDesc = document.getElementById("game-meta-description");
    if (metaDesc) metaDesc.setAttribute("content",
        desc || `${title} on Commodore — screenshots, manual, downloads and video.`
    );
}

/* ============================================================
   SCREENSHOTS + MODAL NAVIGATION (SG-E4.1)
============================================================ */

function renderScreenshots(screenshots) {

    const section = document.querySelector(".game-screenshots");
    const strip = document.getElementById("gameScreenshotsStrip");
    if (!section || !strip) return;

    CCG_SCREENSHOTS = screenshots.slice();
    strip.innerHTML = "";

    screenshots.forEach((src, index) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Screenshot ${index + 1}`;
        img.loading = "lazy";
        img.className = "game-screenshot-thumb";

        img.addEventListener("click", () => {
            openScreenshotModal(index);
        });

        strip.appendChild(img);
    });

    section.hidden = false;
}

/* ============================================================
   MODAL CONTROL
============================================================ */

const modal = document.getElementById("ccgModal");
const modalFrame = document.getElementById("ccgModalFrame");
const modalClose = document.querySelector(".ccg-modal-close");
const modalNext = document.querySelector(".ccg-modal-nav--next");
const modalPrev = document.querySelector(".ccg-modal-nav--prev");
let modalMode = "gallery"; // "gallery" | "doc"

function openScreenshotModal(index) {
    CCG_SCREENSHOT_INDEX = index;
    modalMode = "gallery";
    modal.classList.remove("ccg-modal--doc");
    modalFrame.src = CCG_SCREENSHOTS[index];
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}

function openDocumentModal(src) {
    modalMode = "doc";
    modal.classList.add("ccg-modal--doc");
    modalFrame.src = src;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("ccg-modal--doc");
    modalMode = "gallery";
    modalFrame.src = "";
}

function nextScreenshot() {
    if (!CCG_SCREENSHOTS.length) return;

    CCG_SCREENSHOT_INDEX =
        (CCG_SCREENSHOT_INDEX + 1) % CCG_SCREENSHOTS.length;

    modalFrame.src = CCG_SCREENSHOTS[CCG_SCREENSHOT_INDEX];
}

function prevScreenshot() {
    if (!CCG_SCREENSHOTS.length) return;

    CCG_SCREENSHOT_INDEX =
        (CCG_SCREENSHOT_INDEX - 1 + CCG_SCREENSHOTS.length) % CCG_SCREENSHOTS.length;

    modalFrame.src = CCG_SCREENSHOTS[CCG_SCREENSHOT_INDEX];
}

/* ============================================================
   EVENTS
============================================================ */

modalClose.addEventListener("click", closeModal);

modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
});

if (modalNext) modalNext.addEventListener("click", () => {
    if (modalMode === "doc") return;
    nextScreenshot();
});
if (modalPrev) modalPrev.addEventListener("click", () => {
    if (modalMode === "doc") return;
    prevScreenshot();
});

document.addEventListener("keydown", e => {
    if (!modal.classList.contains("active")) return;

    if (e.key === "Escape") closeModal();
    if (modalMode !== "doc") {
        if (e.key === "ArrowRight") nextScreenshot();
        if (e.key === "ArrowLeft") prevScreenshot();
    }
});

/* ============================================================
   RELATED GAMES
============================================================ */

function renderRelatedGames(game, allGames) {

    const section = document.querySelector(".game-section--related");
    const track = document.getElementById("relatedGamesTrack");
    const titleEl = document.getElementById("relatedGamesTitle");
    const kickerEl = document.getElementById("relatedGamesKicker");

    if (!section || !track || !titleEl || !kickerEl) return;

    let related = [];
    let sourceLabel = "Publisher";

    if (game.publisher) {
        related = allGames.filter(g =>
            g.publisher === game.publisher &&
            String(g.id) !== String(game.id)
        );
    }

    if (!related.length && game.developer) {
        related = allGames.filter(g =>
            g.developer === game.developer &&
            String(g.id) !== String(game.id)
        );
        sourceLabel = "Developer";
    }

    related = related.slice(0, 10);

    if (!related.length) {
        section.hidden = true;
        return;
    }

    titleEl.textContent = "More From The Same Publisher";
    kickerEl.textContent = "Related Games";

    track.innerHTML = related.map(g => {
        const thumb = resolveGameThumb(g.thumbnail || g.thumb || g.cover);
        return `
            <a href="game.html?id=${encodeURIComponent(g.id)}" class="ccg-game-card">
                <div class="ccg-game-card__thumb">
                    <img src="${thumb}" alt="${g.title}">
                </div>
                <div class="ccg-game-card__body">
                    <h3 class="ccg-game-card__title">${g.title}</h3>
                    <div class="ccg-game-card__meta">
                        ${(g.year || "")} · ${(g.system || "")}
                    </div>
                </div>
            </a>
        `;
    }).join("");

    section.hidden = false;
    initRelatedCarousel();
}

/* ============================================================
   RELATED GAMES CAROUSEL BEHAVIOUR (SG-E5)
============================================================ */

function initRelatedCarousel() {

    const track = document.querySelector(".related-carousel__track");
    const viewport = document.querySelector(".related-carousel__viewport");
    const prevBtn = document.querySelector(".related-carousel__nav--prev");
    const nextBtn = document.querySelector(".related-carousel__nav--next");

    if (!track || !viewport || !prevBtn || !nextBtn) return;

    const scrollAmount = () => viewport.clientWidth * 0.9;

    const scrollBy = delta => {
        track.scrollBy({
            left: delta,
            behavior: "smooth"
        });
    };

    prevBtn.addEventListener("click", () => scrollBy(-scrollAmount()));
    nextBtn.addEventListener("click", () => scrollBy(scrollAmount()));
}
