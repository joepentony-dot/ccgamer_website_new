/* ============================================================
   CCG RECENTLY VIEWED GAMES
   ------------------------------------------------------------
   Stores a small device-local viewing history. No account,
   tracking service or database write is involved.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_RECENTLY_VIEWED_READY) return;
    window.CCG_RECENTLY_VIEWED_READY = true;

    const STORAGE_KEY = "ccgRecentlyViewedGamesV1";
    const CSS_PATH = "/resources/css/ccg-recently-viewed.css";
    const MAX_STORED = 12;
    const MAX_SHOWN = 6;

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function safeRead() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(value) ? value.filter(Boolean) : [];
        } catch (error) {
            return [];
        }
    }

    function safeWrite(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED)));
            document.dispatchEvent(new CustomEvent("ccg:recently-viewed-updated", { detail: { items } }));
        } catch (error) {}
    }

    function normalizeSlug(value) {
        return String(value || "")
            .trim()
            .replace(/^\/+|\/+$/g, "")
            .split("/")
            .filter(Boolean)
            .pop() || "";
    }

    function currentGameSlug() {
        const path = window.location.pathname || "";
        const match = path.match(/\/games\/([^/]+)\/?(?:index\.html)?$/i);
        if (!match) return "";
        const slug = normalizeSlug(match[1]);
        const reserved = new Set(["genres", "collections", "publishers", "developers", "years", "platforms", "downloads", "index.html"]);
        return reserved.has(slug.toLowerCase()) ? "" : slug;
    }

    function resolveImage(game) {
        const candidates = [
            game?.thumbnail,
            game?.thumbnailUrl,
            game?.image,
            game?.cover,
            game?.box,
            game?.media?.thumbnail,
            document.querySelector(".game-hero img, .game-hero__image img, [data-game-thumbnail] img")?.getAttribute("src")
        ];

        const raw = candidates.find((value) => typeof value === "string" && value.trim());
        if (!raw) return "";
        try {
            return new URL(raw, window.location.href).href;
        } catch (error) {
            return "";
        }
    }

    function buildRecord(game) {
        const slug = normalizeSlug(game?.slug || game?.id || currentGameSlug());
        const title = String(
            game?.title ||
            document.getElementById("gameHeroTitle")?.textContent ||
            document.querySelector("h1")?.textContent ||
            ""
        ).trim();
        if (!slug || !title) return null;

        return {
            slug,
            title,
            href: `/games/${slug}/`,
            system: String(game?.system || game?.platform || "").trim(),
            year: String(game?.year || "").trim(),
            image: resolveImage(game),
            viewedAt: Date.now()
        };
    }

    function storeGame(game) {
        const record = buildRecord(game);
        if (!record) return;
        const items = safeRead().filter((item) => item.slug !== record.slug);
        items.unshift(record);
        safeWrite(items);
    }

    function fallbackRecordAfterRender() {
        if (!currentGameSlug()) return;
        const attempt = () => {
            const title = document.getElementById("gameHeroTitle")?.textContent?.trim();
            if (title) storeGame(null);
        };
        requestAnimationFrame(attempt);
        setTimeout(attempt, 700);
        setTimeout(attempt, 1800);
    }

    function isHubPage() {
        return Boolean(
            document.querySelector(".ccg-page--home, .ccg-page--games-index") ||
            document.documentElement.matches('[data-ccg-page="home"], [data-ccg-page="games-index"]')
        );
    }

    function createImage(item) {
        const frame = document.createElement("span");
        frame.className = "ccg-recently-viewed__image";

        if (item.image) {
            const image = document.createElement("img");
            image.src = item.image;
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.addEventListener("error", () => {
                image.remove();
                const fallback = document.createElement("span");
                fallback.className = "ccg-recently-viewed__fallback";
                fallback.textContent = item.system || "CCG Game";
                frame.appendChild(fallback);
            }, { once: true });
            frame.appendChild(image);
        } else {
            const fallback = document.createElement("span");
            fallback.className = "ccg-recently-viewed__fallback";
            fallback.textContent = item.system || "CCG Game";
            frame.appendChild(fallback);
        }

        return frame;
    }

    function createCard(item) {
        const card = document.createElement("a");
        card.className = "ccg-recently-viewed__card";
        card.href = item.href || `/games/${item.slug}/`;
        card.appendChild(createImage(item));

        const body = document.createElement("span");
        body.className = "ccg-recently-viewed__body";

        const title = document.createElement("span");
        title.className = "ccg-recently-viewed__name";
        title.textContent = item.title;

        const meta = document.createElement("span");
        meta.className = "ccg-recently-viewed__meta";
        meta.textContent = [item.system, item.year].filter(Boolean).join(" · ") || "Recently viewed";

        body.append(title, meta);
        card.appendChild(body);
        return card;
    }

    function findInsertionTarget() {
        return document.querySelector(
            ".ccg-page--home .ccg-main--home, .ccg-page--home main, .ccg-page--games-index .games-main, .ccg-page--games-index main"
        );
    }

    function render() {
        if (!isHubPage()) return;
        ensureCss();

        const target = findInsertionTarget();
        if (!target) return;

        let section = target.querySelector(":scope > [data-ccg-recently-viewed]");
        const items = safeRead().slice(0, MAX_SHOWN);

        if (!items.length) {
            section?.remove();
            return;
        }

        if (!section) {
            section = document.createElement("section");
            section.className = "ccg-recently-viewed";
            section.setAttribute("data-ccg-recently-viewed", "true");
            section.setAttribute("aria-labelledby", "ccg-recently-viewed-title");
            section.innerHTML = `
                <div class="ccg-recently-viewed__header">
                    <div>
                        <p class="ccg-recently-viewed__kicker">Continue exploring</p>
                        <h2 class="ccg-recently-viewed__title" id="ccg-recently-viewed-title">Recently Viewed Games</h2>
                    </div>
                    <button class="ccg-recently-viewed__clear" type="button">Clear history</button>
                </div>
                <div class="ccg-recently-viewed__grid"></div>
            `;
            target.appendChild(section);

            section.querySelector(".ccg-recently-viewed__clear")?.addEventListener("click", () => {
                try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
                section.remove();
            });
        }

        const grid = section.querySelector(".ccg-recently-viewed__grid");
        if (!grid) return;
        grid.textContent = "";
        items.forEach((item) => grid.appendChild(createCard(item)));
    }

    function init() {
        window.addEventListener("ccg:game-loaded", (event) => storeGame(event.detail?.game || null));
        fallbackRecordAfterRender();
        render();
        document.addEventListener("ccg:recently-viewed-updated", render);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
