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
        consolePanel: null,
        consoleInput: null,
        audioCtx: null,
        inputBuffer: "",
        konamiIndex: 0,
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
        const overlay = createOverlay("ccg-press-play", `
            <div class="ccg-press-play__bars"></div>
            <h1>PRESS PLAY ON TAPE</h1>
            <div class="ccg-press-play__bars"></div>
        `);
        setTimeout(() => overlay.remove(), 4200);
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
        const pacman = createOverlay("ccg-pacman");
        pacman.innerHTML = `
            <div class="ccg-pacman__sprite"></div>
            <div class="ccg-pacman__ghost"></div>
        `;
        setTimeout(() => pacman.remove(), 13000);
    }

    function triggerBoing() {
        const boing = createOverlay("ccg-boing");
        setTimeout(() => boing.remove(), 10000);
    }

    function triggerLemmings() {
        const lemmings = createOverlay("ccg-lemmings", `
            <div class="ccg-lemmings__countdown">3</div>
            <div class="ccg-lemmings__label">NUKE DEPLOYING...</div>
        `);
        const countdown = lemmings.querySelector(".ccg-lemmings__countdown");
        let count = 3;
        const timer = setInterval(() => {
            count -= 1;
            if (count >= 0) {
                countdown.textContent = String(count);
            }
            if (count < 0) {
                clearInterval(timer);
                lemmings.classList.add("is-boom");
                countdown.textContent = "💥";
                lemmings.querySelector(".ccg-lemmings__label").textContent = "OH NO!";
                setTimeout(() => lemmings.remove(), 2500);
            }
        }, 800);
    }

    function triggerZX() {
        const overlay = createOverlay("ccg-zx", `
            <div class="ccg-zx__screen">
                <div class="ccg-zx__title">ZX SPECTRUM 48K</div>
                <div class="ccg-zx__loader">LOADING... PLEASE WAIT</div>
                <div class="ccg-zx__bar"><span></span></div>
                <div class="ccg-zx__prompt">READY.</div>
            </div>
        `);
        setTimeout(() => overlay.classList.add("is-active"), 20);
        setTimeout(() => overlay.remove(), 5200);
    }

    function triggerMatrix() {
        const existing = document.querySelector(".ccg-matrix");
        if (existing) {
            existing.remove();
            return;
        }
        createOverlay("ccg-matrix");
    }

    function triggerInvaders() {
        const existing = document.querySelector(".ccg-invaders");
        if (existing) {
            existing.remove();
            return;
        }
        createOverlay("ccg-invaders");
    }

    function triggerRainbow() {
        document.body.classList.toggle("ccg-rainbow");
    }

    function triggerKonami() {
        const overlay = createOverlay("ccg-konami", `
            <div class="ccg-konami__card">
                <h2>GOD MODE ENABLED</h2>
                <p>POWER LEVELS MAXED • CRT SHUTDOWN INITIATED</p>
            </div>
        `);
        setTimeout(() => overlay.classList.add("is-fade"), 2200);
        setTimeout(() => overlay.remove(), 3800);
    }

    const cheats = {
        "sys64738": () => triggerC64Reset(),
        "pressplay": () => triggerPressPlay(),
        "vhs": () => document.body.classList.toggle("ccg-vhs"),
        "terminator": () => {
            document.body.classList.toggle("ccg-terminator");
            playTone(100, "sawtooth", 0.5, 0.4);
        },
        "bsod": () => triggerBSOD(),
        "mario": () => {
            playTone(660, "square", 0.1, 0.25);
            setTimeout(() => playTone(1320, "square", 0.3, 0.2), 150);
        },
        "nokia": () => {
            const t = 150;
            playTone(1318, "square", 0.1, 0.2);
            setTimeout(() => playTone(1174, "square", 0.1, 0.2), t);
            setTimeout(() => playTone(740, "square", 0.1, 0.2), t * 2);
            setTimeout(() => playTone(830, "square", 0.2, 0.2), t * 3);
        },
        "sonic": () => {
            playTone(1200, "sine", 0.3, 0.2);
            setTimeout(() => playTone(1000, "sine", 0.4, 0.18), 300);
        },
        "warp": () => triggerWarp(),
        "party": () => document.body.classList.toggle("ccg-party"),
        "zxspectrum": () => triggerZX(),
        "pacman": () => triggerPacman(),
        "boing": () => triggerBoing(),
        "matrix": () => triggerMatrix(),
        "invaders": () => triggerInvaders(),
        "rainbow": () => triggerRainbow(),
        "lemmings": () => triggerLemmings(),
        "cheeky": () => window.location.replace("https://gaydar.net/"),
        "konamicode": () => triggerKonami(),
    };

    function normalizeCode(code) {
        return code.toLowerCase().replace(/\s+/g, "");
    }

    function triggerCheat(code) {
        const normalized = normalizeCode(code);
        if (cheats[normalized]) {
            cheats[normalized]();
        }
    }

    function buildSecretModal() {
        if (secretState.modal) return secretState.modal;

        const modal = document.createElement("div");
        modal.className = "ccg-secret-modal";
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="ccg-secret-modal__content" role="dialog" aria-label="Secret system commands">
                <div class="ccg-secret-modal__actions">
                    <button class="ccg-secret-btn" type="button" data-ccg-secret-open-input>ENTER CODES</button>
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
                    <li data-ccg-secret-code="rainbow">RAINBOW</li>
                    <li data-ccg-secret-code="lemmings">LEMMINGS</li>
                    <li data-ccg-secret-code="cheeky">CHEEKY</li>
                    <li data-ccg-secret-code="konamicode">KONAMI CODE</li>
                </ul>
                <div class="ccg-secret-console" hidden>
                    <label class="ccg-secret-console__label" for="ccg-secret-input">ENTER COMMAND:</label>
                    <div class="ccg-secret-console__row">
                        <input id="ccg-secret-input" class="ccg-secret-console__input" type="text" autocomplete="off" />
                        <button class="ccg-secret-btn" type="button" data-ccg-secret-run>RUN</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        secretState.modal = modal;
        secretState.consolePanel = modal.querySelector(".ccg-secret-console");
        secretState.consoleInput = modal.querySelector(".ccg-secret-console__input");

        modal.addEventListener("click", event => {
            if (event.target === modal) closeSecretModal();
        });

        modal.querySelectorAll("[data-ccg-secret-code]").forEach(item => {
            item.addEventListener("click", () => {
                triggerCheat(item.dataset.ccgSecretCode || "");
            });
        });

        modal.querySelector("[data-ccg-secret-open-input]").addEventListener("click", () => {
            secretState.consolePanel.hidden = false;
            secretState.consoleInput.focus();
        });

        modal.querySelector("[data-ccg-secret-close]").addEventListener("click", closeSecretModal);

        modal.querySelector("[data-ccg-secret-run]").addEventListener("click", () => {
            triggerCheat(secretState.consoleInput.value);
            secretState.consoleInput.value = "";
            secretState.consoleInput.focus();
        });

        secretState.consoleInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                triggerCheat(secretState.consoleInput.value);
                secretState.consoleInput.value = "";
            }
        });

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
    }

    function setupSecretHint() {
        const footer = document.querySelector(".ccg-footer");
        if (!footer || footer.querySelector(".ccg-footer__hint")) return;
        const hint = document.createElement("button");
        hint.type = "button";
        hint.className = "ccg-footer__hint";
        hint.innerHTML = `<span>SYS?</span><small>Type SYS64738</small>`;
        hint.addEventListener("click", openSecretModal);
        footer.appendChild(hint);
    }

    function setupSecretListeners() {
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeSecretModal();
                return;
            }

            const target = event.target;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
                return;
            }

            if (event.key.length === 1) {
                secretState.inputBuffer = `${secretState.inputBuffer}${event.key}`.toLowerCase();
                secretState.inputBuffer = secretState.inputBuffer.slice(-18);
                if (secretState.inputBuffer.includes("sys64738")) {
                    openSecretModal();
                }
            }

            const expected = konamiSequence[secretState.konamiIndex];
            if (event.key === expected) {
                secretState.konamiIndex += 1;
                if (secretState.konamiIndex >= konamiSequence.length) {
                    secretState.konamiIndex = 0;
                    triggerCheat("konamicode");
                }
            } else {
                secretState.konamiIndex = event.key === konamiSequence[0] ? 1 : 0;
            }
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

        setupNavToggle();
        setupVisitCounter();
        setupSecretHint();
        setupSecretListeners();

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
