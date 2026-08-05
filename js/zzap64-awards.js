/* ============================================================
   CCG ZZAP!64 AWARDS ARCHIVE
   ------------------------------------------------------------
   Loads verified year data, matches awards to the game archive,
   sorts results alphabetically and keeps future game additions
   linkable without editing the award records again.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_AWARDS_READY) return;
    window.CCG_ZZAP64_AWARDS_READY = true;

    const YEARS = [1985, 1986, 1987, 1988, 1989];
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
    const TITLE_ALIAS_GROUPS = [
        ["super pipeline", "super pipeline ii", "super pipeline 2"],
        ["gremlins", "gremlins the adventure"],
        ["rockfords riot", "boulder dash ii rockfords revenge", "boulder dash 2 rockfords revenge"],
        ["spy vs spy ii", "spy vs spy ii the island caper", "spy vs spy 2 the island caper"],
        ["graphic adventure creator", "gac"],
        ["shoot em up construction kit", "seuck"],
        ["international karate plus", "international karate +", "ik+"],
        ["federation of free traders", "foft"],
        ["the duel test drive ii", "test drive ii the duel", "test drive 2 the duel"],
        ["cybernoid ii", "cybernoid ii the revenge", "cybernoid 2 the revenge"],
        ["last ninja 2", "last ninja ii"],
        ["impossible mission 2", "impossible mission ii"],
        ["summer games 2", "summer games ii"],
        ["pitstop 2", "pitstop ii"],
        ["beach head 2", "beach head ii"],
        ["who dares wins 2", "who dares wins ii"],
        ["f 16 combat pilot", "f16 combat pilot"],
        ["b 24 flight simulator", "b24 flight simulator"],
        ["r i s k", "risk"],
        ["a p b", "apb"],
        ["r type", "rtype"],
        ["pac mania", "pacmania"],
        ["led storm", "l e d storm"],
        ["m u l e", "mule"],
        ["ghosts n goblins", "ghosts and goblins"],
        ["north and south", "north south"],
        ["return of the mutant camels", "revenge of the mutant camels ii", "revenge of the mutant camels 2"]
    ];

    const state = {
        entries: [],
        games: [],
        gamesByTitle: new Map(),
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

    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’‘`]/g, "'")
            .replace(/&/g, " and ")
            .replace(/\+/g, " plus ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    const titleAliases = (() => {
        const map = new Map();
        TITLE_ALIAS_GROUPS.forEach((group) => {
            const canonical = normalizeText(group[0]);
            group.forEach((title) => map.set(normalizeText(title), canonical));
        });
        return map;
    })();

    function titleKey(value) {
        const normalized = normalizeText(value).replace(/^(the|a|an)\s+/, "");
        return titleAliases.get(normalized) || normalized;
    }

    function systemKey(value) {
        const normalized = normalizeText(value);
        if (normalized.includes("amiga")) return "amiga";
        if (normalized === "c64" || normalized.includes("commodore 64")) return "c64";
        return normalized;
    }

    function normalizeAward(value) {
        const normalized = normalizeText(value);
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

    function buildGameIndex() {
        state.gamesByTitle = new Map();

        state.games.forEach((game) => {
            const candidates = [game?.title, game?.sorttitle, game?.name, game?.slug, game?.id].filter(Boolean);
            candidates.forEach((candidate) => {
                const key = titleKey(candidate);
                if (!key) return;
                const bucket = state.gamesByTitle.get(key) || [];
                if (!bucket.includes(game)) bucket.push(game);
                state.gamesByTitle.set(key, bucket);
            });
        });
    }

    function findGame(entry) {
        const matches = state.gamesByTitle.get(titleKey(entry.title)) || [];
        if (!matches.length) return null;

        const requestedSystem = systemKey(entry.system);
        const exactSystem = matches.find((game) => systemKey(game.system || game.platform) === requestedSystem);
        if (exactSystem) return exactSystem;

        return matches.length === 1 ? matches[0] : null;
    }

    function gameHref(game) {
        const slug = String(game?.slug || game?.id || "").trim().replace(/^\/+|\/+$/g, "");
        return slug ? `/games/${encodeURIComponent(slug)}/` : "";
    }

    function sortTitle(value) {
        return normalizeText(value).replace(/^(the|a|an)\s+/, "");
    }

    function compareEntriesAlphabetically(a, b) {
        return sortTitle(a.title).localeCompare(sortTitle(b.title), "en-GB", { numeric: true })
            || String(a.title).localeCompare(String(b.title), "en-GB", { numeric: true })
            || Number(a.year) - Number(b.year)
            || MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
            || systemKey(a.system).localeCompare(systemKey(b.system))
            || AWARD_ORDER.indexOf(a.award) - AWARD_ORDER.indexOf(b.award);
    }

    function filteredEntries() {
        const query = normalizeText(state.query);

        return state.entries.filter((entry) => {
            const queryMatch = !query || query.split(" ").filter(Boolean).every((term) => normalizeText([
                entry.title,
                entry.month,
                entry.year,
                entry.award,
                entry.system,
                entry.score === null ? "not scored" : entry.score
            ].join(" ")).includes(term));
            const yearMatch = state.year === "all" || String(entry.year) === state.year;
            const systemMatch = state.system === "all" || systemKey(entry.system) === state.system;
            const awardMatch = state.award === "all" || normalizeText(entry.award) === state.award;
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

    function renderGameTitle(entry, game) {
        const href = gameHref(game);
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

        const game = findGame(entry);
        card.innerHTML = `
            <div class="zzap-award-card__top">
                <span class="zzap-award-card__badge">${escapeHtml(entry.award)}</span>
                ${renderScore(entry)}
            </div>
            <h3 class="zzap-award-card__title">${renderGameTitle(entry, game)}</h3>
            <div class="zzap-award-card__meta">
                <span>${escapeHtml(entry.month)} ${escapeHtml(entry.year)}</span>
                <span>${escapeHtml(entry.system)}</span>
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

        try {
            const response = await fetch("/games/games-search.json", { cache: "no-store" });
            const data = response.ok ? await response.json() : [];
            state.games = Array.isArray(data) ? data : (data.games || []);
        } catch (error) {
            state.games = [];
        }

        buildGameIndex();
    }

    async function init() {
        bindFilters();
        try {
            await loadAll();
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
