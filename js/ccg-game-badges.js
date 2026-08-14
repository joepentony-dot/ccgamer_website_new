/* ============================================================
   CCG SINGLE-GAME ZZAP!64 AWARD BADGES
   ------------------------------------------------------------
   Adds supplied Gold Medal/Silver Medal/Sizzler artwork when a game
   appears in the verified Zzap!64 award archive.
   Award badges link directly to their verified original review scan.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_GAME_BADGES_READY) return;
    window.CCG_GAME_BADGES_READY = true;

    const isSingleGame = document.documentElement.getAttribute("data-ccg-page") === "single-game"
        || Boolean(document.querySelector(".ccg-page--single-game"));
    if (!isSingleGame) return;

    const YEARS = [1985, 1986, 1987, 1988, 1989];
    const MATCHER_PATH = "/js/ccg-zzap64-matcher.js";
    const REVIEW_LINKS_PATH = "/data/zzap64-review-links.json";
    const CSS_PATH = "/resources/css/ccg-game-badges.css";
    const ASSETS = Object.freeze({
        gold: "/resources/images/zzap64/zzap64-gold-medal.webp",
        silver: "/resources/images/zzap64/zzap64-silver-medal.svg",
        sizzler: "/resources/images/zzap64/zzap64-sizzler.webp"
    });

    function ensureStylesheet() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function ensureScript(src) {
        if (src === MATCHER_PATH && window.CCGZzap64Matcher) return Promise.resolve();
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            return new Promise((resolve, reject) => {
                if (src === MATCHER_PATH && window.CCGZzap64Matcher) {
                    resolve();
                    return;
                }
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.defer = true;
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener("error", reject, { once: true });
            document.head.appendChild(script);
        });
    }

    function normalizeRequestedId() {
        const params = new URLSearchParams(window.location.search);
        const queryValue = params.get("id") || params.get("slug") || "";
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const pathValue = pathParts[0] === "games" && pathParts[1] && pathParts[1] !== "game.html"
            ? pathParts[1]
            : "";

        try {
            return decodeURIComponent(queryValue || pathValue)
                .trim()
                .toLowerCase()
                .replace(/^\/+|\/+$/g, "");
        } catch (error) {
            return String(queryValue || pathValue).trim().toLowerCase().replace(/^\/+|\/+$/g, "");
        }
    }

    function normalizeEntry(raw, year) {
        if (Array.isArray(raw)) {
            return {
                year,
                month: String(raw[0] || ""),
                title: String(raw[1] || ""),
                award: String(raw[2] || ""),
                score: raw[3] === null || raw[3] === undefined || raw[3] === "" ? null : Number(raw[3]),
                system: String(raw[4] || "C64")
            };
        }
        return {
            year: Number(raw.year || year),
            month: String(raw.month || ""),
            title: String(raw.title || raw.game || ""),
            award: String(raw.award || ""),
            score: raw.score === null || raw.score === undefined || raw.score === "" ? null : Number(raw.score),
            system: String(raw.system || raw.platform || "C64")
        };
    }

    function resolveGame(games, requestedId, matcher) {
        const exact = games.find((game) => {
            const values = [game?.id, game?.slug]
                .filter(Boolean)
                .map((value) => String(value).trim().toLowerCase().replace(/^\/+|\/+$/g, ""));
            return values.includes(requestedId);
        });
        if (exact) return exact;

        const title = document.getElementById("gameHeroTitle")?.textContent?.trim();
        if (!title) return null;
        const pageSystem = document.getElementById("gameMetaSystem")?.textContent?.trim() || "";
        return matcher.findGame({ title, system: pageSystem }, matcher.buildGameIndex(games));
    }

    function entryMatchesGame(entry, game, matcher) {
        const entrySystem = matcher.systemKey(entry.system);
        const gameSystem = matcher.systemKey(game.system || game.platform);
        if (entrySystem && gameSystem && entrySystem !== gameSystem) return false;

        const gameVariants = new Set([
            game.title,
            game.sorttitle,
            game.name,
            game.slug,
            game.id
        ].filter(Boolean).flatMap((value) => matcher.titleVariants(value)));
        const exact = matcher.titleVariants(entry.title).some((variant) => gameVariants.has(variant));
        if (exact) return true;

        return matcher.scoreGame(entry, game) >= 108;
    }

    function awardPriority(entry) {
        const award = matcherText(entry.award);
        if (award.includes("gold")) return 0;
        if (award.includes("silver")) return 1;
        if (award.includes("sizzler")) return 2;
        return 3;
    }

    function matcherText(value) {
        return window.CCGZzap64Matcher.normalizeText(value);
    }

    function reviewRecordKey(entry, matcher) {
        return [
            Number(entry.year),
            String(entry.month || "").trim().toLowerCase(),
            matcher.systemKey(entry.system) === "amiga" ? "amiga" : "c64",
            String(entry.title || "").trim()
        ].join("|");
    }

    function verifiedReview(row) {
        if (!row || row.precision !== "page") return null;
        const issue = Number(row.issue);
        const page = Number(row.page);
        if (!Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) return null;
        try {
            const url = new URL(String(row.url || ""));
            const host = url.hostname.replace(/^www\./i, "").toLowerCase();
            if (url.protocol !== "https:" || host !== "zzap64.co.uk") return null;
            if (url.pathname.toLowerCase() !== "/cgi-bin/displaypage.pl") return null;
            if (Number(url.searchParams.get("issue")) !== issue || Number(url.searchParams.get("page")) !== page) return null;
            return { url: url.toString(), issue, page };
        } catch {
            return null;
        }
    }

    function attachReviewLinks(entries, reviewData, matcher) {
        const records = reviewData && typeof reviewData.entries === "object" && reviewData.entries
            ? reviewData.entries
            : {};
        return entries.map((entry) => {
            const review = verifiedReview(records[reviewRecordKey(entry, matcher)]);
            return review ? {
                ...entry,
                reviewUrl: review.url,
                reviewIssue: review.issue,
                reviewPage: review.page
            } : entry;
        });
    }

    function uniqueAwards(entries) {
        const seen = new Set();
        return entries
            .filter((entry) => {
                const award = matcherText(entry.award);
                return award.includes("gold") || award.includes("silver") || award.includes("sizzler");
            })
            .sort((a, b) => awardPriority(a) - awardPriority(b) || a.year - b.year)
            .filter((entry) => {
                const key = [matcherText(entry.award), entry.year, entry.month, entry.score].join("|");
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function createAwardBadge(entry) {
        const award = matcherText(entry.award);
        const isGold = award.includes("gold");
        const isSilver = award.includes("silver");
        const type = isGold ? "gold" : (isSilver ? "silver" : "sizzler");
        const isLinked = Boolean(entry.reviewUrl);

        const badge = document.createElement(isLinked ? "a" : "div");
        badge.className = `ccg-game-badge ccg-game-badge--award ccg-game-badge--${type}`;
        if (isLinked) {
            badge.href = entry.reviewUrl;
            badge.target = "_blank";
            badge.rel = "noopener noreferrer external";
            badge.setAttribute("aria-label", `Read the original Zzap!64 review for ${entry.title}, issue ${entry.reviewIssue}, page ${entry.reviewPage}`);
            badge.title = `Read original Zzap!64 review · Issue ${entry.reviewIssue}, p${entry.reviewPage}`;
        }

        const image = document.createElement("img");
        image.className = "ccg-game-badge__image";
        image.src = isGold ? ASSETS.gold : (isSilver ? ASSETS.silver : ASSETS.sizzler);
        image.alt = isGold
            ? "Zzap!64 Gold Medal award"
            : (isSilver ? "Zzap!64 Silver Medal award" : "Zzap!64 Sizzler award");
        image.width = (isGold || isSilver) ? 64 : 96;
        image.height = (isGold || isSilver) ? 108 : 72;
        image.loading = "lazy";
        image.decoding = "async";

        const copy = document.createElement("span");
        copy.className = "ccg-game-badge__copy";

        const title = document.createElement("span");
        title.className = "ccg-game-badge__title";
        title.textContent = isGold
            ? "Zzap!64 Gold Medal"
            : (isSilver ? "Zzap!64 Silver Medal" : "Zzap!64 Sizzler");

        const detail = document.createElement("span");
        detail.className = "ccg-game-badge__detail";
        const score = Number.isFinite(entry.score) ? ` · ${entry.score}%` : "";
        const reviewHint = isLinked ? " · Review ↗" : "";
        detail.textContent = `${entry.month} ${entry.year}${score}${reviewHint}`;

        copy.append(title, detail);
        badge.append(image, copy);
        return badge;
    }

    function insertBadges(awards) {
        const unique = uniqueAwards(awards);
        if (!unique.length) return true;

        const heroContent = document.querySelector(".game-hero__content");
        const target = heroContent?.querySelector(".game-hero__actions")
            || heroContent?.querySelector(".game-hero__badges")
            || heroContent?.querySelector(".game-hero__title-row");
        if (!target || document.querySelector(".ccg-game-badges")) return false;

        const row = document.createElement("div");
        row.className = "ccg-game-badges";
        row.setAttribute("aria-label", "Zzap!64 awards");
        unique.forEach((entry) => row.appendChild(createAwardBadge(entry)));
        target.insertAdjacentElement("afterend", row);
        return true;
    }

    async function loadAwards() {
        const yearGroups = await Promise.all(YEARS.map(async (year) => {
            const response = await fetch(`/data/zzap64-awards/${year}.json`, { cache: "no-store" });
            if (!response.ok) return [];
            const data = await response.json();
            const rows = Array.isArray(data) ? data : (data.entries || data.awards || []);
            return rows.map((raw) => normalizeEntry(raw, year));
        }));
        return yearGroups.flat();
    }

    async function loadReviewLinks() {
        const response = await fetch(REVIEW_LINKS_PATH, { cache: "default" });
        if (!response.ok) throw new Error(`Zzap review links HTTP ${response.status}`);
        return response.json();
    }

    async function init() {
        ensureStylesheet();
        try {
            await ensureScript(MATCHER_PATH);
            const matcher = window.CCGZzap64Matcher;
            if (!matcher) throw new Error("Zzap matcher unavailable");

            const [gamesResponse, rawEntries, reviewData] = await Promise.all([
                fetch("/games/games.json", { cache: "no-store" }),
                loadAwards(),
                loadReviewLinks()
            ]);
            if (!gamesResponse.ok) throw new Error(`Game archive HTTP ${gamesResponse.status}`);
            const gamesData = await gamesResponse.json();
            const games = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
            const requestedId = normalizeRequestedId();
            const game = resolveGame(games, requestedId, matcher);
            if (!game) return;

            const entries = attachReviewLinks(rawEntries, reviewData, matcher);
            const awards = entries.filter((entry) => entryMatchesGame(entry, game, matcher));
            if (!insertBadges(awards)) {
                window.setTimeout(() => insertBadges(awards), 180);
            }
        } catch (error) {
            console.warn("[CCG] Game badge layer could not be loaded:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
