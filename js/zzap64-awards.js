/* ============================================================
   CCG ZZAP!64 AWARDS ARCHIVE
   ------------------------------------------------------------
   Loads the small award files first, renders cards in frame-sized
   batches, then links reviewed games from the full game archive.
   Static data uses normal browser caching rather than forced reloads.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_AWARDS_READY) return;
    window.CCG_ZZAP64_AWARDS_READY = true;

    const YEARS = [1985, 1986, 1987, 1988, 1989];
    const MATCHER_PATH = "/js/ccg-zzap64-matcher.js";
    const BATCH_SIZE = window.matchMedia?.("(max-width: 520px)")?.matches ? 12 : 24;
    const ASSETS = Object.freeze({
        gold: "/resources/images/zzap64/zzap64-gold-medal.webp",
        silver: "/resources/images/zzap64/zzap64-silver-medal.svg",
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
    const AWARD_ORDER = ["Gold Medal", "Silver Medal", "Sizzler"];

    const state = {
        entries: [],
        games: [],
        gameIndex: null,
        matcher: null,
        linksStatus: "pending",
        query: "",
        year: "all",
        system: "all",
        award: "all",
        renderToken: 0,
        filtersBound: false,
        progressTimer: null
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

    function nextFrame(callback) {
        if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(callback);
        } else {
            window.setTimeout(callback, 16);
        }
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

    function updateProgress(percent, label, detail, options = {}) {
        const loading = document.getElementById("zzapLoading");
        const progress = document.getElementById("zzapLoadingProgress");
        const bar = document.getElementById("zzapLoadingBar");
        const labelNode = document.getElementById("zzapLoadingLabel");
        const detailNode = document.getElementById("zzapLoadingDetail");
        const percentNode = document.getElementById("zzapLoadingPercent");
        if (!loading) return;

        const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        window.clearTimeout(state.progressTimer);
        loading.hidden = false;
        loading.dataset.state = options.state || "loading";
        loading.setAttribute("aria-busy", safePercent < 100 ? "true" : "false");
        progress?.setAttribute("aria-valuenow", String(safePercent));
        if (bar) bar.style.width = `${safePercent}%`;
        if (labelNode) labelNode.textContent = label;
        if (detailNode) detailNode.textContent = detail;
        if (percentNode) percentNode.textContent = `${safePercent}%`;

        if (safePercent >= 100 && options.hide !== false) {
            state.progressTimer = window.setTimeout(() => {
                loading.hidden = true;
            }, options.delay ?? 900);
        }
    }

    function setControlsEnabled(enabled) {
        ["zzapSearch", "zzapYearFilter", "zzapSystemFilter", "zzapAwardFilter"].forEach((id) => {
            const control = document.getElementById(id);
            if (control) control.disabled = !enabled;
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
        if (!state.gameIndex || state.linksStatus !== "ready") return null;
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

        const fragment = document.createDocumentFragment();
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
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    function awardArtwork(entry) {
        if (entry.award === "Gold Medal") {
            return `<img class="zzap-award-card__award-logo zzap-award-card__award-logo--gold" src="${ASSETS.gold}" alt="Zzap!64 Gold Medal award" width="64" height="108" loading="lazy" decoding="async">`;
        }
        if (entry.award === "Silver Medal") {
            return `<img class="zzap-award-card__award-logo zzap-award-card__award-logo--silver" src="${ASSETS.silver}" alt="Zzap!64 Silver Medal award" width="64" height="108" loading="lazy" decoding="async">`;
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
        if (state.linksStatus === "pending") {
            return `
                <span class="zzap-award-card__game-name">${escapeHtml(entry.title)}</span>
                <span class="zzap-award-card__availability zzap-award-card__availability--checking">Checking review link…</span>
            `;
        }

        if (state.linksStatus === "failed") {
            return `
                <span class="zzap-award-card__game-name">${escapeHtml(entry.title)}</span>
                <span class="zzap-award-card__availability zzap-award-card__availability--unavailable">Review link unavailable</span>
            `;
        }

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

    function updateResultSummary(entries) {
        const count = document.getElementById("zzapVisibleCount");
        const summary = document.getElementById("zzapFilterSummary");
        if (count) count.textContent = entries.length.toLocaleString("en-GB");
        if (!summary) return;

        const parts = [];
        if (state.year !== "all") parts.push(state.year);
        if (state.system !== "all") parts.push(state.system === "c64" ? "C64" : "Amiga");
        if (state.award !== "all") parts.push(state.award.replace(/\b\w/g, (letter) => letter.toUpperCase()));
        if (state.query) parts.push(`“${state.query}”`);
        const context = parts.length ? parts.join(" · ") : "All indexed awards from 1985–1989";
        const linkContext = state.linksStatus === "pending" ? " · review links loading" : "";
        summary.textContent = `${context} · alphabetical order${linkContext}`;
    }

    function render() {
        const grid = document.getElementById("zzapAwardsGrid");
        if (!grid) return Promise.resolve(false);

        const entries = filteredEntries();
        const renderToken = ++state.renderToken;
        grid.textContent = "";
        grid.setAttribute("aria-busy", "true");
        updateResultSummary(entries);

        if (!entries.length) {
            const empty = document.createElement("div");
            empty.className = "zzap-empty";
            empty.textContent = "No Zzap!64 award entries match those filters.";
            grid.appendChild(empty);
            grid.setAttribute("aria-busy", "false");
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            let cursor = 0;

            function appendBatch() {
                if (renderToken !== state.renderToken) {
                    resolve(false);
                    return;
                }

                const fragment = document.createDocumentFragment();
                const limit = Math.min(cursor + BATCH_SIZE, entries.length);
                while (cursor < limit) {
                    fragment.appendChild(createCard(entries[cursor]));
                    cursor += 1;
                }
                grid.appendChild(fragment);

                if (cursor < entries.length) {
                    nextFrame(appendBatch);
                    return;
                }

                grid.setAttribute("aria-busy", "false");
                resolve(true);
            }

            nextFrame(appendBatch);
        });
    }

    function bindFilters() {
        if (state.filtersBound) return;
        state.filtersBound = true;

        const search = document.getElementById("zzapSearch");
        const year = document.getElementById("zzapYearFilter");
        const system = document.getElementById("zzapSystemFilter");
        const award = document.getElementById("zzapAwardFilter");

        search?.addEventListener("input", () => {
            state.query = search.value.trim();
            void render();
        });
        year?.addEventListener("change", () => {
            state.year = year.value;
            void render();
        });
        system?.addEventListener("change", () => {
            state.system = system.value;
            void render();
        });
        award?.addEventListener("change", () => {
            state.award = award.value;
            void render();
        });
    }

    async function loadAwardEntries() {
        updateProgress(8, "Loading award records…", "Fetching the five year files in parallel.");
        const yearResults = await Promise.all(YEARS.map(async (year) => {
            const response = await fetch(`/data/zzap64-awards/${year}.json`, { cache: "default" });
            if (!response.ok) throw new Error(`${year} archive HTTP ${response.status}`);
            const data = await response.json();
            const records = Array.isArray(data) ? data : (data.entries || data.awards || []);
            return records.map((record) => normalizeEntry(record, year));
        }));

        state.entries = yearResults.flat().filter((entry) => (
            entry.year && entry.month && entry.title && entry.award && entry.system
        ));

        const total = document.getElementById("zzapTotalCount");
        if (total) total.textContent = state.entries.length.toLocaleString("en-GB");
        renderYearCards();
        bindFilters();
        setControlsEnabled(true);

        updateProgress(34, "Award records loaded", `${state.entries.length.toLocaleString("en-GB")} entries are ready. Displaying them now.`);
        await render();
        updateProgress(58, "Awards displayed", "The archive is usable while reviewed-game links are being prepared.");
    }

    async function loadReviewedGameLinks() {
        updateProgress(66, "Linking reviewed games…", "Loading the CCG game index with normal browser caching.");

        try {
            const gamesResponse = await fetch("/games/games.json", { cache: "default" });
            if (!gamesResponse.ok) throw new Error(`Game archive HTTP ${gamesResponse.status}`);
            const gamesData = await gamesResponse.json();
            state.games = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);

            updateProgress(80, "Matching review pages…", `Checking ${state.games.length.toLocaleString("en-GB")} game records against the awards.`);
            state.gameIndex = state.matcher.buildGameIndex(state.games);
            state.linksStatus = "ready";
            await render();

            updateProgress(100, "Archive ready", "Awards, scores, filters and reviewed-game links are available.");
        } catch (error) {
            state.linksStatus = "failed";
            await render();
            updateProgress(
                100,
                "Awards ready",
                "The awards loaded, but reviewed-game links could not be checked on this visit.",
                { state: "warning", delay: 3600 }
            );
            console.warn("[CCG] Zzap reviewed-game links were unavailable:", error);
        }
    }

    async function init() {
        setControlsEnabled(false);
        updateProgress(2, "Preparing archive…", "Starting the title matcher and award index.");

        try {
            await ensureScript(MATCHER_PATH);
            state.matcher = window.CCGZzap64Matcher;
            if (!state.matcher) throw new Error("Zzap title matcher did not initialise");

            await loadAwardEntries();
            await loadReviewedGameLinks();
        } catch (error) {
            const grid = document.getElementById("zzapAwardsGrid");
            if (grid) {
                grid.setAttribute("aria-busy", "false");
                grid.innerHTML = '<div class="zzap-empty">The awards index could not be loaded. Refresh the page to try again.</div>';
            }
            updateProgress(
                100,
                "Archive unavailable",
                "The award records could not be loaded. Refresh the page to try again.",
                { state: "error", hide: false }
            );
            console.error("[CCG] Zzap!64 awards archive failed:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
