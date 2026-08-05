/* ============================================================
   CCG ZZAP!64 AWARDS ARCHIVE
   ------------------------------------------------------------
   Loads verified year data, matches awards against games.json,
   displays award/platform artwork and keeps future game additions
   linkable without editing the archive records again.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_AWARDS_READY) return;
    window.CCG_ZZAP64_AWARDS_READY = true;

    const YEARS = [1985, 1986, 1987, 1988, 1989];
    const MATCHER_PATH = "/js/ccg-zzap64-matcher.js";
    const ASSETS = Object.freeze({
        gold: "/resources/images/zzap64/zzap64-gold-medal.webp",
        sizzler: "/resources/images/zzap64/zzap64-sizzler.webp",
        c64: "/resources/images/platforms/commodore-64-logo.webp",
        amiga: "/resources/images/platforms/commodore-amiga-logo.webp"
    });
    const YEAR_META = {
        1985: { label: "The year Zzap!64 began", page: "/retro-specials/zzap64-gold-medals-sizzlers-1985/" },
        1986: { label: "The first full calendar year", page: "/retro-specials/zzap64-gold-medals-sizzlers-1986/" },
        1987: { label: "A much stranger awards year", page: "/retro-specials/zzap64-gold-medals-sizzlers-1987/" },
        1988: { label: "C64 and Amiga coverage converged", page: "/retro-specials/zzap64-gold-medals-sizzlers-1988/" },
        1989: { label: "Dual-platform reviews became common", page: "/retro-specials/zzap64-gold-medals-sizzlers-1989/" }
    };
    const MONTH_ORDER = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const AWARD_ORDER = ["Gold Medal", "Sizzler", "Silver Medal"];

    const state = {
        entries: [],
        games: [],
        gameIndex: null,
        matcher: null,
        query: "",
        year: "all",
        system: "all",
        award: "all"
    };

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        })[character]);
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

    function normalizeAward(value) {
        const normalized = state.matcher.normalizeText(value);
        if (normalized.includes("gold")) return "Gold Medal";
        if (normalized.includes("silver")) return "Silver Medal";
        return "Sizzler";
    }

    function normalizeScore(value) {
        if (value === null || value === undefined || value === "") return null;
        const score = Number(value);
        return Number.isFinite(score) ? score : null;
    }

    function normalizeEntry(raw, fallbackYear) {
        if (Array.isArray(raw)) {
            return {
                year: Number(fallbackYear),
                month: String(raw[0] || ""),
                title: String(raw[1] || ""),
                award: normalizeAward(raw[2]),
                score: normalizeScore(raw[3]),
                system: String(raw[4] || "C64")
            };
        }

        return {
            year: Number(raw.year || fallbackYear),
            month: String(raw.month || ""),
            title: String(raw.title || raw.game || ""),
            award: normalizeAward(raw.award),
            score: normalizeScore(raw.score),
            system: String(raw.system || raw.platform || "C64")
        };
    }

    function findGame(entry) {
        return state.matcher.findGame(entry, state.gameIndex);
    }

    function sortTitle(value) {
        return state.matcher.canonicalTitle(value);
    }

    function compareEntriesAlphabetically(a, b) {
        return sortTitle(a.title).localeCompare(sortTitle(b.title), "en-GB", { numeric: true })
            || String(a.title).localeCompare(String(b.title), "en-GB", { numeric: true })
            || Number(a.year) - Number(b.year)
            || MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
            || state.matcher.systemKey(a.system).localeCompare(state.matcher.systemKey(b.system))
            || AWARD_ORDER.indexOf(a.award) - AWARD_ORDER.indexOf(b.award);
    }

    function filteredEntries() {
        const query = state.matcher.normalizeText(state.query);

        return state.entries.filter((entry) => {
            const haystack = state.matcher.normalizeText([
                entry.title,
                entry.month,
                entry.year,
                entry.award,
                entry.system,
                entry.score === null ? "not scored" : entry.score
            ].join(" "));
            const queryMatch = !query || query.split(" ").filter(Boolean).every((term) => haystack.includes(term));
            const yearMatch = state.year === "all" || String(entry.year) === state.year;
            const systemMatch = state.system === "all" || state.matcher.systemKey(entry.system) === state.system;
            const awardMatch = state.award === "all" || state.matcher.normalizeText(entry.award) === state.award;
            return queryMatch && yearMatch && systemMatch && awardMatch;
        }).sort(compareEntriesAlphabetically);
    }

    function renderYearCards() {
        const container = document.getElementById("zzapYearCards");
        if (!container) return;
        container.textContent = "";

        YEARS.forEach((year) => {
            const meta = YEAR_META[year];
            const count = state.entries.filter((entry) => entry.year === year).length;
            const card = document.createElement("a");
            card.className = "zzap-year-card";
            card.href = meta.page;
            card.innerHTML = `
                <span class="zzap-year-card__year">${year}</span>
                <span class="zzap-year-card__count">${count.toLocaleString("en-GB")} award entries · ${escapeHtml(meta.label)}</span>
                <span class="zzap-year-card__link">Watch the full retrospective →</span>
            `;
            container.appendChild(card);
        });
    }

    function awardArtwork(entry) {
        if (entry.award === "Gold Medal") {
            return `<img class="zzap-award-card__award-logo zzap-award-card__award-logo--gold" src="${ASSETS.gold}" alt="Zzap!64 Gold Medal award" width="64" height="108" loading="lazy" decoding="async">`;
        }
        if (entry.award === "Sizzler") {
            return `<img class="zzap-award-card__award-logo zzap-award-card__award-logo--sizzler" src="${ASSETS.sizzler}" alt="Zzap!64 Sizzler award" width="96" height="72" loading="lazy" decoding="async">`;
        }
        return `<span class="zzap-award-card__badge">${escapeHtml(entry.award)}</span>`;
    }

    function platformArtwork(entry) {
        const system = state.matcher.systemKey(entry.system);
        if (system === "amiga") {
            return `<span class="zzap-award-card__platform zzap-award-card__platform--amiga"><img src="${ASSETS.amiga}" alt="Commodore Amiga" width="170" height="63" loading="lazy" decoding="async"></span>`;
        }
        return `<span class="zzap-award-card__platform zzap-award-card__platform--c64"><img src="${ASSETS.c64}" alt="Commodore 64" width="180" height="18" loading="lazy" decoding="async"></span>`;
    }

    function renderGameTitle(entry, game) {
        const href = state.matcher.gameHref(game);
        if (game && href) {
            return `
                <a class="zzap-award-card__game-link" href="${escapeHtml(href)}" aria-label="Open the CCG game page for ${escapeHtml(entry.title)}">
                    <span class="zzap-award-card__game-name">${escapeHtml(entry.title)}</span>
                    <span class="zzap-award-card__game-action">Open game page <span aria-hidden="true">→</span></span>
                </a>
            `;
        }

        return `
            <span class="zzap-award-card__game-name">${escapeHtml(entry.title)}</span>
            <span class="zzap-award-card__availability">Not yet reviewed</span>
        `;
    }

    function renderScore(entry) {
        if (entry.score === null) {
            return '<span class="zzap-award-card__score zzap-award-card__score--unscored">Not scored by Zzap!64</span>';
        }
        return `<span class="zzap-award-card__score">${escapeHtml(entry.score)}%</span>`;
    }

    function createCard(entry) {
        const card = document.createElement("article");
        card.className = "zzap-award-card";
        card.dataset.award = entry.award;
        card.dataset.system = state.matcher.systemKey(entry.system);

        const game = findGame(entry);
        if (game) card.dataset.gameLinked = "true";

        card.innerHTML = `
            <div class="zzap-award-card__top">
                <div class="zzap-award-card__award-mark">
                    ${awardArtwork(entry)}
                    <span class="zzap-award-card__award-label">${escapeHtml(entry.award)}</span>
                </div>
                ${renderScore(entry)}
            </div>
            <h3 class="zzap-award-card__title">${renderGameTitle(entry, game)}</h3>
            <div class="zzap-award-card__bottom">
                <div class="zzap-award-card__meta">
                    <span>${escapeHtml(entry.month)} ${escapeHtml(entry.year)}</span>
                    <span>${escapeHtml(entry.system)}</span>
                </div>
                ${platformArtwork(entry)}
            </div>
        `;
        return card;
    }

    function render() {
        const grid = document.getElementById("zzapAwardsGrid");
        const count = document.getElementById("zzapVisibleCount");
        const summary = document.getElementById("zzapFilterSummary");
        if (!grid) return;

        const entries = filteredEntries();
        grid.textContent = "";

        if (!entries.length) {
            const empty = document.createElement("div");
            empty.className = "zzap-empty";
            empty.textContent = "No Zzap!64 award entries match those filters.";
            grid.appendChild(empty);
        } else {
            entries.forEach((entry) => grid.appendChild(createCard(entry)));
        }

        if (count) count.textContent = entries.length.toLocaleString("en-GB");
        if (summary) {
            const parts = [];
            if (state.year !== "all") parts.push(state.year);
            if (state.system !== "all") parts.push(state.system === "c64" ? "C64" : "Amiga");
            if (state.award !== "all") parts.push(state.award.replace(/\b\w/g, (letter) => letter.toUpperCase()));
            if (state.query) parts.push(`“${state.query}”`);
            const context = parts.length ? parts.join(" · ") : "All indexed awards from 1985–1989";
            summary.textContent = `${context} · alphabetical order`;
        }
    }

    function bindFilters() {
        const search = document.getElementById("zzapSearch");
        const year = document.getElementById("zzapYearFilter");
        const system = document.getElementById("zzapSystemFilter");
        const award = document.getElementById("zzapAwardFilter");

        search?.addEventListener("input", () => {
            state.query = search.value.trim();
            render();
        });
        year?.addEventListener("change", () => {
            state.year = year.value;
            render();
        });
        system?.addEventListener("change", () => {
            state.system = system.value;
            render();
        });
        award?.addEventListener("change", () => {
            state.award = award.value;
            render();
        });
    }

    async function loadAll() {
        await ensureScript(MATCHER_PATH);
        state.matcher = window.CCGZzap64Matcher;
        if (!state.matcher) throw new Error("Zzap title matcher did not initialise");

        const yearResults = await Promise.all(YEARS.map(async (year) => {
            const response = await fetch(`/data/zzap64-awards/${year}.json`, { cache: "no-store" });
            if (!response.ok) throw new Error(`${year} archive HTTP ${response.status}`);
            const data = await response.json();
            const records = Array.isArray(data) ? data : (data.entries || data.awards || []);
            return records.map((record) => normalizeEntry(record, year));
        }));

        state.entries = yearResults.flat().filter((entry) => (
            entry.year && entry.month && entry.title && entry.award && entry.system
        ));

        const gamesResponse = await fetch("/games/games.json", { cache: "no-store" });
        if (!gamesResponse.ok) throw new Error(`Game archive HTTP ${gamesResponse.status}`);
        const gamesData = await gamesResponse.json();
        state.games = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
        state.gameIndex = state.matcher.buildGameIndex(state.games);
    }

    async function init() {
        try {
            await loadAll();
            bindFilters();
            const total = document.getElementById("zzapTotalCount");
            if (total) total.textContent = state.entries.length.toLocaleString("en-GB");
            renderYearCards();
            render();
        } catch (error) {
            const grid = document.getElementById("zzapAwardsGrid");
            if (grid) grid.innerHTML = '<div class="zzap-empty">The awards index could not be loaded. Refresh the page to try again.</div>';
            console.error("[CCG] Zzap!64 awards archive failed:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
