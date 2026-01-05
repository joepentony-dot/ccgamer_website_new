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

    function isMobileLike() {
        return Boolean(isMobileViewport() || (MQ_MOBILE && MQ_MOBILE.matches) || (MQ_COARSE && MQ_COARSE.matches));
    }

    function safeNowMobileClass() {
        const mobile = isMobileLike();
        document.documentElement.classList.toggle("ccg-is-mobile", mobile);
        if (document.body && document.body.classList) {
            document.body.classList.toggle("ccg-is-mobile", mobile);
        }
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
                <button class="ccg-egg-overlay__exit" type="button">Exit to CCGAMER Website</button>
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
        const remove = () => bsod.remove();
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

            if (event.key.length !== 1) return;

            secretState.inputBuffer += event.key;
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
                    <button class="ccg-secret-btn" type="button" data-ccg-secret-close>CLOSE EASTER EGGS</button>
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
            if (event.target === modal) closeSecretModal();
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
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("ccg-secret-modal-open");
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

    function ensureLogoBubble(logo) {
        const brand = logo.closest(".ccg-brand");
        if (!brand) return null;

        let bubble = brand.querySelector(".ccg-logo-bubble");
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.className = "ccg-logo-bubble";
            bubble.setAttribute("role", "status");
            bubble.setAttribute("aria-live", "polite");
            bubble.innerHTML = "<span class=\"ccg-logo-bubble__text\"></span>";
            brand.appendChild(bubble);
        }
        return bubble;
    }

    function showLogoBubble(logo, message, { swapText = false } = {}) {
        const bubble = ensureLogoBubble(logo);
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
        const logos = document.querySelectorAll(".ccg-header .ccg-brand__logo");
        if (!logos.length) return;

        logos.forEach(logo => {
            if (logo.dataset.ccgLogoEasterEgg === "true") return;
            logo.dataset.ccgLogoEasterEgg = "true";

            const brandLink = logo.closest(".ccg-brand");
            if (brandLink && brandLink.tagName === "A") {
                brandLink.removeAttribute("href");
                brandLink.removeAttribute("target");
                brandLink.removeAttribute("rel");
                brandLink.setAttribute("role", "button");
                brandLink.setAttribute("tabindex", "0");
                if (!brandLink.getAttribute("aria-label")) {
                    brandLink.setAttribute("aria-label", "Cheeky Commodore Gamer logo");
                }
            }

            logo.addEventListener("click", event => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                }

                logoClickState.count += 1;

                if (logoClickState.count === 1) {
                    flashLogo(logo, "ccg-logo-flash--neon");
                    showLogoBubble(logo, "Dont Click Me Again");
                    scheduleLogoReset();
                    return;
                }

                if (logoClickState.count === 2) {
                    flashLogo(logo, "ccg-logo-flash--red");
                    showLogoBubble(logo, "DEFINITELY Dont Click Me Again", { swapText: true });
                    scheduleLogoReset();
                    return;
                }

                if (logoClickState.count >= 3) {
                    if (logoClickState.lastBubble) {
                        logoClickState.lastBubble.classList.remove("is-visible", "ccg-logo-bubble--swap");
                    }
                    openSecretModal();
                    resetLogoClickState();
                }
            });
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
        const mobileMatch = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 960px)") : null;

        const primaryList = nav?.querySelector("[data-ccg-nav-primary]");
        const secondaryList = nav?.querySelector("[data-ccg-nav-secondary]");
        const moreWrap = nav?.querySelector(".ccg-nav__more");
        const moreToggle = moreWrap?.querySelector("[data-ccg-more-toggle]");
        const moreMenu = nav?.querySelector("[data-ccg-more-menu]");

        if (!toggle || !nav || !primaryList || !moreWrap || !moreMenu) return;

        const isMobileViewport = () => mobileMatch ? mobileMatch.matches : window.innerWidth <= 960;

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

        buildMoreMenu();

        let isMoreOpen = false;
        let isNavOpen = false;

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
                return;
            }

            buildDrawer();

            const hasDrawerLinks = drawerPrimary?.querySelector(".ccg-nav__link") || drawerSecondary?.querySelector(".ccg-nav__link");
            nav.classList.toggle("ccg-nav--mobile-fallback", !hasDrawerLinks);
        };

        toggle.addEventListener("click", () => {
            if (isNavOpen) {
                closeNav();
            } else {
                openNav();
            }
        });

        moreToggle?.addEventListener("click", event => {
            event.stopPropagation();
            if (isMoreOpen) {
                closeMore();
            } else {
                openMore();
            }
        });

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

    items.forEach((el, i) => {
        el.hidden = i !== 0;
    });

    setInterval(() => {
        items[index].hidden = true;
        index = (index + 1) % items.length;
        items[index].hidden = false;
    }, 4200);
}

    /* ======================================================
       DOM READY
    ====================================================== */
    document.addEventListener("DOMContentLoaded", () => {

        /* -------------------------------
           SKIP LINK FOR KEYBOARD USERS
        ------------------------------- */
        const main = document.querySelector("main");
        if (main) {
            if (!main.id) main.id = "ccg-main-content";
            main.setAttribute("tabindex", "-1");

            const skipLink = document.createElement("a");
            skipLink.className = "ccg-skip-link";
            skipLink.href = `#${main.id}`;
            skipLink.textContent = "Skip to main content";
            document.body.prepend(skipLink);
        }

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
        setupVisitCounter();
        setupLogoEasterEgg();
        setupSecretTyping();

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

        /* -------------------------------
           Keep header height var accurate
        ------------------------------- */
        setHeaderHeightVar();
        window.addEventListener("load", setHeaderHeightVar, { passive: true });
    });

})();
