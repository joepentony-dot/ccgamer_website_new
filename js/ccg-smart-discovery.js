/* ============================================================
   CCG SMART GAME DISCOVERY
   ------------------------------------------------------------
   Enhances the existing single-game related carousel using
   archive metadata only. No account data or tracking is used.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_SMART_DISCOVERY_READY) return;
    window.CCG_SMART_DISCOVERY_READY = true;

    const CSS_PATH = "/resources/css/ccg-smart-discovery.css";
    const DATA_PATH = "/games/games.json";
    const MAX_ITEMS = 12;
    const RESERVED_ROUTES = new Set([
        "genres",
        "collections",
        "publishers",
        "developers",
        "years",
        "platforms",
        "downloads",
        "index.html"
    ]);

    const state = {
        gamesPromise: null,
        renderTimer: null,
        currentGame: null,
        renderedSlug: ""
    };

    function isSingleGamePage() {
        return document.documentElement.getAttribute("data-ccg-page") === "single-game"
            || Boolean(document.querySelector(".ccg-page--single-game"));
    }

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function toList(value) {
        if (Array.isArray(value)) return value;
        if (value === undefined || value === null || value === "") return [];
        return [value];
    }

    function normalizedList(value) {
        return [...new Set(toList(value).map(normalizeText).filter(Boolean))];
    }

    function currentSlug() {
        const match = String(window.location.pathname || "").match(/\/games\/([^/]+)\/?(?:index\.html)?$/i);
        if (!match) return "";
        const slug = String(match[1] || "").trim().toLowerCase();
        return RESERVED_ROUTES.has(slug) ? "" : slug;
    }

    function gameSlug(game) {
        return String(game?.slug || game?.id || "").trim().toLowerCase();
    }

    function gameSystem(game) {
        const value = String(game?.system || game?.platform || "").trim().toUpperCase();
        if (value.includes("AMIGA")) return "AMIGA";
        if (value.includes("C64") || value.includes("COMMODORE 64")) return "C64";
        return value;
    }

    function gameYear(game) {
        const value = Number(game?.year);
        return Number.isFinite(value) ? value : null;
    }

    function gameRating(game) {
        const value = Number(game?.ccg_rating);
        return Number.isFinite(value) ? value : null;
    }

    function publishers(game) {
        return normalizedList([
            ...toList(game?.publisher),
            ...toList(game?.credits?.publisher)
        ]);
    }

    function developers(game) {
        return normalizedList([
            ...toList(game?.developer),
            ...toList(game?.credits?.developer),
            ...toList(game?.credits?.producer)
        ]);
    }

    function genres(game) {
        return normalizedList([
            ...toList(game?.genres),
            ...toList(game?.genre)
        ]).filter((value) => value !== "top picks");
    }

    function collections(game) {
        return normalizedList(game?.collections);
    }

    function creditedPeople(game) {
        return normalizedList([
            ...toList(game?.composer),
            ...toList(game?.credits?.musician),
            ...toList(game?.credits?.coder),
            ...toList(game?.credits?.graphics)
        ]);
    }

    function sharedValues(left, right) {
        if (!left.length || !right.length) return [];
        const rightSet = new Set(right);
        return left.filter((value) => rightSet.has(value));
    }

    function titleLabel(value) {
        return String(value || "")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }

    function addReason(reasons, key, label, points) {
        if (points <= 0) return;
        reasons.push({ key, label, points });
    }

    function scoreCandidate(current, candidate) {
        const reasons = [];
        let score = 0;

        const currentTitle = normalizeText(current?.title);
        const candidateTitle = normalizeText(candidate?.title);
        const currentSystem = gameSystem(current);
        const candidateSystem = gameSystem(candidate);

        if (currentTitle && currentTitle === candidateTitle && currentSystem !== candidateSystem) {
            score += 32;
            addReason(reasons, "platform", "Other Platform Version", 32);
        }

        const sharedPublishers = sharedValues(publishers(current), publishers(candidate));
        if (sharedPublishers.length) {
            score += 14;
            addReason(reasons, "publisher", "Same Publisher", 14);
        }

        const sharedDevelopers = sharedValues(developers(current), developers(candidate));
        if (sharedDevelopers.length) {
            score += 11;
            addReason(reasons, "developer", "Same Developer", 11);
        }

        const sharedGenres = sharedValues(genres(current), genres(candidate));
        if (sharedGenres.length) {
            const points = Math.min(14, sharedGenres.length * 7);
            score += points;
            addReason(reasons, "genre", `Shared ${titleLabel(sharedGenres[0])} Genre`, points);
        }

        const sharedCollections = sharedValues(collections(current), collections(candidate));
        if (sharedCollections.length) {
            const points = Math.min(10, sharedCollections.length * 5);
            score += points;
            addReason(reasons, "collection", "Same CCG Collection", points);
        }

        const sharedCredits = sharedValues(creditedPeople(current), creditedPeople(candidate));
        if (sharedCredits.length) {
            const points = Math.min(8, sharedCredits.length * 4);
            score += points;
            addReason(reasons, "credits", `Shared Credit: ${titleLabel(sharedCredits[0])}`, points);
        }

        if (currentSystem && candidateSystem && currentSystem === candidateSystem) {
            score += 3;
            addReason(reasons, "system", `Also ${candidateSystem === "C64" ? "C64" : titleLabel(candidateSystem)}`, 3);
        }

        const currentYear = gameYear(current);
        const candidateYear = gameYear(candidate);
        if (currentYear !== null && candidateYear !== null) {
            const distance = Math.abs(currentYear - candidateYear);
            const points = distance === 0 ? 4 : distance <= 2 ? 3 : distance <= 4 ? 1 : 0;
            score += points;
            addReason(reasons, "year", distance === 0 ? "Same Release Year" : "Close Release Period", points);
        }

        const rating = gameRating(candidate);
        if (rating !== null && rating >= 8) score += 2;
        if (genres(candidate).includes("top picks") || collections(candidate).includes("top picks")) score += 2;

        reasons.sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
        return { score, reasons: reasons.slice(0, 2) };
    }

    function stableHash(value) {
        let hash = 2166136261;
        const text = String(value || "");
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function selectRecommendations(current, games) {
        const currentSlugValue = gameSlug(current);
        const currentId = String(current?.id || "").trim().toLowerCase();
        const currentTitle = normalizeText(current?.title);

        const scored = games
            .filter((candidate) => {
                if (!candidate || !candidate.title) return false;
                const slug = gameSlug(candidate);
                const id = String(candidate?.id || "").trim().toLowerCase();
                if (slug && slug === currentSlugValue) return false;
                if (id && currentId && id === currentId) return false;
                return true;
            })
            .map((candidate) => {
                const match = scoreCandidate(current, candidate);
                return {
                    game: candidate,
                    score: match.score,
                    reasons: match.reasons,
                    tie: stableHash(`${currentSlugValue}|${gameSlug(candidate)}`)
                };
            })
            .filter((entry) => entry.score >= 4)
            .sort((a, b) => b.score - a.score || b.tie - a.tie);

        const selected = [];
        const usedTitles = new Set();
        const publisherCounts = new Map();
        const genreCounts = new Map();

        for (const entry of scored) {
            if (selected.length >= MAX_ITEMS) break;

            const titleKey = normalizeText(entry.game?.title);
            const isOtherPlatform = titleKey && titleKey === currentTitle;
            if (usedTitles.has(titleKey) && !isOtherPlatform) continue;

            const publisherKey = publishers(entry.game)[0] || "unknown";
            const genreKey = genres(entry.game)[0] || "unknown";
            const publisherCount = publisherCounts.get(publisherKey) || 0;
            const genreCount = genreCounts.get(genreKey) || 0;

            if (!isOtherPlatform && publisherCount >= 3) continue;
            if (!isOtherPlatform && genreCount >= 4) continue;

            selected.push(entry);
            usedTitles.add(titleKey);
            publisherCounts.set(publisherKey, publisherCount + 1);
            genreCounts.set(genreKey, genreCount + 1);
        }

        return selected;
    }

    function resolveImage(game) {
        const raw = String(game?.thumbnail || game?.thumb || game?.cover || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
        return `/${raw.replace(/^\.\//, "")}`;
    }

    function createTag(label, reason = false) {
        const tag = document.createElement("span");
        tag.className = reason
            ? "related-card__tag related-card__tag--reason related-card__tag--smart"
            : "related-card__tag";
        tag.textContent = label;
        return tag;
    }

    function createCard(entry) {
        const game = entry.game;
        const card = document.createElement("a");
        card.className = "related-card related-card--smart";
        card.href = `/games/${encodeURIComponent(gameSlug(game))}/`;
        card.setAttribute("aria-label", `View ${game.title}`);

        const image = document.createElement("img");
        image.src = resolveImage(game);
        image.alt = `${game.title} cover art`;
        image.loading = "lazy";
        image.decoding = "async";
        image.width = 320;
        image.height = 180;

        const title = document.createElement("span");
        title.className = "related-card__title";
        title.textContent = game.title;

        const meta = document.createElement("div");
        meta.className = "related-card__meta";

        const primaryGenre = genres(game)[0];
        if (primaryGenre) meta.appendChild(createTag(titleLabel(primaryGenre)));

        const platformYear = [
            gameSystem(game) === "C64" ? "C64" : titleLabel(gameSystem(game)),
            gameYear(game)
        ].filter(Boolean).join(" • ");
        if (platformYear) meta.appendChild(createTag(platformYear));

        entry.reasons.forEach((reason) => meta.appendChild(createTag(reason.label, true)));

        card.append(image, title, meta);
        return card;
    }

    function ensureExplanation(section, current) {
        let explanation = section.querySelector("[data-ccg-smart-discovery-copy]");
        if (!explanation) {
            explanation = document.createElement("p");
            explanation.className = "ccg-smart-discovery__copy";
            explanation.dataset.ccgSmartDiscoveryCopy = "true";
            const carousel = section.querySelector(".related-carousel");
            section.insertBefore(explanation, carousel || section.firstChild);
        }
        explanation.textContent = `Matched to ${current.title} using publisher, genre, credited creators, collections and release period.`;
    }

    function render(current, games) {
        const container = document.getElementById("relatedGamesTrack");
        const section = document.querySelector(".game-section--related");
        if (!container || !section) return false;

        const slug = gameSlug(current);
        if (!slug || state.renderedSlug === slug) return true;

        const recommendations = selectRecommendations(current, games);
        if (!recommendations.length) return false;

        const kicker = document.getElementById("relatedGamesKicker");
        const title = document.getElementById("relatedGamesTitle");
        if (kicker) kicker.textContent = "SMART ARCHIVE MATCHES";
        if (title) title.textContent = `More Games Connected to ${current.title}`;

        ensureExplanation(section, current);
        container.replaceChildren(...recommendations.map(createCard));
        container.dataset.relatedFor = String(current?.id || slug);
        container.dataset.ccgSmartDiscovery = "true";
        section.hidden = false;
        state.renderedSlug = slug;

        window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event("resize"));
            const viewport = container.closest(".related-carousel")?.querySelector(".related-carousel__viewport");
            viewport?.dispatchEvent(new Event("scroll"));
        });

        return true;
    }

    async function loadGames() {
        if (state.gamesPromise) return state.gamesPromise;
        state.gamesPromise = fetch(DATA_PATH, { cache: "force-cache" })
            .then((response) => {
                if (!response.ok) throw new Error(`Games data HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => Array.isArray(data) ? data : []);
        return state.gamesPromise;
    }

    async function resolveCurrentGame(provided, games) {
        const providedSlug = gameSlug(provided);
        const slug = providedSlug || currentSlug();
        const full = games.find((game) => gameSlug(game) === slug);
        return full || provided || null;
    }

    async function run(providedGame) {
        if (!isSingleGamePage()) return;
        ensureCss();

        try {
            const games = await loadGames();
            const current = await resolveCurrentGame(providedGame, games);
            if (!current) return;
            state.currentGame = current;

            const attempt = () => {
                if (render(current, games)) return;
                window.setTimeout(() => render(current, games), 500);
            };

            if ("requestIdleCallback" in window) {
                requestIdleCallback(attempt, { timeout: 900 });
            } else {
                window.setTimeout(attempt, 180);
            }
        } catch (error) {
            console.warn("[ccg-smart-discovery] Related-game enhancement unavailable", error);
        }
    }

    function schedule(game) {
        window.clearTimeout(state.renderTimer);
        state.renderTimer = window.setTimeout(() => void run(game), 120);
    }

    function init() {
        if (!isSingleGamePage()) return;
        document.addEventListener("ccg:game-loaded", (event) => schedule(event.detail?.game || null));
        window.setTimeout(() => schedule(null), 900);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
