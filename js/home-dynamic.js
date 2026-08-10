/* ============================================================
   CCG HOME DYNAMIC — OMEGA (GENRE THUMBS FIXED)
   ------------------------------------------------------------
   • Featured Highlights (unchanged)
   • Small Home genre thumbnails (from first game in genre)
   • NO new assets
   • NO 404s
============================================================ */

let CCG_HOME_ALL_GAMES = [];
const CCG_HOME_STATUS = {
    games: {
        ok: false,
        error: null,
        updatedAt: null
    }
};
const HOME_DEBUG_ENABLED = (() => {
    try {
        return new URLSearchParams(window.location.search).get("debug") === "1";
    } catch (error) {
        return false;
    }
})();
let HOME_DEBUG_PANEL = null;
const HOME_DEBUG_ENTRIES = {
    modules: new Map(),
    fetch: new Map()
};
const YT_API_SRC = "https://www.youtube.com/iframe_api";
const CCG_HOME_YT_PLAYERS = new Map();
const CCG_HOME_YT_QUEUE = new Set();
let CCG_HOME_YT_API_READY = false;
let CCG_HOME_YT_API_LOADING = false;
let CCG_HOME_VISUAL_LOCKED = false;

const MOBILE_MEDIA = window.matchMedia?.("(max-width: 1024px)");
const PREFERS_REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const COARSE_POINTER = window.matchMedia?.("(pointer: coarse)");
const FALLBACK_MOBILE_MEDIA = window.matchMedia?.("(max-width: 768px)");
const STAY_AWHILE_AUDIO_SRC = "resources/css/audio/c64_speech_stayawhile.mp3";
const STAY_AWHILE_PULSE_CLASS = "home-visitor-callout__headline--pulse";

let stayAwhileAudio = null;

const isMobileViewport = () => {
    if (typeof window.isMobileViewport === "function") {
        return window.isMobileViewport();
    }
    if (FALLBACK_MOBILE_MEDIA) return FALLBACK_MOBILE_MEDIA.matches;
    return window.innerWidth <= 768;
};

document.addEventListener("DOMContentLoaded", () => {
    // Defensive guard: lock HOME visuals to the initial crisp state (no post-load haze reactivation).
    document.documentElement.matches?.('[data-ccg-page="home"]') && document.documentElement.classList.add("ccg-home-no-haze");

    if (shouldUseMobileLite()) {
        applyMobileLiteMode();
    }

    initHomeDynamic().catch((error) => {
        console.error("[CCG-HOME] bootstrap FAILED", error);
        setModuleStatus("Bootstrap", "failed", error);
    });
});

function getHomeDataModules() {
    return [
        { name: "Featured highlights", fn: renderFeaturedHighlights },
        { name: "Featured spotlight", fn: renderFeaturedSpotlight },
        { name: "Featured videos", fn: renderFeaturedVideos },
        { name: "Random game buttons", fn: wireRandomGameButton }
    ];
}

async function retryHomeDataLoad(button) {
    if (button?.dataset?.ccgRetryBusy === "true") return;
    if (button) {
        button.dataset.ccgRetryBusy = "true";
        button.textContent = "Retrying…";
    }

    await runAsyncModules([{ name: "Games data", fn: loadGamesForHome }]);
    runSyncModules(getHomeDataModules());

    if (button) {
        button.dataset.ccgRetryBusy = "false";
        button.textContent = "Tap to retry";
    }
}

async function initHomeDynamic() {
    const skipAnimations = shouldSkipHomeAnimations();
    initHomeDebugPanel();

    const asyncModules = [
        { name: "Games data", fn: loadGamesForHome }
    ];

    await runAsyncModules(asyncModules);

    const syncModules = [
        ...getHomeDataModules(),
        {
            name: "Mode label sync",
            fn: () => {
                syncModeLabel();
                initModeObserver();
            }
        },
        { name: "Scroll perf pause", fn: setupHomeScrollPerfPause },
        { name: "Stay a while callout", fn: initStayAwhileCallout },
        { name: "Mobile dock effects", fn: initMobileDockEffects },
        { name: "Hero parallax", fn: initHeroParallaxLite },
        {
            name: "Hero visuals",
            fn: () => {
                if (skipAnimations) {
                    calmHeroCards();
                } else {
                    initHeroCardFX();

                    if (!isMobileViewport()) {
                        runWhenIdle(() => {
                            initHeroGlowPulse();
                            initHomeEnergy();
                        });
                    }
                }
            }
        },
        { name: "Home visual lock", fn: lockHomeVisualState }
    ];

    runSyncModules(syncModules);
}

function runSyncModules(modules) {
    modules.forEach(module => {
        try {
            module.fn();
            setModuleStatus(module.name, "ok");
        } catch (error) {
            setModuleStatus(module.name, "failed", error);
        }
    });
}

async function runAsyncModules(modules) {
    const results = await Promise.allSettled(
        modules.map(module => Promise.resolve().then(() => module.fn()))
    );

    results.forEach((result, index) => {
        const module = modules[index];
        if (result.status === "fulfilled") {
            setModuleStatus(module.name, "ok");
        } else {
            setModuleStatus(module.name, "failed", result.reason);
        }
    });
}

function setModuleStatus(name, status, error) {
    const label = `[CCG-HOME] module ${name}`;
    if (status === "ok") {
        console.info(`${label} OK`);
    } else {
        console.error(`${label} FAILED`, error);
    }

    if (!HOME_DEBUG_ENABLED) return;
    HOME_DEBUG_ENTRIES.modules.set(name, { status, error });
    renderDebugEntries("modules");
}

function setFetchStatus(name, status, error) {
    const label = `[CCG-HOME] fetch ${name}`;
    if (status === "ok") {
        console.info(`${label} OK`);
    } else {
        console.error(`${label} FAILED`, error);
    }

    if (!HOME_DEBUG_ENABLED) return;
    HOME_DEBUG_ENTRIES.fetch.set(name, { status, error });
    renderDebugEntries("fetch");
}

function initHomeDebugPanel() {
    if (!HOME_DEBUG_ENABLED || HOME_DEBUG_PANEL) return;
    const panel = document.createElement("aside");
    panel.className = "home-debug-panel";
    panel.setAttribute("data-ccg-home-debug", "true");
    panel.innerHTML = `
        <div class="home-debug-panel__title">CCG Home Debug</div>
        <div class="home-debug-panel__section">
            <div class="home-debug-panel__label">Fetch</div>
            <ul class="home-debug-panel__list" data-ccg-debug-fetch></ul>
        </div>
        <div class="home-debug-panel__section">
            <div class="home-debug-panel__label">Modules</div>
            <ul class="home-debug-panel__list" data-ccg-debug-modules></ul>
        </div>
    `;
    document.body.appendChild(panel);
    HOME_DEBUG_PANEL = panel;
    renderDebugEntries("fetch");
    renderDebugEntries("modules");
}

function renderDebugEntries(type) {
    if (!HOME_DEBUG_PANEL) return;
    const list = HOME_DEBUG_PANEL.querySelector(
        type === "fetch" ? "[data-ccg-debug-fetch]" : "[data-ccg-debug-modules]"
    );
    if (!list) return;

    const entries = type === "fetch" ? HOME_DEBUG_ENTRIES.fetch : HOME_DEBUG_ENTRIES.modules;
    list.innerHTML = "";
    entries.forEach((value, key) => {
        const item = document.createElement("li");
        item.className = `home-debug-panel__item home-debug-panel__item--${value.status}`;
        item.textContent = `${key}: ${value.status === "ok" ? "OK" : "FAILED"}`;
        if (value.error) {
            item.title = String(value.error?.message || value.error);
        }
        list.appendChild(item);
    });
}

function initStayAwhileCallout() {
    const headline = document.querySelector(".home-visitor-callout__headline--interactive");
    if (!headline) return;

    if (!stayAwhileAudio) {
        stayAwhileAudio = new Audio(STAY_AWHILE_AUDIO_SRC);
        stayAwhileAudio.preload = "auto";
    }

    const triggerStayAwhile = () => {
        if (!stayAwhileAudio) return;
        if (!stayAwhileAudio.paused) {
            stayAwhileAudio.pause();
        }
        stayAwhileAudio.currentTime = 0;
        const playPromise = stayAwhileAudio.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
        }

        headline.classList.remove(STAY_AWHILE_PULSE_CLASS);
        void headline.offsetWidth;
        headline.classList.add(STAY_AWHILE_PULSE_CLASS);
    };

    const handleKeydown = (event) => {
        // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
        // Prevents quiz/hotkey logic from blocking form typing
        const tag = event.target?.tagName?.toLowerCase();
        const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
        if (isEditable) return;

        if (location.pathname.startsWith("/admin/")) return;
        // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
        // Prevents quiz/hotkey logic from blocking form typing
        const secondaryTag = event?.target?.tagName?.toLowerCase();
        const secondaryEditable = secondaryTag === "input" || secondaryTag === "textarea" || event?.target?.isContentEditable === true;
        if (secondaryEditable) return;
        if (event.target?.closest?.("input, textarea, [contenteditable]")) return;
        if (event.repeat) return;
        if (event.key === "Enter") {
            event.preventDefault();
            triggerStayAwhile();
            return;
        }
        if (event.key === " " || event.key === "Spacebar") {
            triggerStayAwhile();
        }
    };

    headline.addEventListener("click", triggerStayAwhile);
    headline.addEventListener("keydown", handleKeydown);
    headline.addEventListener("animationend", (event) => {
        if (event.animationName === "homeVisitorPulse") {
            headline.classList.remove(STAY_AWHILE_PULSE_CLASS);
        }
    });
}

function lockHomeVisualState() {
    const root = document.documentElement;
    if (!root?.matches?.('[data-ccg-page="home"]') || CCG_HOME_VISUAL_LOCKED) return;
    CCG_HOME_VISUAL_LOCKED = true;

    const targets = [
        root,
        document.body,
        document.querySelector(".ccg-page--home"),
        document.querySelector(".ccg-main--home")
    ].filter(Boolean);

    targets.forEach(target => {
        target.style.filter = "none";
        target.style.backdropFilter = "none";
        target.style.opacity = "1";
        target.style.mixBlendMode = "normal";
        target.style.transform = "none";
    });

    const enforceReset = (node) => {
        node.style.filter = "none";
        node.style.backdropFilter = "none";
        node.style.opacity = "1";
        node.style.mixBlendMode = "normal";
        node.style.transform = "none";
    };

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type !== "attributes" || mutation.attributeName !== "style") return;
            enforceReset(mutation.target);
        });
    });

    targets.forEach(target => {
        observer.observe(target, { attributes: true, attributeFilter: ["style"] });
    });
}

function loadYouTubeIframeAPI() {
    if (window.YT?.Player) {
        CCG_HOME_YT_API_READY = true;
        flushQueuedYouTubePlayers();
        return;
    }

    if (CCG_HOME_YT_API_LOADING || CCG_HOME_YT_API_READY) return;

    const existingScript = document.querySelector(`script[src="${YT_API_SRC}"]`);
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === "function") {
            previousReady();
        }
        CCG_HOME_YT_API_READY = true;
        CCG_HOME_YT_API_LOADING = false;
        flushQueuedYouTubePlayers();
    };

    if (existingScript) {
        CCG_HOME_YT_API_LOADING = true;
        return;
    }

    const script = document.createElement("script");
    script.src = YT_API_SRC;
    script.async = true;
    script.defer = true;
    CCG_HOME_YT_API_LOADING = true;
    document.head.appendChild(script);
}

function flushQueuedYouTubePlayers() {
    if (!window.YT?.Player) return;
    CCG_HOME_YT_QUEUE.forEach(iframe => {
        createYouTubePlayer(iframe);
    });
    CCG_HOME_YT_QUEUE.clear();
}

function createYouTubePlayer(iframe) {
    if (!iframe?.id || CCG_HOME_YT_PLAYERS.has(iframe.id) || !window.YT?.Player) return;
    const player = new window.YT.Player(iframe, {
        events: {
            onReady: onYouTubePlayerReady
        }
    });
    CCG_HOME_YT_PLAYERS.set(iframe.id, player);
}

function onYouTubePlayerReady(event) {
    const player = event?.target;
    const iframe = player?.getIframe?.();
    if (iframe?.id) {
        CCG_HOME_YT_PLAYERS.set(iframe.id, player);
    }
}

function ensureYouTubePlayer(iframe) {
    if (!iframe?.id) return;
    if (CCG_HOME_YT_PLAYERS.has(iframe.id)) return;

    if (window.YT?.Player) {
        createYouTubePlayer(iframe);
        return;
    }

    CCG_HOME_YT_QUEUE.add(iframe);
    loadYouTubeIframeAPI();
}

function pauseVideo(player) {
    if (player && typeof player.pauseVideo === "function") {
        player.pauseVideo();
    }
}

function playVideo(player) {
    if (player && typeof player.playVideo === "function") {
        player.playVideo();
    }
}

function pauseOtherFeaturedVideos(activeIframe) {
    CCG_HOME_YT_PLAYERS.forEach((player, id) => {
        if (activeIframe?.id && id === activeIframe.id) return;
        pauseVideo(player);
    });
}

/* ------------------------------------------------------------
   MOBILE/LOW-POWER DETECTION (ROBUST)
   - Some devices report odd CSS pixel widths; use visualViewport/innerWidth as a fallback.
------------------------------------------------------------ */

function getViewportWidth() {
    const vv = window.visualViewport?.width;
    return typeof vv === "number" && vv > 0 ? vv : window.innerWidth;
}

function shouldSkipHomeAnimations() {
    return Boolean(
        isMobileViewport() ||
        MOBILE_MEDIA?.matches ||
        COARSE_POINTER?.matches ||
        PREFERS_REDUCED_MOTION?.matches
    );
}


function shouldUseMobileLite() {
    const vw = getViewportWidth();
    const smallViewport = typeof vw === "number" && vw <= 1100;
    return Boolean(isMobileViewport() || MOBILE_MEDIA?.matches || COARSE_POINTER?.matches || smallViewport);
}

function setupHomeScrollPerfPause() {
    const root = document.documentElement;
    if (!root?.matches?.('[data-ccg-page="home"]')) return;

    const PAUSE_CLASS = "ccg-home-perf-paused";
    const resumeDelay = 200;
    let resumeTimer = null;

    const setPaused = (paused) => {
        root.classList.toggle(PAUSE_CLASS, paused);
        window.dispatchEvent(new CustomEvent("ccg-home-perf-pause", { detail: { paused } }));
    };

    const onScroll = () => {
        setPaused(true);
        if (resumeTimer) {
            window.clearTimeout(resumeTimer);
        }
        resumeTimer = window.setTimeout(() => setPaused(false), resumeDelay);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
}

function initMobileDockEffects() {
    const dock = document.querySelector("[data-omega-mobile-dock]");
    if (!dock || !isMobileViewport()) return;

    let idleTimer = null;
    const idleDelay = 180;

    const handleScroll = () => {
        dock.classList.add("is-scrolling");
        if (idleTimer) {
            window.clearTimeout(idleTimer);
        }
        idleTimer = window.setTimeout(() => {
            dock.classList.remove("is-scrolling");
        }, idleDelay);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
}

function initHeroParallaxLite() {
    const hero = document.querySelector(".home-hero");
    if (!hero || !isMobileViewport() || PREFERS_REDUCED_MOTION?.matches) return;

    let ticking = false;

    const update = () => {
        const rect = hero.getBoundingClientRect();
        const offset = Math.max(-12, Math.min(12, rect.top * -0.06));
        hero.style.setProperty("--home-hero-parallax", `${offset.toFixed(2)}px`);
        ticking = false;
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
}

function applyMobileLiteMode() {
    document.body.classList.add("ccg-mobile-lite");
    document.documentElement.classList.add("ccg-mobile-lite");

    const randomButtons = document.querySelectorAll("[data-ccg-random-game]");
    randomButtons.forEach(btn => {
        const mobileLabel = btn.dataset.mobileLabel;
        if (!mobileLabel) return;
        const label = btn.querySelector(".home-random-cta__label");
        if (label) {
            label.textContent = mobileLabel;
        } else {
            btn.textContent = mobileLabel;
        }
    });
}

function runWhenIdle(task) {
    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => task(), { timeout: 1200 });
    } else {
        window.setTimeout(task, 200);
    }
}

/* ============================================================
   LOAD DATA
============================================================ */

async function loadGamesForHome() {
    try {
        const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
        const rootPrefix = root.endsWith("/") ? root : `${root}/`;
        const url = `${rootPrefix}games/games.json`;
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) {
            throw new Error(`games.json fetch failed (${res.status})`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            throw new Error("games.json response was not an array");
        }
        CCG_HOME_ALL_GAMES = data;
        CCG_HOME_STATUS.games = { ok: true, error: null, updatedAt: Date.now() };
        setFetchStatus("games.json", "ok");
        return data;
    } catch (error) {
        CCG_HOME_ALL_GAMES = [];
        CCG_HOME_STATUS.games = { ok: false, error, updatedAt: Date.now() };
        setFetchStatus("games.json", "failed", error);
        throw error;
    }
}

/* ============================================================
   FEATURED SHOWCASE — MATCHED GAME & VIDEO
============================================================ */

function renderFeaturedHighlights() {
    const grid = document.querySelector(".home-highlights-grid");
    if (!grid) return;

    if (!CCG_HOME_STATUS.games.ok) {
        grid.innerHTML = "";
        grid.appendChild(buildFallbackCard({
            title: "Featured highlights unavailable",
            text: "We couldn’t load the games library yet. Please try again in a moment.",
            onRetry: retryHomeDataLoad,
            cardClass: "home-highlight-card"
        }));
        return;
    }

    const picks = sampleGames(3);
    if (!picks.length) {
        grid.innerHTML = "";
        grid.appendChild(buildFallbackCard({
            title: "Featured highlights pending",
            text: "No highlighted titles are available right now.",
            onRetry: retryHomeDataLoad,
            cardClass: "home-highlight-card"
        }));
        return;
    }

    grid.innerHTML = "";

    picks.forEach(game => {
        const card = document.createElement("a");
        card.className = "ccg-card home-feature-card";
        card.href = resolveGameUrl(game);

        card.innerHTML = `
            <img src="${resolveThumb(game.thumbnail)}"
                 alt="${game.title}"
                 loading="lazy"
                 decoding="async"
                 width="320"
                 height="180">
            <div class="ccg-card__body">
                <h3 class="ccg-card__title">${game.title}</h3>
                <p class="ccg-card__text">${buildMeta(game)}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderFeaturedSpotlight() {
    const card = document.querySelector('[data-ccg-spotlight]');
    if (!card) return;

    const game = pickSpotlightGame();
    if (!game) {
        card.style.display = "none";
        return;
    }

    const thumb = resolveThumb(game.thumbnail);
    const meta = buildMeta(game) || "Featured pick";
    const videoUrl = game.videoid ? `https://www.youtube.com/watch?v=${game.videoid}` : "";
    const gameUrl = resolveGameUrl(game);

    const artEl = card.querySelector('[data-ccg-spotlight-art]');
    const metaEl = card.querySelector('[data-ccg-spotlight-meta]');
    const titleEl = card.querySelector('[data-ccg-spotlight-title]');
    const copyEl = card.querySelector('[data-ccg-spotlight-copy]');
    const tagsEl = card.querySelector('[data-ccg-spotlight-tags]');
    const gameLink = card.querySelector('[data-ccg-spotlight-game]');
    const ytLink = card.querySelector('[data-ccg-spotlight-youtube]');
    const videoShell = card.querySelector('[data-ccg-spotlight-video]');
    const videoLabel = card.querySelector('.home-spotlight__video-label');
    const iframeWrap = card.querySelector('[data-ccg-spotlight-iframe-wrap]');

    if (artEl) artEl.style.backgroundImage = `url('${thumb}')`;
    if (videoShell && game.videoid) {
        videoShell.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('https://img.youtube.com/vi/${game.videoid}/hqdefault.jpg')`;
        videoShell.style.backgroundSize = "cover";
        videoShell.style.backgroundPosition = "center";
    } else if (videoShell) {
        videoShell.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('${thumb}')`;
        videoShell.classList.add("is-static");
        if (videoLabel) videoLabel.textContent = "Video preview unavailable";
    }

    if (metaEl) metaEl.textContent = meta;
    if (titleEl) titleEl.textContent = game.title;
    if (copyEl) copyEl.textContent = game.description?.trim() || "Neon-fuelled action and pixel-perfect charm.";

    if (tagsEl) {
        tagsEl.innerHTML = "";
        [game.system, game.year, ...(game.genres?.slice(0, 2) || [])]
            .filter(Boolean)
            .forEach(tag => {
                const pill = document.createElement("span");
                pill.className = "home-spotlight__tag";
                pill.textContent = tag;
                tagsEl.appendChild(pill);
            });
    }

    if (gameLink) gameLink.href = gameUrl;
    if (ytLink) {
        ytLink.href = videoUrl || "#";
        ytLink.target = "_blank";
        ytLink.rel = "noopener";
        if (!videoUrl) {
            ytLink.setAttribute("aria-disabled", "true");
            ytLink.onclick = (ev) => ev.preventDefault();
        }
    }

    hydrateSpotlightVideo(game.videoid, iframeWrap);
}

function pickSpotlightGame() {
    if (!CCG_HOME_ALL_GAMES.length) return null;

    const flagged = CCG_HOME_ALL_GAMES.find(g => g.featured === true || g.isFeatured === true || g.homeFeatured === true);
    if (flagged?.videoid) return flagged;

    const sortedWithVideo = CCG_HOME_ALL_GAMES
        .filter(g => g.videoid)
        .sort((a, b) => (a.sorttitle || a.title).localeCompare(b.sorttitle || b.title, undefined, { sensitivity: "base" }));

    if (!sortedWithVideo.length) return flagged || CCG_HOME_ALL_GAMES[0];

    const fallbackId = "turrican_ii_the_final_fight";
    return sortedWithVideo.find(g => g.id === fallbackId) || sortedWithVideo[0];
}

function hydrateSpotlightVideo(videoId, iframeWrap) {
    const watchButtons = document.querySelectorAll('[data-ccg-spotlight-watch]');
    const iframe = document.querySelector('[data-ccg-spotlight-iframe]');
    if (iframe && !iframe.id) {
        iframe.id = "yt-player-spotlight";
    }

    if (!videoId || !iframeWrap || !iframe) {
        watchButtons.forEach(btn => {
            btn.setAttribute("disabled", "true");
            btn.disabled = true;
        });
        return;
    }

    const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&enablejsapi=1`;

    const loadEmbed = () => {
        if (iframe.dataset.loaded === "true") return;
        iframe.src = embedSrc;
        iframe.dataset.loaded = "true";
        iframeWrap.classList.add("is-playing");
        ensureYouTubePlayer(iframe);
    };

    watchButtons.forEach(btn => {
        btn.onclick = (ev) => {
            ev.preventDefault();
            loadEmbed();
        };
    });
}

/* ============================================================
   UTIL
============================================================ */

function getHomeSiteRoot() {
    const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "";
    if (!root) return "";
    return root.endsWith("/") ? root : `${root}/`;
}

function buildFallbackCard({ title, text, buttonLabel = "Tap to retry", onRetry, cardClass = "" }) {
    const card = document.createElement("article");
    card.className = `ccg-card home-fallback-card ${cardClass}`.trim();
    card.innerHTML = `
        <div class="ccg-card__body">
            <h3 class="ccg-card__title">${title}</h3>
            <p class="ccg-card__text">${text}</p>
        </div>
    `;

    if (onRetry) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ccg-btn ccg-btn--ghost home-fallback-retry";
        button.textContent = buttonLabel;
        button.addEventListener("click", () => onRetry(button));
        card.querySelector(".ccg-card__body")?.appendChild(button);
    }

    return card;
}

function resolveThumb(t) {
    const rootPrefix = getHomeSiteRoot();
    if (!t) return `${rootPrefix}resources/images/thumbnails/all/1942.jpg`;
    if (t.startsWith("http")) return t;
    if (t.startsWith("resources/")) {
        return `${rootPrefix}${t}`;
    }
    return `${rootPrefix}resources/images/thumbnails/all/${t}`;
}

function resolveGameUrl(game) {
    const rootPrefix = getHomeSiteRoot();
    const slug = String(game?.slug || "").trim();
    if (slug) return `${rootPrefix}games/${slug}/`;

    const id = String(game?.id || "").trim();
    if (id) {
        const fallbackSlug = id.toLowerCase().replace(/_+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (fallbackSlug) return `${rootPrefix}games/${fallbackSlug}/`;
    }

    return "#";
}

function getFeaturedCompany(game) {
    const developer = String(game?.developer || game?.credits?.developer || "").trim();
    if (developer) return developer;

    const publishers = Array.isArray(game?.credits?.publisher)
        ? game.credits.publisher
        : [game?.credits?.publisher || game?.publisher];

    return publishers
        .map((publisher) => String(publisher || "").trim())
        .find(Boolean) || "";
}

function buildMeta(game) {
    return [game.system, game.year, getFeaturedCompany(game)].filter(Boolean).join(" · ");
}

function sampleGames(count, predicate = () => true) {
    const pool = CCG_HOME_ALL_GAMES.filter(predicate);
    return pool
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
}

function pickVideoGame(system) {
    const systemMatch = sampleGames(1, g => Boolean(g.videoid) && g.system?.toLowerCase() === system?.toLowerCase());
    if (systemMatch.length) return systemMatch[0];

    const anyVideo = sampleGames(1, g => Boolean(g.videoid));
    return anyVideo[0] || null;
}

function renderFeaturedVideos() {
    const grid = document.querySelector("[data-ccg-video-grid]");
    if (!grid) return;

    if (!CCG_HOME_STATUS.games.ok) {
        grid.innerHTML = "";
        grid.appendChild(buildFallbackCard({
            title: "Featured videos unavailable",
            text: "We couldn’t load the games library, so videos can’t be selected yet.",
            onRetry: retryHomeDataLoad,
            cardClass: "home-video-card home-video-card--fallback"
        }));
        return;
    }

    if (!CCG_HOME_ALL_GAMES.length) {
        grid.innerHTML = "";
        grid.appendChild(buildFallbackCard({
            title: "Featured videos pending",
            text: "No video entries are available right now.",
            onRetry: retryHomeDataLoad,
            cardClass: "home-video-card home-video-card--fallback"
        }));
        return;
    }

    const lanes = [
        { system: "C64", label: "Commodore 64" },
        { system: "Amiga", label: "Commodore Amiga" }
    ];

    grid.innerHTML = "";

    lanes.forEach((lane, index) => {
        const game = pickVideoGame(lane.system);
        const card = buildVideoCard(game, lane.label, index);
        grid.appendChild(card);
    });
}

function buildVideoCard(game, systemLabel, index) {
    const card = document.createElement("article");
    card.className = "ccg-card home-video-card";

    const hasVideo = Boolean(game?.videoid);
    const videoId = game?.videoid || "";
    const thumb = hasVideo
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : resolveThumb(game?.thumbnail);
    const meta = game ? (buildMeta(game) || systemLabel) : `${systemLabel} feature`;
    const title = game?.title || `${systemLabel} pick`;
    const viewLabel = "View Game";
    const viewAria = game ? `aria-label="View ${title} game page"` : "aria-disabled=\"true\"";
    const gameUrl = game ? resolveGameUrl(game) : "#";
    const iframeId = hasVideo ? `yt-player-featured-${systemLabel.toLowerCase().replace(/\s+/g, "-")}-${index}` : "";

    card.innerHTML = `
        <div class="home-video-card__media">
            <div class="home-featured-video-media">
                <iframe
                    class="home-video-card__iframe"
                    data-ccg-video-iframe
                    ${iframeId ? `id="${iframeId}"` : ""}
                    title="${title} gameplay video"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowfullscreen></iframe>
            </div>
            <div class="home-video-card__overlay">
                <span class="home-video-card__badge">${systemLabel}</span>
                <div class="home-video-card__thumb" style="background-image: url('${thumb}')">
                    <button class="ccg-btn ccg-btn--ghost home-video-card__play" type="button" data-ccg-video-play ${hasVideo ? "" : "disabled"}>Play video</button>
                </div>
            </div>
        </div>
        <div class="ccg-card__body">
            <p class="home-video-card__label">Randomised pick</p>
            <h3 class="ccg-card__title">${title}</h3>
            <p class="ccg-card__text">${meta}</p>
            <div class="home-video-card__links">
                <a href="${gameUrl}" class="ccg-link home-video-card__game-link" ${viewAria}>${viewLabel}</a>
            </div>
        </div>
    `;

    const playButton = card.querySelector('[data-ccg-video-play]');
    const iframe = card.querySelector('[data-ccg-video-iframe]');
    const overlay = card.querySelector('.home-video-card__overlay');
    const isMobileDevice = Boolean(isMobileViewport() || MOBILE_MEDIA?.matches || COARSE_POINTER?.matches);

    if (hasVideo && iframe && isMobileDevice) {
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&playsinline=1&fs=1&enablejsapi=1`;
        iframe.dataset.loaded = "true";
        if (overlay) {
            overlay.style.pointerEvents = "none";
        }
    }

    if (hasVideo && playButton && iframe) {
        playButton.onclick = () => {
            if (!iframe.dataset.loaded) {
                iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&enablejsapi=1`;
                iframe.dataset.loaded = "true";
            }
            card.classList.add("is-playing");
            ensureYouTubePlayer(iframe);
            pauseOtherFeaturedVideos(iframe);
        };
    }

    return card;
}

/* ============================================================
   RANDOM GAME + MODE
============================================================ */

function getRandomGame() {
    if (!CCG_HOME_ALL_GAMES.length) return null;
    const candidates = CCG_HOME_ALL_GAMES.filter(game => resolveGameUrl(game) !== "#");
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

function animateRandomCTA(button) {
    if (!button) return;
    const status = button.querySelector(".home-random-cta__status");
    button.classList.remove("is-launching");
    void button.offsetWidth;
    button.classList.add("is-launching");
    button.setAttribute("aria-busy", "true");
    if (status) {
        status.textContent = "LOADING…";
    }
}

function navigateToGame(game) {
    const url = resolveGameUrl(game);
    if (!url || url === "#") return false;
    window.location.href = url;
    return true;
}

function wireRandomGameButton() {
    const buttons = Array.from(document.querySelectorAll("[data-ccg-random-game]"));
    if (!buttons.length) return;

    const resetButton = (btn) => {
        btn.classList.remove("is-disabled");
        btn.removeAttribute("aria-disabled");
        btn.removeAttribute("disabled");
        btn.dataset.ccgRandomDisabled = "false";
        const status = btn.querySelector(".home-random-cta__status");
        if (status) status.textContent = "";
    };

    const disableButton = (btn, message = "Unavailable") => {
        btn.classList.add("is-disabled");
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("disabled", "true");
        btn.dataset.ccgRandomDisabled = "true";
        const status = btn.querySelector(".home-random-cta__status");
        if (status) status.textContent = message;
    };

    const launchRandom = (event) => {
        event?.preventDefault?.();
        const button = event?.currentTarget || event?.target;
        if (!button || button.classList.contains("is-disabled")) return;

        if (!CCG_HOME_ALL_GAMES.length) {
            disableButton(button, "Unavailable");
            return;
        }

        if (button.dataset.ccgRandomBusy === "true") return;
        button.dataset.ccgRandomBusy = "true";

        const game = getRandomGame();
        if (!game) {
            disableButton(button, "Unavailable");
            return;
        }

        animateRandomCTA(button);
        const delay = PREFERS_REDUCED_MOTION?.matches ? 0 : 280;
        window.setTimeout(() => {
            button.dataset.ccgRandomBusy = "false";
            button.removeAttribute("aria-busy");
            navigateToGame(game);
        }, delay);
    };

    buttons.forEach(btn => {
        if (CCG_HOME_ALL_GAMES.length && btn.dataset.ccgRandomDisabled === "true") {
            resetButton(btn);
        }
        if (btn.dataset.ccgRandomWired === "true") return;
        btn.dataset.ccgRandomWired = "true";
        btn.addEventListener("click", launchRandom);
    });
}

function syncModeLabel() {
    const el = document.querySelector("[data-ccg-mode-label]");
    if (el) el.textContent = document.body.dataset.ccgMode?.toUpperCase() || "C64";
}

function initModeObserver() {
    new MutationObserver(syncModeLabel)
        .observe(document.body, { attributes: true, attributeFilter: ["data-ccg-mode"] });
}

/* ============================================================
   HERO CARD GLOW — POINTER REACTIVE
============================================================ */

function initHeroCardFX() {
    const cards = document.querySelectorAll('.home-hero-card, .home-highlight-card, .home-spotlight-card, .home-link-tile, .home-video-card');
    const hasFinePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
    if (!cards.length || !hasFinePointer) return;

    cards.forEach(card => {
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '50%');
        card.style.setProperty('--glow-alpha', '0.28');

        let frameId = null;
        let pendingPoint = null;

        const updateGlow = () => {
            if (!pendingPoint) return;
            const rect = card.getBoundingClientRect();
            const x = ((pendingPoint.x - rect.left) / rect.width) * 100;
            const y = ((pendingPoint.y - rect.top) / rect.height) * 100;
            card.style.setProperty('--glow-x', `${x.toFixed(2)}%`);
            card.style.setProperty('--glow-y', `${y.toFixed(2)}%`);
            card.style.setProperty('--glow-alpha', '0.55');
            frameId = null;
        };

        card.addEventListener('pointermove', (e) => {
            pendingPoint = { x: e.clientX, y: e.clientY };
            if (!frameId) {
                frameId = requestAnimationFrame(updateGlow);
            }
        }, { passive: true });

        card.addEventListener('pointerleave', () => {
            pendingPoint = null;
            if (frameId) cancelAnimationFrame(frameId);
            frameId = null;
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
            card.style.setProperty('--glow-alpha', '0.30');
        });
    });
}

function initHeroGlowPulse() {
    if (document.documentElement.classList.contains("ccg-home-no-haze")) {
        // HOME haze fix: never escalate glow after first paint (keep visuals crisp and stable).
        return;
    }
    const cards = document.querySelectorAll('.home-hero-card');
    if (!cards.length || PREFERS_REDUCED_MOTION?.matches) return;

    let tick = 0;
    let frameId = null;
    let paused = false;

    const loop = () => {
        if (paused) {
            frameId = null;
            return;
        }
        tick += 0.02;
        const pulse = 0.30 + Math.sin(tick) * 0.05;
        cards.forEach(card => card.style.setProperty('--glow-alpha', pulse.toFixed(3)));
        frameId = requestAnimationFrame(loop);
    };

    const setPaused = (next) => {
        paused = next;
        if (paused && frameId) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
        if (!paused && !frameId) {
            frameId = requestAnimationFrame(loop);
        }
    };

    window.addEventListener("ccg-perf-pause", (event) => {
        setPaused(Boolean(event?.detail?.paused));
    }, { passive: true });

    frameId = requestAnimationFrame(loop);
}

/* ============================================================
   HOME ENERGY — TAGLINE + BRAND PULSE
============================================================ */

function initHomeEnergy() {
    if (document.documentElement.classList.contains("ccg-home-no-haze")) {
        // HOME haze fix: prevent post-load ignition classes from reintroducing background haze.
        return;
    }
    const tagline = document.querySelector('.home-tagline');
    const brand = document.querySelector('.ccg-brand');

    if (!tagline && !brand) return;
    if (PREFERS_REDUCED_MOTION?.matches) return;

    setInterval(() => {
        tagline?.classList.toggle('is-ignited');
        brand?.classList.toggle('is-ignited');
    }, 2800);
}

function calmHeroCards() {
    const cards = document.querySelectorAll('.home-hero-card, .home-highlight-card, .home-spotlight-card, .home-link-tile, .home-video-card');
    if (!cards.length) return;

    cards.forEach(card => {
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '50%');
        card.style.setProperty('--glow-alpha', '0.30');
    });
}
