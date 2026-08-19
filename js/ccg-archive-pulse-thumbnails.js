/* ============================================================
   CCG ARCHIVE PULSE THUMBNAILS
   ------------------------------------------------------------
   Adds compact, authoritative game thumbnails to the Home page
   Game of the Day and Archive Pick cards.

   Thumbnail paths come from games/games-index.json so older or
   non-slug filenames continue to resolve correctly.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ARCHIVE_PULSE_THUMBNAILS_READY) return;
    window.CCG_ARCHIVE_PULSE_THUMBNAILS_READY = true;

    const pathname = String(window.location.pathname || "/");
    const isHome = pathname === "/" || /\/home\.html$/i.test(pathname);
    if (!isHome) return;

    const CSS_PATH = "/resources/css/ccg-archive-pulse-thumbnails.css";
    const INDEX_PATH = "/games/games-index.json";
    const TARGET_TYPES = new Set(["game-of-the-day", "archive-pick"]);
    let indexPromise = null;
    let observer = null;

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        link.setAttribute("data-ccg-archive-pulse-thumbnail-style", "true");
        document.head.appendChild(link);
    }

    function normalizePath(value) {
        const raw = String(value || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw)) return raw;
        return `/${raw.replace(/^\/+/, "")}`;
    }

    function slugFromCard(card) {
        try {
            const url = new URL(card.getAttribute("href") || "", window.location.href);
            const match = url.pathname.match(/\/games\/([^/]+)\/?$/i);
            return match ? decodeURIComponent(match[1]) : "";
        } catch (error) {
            return "";
        }
    }

    function loadIndex() {
        if (!indexPromise) {
            indexPromise = fetch(INDEX_PATH, { cache: "force-cache" })
                .then((response) => {
                    if (!response.ok) throw new Error(`${INDEX_PATH} HTTP ${response.status}`);
                    return response.json();
                })
                .then((rows) => {
                    const map = new Map();
                    (Array.isArray(rows) ? rows : []).forEach((row) => {
                        const slug = String(row?.slug || "").trim();
                        const thumbnail = normalizePath(row?.thumbnail);
                        if (slug && thumbnail) map.set(slug, thumbnail);
                    });
                    return map;
                })
                .catch((error) => {
                    console.warn("[ccg-archive-pulse-thumbnails] Game thumbnail index unavailable", error);
                    return new Map();
                });
        }
        return indexPromise;
    }

    async function enhanceCards() {
        const pulse = document.querySelector("[data-ccg-archive-pulse]");
        if (!pulse) return false;

        const index = await loadIndex();
        pulse.querySelectorAll(".ccg-archive-pulse__card[data-ccg-archive-pulse]").forEach((card) => {
            const type = String(card.dataset.ccgArchivePulse || "");
            if (!TARGET_TYPES.has(type) || card.querySelector(".ccg-archive-pulse__thumb")) return;

            const slug = slugFromCard(card);
            const src = index.get(slug);
            if (!src) return;

            const image = document.createElement("img");
            image.className = "ccg-archive-pulse__thumb";
            image.src = src;
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.width = 96;
            image.height = 72;
            image.addEventListener("error", () => {
                card.classList.remove("ccg-archive-pulse__card--has-thumb");
                image.remove();
            }, { once: true });

            card.classList.add("ccg-archive-pulse__card--has-thumb");
            card.insertBefore(image, card.firstChild);
        });

        return true;
    }

    function init() {
        ensureCss();
        void enhanceCards().then((found) => {
            if (found || observer) return;
            observer = new MutationObserver(() => {
                void enhanceCards().then((nowFound) => {
                    if (nowFound && observer) {
                        observer.disconnect();
                        observer = null;
                    }
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
            window.setTimeout(() => {
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            }, 10000);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
