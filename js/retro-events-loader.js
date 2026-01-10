/* ============================================================
   RETRO EVENTS COLLECTION LOADER — OMEGA SAFE
   ------------------------------------------------------------
   • Video-led collection for events, expos, museums
   • Uses existing card markup + grid classes
   • Thumbnail fallback: local collection path → YouTube
============================================================ */

const ccgRetroEventsVideos = [
    {
        id: "6PmRNlqIdFY",
        title: "Arcade Club Bury, Greater Manchester – Europe’s Largest Free-Play Arcade Visit"
    },
    {
        id: "qody-Yqd19o",
        title: "Guru Meditation – Commodore Amiga Error That Became a Legend"
    },
    {
        id: "PDomaOW-1-c",
        title: "Memories of the Commodore 64 – A Brother’s 1982 Retro Gaming Journey"
    },
    {
        id: "QwJKwDVd2h8",
        title: "North West Computer Museum, Leigh – Visiting with the Yorkshire Amiga Group"
    },
    {
        id: "smVNHlm_jM0",
        title: "Play Expo Blackpool 2025 – Retro Gaming Weekend at the Norbreck Castle"
    },
    {
        id: "_KRx_UxPWTM",
        title: "Play Expo Blackpool Norbreck Castle – John Romero & Retro Gaming Weekend Highlights"
    },
    {
        id: "C7_aTXHJ4iI",
        title: "Play Expo Blackpool Norbreck Castle – Retro Gaming Highlights & Legendary Guests"
    },
    {
        id: "Z6iXT4iPqs8",
        title: "Play Expo Blackpool Norbreck Castle – Romero, Rare Consoles & Retro Gaming Gold"
    },
    {
        id: "n_ZymsSyDAg",
        title: "Play Expo Blackpool – Cutting Room Floor Bonus Retro Gaming Footage"
    },
    {
        id: "uLAK4KLYkEA",
        title: "Retro Games Day – Gaming with Family from Amiga to PlayStation 5"
    },
    {
        id: "6IYw6wRW3-0",
        title: "TOP 15 Commodore 64 Games – Essential C64 Classics You Must Play"
    },
    {
        id: "rRKBcyiWO2I",
        title: "The SID Chip – Commodore 64 Sound Interface Device & 8-Bit Music Revolution"
    },
    {
        id: "sAU3CPCCpvE",
        title: "Video Game Market Leeds 2024 – Royal Armouries Retro Gaming Finds"
    },
    {
        id: "2OG2tPx5gnU",
        title: "X-Copy – The Ultimate Commodore Amiga Disk Copier Story (1988–1993)"
    },
    {
        id: "SiMgKvZeXws",
        title: "Yorkshire Amiga Group – North West Retro Computing Meetup"
    },
    {
        id: "1S-gaWInghY",
        title: "ZX Spectrum Memories – Rewinding 8-Bit History with Hodgy"
    }
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
