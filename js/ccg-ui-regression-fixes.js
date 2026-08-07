/* ============================================================
   CCG UI REGRESSION FIXES — 2026-08-07
   ------------------------------------------------------------
   Small runtime layer for:
   • guaranteed stylesheet delivery for interaction polish
   • minimum visible Zzap!64 loading progress window
   • richer home-page footer navigation/legal information
   • legacy MicroProse featured-card compatibility
============================================================ */

(function () {
    "use strict";

    const STYLE_PATH = "/resources/css/ccg-ui-regression-fixes.css";
    const ZZAP_MIN_VISIBLE_MS = 1800;

    function ensureStylesheet() {
        if (document.querySelector('link[data-ccg-ui-regression-fixes]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = STYLE_PATH;
        link.dataset.ccgUiRegressionFixes = "true";
        document.head.appendChild(link);
    }

    function repairLegacyMicroProseFeaturedCard() {
        if (document.documentElement.getAttribute("data-ccg-page") !== "publisher-index") return;

        const featuredGrid = document.querySelector(".ccg-publisher-grid--featured");
        if (!featuredGrid) return;

        const legacyLink = featuredGrid.querySelector(':scope > a.ccg-publisher-card__link[href="/games/publishers/microprose-software/"]');
        if (!legacyLink) return;

        const article = document.createElement("article");
        article.className = "ccg-publisher-card ccg-publisher-card--featured";
        article.dataset.publisherCard = "";
        article.dataset.publisherName = "microprose software";
        article.dataset.publisherPlatform = "";

        featuredGrid.insertBefore(article, legacyLink);
        article.appendChild(legacyLink);

        if (!legacyLink.querySelector(".ccg-publisher-card__eyebrow")) {
            const eyebrow = document.createElement("span");
            eyebrow.className = "ccg-publisher-card__eyebrow";
            eyebrow.textContent = "Featured Publisher";

            const title = legacyLink.querySelector(".ccg-publisher-card__title");
            if (title) legacyLink.insertBefore(eyebrow, title);
            else legacyLink.appendChild(eyebrow);
        }

        article.dataset.ccgMicroproseRepair = "true";
    }

    function enhanceHomeFooter() {
        const root = document.documentElement;
        if (root.getAttribute("data-ccg-page") !== "home") return;

        const footer = document.querySelector(".ccg-footer");
        if (!footer || footer.querySelector("[data-ccg-footer-hub]")) return;

        const hub = document.createElement("nav");
        hub.className = "ccg-footer-hub";
        hub.dataset.ccgFooterHub = "true";
        hub.setAttribute("aria-label", "Footer navigation");
        hub.innerHTML = `
            <div class="ccg-footer-hub__group">
                <h2 class="ccg-footer-hub__title">Explore CCG</h2>
                <div class="ccg-footer-hub__links">
                    <a href="/games/">Games</a>
                    <a href="/games/genres/">Genres</a>
                    <a href="/games/publishers/">Publishers</a>
                    <a href="/games/collections/">Collections</a>
                    <a href="/zzap64/">Zzap!64 Awards</a>
                    <a href="/quiz/quiz.html">Quiz</a>
                </div>
            </div>
            <div class="ccg-footer-hub__group">
                <h2 class="ccg-footer-hub__title">Cheeky Commodore Gamer</h2>
                <div class="ccg-footer-hub__links">
                    <a href="/about.html">About</a>
                    <a href="/contact.html">Contact</a>
                    <a href="/support.html">Support CCG</a>
                    <a href="/supporters.html">Supporters</a>
                </div>
            </div>
            <div class="ccg-footer-hub__group">
                <h2 class="ccg-footer-hub__title">Site information</h2>
                <div class="ccg-footer-hub__links">
                    <a href="/terms.html">Terms</a>
                    <a href="/privacy.html">Privacy</a>
                    <a href="/cookies.html">Cookies</a>
                    <a href="/affiliate-disclosure.html">Affiliate disclosure</a>
                </div>
            </div>
        `;

        const counter = footer.querySelector(".ccg-footer__counter-wrap");
        if (counter) footer.insertBefore(hub, counter);
        else footer.appendChild(hub);

        const note = document.createElement("p");
        note.className = "ccg-footer-hub__note";
        note.textContent = "Independent Commodore 64 & Amiga archive, videos, reviews and community features.";
        hub.insertAdjacentElement("afterend", note);
    }

    function holdZzapLoaderForFirstPaint() {
        if (document.documentElement.getAttribute("data-ccg-page") !== "zzap64-awards") return;
        const loader = document.getElementById("zzapLoading");
        if (!loader || loader.dataset.ccgMinimumVisibility === "true") return;

        loader.dataset.ccgMinimumVisibility = "true";
        const startedAt = performance.now();
        let releaseTimer = 0;
        let allowingHide = false;

        const releaseWhenReady = () => {
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(0, ZZAP_MIN_VISIBLE_MS - elapsed);
            window.clearTimeout(releaseTimer);
            releaseTimer = window.setTimeout(() => {
                allowingHide = true;
                if (loader.getAttribute("aria-busy") === "false") loader.hidden = true;
            }, remaining);
        };

        const observer = new MutationObserver(() => {
            if (loader.hidden && !allowingHide) {
                loader.hidden = false;
                releaseWhenReady();
                return;
            }
            if (loader.getAttribute("aria-busy") === "false") releaseWhenReady();
        });

        observer.observe(loader, { attributes: true, attributeFilter: ["hidden", "aria-busy"] });
        loader.hidden = false;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                loader.classList.add("zzap-loading--painted");
            });
        });
    }

    function init() {
        ensureStylesheet();
        repairLegacyMicroProseFeaturedCard();
        enhanceHomeFooter();
        holdZzapLoaderForFirstPaint();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();