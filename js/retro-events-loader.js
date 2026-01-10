/* ============================================================
   RETRO EVENTS COLLECTION LOADER — OMEGA SAFE
   ------------------------------------------------------------
   • Video-led collection for events, expos, museums
   • Uses existing card markup + grid classes
   • Thumbnail fallback: local collection path → YouTube
============================================================ */

const ccgRetroEventsVideos = [
    { id: "6IYw6wRW3-0" },
    { id: "_KRx_UxPWTM" },
    { id: "C7_aTXHJ4iI" },
    { id: "Z6iXT4iPqs8" },
    { id: "6PmRNlqIdFY" },
    { id: "n_ZymsSyDAg" },
    { id: "1S-gaWInghY" },
    { id: "qody-Yqd19o" },
    { id: "QwJKwDVd2h8" },
    { id: "uLAK4KLYkEA" },
    { id: "PDomaOW-1-c" },
    { id: "sAU3CPCCpvE" },
    { id: "SiMgKvZeXws" },
    { id: "smVNHlm_jM0" },
    { id: "2OG2tPx5gnU" },
    { id: "rRKBcyiWO2I" }
];

function ccgEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function ccgRetroEventsThumbLocal(videoId) {
    return `../../resources/images/collections/retro-events/${videoId}.jpg`;
}

function ccgRetroEventsThumbYouTube(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function ccgBuildRetroEventCard(video, index) {
    const videoId = String(video?.id || "").trim();
    if (!videoId) return "";

    const title = video?.title || `Retro Event Video ${String(index + 1).padStart(2, "0")}`;
    const safeTitle = ccgEscapeHtml(title);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const localThumb = ccgRetroEventsThumbLocal(videoId);
    const ytThumb = ccgRetroEventsThumbYouTube(videoId);

    return `
        <div class="ccg-game-card genre-card">
            <a href="${videoUrl}" class="ccg-game-card__thumb" target="_blank" rel="noopener">
                <img src="${localThumb}" data-ccg-thumb-fallback="${ytThumb}" alt="${safeTitle}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">
                    ${safeTitle}
                </h3>

                <div class="ccg-game-card__meta">
                    Retro Events · YouTube
                </div>

                <div class="ccg-game-card__actions">
                    <a href="${videoUrl}"
                       class="ccg-btn ccg-btn--primary ccg-game-card__btn"
                       target="_blank"
                       rel="noopener">
                       Watch Video
                    </a>
                </div>
            </div>
        </div>
    `;
}

function ccgApplyRetroEventsThumbFallback(container) {
    const images = container.querySelectorAll("img[data-ccg-thumb-fallback]");
    images.forEach((img) => {
        img.addEventListener("error", () => {
            const fallback = img.getAttribute("data-ccg-thumb-fallback");
            if (!fallback || img.src === fallback) return;
            img.src = fallback;
        }, { once: true });
    });
}

function ccgRunRetroEventsCollection() {
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!grid) {
        console.warn("[CCG RETRO EVENTS] Missing grid container");
        return;
    }

    const cards = ccgRetroEventsVideos
        .map(ccgBuildRetroEventCard)
        .join("");

    if (countEl) {
        countEl.textContent = ccgRetroEventsVideos.length;
    }

    if (cards) {
        grid.innerHTML = cards;
        ccgApplyRetroEventsThumbFallback(grid);
    } else {
        grid.innerHTML = `
            <div class="ccg-genre-empty">
                <h3>No collection entries yet</h3>
                <p>We&apos;re refreshing this set — check back soon or browse every game.</p>
                <div class="ccg-genre-empty__actions">
                    <a class="ccg-btn ccg-btn--primary" href="../index.html">Browse All Games</a>
                    <a class="ccg-btn ccg-btn--secondary" href="../genres/index.html">Browse by Genre</a>
                </div>
            </div>
        `;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ccgRunRetroEventsCollection, { once: true });
} else {
    ccgRunRetroEventsCollection();
}
