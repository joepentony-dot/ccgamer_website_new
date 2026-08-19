/* ============================================================
   CCG ARCHIVE PULSE — EVERY-VISIT RANDOMIZER
   ------------------------------------------------------------
   The base engagement engine historically used a UTC-day hash,
   which made the Home page Archive Pulse repeat all day despite
   the "Something Different Every Visit" promise.

   This small Home-only layer keeps the existing Omega cards and
   styling intact while rotating their content on every page load.
   It remembers the previous selection for the current browser tab
   so a normal refresh cannot immediately return the same picks.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ARCHIVE_PULSE_RANDOMIZER_READY) return;
    window.CCG_ARCHIVE_PULSE_RANDOMIZER_READY = true;

    const pathname = String(window.location.pathname || "/");
    const pageId = String(document.documentElement.getAttribute("data-ccg-page") || "").toLowerCase();
    const isHome = pageId === "home" || pathname === "/" || /\/home\.html$/i.test(pathname);
    if (!isHome) return;

    const GAMES_PATH = "/games/games-search.json";
    const INDEX_PATH = "/games/games-index.json";
    const SPECIALS_PATH = "/data/retro-specials.json";
    const PREVIOUS_KEY = "ccgArchivePulsePreviousV2";
    const TARGET_GAME_TYPES = ["game-of-the-day", "archive-pick"];

    function toArray(value) {
        if (Array.isArray(value)) return value.filter(Boolean);
        return value === undefined || value === null || value === "" ? [] : [value];
    }

    function titleCase(value) {
        return String(value || "")
            .replace(/[-_]+/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.length <= 3 && part === part.toUpperCase()
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }

    function gameMeta(game) {
        return [
            game?.year,
            ...toArray(game?.publisher).slice(0, 1),
            ...toArray(game?.genres || game?.genre).slice(0, 1).map(titleCase)
        ].filter(Boolean).join(" · ");
    }

    function secureRandomIndex(length) {
        if (!Number.isInteger(length) || length <= 1) return 0;
        try {
            if (window.crypto?.getRandomValues) {
                const values = new Uint32Array(1);
                window.crypto.getRandomValues(values);
                return values[0] % length;
            }
        } catch (error) {}
        return Math.floor(Math.random() * length);
    }

    function shuffledCopy(items) {
        const output = Array.from(items || []);
        for (let index = output.length - 1; index > 0; index -= 1) {
            const swapIndex = secureRandomIndex(index + 1);
            [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
        }
        return output;
    }

    function readPrevious() {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(PREVIOUS_KEY) || "null");
            return parsed && typeof parsed === "object"
                ? {
                    games: Array.isArray(parsed.games) ? parsed.games.map(String) : [],
                    zzap: String(parsed.zzap || "")
                }
                : { games: [], zzap: "" };
        } catch (error) {
            return { games: [], zzap: "" };
        }
    }

    function writePrevious(games, zzap) {
        try {
            sessionStorage.setItem(PREVIOUS_KEY, JSON.stringify({
                games: games.map((game) => String(game?.slug || "")).filter(Boolean),
                zzap: String(zzap?.slug || zzap?.id || "")
            }));
        } catch (error) {}
    }

    async function fetchJson(path) {
        const response = await fetch(path, { cache: "force-cache" });
        if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
        return response.json();
    }

    async function loadData() {
        const [gamesRaw, indexRaw, specialsRaw] = await Promise.all([
            fetchJson(GAMES_PATH),
            fetchJson(INDEX_PATH),
            fetchJson(SPECIALS_PATH)
        ]);

        const games = (Array.isArray(gamesRaw) ? gamesRaw : [])
            .filter((game) => game?.title && game?.slug);
        const specials = (Array.isArray(specialsRaw) ? specialsRaw : [])
            .filter((item) => item?.title && (item?.slug || item?.id));
        const thumbnails = new Map();

        (Array.isArray(indexRaw) ? indexRaw : []).forEach((row) => {
            const slug = String(row?.slug || "").trim();
            const thumbnail = String(row?.thumbnail || "").trim();
            if (!slug || !thumbnail) return;
            thumbnails.set(slug, /^https?:\/\//i.test(thumbnail)
                ? thumbnail
                : `/${thumbnail.replace(/^\/+/, "")}`);
        });

        return { games, specials, thumbnails };
    }

    function chooseGames(games, previousSlugs) {
        if (!games.length) return [];
        const previous = new Set(previousSlugs || []);
        let pool = games.filter((game) => !previous.has(String(game.slug || "")));

        // Only fall back to the full archive if excluding the previous visit
        // would leave too few cards to fill the pulse.
        if (pool.length < Math.min(2, games.length)) pool = games;
        return shuffledCopy(pool).slice(0, Math.min(2, pool.length));
    }

    function chooseZzap(specials, previousSlug) {
        const zzapItems = specials.filter((item) => /zzap/i.test(String(item?.title || item?.slug || "")));
        if (!zzapItems.length) return null;

        const filtered = previousSlug && zzapItems.length > 1
            ? zzapItems.filter((item) => String(item?.slug || item?.id || "") !== previousSlug)
            : zzapItems;
        const pool = filtered.length ? filtered : zzapItems;
        return pool[secureRandomIndex(pool.length)] || null;
    }

    function ensureThumbnail(card, src) {
        const existing = card.querySelector(".ccg-archive-pulse__thumb");
        if (!src) {
            existing?.remove();
            card.classList.remove("ccg-archive-pulse__card--has-thumb");
            return;
        }

        const image = existing || document.createElement("img");
        image.className = "ccg-archive-pulse__thumb";
        image.src = src;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.width = 96;
        image.height = 72;
        image.onerror = () => {
            card.classList.remove("ccg-archive-pulse__card--has-thumb");
            image.remove();
        };

        if (!existing) card.insertBefore(image, card.firstChild);
        card.classList.add("ccg-archive-pulse__card--has-thumb");
    }

    function updateGameCard(type, game, thumbnails) {
        if (!game) return;
        const card = document.querySelector(`.ccg-archive-pulse__card[data-ccg-archive-pulse="${type}"]`);
        if (!card) return;

        card.href = `/games/${game.slug}/`;
        const label = card.querySelector(".ccg-archive-pulse__label");
        const name = card.querySelector(".ccg-archive-pulse__name");
        const meta = card.querySelector(".ccg-archive-pulse__meta");

        if (label && type === "game-of-the-day") label.textContent = "Fresh Game Pick";
        if (name) name.textContent = game.title;
        if (meta) meta.textContent = gameMeta(game) || "Explore the archive";
        ensureThumbnail(card, thumbnails.get(String(game.slug || "")) || "");
    }

    function updateZzapCard(item) {
        if (!item) return;
        const card = document.querySelector('.ccg-archive-pulse__card[data-ccg-archive-pulse="zzap-feature"]');
        if (!card) return;

        const slug = String(item.slug || item.id || "").replace(/^\/+|\/+$/g, "");
        if (slug) card.href = `/retro-specials/${slug}/`;
        const name = card.querySelector(".ccg-archive-pulse__name");
        const meta = card.querySelector(".ccg-archive-pulse__meta");
        if (name) name.textContent = item.title || "Zzap!64 Archive";
        if (meta) meta.textContent = item.summary || "Sizzlers, Gold Medals and magazine history";
    }

    function waitForPulse() {
        const existing = document.querySelector("[data-ccg-archive-pulse]");
        if (existing) return Promise.resolve(existing);

        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                observer.disconnect();
                window.clearTimeout(timeout);
                resolve(value);
            };
            const observer = new MutationObserver(() => {
                const pulse = document.querySelector("[data-ccg-archive-pulse]");
                if (pulse) finish(pulse);
            });
            const timeout = window.setTimeout(() => finish(null), 10000);
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    async function init() {
        const pulse = await waitForPulse();
        if (!pulse || pulse.dataset.ccgEveryVisitRandomized === "true") return;

        try {
            const [{ games, specials, thumbnails }, previous] = await Promise.all([
                loadData(),
                Promise.resolve(readPrevious())
            ]);
            const selectedGames = chooseGames(games, previous.games);
            const selectedZzap = chooseZzap(specials, previous.zzap);

            TARGET_GAME_TYPES.forEach((type, index) => {
                updateGameCard(type, selectedGames[index], thumbnails);
            });
            updateZzapCard(selectedZzap);
            writePrevious(selectedGames, selectedZzap);
            pulse.dataset.ccgEveryVisitRandomized = "true";
        } catch (error) {
            console.warn("[ccg-archive-pulse-randomizer] Could not rotate Archive Pulse", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
    } else {
        void init();
    }
})();
