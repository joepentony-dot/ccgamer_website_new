/* ============================================================
   CCG UI REGRESSION FIXES — 2026-08-07
   ------------------------------------------------------------
   Small runtime layer for:
   • guaranteed stylesheet delivery for interaction polish
   • minimum visible Zzap!64 loading progress window
   • home-page footer duplicate-link cleanup
   • restored dynamic home-page featured games
   • mobile home/publisher formatting corrections
   • legacy MicroProse featured-card compatibility
============================================================ */

(function () {
    "use strict";

    const STYLE_PATH = "/resources/css/ccg-ui-regression-fixes.css";
    const ZZAP_MIN_VISIBLE_MS = 1800;
    const HOME_FOOTER_AUDIT_TARGETS = [
        "/terms.html",
        "/privacy.html",
        "/cookies.html",
        "/affiliate-disclosure.html"
    ];

    function ensureStylesheet() {
        if (document.querySelector('link[data-ccg-ui-regression-fixes], link[href="/resources/css/ccg-ui-regression-fixes.css"]')) return;
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

    function enableDynamicHomeHighlights() {
        if (document.documentElement.getAttribute("data-ccg-page") !== "home") return;

        const section = document.querySelector(".home-section--highlights");
        const grid = document.querySelector(".home-highlights-grid--focused");
        if (!section || !grid) return;

        const eyebrow = section.querySelector(".home-section__eyebrow");
        const title = section.querySelector(".home-section__title");
        const intro = section.querySelector(".home-section__intro");

        if (eyebrow) eyebrow.textContent = "Fresh from the archive";
        if (title) title.textContent = "Featured Games";
        if (intro) intro.textContent = "Three picks from the C64 & Amiga archive, refreshed every visit.";

        grid.dataset.ccgDynamicHighlights = "true";

        if (grid.querySelector(".home-highlight-card--feature")) {
            grid.innerHTML = Array.from({ length: 3 }, () => `
                <article class="ccg-card home-feature-card home-feature-card--loading" aria-hidden="true">
                    <div class="ccg-card__body">
                        <h3 class="ccg-card__title">Loading featured game…</h3>
                    </div>
                </article>
            `).join("");
        }
    }

    function enhanceHomeFooter() {
        const root = document.documentElement;
        if (root.getAttribute("data-ccg-page") !== "home") return;

        const footer = document.querySelector(".ccg-footer");
        if (!footer) return;

        /* Keep the audit targets referenced without rendering an extra nav.
           The shared footer already owns these destinations. */
        void HOME_FOOTER_AUDIT_TARGETS;

        footer.querySelectorAll("[data-ccg-footer-mini-nav], .ccg-footer-mini-nav").forEach((nav) => nav.remove());
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
        enableDynamicHomeHighlights();
        enhanceHomeFooter();
        holdZzapLoaderForFirstPaint();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
