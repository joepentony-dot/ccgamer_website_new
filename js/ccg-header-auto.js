/* =======================================================================
   CCG-HEADER-AUTO.JS — OMEGA SAFE PATCH (FINAL)
   Purpose:
   • Auto-correct broken navigation & internal links
   • Sync saved mode state + hero badge without double-owning the toggle
   • NEVER touch intro loader logic
   • Zero visual changes — only structural fixes
   ======================================================================= */

(function () {
    "use strict";

    /* ------------------------------------------------------------
       1) PATH NORMALISATION MAP
       Ensures all “collections” URLs point to real genre pages.
    ------------------------------------------------------------ */
    const PATH_FIX_MAP = {
        "games/collections/top-picks.html": "games/genres/top-picks.html",
        "games/collections/bpjs-indexed-games.html": "games/genres/bpjs-indexed-games.html",
        "games/collections/cartridge-games.html": "games/genres/cartridge-games.html",
        "games/collections/licensed-games.html": "games/genres/licensed-games.html",

        // Any leftover “collections/*.html” → 404 protection
        "/games/collections/": "/games/genres/"
    };

    function fixBrokenLinks() {
        document.querySelectorAll("a[href]").forEach(a => {
            const href = a.getAttribute("href");

            if (!href) return;

            // Direct exact replacements
            if (PATH_FIX_MAP[href]) {
                a.setAttribute("href", PATH_FIX_MAP[href]);
                return;
            }

            // Fallback pattern rule: any /collections/ path becomes /genres/
            if (href.includes("/collections/")) {
                const corrected = href.replace("/collections/", "/genres/");
                a.setAttribute("href", corrected);
            }
        });
    }

    /* ------------------------------------------------------------
       2) MODE STATE FALLBACK (C64 ↔ Amiga)
       ccg-mode-engine.js is the established toggle owner whenever
       it is present. This helper only restores the saved state on
       legacy pages that do not load the mode engine.
    ------------------------------------------------------------ */
    function setupModeStateFallback() {
        const toggle = document.querySelector("[data-ccg-mode-toggle]");
        if (!toggle) return;

        const hasModeEngine = Array.from(document.scripts).some(script => {
            const src = script.getAttribute("src") || "";
            return /(?:^|\/)ccg-mode-engine\.js(?:[?#].*)?$/i.test(src);
        });

        if (hasModeEngine) {
            toggle.dataset.ccgModeOwner = "engine";
            return;
        }

        const body = document.body;
        const heroLabel = document.querySelector("[data-ccg-hero-mode-label]");

        function applyMode(mode) {
            const nextMode = mode === "amiga" ? "amiga" : "c64";
            document.documentElement.setAttribute("data-ccg-mode", nextMode);
            document.documentElement.setAttribute("data-mode", nextMode);
            body.setAttribute("data-ccg-mode", nextMode);
            body.setAttribute("data-mode", nextMode);

            if (heroLabel) heroLabel.textContent = nextMode === "c64" ? "C64" : "Amiga";
            toggle.setAttribute("aria-pressed", String(nextMode === "amiga"));
            toggle.setAttribute("aria-label", nextMode === "amiga" ? "Switch to C64 mode" : "Switch to Amiga mode");
            toggle.dataset.ccgActiveMode = nextMode;
        }

        let saved = "c64";
        try {
            saved = localStorage.getItem("ccg-mode") || "c64";
        } catch (error) {}
        applyMode(saved);

        toggle.dataset.ccgModeOwner = "header-fallback";
        toggle.addEventListener("click", () => {
            const newMode = body.getAttribute("data-ccg-mode") === "c64" ? "amiga" : "c64";
            try {
                localStorage.setItem("ccg-mode", newMode);
            } catch (error) {}
            applyMode(newMode);
            window.dispatchEvent(new CustomEvent("ccg:mode-changed", { detail: { mode: newMode } }));
        });
    }

    /* ------------------------------------------------------------
       3) HERO BADGE SYNC (Mode: C64 / Amiga)
       Works on any page where badge exists.
    ------------------------------------------------------------ */
    function syncHeroBadge() {
        const badge = document.querySelector("[data-ccg-hero-badge]");
        const badgeLabel = document.querySelector("[data-ccg-hero-mode-label]");
        if (!badge || !badgeLabel) return;

        const mode = document.body.getAttribute("data-ccg-mode") || "c64";
        badgeLabel.textContent = mode === "c64" ? "C64" : "Amiga";
    }

    /* ------------------------------------------------------------
       4) LOGO PATH SAFEGUARD
       Ensures logo is always correct no matter what HTML says.
    ------------------------------------------------------------ */
    function normaliseLogo() {
        const logo = document.querySelector(".ccg-brand__logo");
        if (!logo) return;

        const correct = "resources/images/ccgamer-logo.png";
        if (logo.getAttribute("src") !== correct) {
            logo.setAttribute("src", correct);
        }
    }

    /* ------------------------------------------------------------
       5) SOCIAL LINKS SANITY CHECK
       Ensures all socials always use your real, correct URLs.
    ------------------------------------------------------------ */
    function fixSocialLinks() {
        const socials = {
            youtube: "https://www.youtube.com/@CheekyCommodoreGamer",
            patreon: "https://patreon.com/CheekyCommodoreGamer",
            paypal: "https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL",
            twitter: "https://twitter.com/CheekyC64Gamer",
            facebook: "https://www.facebook.com/cheekycommodoregamer",
            discord: "https://discord.gg/83Xw9ktAn4"
        };

        document.querySelectorAll(".ccg-socials__icon-btn, .ccg-socials__link").forEach(a => {
            if (a.classList.contains("ccg-socials__icon--yt")) a.href = socials.youtube;
            if (a.classList.contains("ccg-socials__icon--patreon")) a.href = socials.patreon;
            if (a.classList.contains("ccg-socials__icon--paypal")) a.href = socials.paypal;
            if (a.classList.contains("ccg-socials__icon--x")) a.href = socials.twitter;
            if (a.classList.contains("ccg-socials__icon--fb")) a.href = socials.facebook;
            if (a.classList.contains("ccg-socials__icon--discord")) a.href = socials.discord;
        });
    }

    /* ------------------------------------------------------------
       INIT (runs after DOM ready)
    ------------------------------------------------------------ */
    document.addEventListener("DOMContentLoaded", () => {
        fixBrokenLinks();
        normaliseLogo();
        setupModeStateFallback();
        syncHeroBadge();
        fixSocialLinks();
    });

})();
