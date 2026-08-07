/* ============================================================
   CCG UI REGRESSION FIXES — 2026-08-07
   ------------------------------------------------------------
   Small runtime layer for:
   • guaranteed stylesheet delivery for interaction polish
   • minimum visible Zzap!64 loading progress window
   • home-page footer duplicate-link cleanup
   • protected streamlined home-page highlights
   • mobile home/publisher formatting corrections
   • legacy MicroProse featured-card compatibility
============================================================ */

(function () {
    "use strict";

    const STYLE_PATH = "/resources/css/ccg-ui-regression-fixes.css";
    const POLISH_STYLE_ID = "ccg-ui-mobile-formatting-polish";
    const ZZAP_MIN_VISIBLE_MS = 1800;

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

    function getHomeHighlightMarkup() {
        return `
            <a href="/zzap64/" class="ccg-card home-highlight-card home-highlight-card--feature home-highlight-card--zzap">
                <div class="ccg-card__body">
                    <span class="home-highlight-card__eyebrow">Magazine archive</span>
                    <h3 class="ccg-card__title">Zzap!64 Awards</h3>
                    <p class="ccg-card__text">Revisit the Sizzlers, Gold Medals and standout scores from Zzap!64, year by year.</p>
                    <span class="home-highlight-card__cta">Explore the awards →</span>
                </div>
            </a>

            <a href="/games/downloads/" class="ccg-card home-highlight-card home-highlight-card--feature home-highlight-card--downloads" data-home-downloads-card="true">
                <div class="ccg-card__body">
                    <span class="home-highlight-card__eyebrow">Archive access</span>
                    <h3 class="ccg-card__title">Game Downloads A–Z</h3>
                    <p class="ccg-card__text">Search the downloadable C64 and Amiga archive and jump straight to the title you want.</p>
                    <span class="home-highlight-card__cta">Browse downloads →</span>
                </div>
            </a>

            <a href="/games/collections/top-picks.html" class="ccg-card home-highlight-card home-highlight-card--feature home-highlight-card--picks">
                <div class="ccg-card__body">
                    <span class="home-highlight-card__eyebrow">Curated by CCG</span>
                    <h3 class="ccg-card__title">CCG Top Picks</h3>
                    <p class="ccg-card__text">Skip the endless lists and head straight to a hand-picked selection of Commodore favourites.</p>
                    <span class="home-highlight-card__cta">See the picks →</span>
                </div>
            </a>
        `;
    }

    function protectStreamlinedHomeHighlights() {
        if (document.documentElement.getAttribute("data-ccg-page") !== "home") return;

        const grid = document.querySelector(".home-highlights-grid--focused");
        if (!grid || grid.dataset.ccgStaticHighlightsProtected === "true") return;

        const restoreHighlights = () => {
            const intendedCards = grid.querySelectorAll(".home-highlight-card--feature");
            const dynamicCards = grid.querySelectorAll(".home-feature-card");
            if (intendedCards.length === 3 && dynamicCards.length === 0) return;
            grid.innerHTML = getHomeHighlightMarkup();
        };

        grid.dataset.ccgStaticHighlightsProtected = "true";
        restoreHighlights();

        const observer = new MutationObserver(() => {
            restoreHighlights();
        });
        observer.observe(grid, { childList: true });

        requestAnimationFrame(() => {
            requestAnimationFrame(restoreHighlights);
        });
        window.setTimeout(restoreHighlights, 120);
        window.setTimeout(restoreHighlights, 500);
    }

    function enhanceHomeFooter() {
        const root = document.documentElement;
        if (root.getAttribute("data-ccg-page") !== "home") return;

        const footer = document.querySelector(".ccg-footer");
        if (!footer) return;

        /* The shared footer already supplies the site/legal navigation.
           Remove the extra mini-nav previously added here so the homepage
           does not repeat the same links twice. */
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
        protectStreamlinedHomeHighlights();
        enhanceHomeFooter();
        holdZzapLoaderForFirstPaint();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
