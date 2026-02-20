const IS_ADMIN_PATH = window.location.pathname.startsWith('/admin/');
if (IS_ADMIN_PATH) {
    console.info('[CCG-AUTH] Public auth guard disabled on admin path');
}

/* ==========================================================
   CCG GLOBAL SCRIPT — CORE UI (NAV + WOW)
   ----------------------------------------------------------
   • Depth-aware logo path fix
   • Priority navigation with responsive drawer + dropdown
   • No dependencies on page-specific JS

   MOBILE HARDENING (NO PADDING HACKS)
   • Clamp horizontal overflow (prevents right-side spill)
   • Header containment on mobile (reduces visual bleed)
   • Disable heavy effects on mobile (particles/glints/wow)
========================================================== */

(function () {
    "use strict";

    function isAdminContext() {
        const meta = document.querySelector('meta[name="ccg-context"]');
        return meta && meta.getAttribute("content") === "admin";
    }

    function isQuizContext() {
        const meta = document.querySelector('meta[name="ccg-context"]');
        return meta && meta.getAttribute("content") === "quiz";
    }

    function CCG_isTypingTarget(e) {
        const el = e.target;
        if (!el) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName?.toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select";
    }

    if (isAdminContext()) {
        console.log("[CCG] Admin context detected — keyboard suppression disabled in this module.");
        return;
    }

    /* ======================================================
       ENV / MOBILE DETECTION
    ====================================================== */
    const MQ_MOBILE = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 820px)")
        : null;
    const MQ_MOBILE_VIEWPORT = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 768px)")
        : null;
    const MQ_COARSE = typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: coarse)")
        : null;
    const MQ_REDUCED = typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    function isMobileViewport() {
        if (MQ_MOBILE_VIEWPORT) return MQ_MOBILE_VIEWPORT.matches;
        return window.innerWidth <= 768;
    }

    window.isMobileViewport = isMobileViewport;
    window.ccgIsMobileLike = isMobileLike;

    function isMobileLike() {
        return Boolean(isMobileViewport() || (MQ_MOBILE && MQ_MOBILE.matches) || (MQ_COARSE && MQ_COARSE.matches));
    }

    function safeNowMobileClass() {
        const mobile = isMobileLike();
        document.documentElement.classList.toggle("ccg-is-mobile", mobile);
        document.documentElement.classList.toggle("ccg-lite-mobile", mobile);
        if (document.body && document.body.classList) {
            document.body.classList.toggle("ccg-is-mobile", mobile);
            document.body.classList.toggle("ccg-lite-mobile", mobile);
        }
    }

    safeNowMobileClass();

    /* ======================================================
       BUTTON CLASS NORMALISATION
    ====================================================== */
    function applyGlobalButtonClasses() {
        const selectors = [
            ".ccg-nav-toggle",
            ".ccg-nav__more-toggle",
            ".ccg-mode-toggle",
            ".ccg-nav-drawer__close",
            ".admin-step-btn",
            ".admin-help-toggle",
            ".admin-btn",
            ".games-accordion__header",
            ".home-video-card__play",
            ".ccg-egg-overlay__exit",
            ".ccg-secret-btn",
            "#intro-overlay-btn",
            ".skip-top",
            ".intro-skip"
        ];
        const variantClasses = ["ccg-btn--primary", "ccg-btn--secondary", "ccg-btn--ghost"];

        document.querySelectorAll(selectors.join(",")).forEach((btn) => {
            if (!btn.classList.contains("ccg-btn")) {
                btn.classList.add("ccg-btn");
            }
            const hasVariant = variantClasses.some((variant) => btn.classList.contains(variant));
            if (!hasVariant) {
                btn.classList.add("ccg-btn--ghost");
            }
        });
    }

    /* ======================================================
       DEPTH-AWARE LOGO PATH
    ====================================================== */
    function getLogoPath() {
        let path = window.location.pathname || "";

        const repoMarker = "/ccgamer_website_new/";
        const repoIndex = path.indexOf(repoMarker);
        if (repoIndex !== -1) {
            path = path.substring(repoIndex + repoMarker.length);
        }

        if (path.startsWith("/")) path = path.slice(1);
        if (!path) return "resources/images/ccgamer-logo.png";

        const depth = path.split("/").length - 1;
        return "../".repeat(depth) + "resources/images/ccgamer-logo.png";
    }

    function normalisePath(path) {
        const url = new URL(path, window.location.href);
        let pathname = url.pathname.replace("/ccgamer_website_new", "");
        if (pathname.endsWith("/")) pathname += "index.html";
        return pathname;
    }

    /* ======================================================
       GAME URL HELPERS
    ====================================================== */
    function getSiteRoot() {
        const path = window.location.pathname || "/";
        const repoMarker = "/ccgamer_website_new/";
        if (path.includes(repoMarker)) return repoMarker;
        return "/";
    }

    const CCG_GAME_SLUGS = new Map();

    function ccgRegisterGameSlugs(games) {
        if (!Array.isArray(games)) return;

        games.forEach(game => {
            const id = String(game?.id ?? "").trim();
            const slug = String(game?.slug ?? "").trim();
            if (id && slug) {
                CCG_GAME_SLUGS.set(id, slug);
            }
        });
    }

    function ccgGameSlugFromId(gameId) {
        if (!gameId) return "";
        const key = String(gameId).trim();
        return CCG_GAME_SLUGS.get(key) || "";
    }

    function ccgBuildGameUrl(gameId, fallbackSlug = "") {
        const slug = ccgGameSlugFromId(gameId) || String(fallbackSlug || "").trim();
        if (!slug) return "";
        return `${getSiteRoot()}games/${slug}/`;
    }

    function markActiveLinks(header) {
        const current = normalisePath(window.location.href);

        const setActiveState = (link, isActive) => {
            link.classList.toggle("ccg-nav__link--active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        };

        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            const target = normalisePath(link.getAttribute("href") || "");
            const isActive = current.endsWith(target) || current === target;

            setActiveState(link, isActive);

            if (isActive) {
                const href = link.getAttribute("href");
                if (!href) return;

                header.querySelectorAll(`.ccg-nav__link[href='${href}']`).forEach(matchedLink => {
                    setActiveState(matchedLink, true);
                });
            }
        });
    }

    function normalizeHeaderNavLinks() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const rootPrefix = (() => {
            const root = getSiteRoot();
            return root.endsWith("/") ? root : `${root}/`;
        })();

        const normalizeTarget = (href) => {
            let cleaned = href.replace(/^(\.\/|(\.\.\/)+)/, "");
            cleaned = cleaned.replace(/^\/+/, "");
            const trimmed = cleaned.replace(/\/+$/, "");

            if (trimmed === "about") return "about.html";
            if (trimmed === "contact") return "contact.html";
            if (trimmed === "games/genres") return "games/genres/index.html";

            return cleaned || trimmed;
        };

        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            const href = link.getAttribute("href") || "";
            if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
                return;
            }

            const cleaned = normalizeTarget(href);
            if (!cleaned) return;
            link.setAttribute("href", `${rootPrefix}${cleaned}`);
        });
    }

    window.ccgGetSiteRoot = getSiteRoot;
    window.ccgRegisterGameSlugs = ccgRegisterGameSlugs;
    window.ccgGameSlugFromId = ccgGameSlugFromId;
    window.ccgBuildGameUrl = ccgBuildGameUrl;

    /* ======================================================
       SCROLL FAILSAFE (DESKTOP-FIRST)
       ------------------------------------------------------
       • Guarantees wheel scrolling even when layers block
       • Does not override native scrolling unless blocked
    ====================================================== */
    function setupScrollFailsafe() {
        const root = document.documentElement;
        if (root?.matches?.('[data-ccg-page="intro"]')) return;
        const shouldEnableFailsafe = () => !isMobileLike();
        if (!shouldEnableFailsafe()) return;
        const getScrollTop = () => window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const getMaxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const canScroll = () => document.documentElement.scrollHeight - window.innerHeight > 1;

        let ticking = false;

        const isRelatedCarouselEvent = (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return false;
            return !!target.closest([
                ".game-section--related",
                ".related-carousel",
                ".related-carousel__viewport",
                ".related-carousel__track",
                ".ccg-related",
                ".ccg-related-track",
                ".ccg-related-carousel"
            ].join(","));
        };

        const normalizeDelta = (event) => {
            let deltaY = event.deltaY || 0;
            if (event.deltaMode === 1) {
                deltaY *= 16;
            } else if (event.deltaMode === 2) {
                deltaY *= window.innerHeight;
            }
            return deltaY;
        };

        const handleWheel = (event) => {
            if (event.defaultPrevented || event.ctrlKey) return;
            if (!shouldEnableFailsafe()) return;
            if (isRelatedCarouselEvent(event)) return;
            if (!canScroll()) return;

            const deltaY = normalizeDelta(event);
            if (!deltaY) return;

            const startTop = getScrollTop();
            const maxScroll = getMaxScroll();
            const isMouseWheel = !isMobileLike() && (event.deltaMode === 1 || event.deltaMode === 2 || Math.abs(deltaY) >= 80);
            const dampenedDelta = isMouseWheel ? deltaY * 0.85 : deltaY;
            const targetTop = Math.min(Math.max(startTop + dampenedDelta, 0), maxScroll);

            if (targetTop === startTop || ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const currentTop = getScrollTop();
                if (currentTop === startTop) {
                    window.scrollTo({ top: targetTop, behavior: "auto" });
                } else if (isMouseWheel && Math.abs(currentTop - targetTop) > 2) {
                    window.scrollTo({ top: targetTop, behavior: "auto" });
                }
                ticking = false;
            });
        };

        window.addEventListener("wheel", handleWheel, { passive: true, capture: true });
    }

    /* ======================================================
       SCROLL PERFORMANCE PAUSE (DESKTOP-FIRST)
       ------------------------------------------------------
       • Temporarily pauses decorative animations during scroll
       • Passive listeners only (no preventDefault)
    ====================================================== */
    function setupScrollPerfPause() {
        const root = document.documentElement;
        const PAUSE_CLASS = "ccg-perf-paused";
        const resumeDelay = 160;
        let resumeTimer = null;

        const setPaused = (paused) => {
            if (paused) {
                root.classList.add(PAUSE_CLASS);
            } else {
                root.classList.remove(PAUSE_CLASS);
            }
            window.dispatchEvent(new CustomEvent("ccg-perf-pause", { detail: { paused } }));
        };

        const onScroll = () => {
            if (!root.classList.contains(PAUSE_CLASS)) {
                setPaused(true);
            }
            if (resumeTimer) {
                window.clearTimeout(resumeTimer);
            }
            resumeTimer = window.setTimeout(() => {
                setPaused(false);
            }, resumeDelay);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("touchmove", onScroll, { passive: true });
    }
    /* ======================================================
       CCG RATING UTILITIES (EDITORIAL LOCK)
    ====================================================== */
    const CCG_RATING_MIN = 1;
    const CCG_RATING_MAX = 10;
    const CCG_STAR_PATH = "M12 2.2l3.09 6.26 6.9 1-4.99 4.86 1.18 6.88L12 17.96 5.82 21.2l1.18-6.88-4.99-4.86 6.9-1z";

    function ccgEscapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function ccgResolveRatingValue(game) {
        const raw = game?.ccg_rating;
        if (raw === undefined || raw === null || raw === "") {
            return {
                value: null,
                isRated: false
            };
        }

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
            return {
                value: null,
                isRated: false
            };
        }

        const rounded = Math.round(parsed);
        const clamped = Math.min(Math.max(rounded, CCG_RATING_MIN), CCG_RATING_MAX);

        return {
            value: clamped,
            isRated: true
        };
    }

    function ccgBuildStarSvg(type) {
        if (type === "empty") {
            return `
                <svg class="ccg-rating__star ccg-rating__star--empty" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path class="ccg-rating__star-shape ccg-rating__star-shape--empty" d="${CCG_STAR_PATH}"></path>
                </svg>
            `;
        }

        return `
            <svg class="ccg-rating__star ccg-rating__star--full" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path class="ccg-rating__star-shape ccg-rating__star-shape--full" d="${CCG_STAR_PATH}"></path>
            </svg>
        `;
    }

    function ccgBuildRatingStars(ratingData) {
        const isRated = ratingData?.isRated;
        if (!isRated) {
            return Array.from({ length: 5 }, () => ccgBuildStarSvg("empty")).join("");
        }

        const ratingValue = ratingData.value || 0;
        const fullCount = Math.ceil(ratingValue / 2);
        const emptyCount = Math.max(0, 5 - fullCount);

        return [
            ...Array.from({ length: fullCount }, () => ccgBuildStarSvg("full")),
            ...Array.from({ length: emptyCount }, () => ccgBuildStarSvg("empty"))
        ].join("");
    }

    function ccgBuildRatingMarkup(game, opts = {}) {
        const ratingData = ccgResolveRatingValue(game);
        const label = opts.label || "CCG Rating";
        const reason = opts.showReason ? String(game?.ccg_rating_reason || "").trim() : "";
        const showStatus = opts.showStatus ?? true;
        const ariaLabel = ratingData.isRated
            ? `${label}: ${ratingData.value}/10`
            : `${label}: Not Yet Rated`;
        const labelMarkup = label ? `<span class="ccg-rating__label">${ccgEscapeHtml(label)}</span>` : "";
        const reasonMarkup = reason ? `<span class="ccg-rating__reason">${ccgEscapeHtml(reason)}</span>` : "";
        const statusMarkup = showStatus && !ratingData.isRated
            ? `<span class="ccg-rating__status">Not Yet Rated</span>`
            : "";

        return `
            <div class="ccg-rating ${opts.className || ""}" data-ccg-rating-state="${ratingData.isRated ? "rated" : "unrated"}" aria-label="${ccgEscapeHtml(ariaLabel)}">
                ${labelMarkup}
                <span class="ccg-rating__stars" aria-hidden="true">
                    ${ccgBuildRatingStars(ratingData)}
                </span>
                ${statusMarkup}
                ${reasonMarkup}
            </div>
        `;
    }

    window.ccgEscapeHtml = ccgEscapeHtml;
    window.ccgResolveRatingValue = ccgResolveRatingValue;
    window.ccgBuildRatingStars = ccgBuildRatingStars;
    window.ccgBuildRatingMarkup = ccgBuildRatingMarkup;

    /* ======================================================
       MOBILE HARDENING — NO PADDING HACKS
    ====================================================== */
    function clampHorizontalOverflow() {
        // Hard clamp overflow without altering layout alignment
        const de = document.documentElement;
        const body = document.body;

        if (!de || !body) return;

        de.style.overflowX = "hidden";
        de.style.maxWidth = "100%";
        body.style.overflowX = "hidden";
        body.style.maxWidth = "100%";

        // Prevent accidental transform-induced side scrolling on mobile
        body.style.position = body.style.position || "relative";
    }

    function containHeaderOnMobile() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        // Visual containment only
        if (isMobileLike()) {
            header.style.isolation = "isolate";
            header.style.overflowX = "hidden";
            header.style.overflowY = "visible";
        } else {
            header.style.isolation = "";
            header.style.overflowX = "";
            header.style.overflowY = "";
        }
    }

    function setHeaderHeightVar() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const rect = header.getBoundingClientRect();
        const h = Math.max(0, Math.round(rect.height));
        document.documentElement.style.setProperty("--ccg-header-height", `${h}px`);
    }

    function syncMobileHardening() {
        safeNowMobileClass();
        clampHorizontalOverflow();
        containHeaderOnMobile();
        setHeaderHeightVar();
        resetBodyLockIfStuck();
    }

    function resetBodyLockIfStuck() {
        const header = document.querySelector("[data-ccg-header]");
        const navOpen = header?.classList.contains("ccg-header--nav-open");
        if (!navOpen) {
            document.body?.classList.remove("ccg-body--nav-open", "ccg-body--locked");
        }
    }

    /* ======================================================
       EASTER EGGS — SECRET COMMAND CONSOLE
    ====================================================== */
    const secretState = {
        modal: null,
        audioCtx: null,
        inputBuffer: "",
        konamiIndex: 0,
        activeEgg: null,
        openedAt: 0,
        ignoreBackdropMs: 420,
    };

    const konamiSequence = [
        "ArrowUp",
        "ArrowUp",
        "ArrowDown",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ArrowLeft",
        "ArrowRight",
        "b",
        "a",
    ];

    function ensureAudioContext() {
        if (!secretState.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                secretState.audioCtx = new AudioContext();
            }
        }
        return secretState.audioCtx;
    }

    function playTone(frequency, type = "sine", duration = 0.2, gainValue = 0.2) {
        const ctx = ensureAudioContext();
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.value = gainValue;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    }

    function createOverlay(className, html) {
        const overlay = document.createElement("div");
        overlay.className = className;
        if (html) overlay.innerHTML = html;
        document.body.appendChild(overlay);
        return overlay;
    }

    function getEasterEggAsset(filename) {
        const root = getSiteRoot();
        const prefix = root.endsWith("/") ? root : `${root}/`;
        return `${prefix}resources/audio/easter-eggs/${encodeURI(filename)}`;
    }

    function stopMediaElement(media) {
        if (!media) return;
        if (media.pause) {
            media.pause();
            media.currentTime = 0;
        }
        if (media.removeAttribute) {
            media.removeAttribute("src");
        }
        if (media.load) {
            media.load();
        }
        if (media.remove) {
            media.remove();
        }
    }

    function stopActiveEasterEgg() {
        if (!secretState.activeEgg) return;

        const { overlay, media, escHandler, closeHandler, exitButton, cleanup, autoCloseTimer } = secretState.activeEgg;

        if (escHandler) {
            document.removeEventListener("keydown", escHandler);
        }

        if (exitButton && closeHandler) {
            exitButton.removeEventListener("click", closeHandler);
        }

        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
        }

        if (Array.isArray(media)) {
            media.forEach(stopMediaElement);
        }

        if (typeof cleanup === "function") {
            cleanup();
        }

        if (overlay) {
            overlay.remove();
        }

        document.body.classList.remove("ccg-egg-open");
        secretState.activeEgg = null;
    }

    function openEasterEggOverlay(content, options = {}) {
        stopActiveEasterEgg();

        const overlay = createOverlay("ccg-egg-overlay");
        overlay.classList.add("ccg-egg-overlay--letterbox");
        if (options.className) {
            options.className.split(" ").forEach(className => {
                if (className) overlay.classList.add(className);
            });
        }

        overlay.innerHTML = `
            <div class="ccg-egg-overlay__frame">
                <button class="ccg-btn ccg-btn--ghost ccg-egg-overlay__exit" type="button">Exit to CCGAMER Website</button>
                <div class="ccg-egg-overlay__media"></div>
            </div>
        `;

        const mediaContainer = overlay.querySelector(".ccg-egg-overlay__media");
        if (content) {
            mediaContainer.appendChild(content);
        }

        const exitButton = overlay.querySelector(".ccg-egg-overlay__exit");
        const closeHandler = () => stopActiveEasterEgg();
        exitButton.addEventListener("click", closeHandler);

        const escHandler = event => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (CCG_isTypingTarget(event)) return;
            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {
                return;
            }
            if (event.key === "Escape") {
                stopActiveEasterEgg();
            }
        };
        document.addEventListener("keydown", escHandler);

        document.body.classList.add("ccg-egg-open");

        secretState.activeEgg = {
            overlay,
            media: options.media || [],
            escHandler,
            closeHandler,
            exitButton,
            cleanup: options.cleanup || null,
            autoCloseTimer: options.autoCloseTimer || null,
        };

        return overlay;
    }

    function createVideoElement(src, { muted = false, loop = false, autoplay = true } = {}) {
        const video = document.createElement("video");
        video.className = "ccg-egg-overlay__video";
        video.src = src;
        video.autoplay = autoplay;
        video.controls = true;
        video.playsInline = true;
        video.muted = muted;
        video.loop = loop;
        return video;
    }

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function createAudioElement(src) {
        const audio = document.createElement("audio");
        audio.className = "ccg-egg-overlay__audio-media";
        audio.src = src;
        audio.autoplay = true;
        audio.preload = "auto";
        return audio;
    }

    function createScreenFrame(src, className) {
        const frame = document.createElement("iframe");
        frame.className = className || "ccg-egg-overlay__iframe";
        frame.src = src;
        frame.title = "CCG Easter Egg";
        frame.allowFullscreen = true;
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        return frame;
    }

    function triggerC64Reset() {
        const reset = createOverlay("ccg-c64-reset", `
            <div class="ccg-c64-reset__screen">
                <p>**** COMMODORE 64 BASIC V2 ****</p>
                <p>64K RAM SYSTEM  38911 BASIC BYTES FREE</p>
                <p class="ccg-c64-reset__ready">READY<span class="ccg-c64-reset__cursor"></span></p>
            </div>
        `);
        setTimeout(() => reset.classList.add("is-active"), 30);
        setTimeout(() => reset.remove(), 3200);
    }

    function triggerPressPlay() {
        const video = createVideoElement(getEasterEggAsset("press-play.mp4"));
        openEasterEggOverlay(video, { media: [video] });
    }

    function triggerBSOD() {
        const bsod = createOverlay("ccg-bsod", `
            <p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36.</p>
            <p>Press any key to continue...</p>
        `);
        const remove = (event) => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (CCG_isTypingTarget(event)) return;
            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {
                return;
            }
            bsod.remove();
        };
        bsod.addEventListener("click", remove);
        document.addEventListener("keydown", remove, { once: true });
    }

    function triggerWarp() {
        document.body.classList.add("ccg-warp");
        setTimeout(() => document.body.classList.remove("ccg-warp"), 5200);
    }

    function triggerPacman() {
        const pacmanScreen = document.createElement("div");
        pacmanScreen.className = "ccg-egg-overlay__screen";
        const frame = createScreenFrame(getEasterEggAsset("pacman.html"));
        pacmanScreen.appendChild(frame);
        openEasterEggOverlay(pacmanScreen, { media: [frame], className: "ccg-egg-overlay--square" });
    }

    function triggerBoing() {
        const shouldReduceMotion = prefersReducedMotion();
        const video = createVideoElement(getEasterEggAsset("boing.mp4"), { autoplay: !shouldReduceMotion });
        openEasterEggOverlay(video, { media: [video] });
    }

    function triggerLemmings() {
        const video = createVideoElement(getEasterEggAsset("lemmings.mp4"));
        openEasterEggOverlay(video, { media: [video] });
    }

    function triggerZX() {
        const screen = document.createElement("div");
        screen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--zx";

        const frame = createScreenFrame("https://jsspeccy.zxdemo.org/", "ccg-egg-overlay__iframe");
        screen.appendChild(frame);

        const interrupt = document.createElement("div");
        interrupt.className = "ccg-egg-overlay__interrupt";
        interrupt.innerHTML = `
            <img src="${getEasterEggAsset("zx-clive.jpg")}" alt="ZX Spectrum interruption screen" />
        `;
        screen.appendChild(interrupt);

        const audio = createAudioElement(getEasterEggAsset("no_i_dont_think_sp.mp3"));
        audio.autoplay = false;
        screen.appendChild(audio);

        const interruptTimers = {
            start: null,
            end: null,
        };

        const startInterrupt = () => {
            screen.classList.add("is-interrupt");
            audio.currentTime = 0;
            audio.play().catch(() => {});
            interruptTimers.end = setTimeout(() => {
                stopActiveEasterEgg();
            }, 5000);
        };

        interruptTimers.start = setTimeout(startInterrupt, 10000);

        openEasterEggOverlay(screen, {
            media: [frame, audio],
            className: "ccg-egg-overlay--square",
            cleanup: () => {
                if (interruptTimers.start) clearTimeout(interruptTimers.start);
                if (interruptTimers.end) clearTimeout(interruptTimers.end);
            },
        });
    }

    function triggerMatrix() {
        const mediaWrap = document.createElement("div");
        mediaWrap.className = "ccg-egg-overlay__stack";
        const video = createVideoElement(getEasterEggAsset("matrix.mp4"), { muted: true, loop: true });
        const audio = createAudioElement(getEasterEggAsset("matrix_pills.mp3"));
        mediaWrap.appendChild(video);
        mediaWrap.appendChild(audio);
        openEasterEggOverlay(mediaWrap, { media: [video, audio] });
    }

    function triggerInvaders() {
        const invadersScreen = document.createElement("div");
        invadersScreen.className = "ccg-egg-overlay__screen";
        const frame = createScreenFrame("https://dwmkerr.github.io/spaceinvaders/");
        invadersScreen.appendChild(frame);
        openEasterEggOverlay(invadersScreen, { media: [frame], className: "ccg-egg-overlay--square" });
    }

    function triggerKonami() {
        const video = createVideoElement(getEasterEggAsset("konami-code.mp4"));
        openEasterEggOverlay(video, { media: [video], className: "ccg-egg-overlay--vertical" });
    }

    const cheats = {
        "sys64738": () => {
            const screen = document.createElement("div");
            screen.className = "ccg-egg-overlay__screen";
            const frame = createScreenFrame("https://c64.krissz.hu/online-playable-games/");
            screen.appendChild(frame);
            openEasterEggOverlay(screen, { media: [frame], className: "ccg-egg-overlay--square" });
        },
        "pressplay": () => triggerPressPlay(),
        "vhs": () => {
            const video = createVideoElement(getEasterEggAsset("vhs.mp4"));
            openEasterEggOverlay(video, { media: [video] });
        },
        "terminator": () => {
            const audioWrap = document.createElement("div");
            audioWrap.className = "ccg-egg-overlay__audio";
            audioWrap.innerHTML = "<span>Terminator theme engaged.</span>";
            const audio = createAudioElement(getEasterEggAsset("terminator.mp3"));
            audioWrap.appendChild(audio);
            let overlay = null;
            const stopEffect = () => {
                if (overlay) overlay.classList.remove("ccg-egg-overlay--terminator");
            };
            audio.addEventListener("ended", stopEffect);
            overlay = openEasterEggOverlay(audioWrap, {
                media: [audio],
                className: "ccg-egg-overlay--terminator",
                cleanup: () => {
                    audio.removeEventListener("ended", stopEffect);
                },
            });
        },
        "bsod": () => triggerBSOD(),
        "mario": () => {
            const audioWrap = document.createElement("div");
            audioWrap.className = "ccg-egg-overlay__audio";
            audioWrap.innerHTML = "<span>Mario remix incoming.</span>";
            const audio = createAudioElement(getEasterEggAsset("mario.mp3"));
            audioWrap.appendChild(audio);
            let overlay = null;
            const stopEffect = () => {
                if (overlay) overlay.classList.remove("ccg-egg-overlay--mario");
            };
            audio.addEventListener("ended", stopEffect);
            overlay = openEasterEggOverlay(audioWrap, {
                media: [audio],
                className: "ccg-egg-overlay--mario",
                cleanup: () => {
                    audio.removeEventListener("ended", stopEffect);
                },
            });
        },
        "nokia": () => {
            const audioWrap = document.createElement("div");
            audioWrap.className = "ccg-egg-overlay__audio ccg-egg-overlay__audio--nokia";
            audioWrap.innerHTML = `
                <div class="ccg-egg-overlay__nokia-screen">
                    <img src="${getEasterEggAsset("nokia-image.jpg")}" alt="Nokia boot screen" />
                </div>
                <span class="ccg-egg-overlay__label">Nokia tone loading.</span>
            `;
            const audio = createAudioElement(getEasterEggAsset("nokia.mp3"));
            audioWrap.appendChild(audio);
            let overlay = null;
            const stopEffect = () => {
                if (overlay) overlay.classList.remove("ccg-egg-overlay--nokia");
            };
            audio.addEventListener("ended", stopEffect);
            overlay = openEasterEggOverlay(audioWrap, {
                media: [audio],
                className: "ccg-egg-overlay--nokia",
                cleanup: () => {
                    audio.removeEventListener("ended", stopEffect);
                },
            });
        },
        "sonic": () => {
            const audioWrap = document.createElement("div");
            audioWrap.className = "ccg-egg-overlay__audio";
            audioWrap.innerHTML = "<span>Sonic ring sound effect.</span>";
            const audio = createAudioElement(getEasterEggAsset("Sonic Ring Sound Effect.mp3"));
            audioWrap.appendChild(audio);
            let overlay = null;
            let pendingRing = false;
            const triggerRing = () => {
                if (!overlay) {
                    pendingRing = true;
                    return;
                }
                overlay.classList.remove("ccg-egg-overlay--sonic-ring");
                void overlay.offsetWidth;
                overlay.classList.add("ccg-egg-overlay--sonic-ring");
            };
            const stopEffect = () => {
                if (overlay) {
                    overlay.classList.remove("ccg-egg-overlay--sonic");
                    overlay.classList.remove("ccg-egg-overlay--sonic-ring");
                }
            };
            const handlePlay = () => {
                triggerRing();
            };
            audio.addEventListener("ended", stopEffect);
            audio.addEventListener("play", handlePlay);
            overlay = openEasterEggOverlay(audioWrap, {
                media: [audio],
                className: "ccg-egg-overlay--sonic",
                cleanup: () => {
                    audio.removeEventListener("ended", stopEffect);
                    audio.removeEventListener("play", handlePlay);
                },
            });
            if (pendingRing) {
                triggerRing();
                pendingRing = false;
            }
        },
        "warp": () => triggerWarp(),
        "party": () => {
            document.body.classList.remove("ccg-party");
            const shouldReduceMotion = prefersReducedMotion();
            const video = createVideoElement(getEasterEggAsset("party.mp4"), {
                autoplay: !shouldReduceMotion,
                loop: true,
            });
            openEasterEggOverlay(video, { media: [video], className: "ccg-egg-overlay--party" });
        },
        "zxspectrum": () => triggerZX(),
        "pacman": () => triggerPacman(),
        "boing": () => triggerBoing(),
        "matrix": () => triggerMatrix(),
        "invaders": () => triggerInvaders(),
        "heman": () => {
            const video = createVideoElement(getEasterEggAsset("heman.mp4"));
            openEasterEggOverlay(video, { media: [video] });
        },
        "lemmings": () => triggerLemmings(),
        "cheeky": () => {
            const audioWrap = document.createElement("div");
            audioWrap.className = "ccg-egg-overlay__audio";
            audioWrap.innerHTML = "<span>Cheeky mode engaged.</span>";
            const audio = createAudioElement(getEasterEggAsset("gay.mp3"));
            audioWrap.appendChild(audio);
            let overlay = null;
            const handleEnded = () => {
                if (!overlay || !secretState.activeEgg || secretState.activeEgg.overlay !== overlay) return;
                stopActiveEasterEgg();
                window.location.replace("https://gaydar.net/");
            };
            audio.addEventListener("ended", handleEnded);
            overlay = openEasterEggOverlay(audioWrap, {
                media: [audio],
                cleanup: () => {
                    audio.removeEventListener("ended", handleEnded);
                },
            });
        },
        "konamicode": () => triggerKonami(),
    };

    function normalizeCode(code) {
        return code.toLowerCase().replace(/\s+/g, "");
    }

    function triggerCheat(code) {
        const normalized = normalizeCode(code);
        if (cheats[normalized]) {
            closeSecretModal();
            stopActiveEasterEgg();
            cheats[normalized]();
        }
    }

    function setupSecretTyping() {
        const cheatKeys = Object.keys(cheats);
        const maxBuffer = Math.max(...cheatKeys.map(key => key.length)) + 6;

        document.addEventListener("keydown", event => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (CCG_isTypingTarget(event)) return;
            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {
                return;
            }
            if (event.defaultPrevented) return;

            if (event.key === "Escape") {
                if (secretState.activeEgg) {
                    stopActiveEasterEgg();
                }
                return;
            }

            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === konamiSequence[secretState.konamiIndex]) {
                secretState.konamiIndex += 1;
                if (secretState.konamiIndex >= konamiSequence.length) {
                    secretState.konamiIndex = 0;
                    triggerCheat("konamicode");
                }
                return;
            }

            secretState.konamiIndex = 0;

            const keyValue = typeof event.key === "string" ? event.key : "";
            if (keyValue.length !== 1) return;

            secretState.inputBuffer += keyValue;
            if (secretState.inputBuffer.length > maxBuffer) {
                secretState.inputBuffer = secretState.inputBuffer.slice(-maxBuffer);
            }

            const normalizedBuffer = normalizeCode(secretState.inputBuffer);
            const matched = cheatKeys.find(key => normalizedBuffer.endsWith(key));
            if (matched) {
                triggerCheat(matched);
                resetSecretInputState();
            }
        });
    }

    function buildSecretModal() {
        if (secretState.modal) return secretState.modal;

        const modal = document.createElement("div");
        modal.className = "ccg-secret-modal";
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="ccg-secret-modal__content" role="dialog" aria-label="Secret system commands">
                <div class="ccg-secret-modal__actions">
                    <button class="ccg-btn ccg-btn--ghost ccg-secret-btn" type="button" data-ccg-secret-close>CLOSE EASTER EGGS</button>
                </div>
                <h2>SYSTEM COMMANDS</h2>
                <p class="ccg-secret-modal__hint">Tap to activate, or type a code.</p>
                <ul class="ccg-secret-list">
                    <li data-ccg-secret-code="sys64738">SYS64738</li>
                    <li data-ccg-secret-code="pressplay">PRESS PLAY</li>
                    <li data-ccg-secret-code="vhs">VHS</li>
                    <li data-ccg-secret-code="terminator">TERMINATOR</li>
                    <li data-ccg-secret-code="bsod">BSOD</li>
                    <li data-ccg-secret-code="mario">MARIO</li>
                    <li data-ccg-secret-code="nokia">NOKIA</li>
                    <li data-ccg-secret-code="sonic">SONIC</li>
                    <li data-ccg-secret-code="warp">WARP</li>
                    <li data-ccg-secret-code="party">PARTY</li>
                    <li data-ccg-secret-code="zxspectrum">ZXSPECTRUM</li>
                    <li data-ccg-secret-code="pacman">PACMAN</li>
                    <li data-ccg-secret-code="boing">BOING</li>
                    <li data-ccg-secret-code="matrix">MATRIX</li>
                    <li data-ccg-secret-code="invaders">INVADERS</li>
                    <li data-ccg-secret-code="heman">HEMAN</li>
                    <li data-ccg-secret-code="lemmings">LEMMINGS</li>
                    <li data-ccg-secret-code="cheeky">CHEEKY</li>
                    <li data-ccg-secret-code="konamicode">KONAMI CODE</li>
                </ul>
            </div>
        `;

        document.body.appendChild(modal);
        secretState.modal = modal;
        modal.addEventListener("click", event => {
            if (event.target !== modal) return;
            const now = Date.now();
            if (secretState.openedAt && (now - secretState.openedAt) < (secretState.ignoreBackdropMs || 420)) {
                return;
            }
            closeSecretModal();
        });

        modal.querySelectorAll("[data-ccg-secret-code]").forEach(item => {
            item.addEventListener("click", () => {
                triggerCheat(item.dataset.ccgSecretCode || "");
            });
        });

        modal.querySelector("[data-ccg-secret-close]").addEventListener("click", closeSecretModal);

        return modal;
    }

    function openSecretModal() {
        const modal = buildSecretModal();
        if (modal.classList.contains("is-open")) return;
        secretState.openedAt = Date.now();
        requestAnimationFrame(() => {
            if (!modal) return;
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.classList.add("ccg-secret-modal-open");
        });
    }

    function closeSecretModal() {
        if (!secretState.modal) return;
        secretState.modal.classList.remove("is-open");
        secretState.modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("ccg-secret-modal-open");
        resetSecretInputState();
    }

    function resetSecretInputState() {
        secretState.inputBuffer = "";
        secretState.konamiIndex = 0;
    }

    /* ======================================================
       LOGO EASTER EGG (TRIPLE CLICK)
    ====================================================== */
    const logoClickState = {
        count: 0,
        resetTimer: null,
        bubbleTimer: null,
        lastBubble: null,
    };

    function resetLogoClickState() {
        logoClickState.count = 0;
        if (logoClickState.resetTimer) {
            clearTimeout(logoClickState.resetTimer);
            logoClickState.resetTimer = null;
        }
        if (logoClickState.bubbleTimer) {
            clearTimeout(logoClickState.bubbleTimer);
            logoClickState.bubbleTimer = null;
        }
        if (logoClickState.lastBubble) {
            logoClickState.lastBubble.classList.remove("is-visible", "ccg-logo-bubble--swap");
            logoClickState.lastBubble = null;
        }
    }

    function scheduleLogoReset() {
        if (logoClickState.resetTimer) {
            clearTimeout(logoClickState.resetTimer);
        }
        logoClickState.resetTimer = setTimeout(() => {
            logoClickState.count = 0;
            logoClickState.resetTimer = null;
        }, 850);
    }

    function flashLogo(logo, flashClass) {
        logo.classList.remove("ccg-logo-flash--neon", "ccg-logo-flash--red");
        void logo.offsetWidth;
        logo.classList.add(flashClass);
        setTimeout(() => logo.classList.remove(flashClass), 420);
    }

    function ensureLogoBubble() {
        let host = document.getElementById("ccg-toast-host");
        if (!host) {
            host = document.createElement("div");
            host.id = "ccg-toast-host";
            host.className = "ccg-toast-host";
            document.body.appendChild(host);
        }

        let bubble = host.querySelector(".ccg-logo-bubble");
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.className = "ccg-logo-bubble";
            bubble.setAttribute("role", "status");
            bubble.setAttribute("aria-live", "polite");
            bubble.innerHTML = "<span class=\"ccg-logo-bubble__text\"></span>";
            host.appendChild(bubble);
        }
        return bubble;
    }

    function showLogoBubble(message, { swapText = false } = {}) {
        const bubble = ensureLogoBubble();
        if (!bubble) return;

        const textEl = bubble.querySelector(".ccg-logo-bubble__text");
        if (!textEl) return;

        if (logoClickState.bubbleTimer) {
            clearTimeout(logoClickState.bubbleTimer);
            logoClickState.bubbleTimer = null;
        }

        if (swapText) {
            bubble.classList.add("ccg-logo-bubble--swap");
            setTimeout(() => {
                textEl.textContent = message;
            }, 140);
            setTimeout(() => {
                bubble.classList.remove("ccg-logo-bubble--swap");
            }, 320);
        } else {
            bubble.classList.remove("ccg-logo-bubble--swap");
            textEl.textContent = message;
        }

        bubble.classList.add("is-visible");
        logoClickState.lastBubble = bubble;
        logoClickState.bubbleTimer = setTimeout(() => {
            bubble.classList.remove("is-visible");
            logoClickState.bubbleTimer = null;
        }, 1800);
    }

    function setupLogoEasterEgg() {
        /* ==================================================
           EASTER EGG CLICK LOGIC (LOGO ONLY)
           --------------------------------------------------
           Bind directly to .ccg-brand so only logo clicks can
           increment the Easter Egg counter.
        ================================================== */
        const brandTargets = document.querySelectorAll(".ccg-brand");
        if (!brandTargets.length) return;

        brandTargets.forEach(brandTarget => {
            if (brandTarget.dataset.ccgLogoEasterEgg === "true") return;
            brandTarget.dataset.ccgLogoEasterEgg = "true";

            const logo = brandTarget.querySelector(".ccg-brand__logo");
            if (!logo) return;

            if (brandTarget.tagName === "A") {
                brandTarget.removeAttribute("href");
                brandTarget.removeAttribute("target");
                brandTarget.removeAttribute("rel");
                brandTarget.setAttribute("role", "button");
                brandTarget.setAttribute("tabindex", "0");
                if (!brandTarget.getAttribute("aria-label")) {
                    brandTarget.setAttribute("aria-label", "Cheeky Commodore Gamer logo");
                }
            }

            brandTarget.addEventListener("pointerdown", e => {
                if (!e?.target?.closest || !e.target.closest(".ccg-brand__logo")) return;
                if (!e || e.currentTarget !== brandTarget) return;
                if (!brandTarget.contains(e.target)) return;
                if (
                    e.target &&
                    e.target.closest &&
                    e.target.closest("input, textarea, [contenteditable]")
                ) {
                    return;
                }

                e.preventDefault();
                e.stopImmediatePropagation();

                logoClickState.count += 1;

                if (logoClickState.count === 1) {
                    flashLogo(logo, "ccg-logo-flash--neon");
                    showLogoBubble("Dont Click Me Again");
                    scheduleLogoReset();
                    return;
                }

                if (logoClickState.count === 2) {
                    flashLogo(logo, "ccg-logo-flash--red");
                    showLogoBubble("DEFINITELY Dont Click Me Again", { swapText: true });
                    scheduleLogoReset();
                    return;
                }

                if (logoClickState.count >= 3) {
                    if (logoClickState.lastBubble) {
                        logoClickState.lastBubble.classList.remove("is-visible", "ccg-logo-bubble--swap");
                    }
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            openSecretModal();
                        });
                    });
                    resetLogoClickState();
                }
            }, { capture: true });
        });
    }

    /* ======================================================
       NAV TOGGLE (MOBILE)
    ====================================================== */
    function setupNavToggle() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const toggle = header.querySelector("[data-ccg-nav-toggle]");
        const nav = header.querySelector(".ccg-nav");
        const drawer = header.querySelector("[data-ccg-nav-drawer]");
        const drawerPrimary = drawer?.querySelector("[data-ccg-drawer-primary]");
        const drawerSecondary = drawer?.querySelector("[data-ccg-drawer-secondary]");
        const drawerCloseEls = drawer?.querySelectorAll("[data-ccg-drawer-close]") || [];
        const mobileMatch = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 1199px)") : null;

        const primaryList = nav?.querySelector("[data-ccg-nav-primary]");
        const secondaryList = nav?.querySelector("[data-ccg-nav-secondary]");
        let moreWrap = nav?.querySelector(".ccg-nav__more");
        let moreToggle = moreWrap?.querySelector("[data-ccg-more-toggle]");
        let moreMenu = nav?.querySelector("[data-ccg-more-menu]");
        const drawerPanel = drawer?.querySelector(".ccg-nav-drawer__panel");

        if (!toggle || !nav || !primaryList || !moreWrap || !moreMenu) return;

        const isMobileViewport = () => mobileMatch ? mobileMatch.matches : window.innerWidth <= 1199;

        const cloneLink = (link, extraClasses = []) => {
            const clone = link.cloneNode(true);
            extraClasses.forEach(cls => clone.classList.add(cls));
            return clone;
        };

        const buildMoreMenu = () => {
            moreMenu.innerHTML = "";
            secondaryList?.querySelectorAll("a").forEach(link => {
                const clone = cloneLink(link, ["ccg-nav__link--overflow"]);
                clone.setAttribute("role", "menuitem");
                moreMenu.appendChild(clone);
            });
        };

        const buildDrawer = () => {
            if (!drawer) return;

            if (drawerPrimary) {
                drawerPrimary.innerHTML = "<div class=\"ccg-nav-drawer__label\">Primary</div>";
                primaryList?.querySelectorAll("a").forEach(link => {
                    drawerPrimary.appendChild(cloneLink(link, ["ccg-nav__link--mobile"]));
                });
            }

            if (drawerSecondary) {
                drawerSecondary.innerHTML = "<div class=\"ccg-nav-drawer__label\">Explore more</div>";
                secondaryList?.querySelectorAll("a").forEach(link => {
                    drawerSecondary.appendChild(cloneLink(link, ["ccg-nav__link--mobile"]));
                });
            }
        };

        let isMoreOpen = false;
        let isNavOpen = false;

        const refreshMoreRefs = (sourceEl = null) => {
            const nextWrap = sourceEl?.closest(".ccg-nav__more") || nav?.querySelector(".ccg-nav__more");
            if (nextWrap) {
                moreWrap = nextWrap;
                moreToggle = nextWrap.querySelector("[data-ccg-more-toggle]");
                moreMenu = nextWrap.querySelector("[data-ccg-more-menu]");
            } else {
                moreWrap = nav?.querySelector(".ccg-nav__more");
                moreToggle = moreWrap?.querySelector("[data-ccg-more-toggle]") || null;
                moreMenu = nav?.querySelector("[data-ccg-more-menu]") || null;
            }
        };

        buildMoreMenu();
        refreshMoreRefs();

        const openMore = () => {
            if (isMoreOpen || !moreMenu) return;
            isMoreOpen = true;
            nav.classList.add("ccg-nav--more-open");
            moreWrap.dataset.open = "true";
            moreToggle?.setAttribute("aria-expanded", "true");
            moreMenu.hidden = false;
            moreMenu.dataset.state = "open";
        };

        const closeMore = () => {
            if (!isMoreOpen || !moreMenu) return;
            isMoreOpen = false;
            nav.classList.remove("ccg-nav--more-open");
            delete moreWrap.dataset.open;
            moreToggle?.setAttribute("aria-expanded", "false");
            moreMenu.hidden = true;
            moreMenu.dataset.state = "closed";
        };

        const syncBodyLock = (locked) => {
            document.body?.classList.toggle("ccg-body--nav-open", locked);
            document.body?.classList.toggle("ccg-body--locked", locked);
        };

        const syncNavContainerVisibility = () => {
            if (!isMobileViewport()) {
                nav.style.removeProperty("display");
                return;
            }

            const shouldShowFallback = nav.classList.contains("ccg-nav--mobile-fallback");
            nav.style.display = shouldShowFallback ? "" : "none";
        };

        const closeNav = () => {
            isNavOpen = false;
            header.classList.remove("ccg-header--nav-open");
            nav.classList.remove("ccg-nav--open");
            drawer?.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "false");
            syncBodyLock(false);
        };

        const openNav = () => {
            isNavOpen = true;
            buildDrawer();
            header.classList.add("ccg-header--nav-open");
            nav.classList.add("ccg-nav--open");
            drawer?.setAttribute("aria-hidden", "false");
            toggle.setAttribute("aria-expanded", "true");
            syncBodyLock(true);
            setHeaderHeightVar();
        };

        const syncMobileNavState = () => {
            if (!isMobileViewport()) {
                closeNav();
                closeMore();
                syncNavContainerVisibility();
                return;
            }

            buildDrawer();

            const hasDrawerLinks = drawerPrimary?.querySelector(".ccg-nav__link") || drawerSecondary?.querySelector(".ccg-nav__link");
            nav.classList.toggle("ccg-nav--mobile-fallback", !hasDrawerLinks);
            syncNavContainerVisibility();
        };

        toggle.addEventListener("click", () => {
            if (isNavOpen) {
                closeNav();
            } else {
                openNav();
            }
        });

        if (!header.dataset.ccgMoreToggleBound) {
            header.addEventListener("click", event => {
                const toggleTarget = event.target.closest("[data-ccg-more-toggle]");
                if (!toggleTarget) return;
                event.stopPropagation();
                if (toggleTarget.tagName === "A") {
                    if (
                        event.target &&
                        event.target.closest &&
                        event.target.closest("input, textarea, [contenteditable]")
                    ) {
                        return;
                    }
                    event.preventDefault();
                }
                refreshMoreRefs(toggleTarget);
                if (!moreWrap || !moreMenu) return;
                if (isMoreOpen) {
                    closeMore();
                } else {
                    openMore();
                }
            });
            header.dataset.ccgMoreToggleBound = "true";
        }

        drawerCloseEls.forEach(btn => btn.addEventListener("click", closeNav));

        header.addEventListener("click", event => {
            const link = event.target.closest(".ccg-nav__link");
            if (!link) return;
            if (isMobileViewport()) closeNav();
            closeMore();
        });

        document.addEventListener("click", event => {
            if (moreWrap && !moreWrap.contains(event.target)) {
                closeMore();
            }

            if (!isMobileViewport()) return;

            if (isNavOpen && drawer && !drawer.contains(event.target) && !toggle.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", event => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (CCG_isTypingTarget(event)) return;
            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {
                return;
            }
            if (event.key === "Escape") {
                closeNav();
                closeMore();
            }
        });

        if (mobileMatch?.addEventListener) {
            mobileMatch.addEventListener("change", () => {
                closeNav();
                closeMore();
                syncMobileHardening();
                syncMobileNavState();
            });
        } else if (mobileMatch?.addListener) {
            mobileMatch.addListener(() => {
                closeNav();
                closeMore();
                syncMobileHardening();
                syncMobileNavState();
            });
        }

        window.addEventListener("resize", () => {
            setHeaderHeightVar();
            syncMobileHardening();
            syncMobileNavState();
        });

        window.addEventListener("orientationchange", () => {
            setHeaderHeightVar();
            syncMobileHardening();
            syncMobileNavState();
        });

        syncMobileNavState();
        setHeaderHeightVar();
        markActiveLinks(header);
        nav.classList.add("ccg-nav--hydrated");
        closeMore();
    }

    /* ======================================================
       NAV SCROLL INDICATOR (MOBILE)
    ====================================================== */
    function setupNavScrollIndicator() {
        const header = document.querySelector("[data-ccg-header]");
        const drawer = document.querySelector("[data-ccg-nav-drawer]");
        const panel = drawer?.querySelector(".ccg-nav-drawer__panel");

        if (!header || !drawer || !panel) return;
        if (window.ccgNavScrollIndicatorInitialized) return;
        window.ccgNavScrollIndicatorInitialized = true;

        const phoneQuery = typeof window.matchMedia === "function"
            ? window.matchMedia("(max-width: 640px) and (pointer: coarse)")
            : null;

        const STORAGE_KEY = "ccgNavScrollIndicatorSeen";

        const readStoredFlag = () => {
            try {
                return sessionStorage.getItem(STORAGE_KEY) === "true";
            } catch (error) {
                try {
                    return localStorage.getItem(STORAGE_KEY) === "true";
                } catch (fallbackError) {
                    return false;
                }
            }
        };

        const writeStoredFlag = () => {
            try {
                sessionStorage.setItem(STORAGE_KEY, "true");
            } catch (error) {
                try {
                    localStorage.setItem(STORAGE_KEY, "true");
                } catch (fallbackError) {
                    return;
                }
            }
        };

        const isPhoneViewport = () => phoneQuery ? phoneQuery.matches : window.innerWidth <= 640;

        const isNavOpen = () => header.classList.contains("ccg-header--nav-open") || drawer.getAttribute("aria-hidden") === "false";

        const hasOverflow = () => panel.scrollHeight - panel.clientHeight > 12;

        const atTop = () => panel.scrollTop <= 0;

        const INDICATOR_CLASS = "ccg-menu-scroll-indicator";
        const VISIBLE_CLASS = "ccg-menu-scroll-indicator--visible";
        const ATTENTION_CLASS = "ccg-menu-scroll-indicator--attention";
        const SUBTLE_CLASS = "ccg-menu-scroll-indicator--subtle";
        const DISMISSED_CLASS = "ccg-menu-scroll-indicator--dismissed";

        let indicator = null;
        let hasSeenAttention = readStoredFlag();
        let attentionTimeout = null;
        let scrollHandler = null;
        let dismissedForOpen = false;

        const ensureIndicator = () => {
            if (indicator && indicator.parentElement) return indicator;
            const wrapper = document.createElement("div");
            wrapper.className = INDICATOR_CLASS;
            wrapper.setAttribute("aria-hidden", "true");

            const chevronTop = document.createElement("span");
            chevronTop.className = `${INDICATOR_CLASS}__chevron`;
            const chevronBottom = document.createElement("span");
            chevronBottom.className = `${INDICATOR_CLASS}__chevron`;

            wrapper.appendChild(chevronTop);
            wrapper.appendChild(chevronBottom);
            panel.appendChild(wrapper);
            indicator = wrapper;
            return indicator;
        };

        const clearIndicatorClasses = () => {
            if (!indicator) return;
            indicator.classList.remove(
                VISIBLE_CLASS,
                ATTENTION_CLASS,
                SUBTLE_CLASS,
                DISMISSED_CLASS
            );
        };

        const hideIndicator = () => {
            if (!indicator) return;
            indicator.classList.remove(VISIBLE_CLASS, ATTENTION_CLASS, SUBTLE_CLASS);
            indicator.classList.add(DISMISSED_CLASS);
        };

        const showIndicator = (variant) => {
            if (!indicator) return;
            indicator.classList.remove(ATTENTION_CLASS, SUBTLE_CLASS, DISMISSED_CLASS);
            indicator.classList.add(VISIBLE_CLASS, variant);
        };

        const handleAttentionTimeout = () => {
            if (attentionTimeout) {
                window.clearTimeout(attentionTimeout);
            }
            attentionTimeout = window.setTimeout(() => {
                attentionTimeout = null;
                if (isNavOpen() && hasOverflow() && atTop() && !dismissedForOpen) {
                    showIndicator(SUBTLE_CLASS);
                } else {
                    hideIndicator();
                }
            }, 2000);
        };

        const updateIndicator = () => {
            if (!indicator) return;
            if (!isPhoneViewport() || !isNavOpen()) {
                hideIndicator();
                return;
            }

            if (!hasOverflow()) {
                hideIndicator();
                return;
            }

            if (!atTop() || dismissedForOpen) {
                hideIndicator();
                return;
            }

            if (!hasSeenAttention) {
                showIndicator(ATTENTION_CLASS);
                hasSeenAttention = true;
                writeStoredFlag();
                handleAttentionTimeout();
                return;
            }

            showIndicator(SUBTLE_CLASS);
        };

        const handleNavOpen = () => {
            if (!isPhoneViewport()) {
                clearIndicatorClasses();
                return;
            }

            ensureIndicator();

            if (!scrollHandler) {
                scrollHandler = () => {
                    if (!isNavOpen()) return;
                    if (panel.scrollTop > 0) {
                        dismissedForOpen = true;
                        hideIndicator();
                        return;
                    }
                    updateIndicator();
                };
                panel.addEventListener("scroll", scrollHandler, { passive: true });
                panel.addEventListener("touchmove", scrollHandler, { passive: true });
            }

            dismissedForOpen = false;
            updateIndicator();
        };

        const handleNavClose = () => {
            if (attentionTimeout) {
                window.clearTimeout(attentionTimeout);
                attentionTimeout = null;
            }
            if (indicator?.parentElement) {
                indicator.parentElement.removeChild(indicator);
            }
            indicator = null;
        };

        const refreshIndicator = () => {
            if (!isNavOpen()) {
                handleNavClose();
                return;
            }
            handleNavOpen();
        };

        const observer = new MutationObserver(() => {
            if (isNavOpen()) {
                requestAnimationFrame(() => handleNavOpen());
            } else {
                handleNavClose();
            }
        });

        observer.observe(header, { attributes: true, attributeFilter: ["class"] });
        observer.observe(drawer, { attributes: true, attributeFilter: ["aria-hidden"] });

        if (phoneQuery?.addEventListener) {
            phoneQuery.addEventListener("change", () => refreshIndicator());
        } else if (phoneQuery?.addListener) {
            phoneQuery.addListener(() => refreshIndicator());
        }

        window.addEventListener("resize", () => refreshIndicator());
        window.addEventListener("orientationchange", () => refreshIndicator());

        if (isNavOpen()) {
            handleNavOpen();
        }
    }

    if (typeof window !== "undefined") {
        window.ccgInitNavScrollIndicator = setupNavScrollIndicator;
    }

    /* ======================================================
       LIGHTWEIGHT PARTICLE OVERLAY (GUARDED)
    ====================================================== */
    function shouldRenderParticles() {
        const reducedMotionQuery = MQ_REDUCED || (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null);
        if (reducedMotionQuery && reducedMotionQuery.matches) return false;

        // Mobile/coarse pointer: skip entirely to keep things smooth
        if (isMobileLike()) return false;

        const isLowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2;
        const isLowCore = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2;

        return !(isLowMemory || isLowCore);
    }

    function setupParticleField() {
        if (!shouldRenderParticles()) return;

        const bg = document.querySelector(".ccg-bg");
        if (!bg || bg.querySelector(".ccg-bg-particles")) return;

        const particleField = document.createElement("div");
        particleField.className = "ccg-bg-particles";
        particleField.setAttribute("aria-hidden", "true");

        const particleCount = Math.min(48, Math.max(20, Math.round(window.innerWidth / 28)));

        for (let i = 0; i < particleCount; i++) {
            const spark = document.createElement("span");
            spark.className = "ccg-bg-particles__spark";

            spark.style.setProperty("--ccg-particle-x", `${Math.random() * 100}%`);
            spark.style.setProperty("--ccg-particle-delay", `${Math.random() * 12}s`);
            spark.style.setProperty("--ccg-particle-duration", `${12 + Math.random() * 10}s`);
            spark.style.setProperty("--ccg-particle-size", `${1 + Math.random() * 2.5}px`);

            particleField.appendChild(spark);
        }

        bg.appendChild(particleField);

        const reducedMotionQuery = MQ_REDUCED || (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null);
        if (reducedMotionQuery && typeof reducedMotionQuery.addEventListener === "function") {
            reducedMotionQuery.addEventListener("change", event => {
                if (event.matches) {
                    particleField.remove();
                } else {
                    setupParticleField();
                }
            });
        }
    }

    /* ======================================================
       LOCAL VISITOR COUNTER (SIMPLE, FREE)
    ====================================================== */
    function setupVisitCounter() {
        const counterEls = document.querySelectorAll("[data-ccg-visit-counter]");
        if (!counterEls.length) return;

        let count = 0;

        try {
            const storedValue = localStorage.getItem("ccg-visit-count");
            count = storedValue ? Number(storedValue) : 0;
            if (!Number.isFinite(count)) count = 0;
            count += 1;
            localStorage.setItem("ccg-visit-count", String(count));
        } catch (error) {
            count = 1;
        }

        const formatted = count.toLocaleString();
        counterEls.forEach(el => {
            el.textContent = formatted;
        });
    }
/* ======================================================
   FOOTER SIGNATURE ROTATOR (SAFE / LOCAL / NO NETWORK)
====================================================== */
function setupFooterSignatureRotator() {
    const container = document.querySelector("[data-ccg-footer-signature]");
    if (!container) return;

    const items = Array.from(container.querySelectorAll("[data-ccg-signature-item]"));
    if (items.length < 2) return;

    let index = 0;

    // Initialise
    items.forEach((el, i) => {
        el.classList.toggle("is-active", i === 0);
    });

    // Rotate
    setInterval(() => {
        items[index].classList.remove("is-active");
        index = (index + 1) % items.length;
        items[index].classList.add("is-active");
    }, 4200);
}

    /* ======================================================
       OMEGA FLOATING NAV (HOME + GENRES + COLLECTIONS)
    ====================================================== */
    function setupOmegaFloatingNav() {
        const root = document.documentElement;
        const pageType = root?.getAttribute("data-ccg-page") || "";
        const path = window.location.pathname || "";
        const isTargetPage = pageType === "home"
            || pageType.includes("games-index")
            || pageType.includes("genre")
            || pageType.includes("collection")
            || /\/games\/(index\.html)?$/.test(path)
            || path.includes("/games/genres/")
            || path.includes("/games/collections/");

        if (!isTargetPage) return;

        if (document.querySelector("[data-ccg-floating-nav]")) {
            root.classList.add("ccg-has-floating-nav");
            return;
        }

        const rootPrefix = (() => {
            const siteRoot = getSiteRoot();
            return siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
        })();

        const buildUrl = (suffix) => `${rootPrefix}${suffix}`;

        const nav = document.createElement("div");
        nav.className = "ccg-floating-nav";
        nav.setAttribute("data-ccg-floating-nav", "");
        nav.innerHTML = `
            <nav class="ccg-floating-nav__bar" aria-label="Floating navigation">
                <a class="ccg-floating-nav__btn" href="${buildUrl("games/index.html")}">
                    <span class="ccg-floating-nav__icon" aria-hidden="true">📂</span>
                    <span class="ccg-floating-nav__label">Browse Games</span>
                </a>
                <a class="ccg-floating-nav__btn" href="${buildUrl("games/collections/index.html")}">
                    <span class="ccg-floating-nav__icon" aria-hidden="true">⭐</span>
                    <span class="ccg-floating-nav__label">Collections</span>
                </a>
                <a class="ccg-floating-nav__btn" href="${buildUrl("games/genres/index.html")}">
                    <span class="ccg-floating-nav__icon" aria-hidden="true">🗂️</span>
                    <span class="ccg-floating-nav__label">Genres</span>
                </a>
                <a class="ccg-floating-nav__btn" href="${buildUrl("quiz/quiz.html")}">
                    <span class="ccg-floating-nav__icon" aria-hidden="true">🎮</span>
                    <span class="ccg-floating-nav__label">Quiz</span>
                </a>
                <button class="ccg-floating-nav__btn" type="button" data-ccg-floating-top aria-label="Back to top">
                    <span class="ccg-floating-nav__icon" aria-hidden="true">⬆️</span>
                    <span class="ccg-floating-nav__label">Top</span>
                </button>
            </nav>
        `;

        document.body.appendChild(nav);
        root.classList.add("ccg-has-floating-nav");

        const topButton = nav.querySelector("[data-ccg-floating-top]");
        if (topButton) {
            topButton.addEventListener("click", (event) => {
                if (
                    event.target &&
                    event.target.closest &&
                    event.target.closest("input, textarea, [contenteditable]")
                ) {
                    return;
                }
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        let lastScrollY = window.scrollY;
        let ticking = false;
        let hasScrolled = false;
        let isVisible = false;

        const setVisible = (visible) => {
            if (isVisible === visible) return;
            isVisible = visible;
            nav.classList.toggle("ccg-floating-nav--visible", visible);
        };

        const updateVisibility = () => {
            ticking = false;
            const docHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight
            );
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const scrollY = window.scrollY || window.pageYOffset;
            const progress = docHeight ? (scrollY + viewportHeight) / docHeight : 0;
            const isNearBottom = progress >= 0.8;
            const scrollingDown = scrollY > lastScrollY + 2;
            const scrollingUp = scrollY < lastScrollY - 2;

            if (!hasScrolled) {
                setVisible(false);
            } else if (isNearBottom && scrollingDown) {
                setVisible(true);
            } else if (!isNearBottom || scrollingUp) {
                setVisible(false);
            }

            lastScrollY = scrollY;
        };

        const onScroll = () => {
            hasScrolled = true;
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(updateVisibility);
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
    }

    function setupOmegaMobileKeyboardGuard() {
        if (!isMobileLike()) return;
        const root = document.documentElement;
        const inputSelector = "input, textarea, select, [contenteditable='true']";

        const setKeyboardState = (active) => {
            root.classList.toggle("ccg-keyboard-active", Boolean(active));
        };

        document.addEventListener("focusin", (event) => {
            if (event.target instanceof Element && event.target.matches(inputSelector)) {
                setKeyboardState(true);
            }
        });

        document.addEventListener("focusout", (event) => {
            if (event.target instanceof Element && event.target.matches(inputSelector)) {
                setKeyboardState(false);
            }
        });

        if (window.visualViewport) {
            let lastHeight = window.visualViewport.height;
            window.visualViewport.addEventListener("resize", () => {
                const delta = lastHeight - window.visualViewport.height;
                const keyboardActive = delta > 140;
                setKeyboardState(keyboardActive);
                if (!keyboardActive) {
                    lastHeight = window.visualViewport.height;
                }
            });
        }
    }



    // === CCG Secret Admin Access ===
    function setupSecretAdminAccess() {
        const accessPattern = [16, 67, 67, 71];
        const patternLength = accessPattern.length;
        const stepTimeoutMs = 3000;
        let progressIndex = 0;
        let lastStepAt = 0;

        const isEditableTarget = target => {
            if (!(target instanceof Element)) return false;
            if (target.isContentEditable) return true;
            return Boolean(target.closest("input, textarea, select, [contenteditable], [role='textbox']"));
        };

        const normalizeKey = event => {
            if (event.key === "Shift") return 16;
            if (typeof event.key !== "string" || event.key.length !== 1) return null;
            return event.key.toUpperCase().charCodeAt(0);
        };

        const resetSequence = () => {
            progressIndex = 0;
            lastStepAt = 0;
        };

        const targetPath = "/auth/login.html?returnTo=/admin/dashboard.html";

        document.addEventListener("keydown", event => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (CCG_isTypingTarget(event)) return;
            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {
                return;
            }
            if (event.defaultPrevented) return;
            if (isEditableTarget(event.target)) return;

            const now = Date.now();
            if (progressIndex > 0 && now - lastStepAt > stepTimeoutMs) {
                resetSequence();
            }

            const normalizedKey = normalizeKey(event);
            if (normalizedKey === null) return;

            const expected = accessPattern[progressIndex];
            if (normalizedKey !== expected) {
                progressIndex = normalizedKey === accessPattern[0] ? 1 : 0;
                lastStepAt = progressIndex ? now : 0;
                return;
            }

            progressIndex += 1;
            lastStepAt = now;

            if (progressIndex < patternLength) return;

            resetSequence();

            if (IS_ADMIN_PATH) {
                // Admin pages are governed by admin/js/guard.js only
                return;
            }
            window.location.assign(targetPath);
        }, { passive: true });
    }
    // === End Secret Admin Access ===

    /* ======================================================
       DOM READY
    ====================================================== */
    document.addEventListener("DOMContentLoaded", () => {

        // Skip link injection removed to keep the top-left edge clean.
        applyGlobalButtonClasses();

        /* -------------------------------
           MOBILE HARDENING (EARLY)
        ------------------------------- */
        syncMobileHardening();

        /* -------------------------------
           NORMALISE LOGO PATH
        ------------------------------- */
        const logoPath = getLogoPath();
        document.querySelectorAll(".ccg-brand__logo").forEach(img => {
            img.src = logoPath;
            img.loading = img.loading || "lazy";
            if (!img.alt) img.alt = "Cheeky Commodore Gamer logo";
            if (!img.decoding) img.decoding = "async";
        });

        /* -------------------------------
           LAZY RESOURCE ENHANCEMENTS
        ------------------------------- */
        document.querySelectorAll("img:not([loading])").forEach(img => {
            const isAboveTheFold = img.closest("header") || img.closest(".ccg-hero") || img.closest(".home-hero") || img.closest(".ccg-info-hero");
            img.loading = isAboveTheFold ? "eager" : "lazy";
            if (!img.decoding) img.decoding = "async";
        });

        document.querySelectorAll("iframe").forEach(frame => {
            frame.loading = frame.loading || "lazy";
            if (!frame.referrerPolicy) frame.referrerPolicy = "strict-origin-when-cross-origin";
        });

        const introVideo = document.querySelector(".intro-video");
        if (introVideo) {
            introVideo.preload = "metadata";
        }

        normalizeHeaderNavLinks();
        setupNavToggle();
        setupNavScrollIndicator();
        setupVisitCounter();
        setupLogoEasterEgg();
        setupSecretTyping();
        setupSecretAdminAccess();
        setupFooterSignatureRotator();
        setupOmegaFloatingNav();
        setupOmegaMobileKeyboardGuard();

        /* ==================================================
           VIEWPORT WOW — LIGHT UP EVERYTHING
           (MOBILE: DISABLED to avoid extra animation churn)
        ================================================== */
        if (!isMobileLike()) {
            const wowSelectors = [
                ".ccg-hero",
                ".home-highlight-card",
                ".home-genre-card",
                ".games-accordion__section",
                ".ccg-game-card",
                ".ccg-panel",
                ".emulation-cta",
                ".quiz-card",
                "footer",
                ".ccg-brand",
            ];

            const wowTargets = document.querySelectorAll(wowSelectors.join(","));

            if (wowTargets.length) {
                const wowObserver = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("is-lit");
                        } else {
                            entry.target.classList.remove("is-lit");
                        }
                    });
                }, { threshold: 0.25 });

                wowTargets.forEach(el => {
                    el.setAttribute("data-ccg-wow", "");
                    wowObserver.observe(el);
                });
            }
        }

        /* ==================================================
           MICRO-GLINTS — MODED NAV & LOGO
           (MOBILE/COARSE: DISABLED)
        ================================================== */
        if (!isMobileLike()) {
            const glintTargets = document.querySelectorAll(".ccg-brand__logo, .ccg-nav__link");
            glintTargets.forEach(target => {
                target.addEventListener("pointerenter", () => target.classList.add("is-glinting"));
                target.addEventListener("pointerleave", () => target.classList.remove("is-glinting"));
            });
        }

        setupParticleField();
        setupScrollFailsafe();
        setupScrollPerfPause();

        /* -------------------------------
           Keep header height var accurate
        ------------------------------- */
        setHeaderHeightVar();
        window.addEventListener("load", setHeaderHeightVar, { passive: true });
    });

})();

/* ============================================================
   VISITOR COUNTER — GOATCOUNTER STATISTICS API
   ------------------------------------------------------------
   • Footer-only (safe if missing)
   • Cached for 1 hour (localStorage)
   • Silent failure (never breaks UI)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const counterEl = document.getElementById("ccg-visit-count");
    if (!counterEl) return;

    const GOATCOUNTER_API_URL = "https://cheekycommodoregamer.goatcounter.com/api/v0/stats/total?start=2020-01-01";
    const GOATCOUNTER_API_TOKEN = "1h55dk144yvt99xms45tiubge13ctobm2ezngxfwd0a64az1cm";
    const GOATCOUNTER_CACHE_KEY = "ccg_goatcounter_total";
    const GOATCOUNTER_CACHE_TTL = 60 * 60 * 1000;

    const parseCount = value => {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return null;
        }

        return numeric;
    };

    const extractCount = data => {
        if (!data || typeof data !== "object") return null;

        const candidates = [
            data.total,
            data.count,
            data.counts ? data.counts.total : null,
            data.stats ? data.stats.total : null,
            data.pageviews,
        ];

        for (const candidate of candidates) {
            const parsed = parseCount(candidate);
            if (parsed !== null) return parsed;
        }

        return null;
    };

    const setDisplay = value => {
        if (!Number.isFinite(value)) {
            counterEl.textContent = "—";
            return;
        }

        counterEl.textContent = value.toLocaleString();
    };

    const counterContainer = counterEl.closest(".ccg-footer__counter") || counterEl.parentElement;
    const visitorTokenRegex = /\bvisitors?\b/gi;
    const visitorTokenTestRegex = /\bvisitors?\b/i;

    const removeVisitorLabel = () => {
        if (!counterContainer) return;

        const walker = document.createTreeWalker(
            counterContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: node => visitorTokenTestRegex.test(node.nodeValue || "")
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT,
            }
        );

        const nodes = [];
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }

        nodes.forEach(node => {
            const cleaned = (node.nodeValue || "")
                .replace(visitorTokenRegex, "")
                .replace(/\s{2,}/g, " ")
                .trim();

            if (!cleaned) {
                node.remove();
                return;
            }

            node.nodeValue = cleaned;
        });
    };

    if (counterContainer) {
        removeVisitorLabel();

        const observer = new MutationObserver(() => {
            removeVisitorLabel();
        });

        observer.observe(counterContainer, {
            childList: true,
            characterData: true,
            subtree: true,
        });

        window.addEventListener("load", removeVisitorLabel, { once: true });
    }

    const readCache = () => {
        try {
            const raw = localStorage.getItem(GOATCOUNTER_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const cachedAt = Number(parsed && parsed.cachedAt);
            const cachedValue = Number(parsed && parsed.value);
            if (!Number.isFinite(cachedAt) || !Number.isFinite(cachedValue)) return null;
            if (Date.now() - cachedAt > GOATCOUNTER_CACHE_TTL) return null;
            return cachedValue;
        } catch (error) {
            return null;
        }
    };

    const writeCache = value => {
        try {
            localStorage.setItem(GOATCOUNTER_CACHE_KEY, JSON.stringify({
                value,
                cachedAt: Date.now(),
            }));
        } catch (error) {
            // Ignore cache write failures.
        }
    };

    const cachedValue = readCache();
    if (cachedValue !== null) {
        setDisplay(cachedValue);
        return;
    }

    fetch(GOATCOUNTER_API_URL, {
        headers: {
            Authorization: `Bearer ${GOATCOUNTER_API_TOKEN}`,
            "Content-Type": "application/json",
        },
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("GoatCounter stats request failed.");
            }
            return response.json();
        })
        .then(data => {
            const total = extractCount(data);
            if (total === null) {
                setDisplay(null);
                return;
            }
            writeCache(total);
            setDisplay(total);
        })
        .catch(() => {
            setDisplay(null);
        });

});
