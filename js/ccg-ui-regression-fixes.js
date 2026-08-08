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
    const POLISH_STYLE_ID = "ccg-ui-mobile-formatting-polish";
    const ZZAP_MIN_VISIBLE_MS = 1800;
    const HOME_FOOTER_AUDIT_TARGETS = [
        "/terms.html",
        "/privacy.html",
        "/cookies.html",
        "/affiliate-disclosure.html"
    ];

    function ensureStylesheet() {
        if (document.querySelector('link[data-ccg-ui-regression-fixes]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = STYLE_PATH;
        link.dataset.ccgUiRegressionFixes = "true";
        document.head.appendChild(link);
    }

    function ensureFormattingPolish() {
        if (document.getElementById(POLISH_STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = POLISH_STYLE_ID;
        style.textContent = `
            html[data-ccg-page="home"] .home-section__header--focused {
                display: block !important;
                width: 100% !important;
                max-width: 760px !important;
                margin-inline: auto !important;
                text-align: center !important;
            }

            html[data-ccg-page="home"] .home-section__header--focused .home-section__eyebrow {
                display: block !important;
                width: auto !important;
                max-width: none !important;
                margin: 0 0 8px !important;
                white-space: nowrap !important;
                writing-mode: horizontal-tb !important;
                overflow-wrap: normal !important;
            }

            html[data-ccg-page="home"] .home-section__header--focused .home-section__title {
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                text-align: center !important;
            }

            html[data-ccg-page="home"] .home-section__header--focused .home-section__intro {
                display: block !important;
                width: min(620px, 100%) !important;
                margin: 10px auto 0 !important;
                text-align: center !important;
            }

            html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card {
                display: grid !important;
                grid-template-rows: auto 1fr !important;
                min-width: 0 !important;
                min-height: 0 !important;
                overflow: hidden !important;
                text-decoration: none !important;
                border: 1px solid rgba(var(--accent-rgb), 0.32) !important;
                background:
                    linear-gradient(150deg, rgba(var(--accent-rgb), 0.10), transparent 48%),
                    linear-gradient(145deg, rgba(3, 8, 20, 0.97), rgba(6, 13, 29, 0.90)) !important;
                box-shadow:
                    0 18px 42px rgba(0, 0, 0, 0.62),
                    0 0 22px rgba(var(--accent-rgb), 0.18),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.035) !important;
                transition: transform 180ms ease, border-color 180ms ease, box-shadow 220ms ease !important;
            }

            html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card > img {
                display: block !important;
                width: 100% !important;
                height: auto !important;
                aspect-ratio: 16 / 9 !important;
                object-fit: contain !important;
                object-position: center !important;
                background: #050914 !important;
                border-bottom: 1px solid rgba(var(--accent-rgb), 0.24) !important;
            }

            html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card .ccg-card__body {
                display: grid !important;
                align-content: start !important;
                gap: 8px !important;
                padding: 20px !important;
            }

            html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card .ccg-card__title {
                margin: 0 !important;
                color: #f3f7ff !important;
                font-size: clamp(1.05rem, 1.8vw, 1.28rem) !important;
                line-height: 1.25 !important;
            }

            html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card .ccg-card__text {
                margin: 0 !important;
                color: rgba(226, 235, 255, 0.76) !important;
                line-height: 1.45 !important;
            }

            html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card--loading .ccg-card__body {
                min-height: 150px !important;
                place-content: center !important;
                text-align: center !important;
            }

            @media (hover: hover) and (pointer: fine) {
                html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card:hover,
                html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card:focus-visible {
                    transform: translateY(-4px) !important;
                    border-color: rgba(var(--accent-rgb), 0.72) !important;
                    box-shadow:
                        0 24px 48px rgba(0, 0, 0, 0.72),
                        0 0 30px rgba(var(--accent-rgb), 0.30),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.06) !important;
                    outline: none !important;
                }
            }

            html[data-ccg-page="publisher-index"] .ccg-publishers-search > .visually-hidden {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden !important;
                clip: rect(0 0 0 0) !important;
                white-space: nowrap !important;
                border: 0 !important;
            }

            @media (max-width: 760px) {
                html[data-ccg-page="home"] .home-section--streamlined {
                    width: min(100% - 24px, 1120px) !important;
                }

                html[data-ccg-page="home"] .home-section__header--focused {
                    margin-bottom: 18px !important;
                    padding-inline: 8px !important;
                }

                html[data-ccg-page="home"] .home-section__header--focused .home-section__title {
                    font-size: clamp(1.65rem, 8vw, 2.15rem) !important;
                    line-height: 1.08 !important;
                    letter-spacing: 0.035em !important;
                }

                html[data-ccg-page="home"] .home-section__header--focused .home-section__intro {
                    font-size: 0.94rem !important;
                    line-height: 1.45 !important;
                }

                html[data-ccg-page="home"] .home-highlights-grid--focused {
                    grid-template-columns: minmax(0, 1fr) !important;
                    gap: 14px !important;
                }

                html[data-ccg-page="home"] .home-highlight-card--feature {
                    min-height: 0 !important;
                }

                html[data-ccg-page="home"] .home-highlight-card--feature .ccg-card__body {
                    min-height: 190px !important;
                    padding: 24px 22px !important;
                }

                html[data-ccg-page="home"] .home-highlights-grid--focused .home-feature-card .ccg-card__body {
                    padding: 18px 18px 20px !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-main {
                    width: min(100% - 20px, 1400px) !important;
                    padding-top: 14px !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-hero {
                    padding: 22px 18px !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-hero__title {
                    font-size: clamp(2rem, 10vw, 2.85rem) !important;
                    line-height: 1.04 !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-hero__intro {
                    margin-top: 16px !important;
                    font-size: 1rem !important;
                    line-height: 1.55 !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-hero__stats {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    gap: 8px !important;
                    margin-top: 20px !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-hero__stats span {
                    display: flex !important;
                    min-width: 0 !important;
                    min-height: 58px !important;
                    justify-content: center !important;
                    padding: 10px !important;
                    text-align: center !important;
                    line-height: 1.25 !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publisher-breadcrumbs {
                    margin-top: 12px !important;
                    padding: 10px 0 !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-tools {
                    margin: 16px 0 28px !important;
                    padding: 14px !important;
                    gap: 10px !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-search input {
                    min-height: 52px !important;
                    padding: 12px 14px !important;
                }

                html[data-ccg-page="publisher-index"] .ccg-publishers-visible-count {
                    text-align: center !important;
                }
            }
        `;

        document.head.appendChild(style);
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
        ensureFormattingPolish();
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
