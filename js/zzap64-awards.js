/* ============================================================
   CCG ZZAP!64 AWARDS ARCHIVE
   ------------------------------------------------------------
   Loads the small award files first, renders cards in frame-sized
   batches, then links reviewed games from the full game archive.
   Original-magazine links use a generated verification map backed
   by the official Zzap Bible; page numbers are never guessed.
   Available award-year files are discovered from that map.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_AWARDS_READY) return;
    window.CCG_ZZAP64_AWARDS_READY = true;

    const DEFAULT_YEARS = [1985, 1986, 1987, 1988, 1989];
    const MATCHER_PATH = "/js/ccg-zzap64-matcher.js";
    const REVIEW_LINKS_PATH = "/data/zzap64-review-links.json";
    const ZZAP_HOST = "www.zzap64.co.uk";
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
        years: DEFAULT_YEARS.slice(),
        entries: [],
        games: [],
        gameIndex: null,
        matcher: null,
        linksStatus: "pending",
        reviewLinks: new Map(),
        reviewLinksStatus: "pending",
        query: "",
        year: "all",
        system: "all",
        award: "all",
        renderToken: 0,
        filtersBound: false,
        progressTimer: null,
        gamesPromise: null
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
            }, options.delay ?? 260);
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

    function awardRecordKey(entry) {
        return [
            Number(entry.year),
            String(entry.month || "").trim().toLowerCase(),
            state.matcher.systemKey(entry.system) === "amiga" ? "amiga" : "c64",
            String(entry.title || "").trim()
        ].join("|");
    }

    function issueNumber(entry) {
        const monthIndex = MONTH_ORDER.findIndex((month) => month.toLowerCase() === String(entry.month || "").trim().toLowerCase());
        if (monthIndex < 0) return null;
        const issue = ((Number(entry.year) - 1985) * 12) + monthIndex - 3;
        return issue >= 1 ? issue : null;
    }

    function officialIssueUrl(issue) {
        return `https://${ZZAP_HOST}/zzap${issue}/zzap${issue}.html`;
    }

    function safeZzapUrl(value) {
        try {
            const url = new URL(String(value || ""));
            if (url.protocol !== "https:" || url.hostname !== ZZAP_HOST) return "";
            return url.toString();
        } catch {
            return "";
        }
    }

    function magazineLinkFor(entry) {
        const issue = issueNumber(entry);
        if (!issue) return null;

        const record = state.reviewLinks.get(awardRecordKey(entry));
        const recordUrl = safeZzapUrl(record?.url);
        if (
            recordUrl
            && Number(record?.issue) === issue
            && record.precision === "page"
            && Number.isInteger(Number(record.page))
            && Number(record.page) > 0
        ) {
            return {
                issue,
                page: Number(record.page),
                precision: "page",
                url: recordUrl
            };
        }

        return { issue, page: null, precision: "pending", url: "" };
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
            const magazine = magazineLinkFor(entry);
            const haystack = state.matcher.normalizeText([
                entry.title,
                entry.month,
                entry.year,
                entry.award,
                entry.system,
                entry.score === null ? "not scored" : entry.score,
                magazine?.issue ? `issue ${magazine.issue}` : "",
                magazine?.page ? `page ${magazine.page}` : ""
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
        state.years.forEach((year) => {
            const meta = YEAR_META[year] || {
                label: "Zzap!64 awards retrospective",
                page: `/retro-specials/zzap64-gold-medals-sizzlers-${year}/`
            };
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

    function renderMagazineLink(entry) {
        const magazine = magazineLinkFor(entry);
        if (!magazine) return "";

        if (magazine.precision !== "page" || !magazine.page || !magazine.url) {
            return `
                <span class="zzap-award-card__magazine-link zzap-award-card__magazine-link--pending">
                    <span class="zzap-award-card__magazine-label">Original Zzap!64 scan pending verification</span>
                    <span class="zzap-award-card__magazine-detail">Issue ${escapeHtml(magazine.issue)}</span>
                </span>
            `;
        }

        const aria = `Open the original Zzap!64 review of ${entry.title}, issue ${magazine.issue}, page ${magazine.page}`;
        return `
            <a class="zzap-award-card__magazine-link zzap-award-card__magazine-link--page"
               href="${escapeHtml(magazine.url)}"
               target="_blank"
               rel="noopener noreferrer external"
               aria-label="${escapeHtml(aria)}">
                <span class="zzap-award-card__magazine-label">Read original Zzap!64 review <span aria-hidden="true">↗</span></span>
                <span class="zzap-award-card__magazine-detail">Issue ${escapeHtml(magazine.issue)} · p${escapeHtml(magazine.page)} · zzap64.co.uk</span>
            </a>
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

        const magazine = magazineLinkFor(entry);
        if (magazine?.precision === "page") card.dataset.magazinePageLinked = "true";

        card.innerHTML = `
            <div class="zzap-award-card__top">
                <div class="zzap-award-card__award-mark">
                    ${awardArtwork(entry)}
                    <span class="zzap-award-card__award-details">
                        <span class="zzap-award-card__award-label">${escapeHtml(entry.award)}</span>
                        ${platformArtwork(entry)}
                    </span>
                </div>
                ${renderScore(entry)}
            </div>
            <h3 class="zzap-award-card__title">${renderGameTitle(entry, game)}</h3>
            <div class="zzap-award-card__bottom">
                <div class="zzap-award-card__meta">
                    <span>${escapeHtml(entry.month)} ${escapeHtml(entry.year)}</span>
                    <span>${escapeHtml(entry.system)}</span>
                </div>
                ${renderMagazineLink(entry)}
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
        const yearRange = state.years.length ? `${state.years[0]}–${state.years[state.years.length - 1]}` : "available years";
        const context = parts.length ? parts.join(" · ") : `All indexed awards from ${yearRange}`;
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

    async function loadReviewLinks() {
        state.reviewLinksStatus = "pending";
        try {
            const response = await fetch(REVIEW_LINKS_PATH, { cache: "default" });
            if (!response.ok) throw new Error(`Magazine link index HTTP ${response.status}`);
            const data = await response.json();
            const records = data && typeof data.entries === "object" && data.entries ? data.entries : {};
            const years = Array.isArray(data?.years)
                ? data.years.map(Number).filter((year) => Number.isInteger(year) && year >= 1985).sort((a, b) => a - b)
                : [];
            state.years = years.length ? [...new Set(years)] : DEFAULT_YEARS.slice();
            state.reviewLinks = new Map(Object.entries(records));
            state.reviewLinksStatus = "ready";
        } catch (error) {
            state.reviewLinks = new Map();
            state.reviewLinksStatus = "failed";
            state.years = DEFAULT_YEARS.slice();
            console.warn("[CCG] Exact Zzap!64 magazine page links were unavailable; direct scan links will remain pending.", error);
        }
    }

    async function loadAwardEntries() {
        updateProgress(8, "Loading award records…", `Fetching ${state.years.length} year file${state.years.length === 1 ? "" : "s"} in parallel.`);
        let completedYears = 0;
        const yearResults = await Promise.all(state.years.map(async (year) => {
            const response = await fetch(`/data/zzap64-awards/${year}.json`, { cache: "default" });
            if (!response.ok) throw new Error(`${year} archive HTTP ${response.status}`);
            const data = await response.json();
            const records = Array.isArray(data) ? data : (data.entries || data.awards || []);
            completedYears += 1;
            const yearProgress = 8 + Math.round((completedYears / state.years.length) * 42);
            updateProgress(
                yearProgress,
                "Loading award records…",
                `${completedYears} of ${state.years.length} award years loaded.`
            );
            return records.map((record) => normalizeEntry(record, year));
        }));

        state.entries = yearResults.flat().filter((entry) => (
            entry.year && entry.month && entry.title && entry.award && entry.system
        ));

        const total = document.getElementById("zzapTotalCount");
        if (total) total.textContent = state.entries.length.toLocaleString("en-GB");

        const yearRange = document.getElementById("zzapYearRange");
        const yearCount = document.getElementById("zzapYearCount");
        if (yearRange && state.years.length) yearRange.textContent = `${state.years[0]}–${state.years[state.years.length - 1]}`;
        if (yearCount) yearCount.textContent = `${state.years.length} year${state.years.length === 1 ? "" : "s"} covered`;

        const yearFilter = document.getElementById("zzapYearFilter");
        if (yearFilter) {
            yearFilter.textContent = "";
            const all = document.createElement("option");
            all.value = "all";
            all.textContent = "All years";
            yearFilter.appendChild(all);
            state.years.forEach((year) => {
                const option = document.createElement("option");
                option.value = String(year);
                option.textContent = String(year);
                yearFilter.appendChild(option);
            });
            state.year = "all";
        }

        renderYearCards();
        bindFilters();

        const exactCount = state.entries.filter((entry) => magazineLinkFor(entry)?.precision === "page").length;
        const magazineDetail = state.reviewLinksStatus === "ready"
            ? (exactCount === state.entries.length
                ? " Every indexed award has a verified direct original-review scan link."
                : ` ${exactCount.toLocaleString("en-GB")} direct original-review scan links are verified; unresolved links remain pending rather than opening a generic issue.`)
            : " Direct original-review links will remain pending until the verification map is available.";

        updateProgress(58, "Award records ready", `${state.entries.length.toLocaleString("en-GB")} entries are prepared.${magazineDetail}`);
    }

    async function loadGameArchive() {
        const gamesResponse = await fetch("/games/games.json", { cache: "default" });
        if (!gamesResponse.ok) throw new Error(`Game archive HTTP ${gamesResponse.status}`);
        const gamesData = await gamesResponse.json();
        return Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
    }

    async function loadReviewedGameLinks() {
        updateProgress(66, "Linking reviewed games…", "Using the game index that loaded alongside the award records.");

        try {
            const gameResult = await state.gamesPromise;
            if (gameResult.error) throw gameResult.error;
            state.games = gameResult.games;

            updateProgress(80, "Matching review pages…", `Checking ${state.games.length.toLocaleString("en-GB")} game records against the awards.`);
            state.gameIndex = state.matcher.buildGameIndex(state.games);
            state.linksStatus = "ready";
            await render();
            setControlsEnabled(true);

            updateProgress(100, "Archive ready", "Awards, scores, original magazine links, filters and reviewed-game links are available.");
        } catch (error) {
            state.linksStatus = "failed";
            await render();
            setControlsEnabled(true);
            updateProgress(
                100,
                "Awards ready",
                "The awards and original magazine links loaded, but CCG reviewed-game links could not be checked on this visit.",
                { state: "warning", delay: 1200 }
            );
            console.warn("[CCG] Zzap reviewed-game links were unavailable:", error);
        }
    }

    async function init() {
        setControlsEnabled(false);
        updateProgress(2, "Preparing archive…", "Starting the title matcher and verified original-magazine index.");

        try {
            await ensureScript(MATCHER_PATH);
            state.matcher = window.CCGZzap64Matcher;
            if (!state.matcher) throw new Error("Zzap title matcher did not initialise");

            state.gamesPromise = loadGameArchive().then(
                (games) => ({ games }),
                (error) => ({ error })
            );
            await loadReviewLinks();
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
