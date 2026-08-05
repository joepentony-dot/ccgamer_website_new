/* ============================================================
   CCG ZZAP!64 AWARDS ARCHIVE
============================================================ */

(function () {
    "use strict";

    const YEARS = [1985, 1986, 1987, 1988, 1989];
    const YEAR_META = {
        1985: { label: "The year Zzap!64 began", count: 50, page: "/retro-specials/zzap64-gold-medals-sizzlers-1985/" },
        1986: { label: "The first full calendar year", count: 62, page: "/retro-specials/zzap64-gold-medals-sizzlers-1986/" },
        1987: { label: "A much stranger awards year", count: 42, page: "/retro-specials/zzap64-gold-medals-sizzlers-1987/" },
        1988: { label: "C64 and Amiga coverage converged", count: 55, page: "/retro-specials/zzap64-gold-medals-sizzlers-1988/" },
        1989: { label: "Dual-platform reviews became common", count: 79, page: "/retro-specials/zzap64-gold-medals-sizzlers-1989/" }
    };

    const state = {
        entries: [],
        games: [],
        query: "",
        year: "all",
        system: "all",
        award: "all"
    };

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9\s]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizeEntry(raw, year) {
        if (Array.isArray(raw)) {
            return { year, month: raw[0], title: raw[1], award: raw[2], score: raw[3], system: raw[4] || "C64" };
        }
        return {
            year: Number(raw.year || year),
            month: String(raw.month || ""),
            title: String(raw.title || "Untitled"),
            award: String(raw.award || "Sizzler"),
            score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : null,
            system: String(raw.system || "C64")
        };
    }

    function titleAliases(title) {
        const normalized = normalize(title);
        const withoutArticle = normalized.replace(/^(the|a|an)\s+/, "");
        return new Set([normalized, withoutArticle]);
    }

    function findGame(title, system) {
        const aliases = titleAliases(title);
        const matches = state.games.filter((game) => {
            const gameAliases = titleAliases(game.title);
            return Array.from(aliases).some((alias) => gameAliases.has(alias));
        });
        if (!matches.length) return null;
        const systemMatch = matches.find((game) => normalize(game.system) === normalize(system));
        return systemMatch || matches[0];
    }

    function gameHref(game) {
        if (!game?.slug) return "";
        return `/games/${String(game.slug).replace(/^\/+|\/+$/g, "")}/`;
    }

    async function load() {
        const yearRequests = YEARS.map((year) =>
            fetch(`/data/zzap64-awards/${year}.json`, { cache: "no-store" })
                .then((response) => {
                    if (!response.ok) throw new Error(`${year} archive HTTP ${response.status}`);
                    return response.json();
                })
                .then((records) => records.map((record) => normalizeEntry(record, year)))
        );

        const gameRequest = fetch("/games/games-search.json", { cache: "no-store" })
            .then((response) => response.ok ? response.json() : [])
            .catch(() => []);

        const results = await Promise.all([...yearRequests, gameRequest]);
        state.games = Array.isArray(results.pop()) ? results.pop?.() : state.games;
    }

    async function loadAll() {
        const yearResults = await Promise.all(YEARS.map(async (year) => {
            const response = await fetch(`/data/zzap64-awards/${year}.json`, { cache: "no-store" });
            if (!response.ok) throw new Error(`${year} archive HTTP ${response.status}`);
            const records = await response.json();
            return records.map((record) => normalizeEntry(record, year));
        }));
        state.entries = yearResults.flat();

        try {
            const response = await fetch("/games/games-search.json", { cache: "no-store" });
            state.games = response.ok ? await response.json() : [];
        } catch (error) {
            state.games = [];
        }
    }

    function renderYearCards() {
        const container = document.getElementById("zzapYearCards");
        if (!container) return;
        container.textContent = "";

        YEARS.forEach((year) => {
            const meta = YEAR_META[year];
            const card = document.createElement("a");
            card.className = "zzap-year-card";
            card.href = meta.page;
            card.innerHTML = `
                <span class="zzap-year-card__year">${year}</span>
                <span class="zzap-year-card__count">${meta.count} award entries · ${meta.label}</span>
                <span class="zzap-year-card__link">Watch the full retrospective →</span>
            `;
            container.appendChild(card);
        });
    }

    function filteredEntries() {
        const query = normalize(state.query);
        return state.entries.filter((entry) => {
            const queryMatch = !query || normalize(`${entry.title} ${entry.month} ${entry.award} ${entry.system}`).includes(query);
            const yearMatch = state.year === "all" || String(entry.year) === state.year;
            const systemMatch = state.system === "all" || normalize(entry.system) === state.system;
            const awardMatch = state.award === "all" || normalize(entry.award) === state.award;
            return queryMatch && yearMatch && systemMatch && awardMatch;
        });
    }

    function createCard(entry) {
        const card = document.createElement("article");
        card.className = "zzap-award-card";
        card.dataset.award = entry.award;

        const game = findGame(entry.title, entry.system);
        const href = gameHref(game);
        const title = href
            ? `<a href="${href}">${escapeHtml(entry.title)}</a>`
            : escapeHtml(entry.title);
        const score = entry.score === null ? "No %" : `${entry.score}%`;

        card.innerHTML = `
            <div class="zzap-award-card__top">
                <span class="zzap-award-card__badge">${escapeHtml(entry.award)}</span>
                <span class="zzap-award-card__score">${score}</span>
            </div>
            <h3 class="zzap-award-card__title">${title}</h3>
            <div class="zzap-award-card__meta">
                <span>${entry.month} ${entry.year}</span>
                <span>${escapeHtml(entry.system)}</span>
            </div>
        `;
        return card;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
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
            summary.textContent = parts.length ? parts.join(" · ") : "All indexed awards from 1985–1989";
        }
    }

    function bindFilters() {
        const search = document.getElementById("zzapSearch");
        const year = document.getElementById("zzapYearFilter");
        const system = document.getElementById("zzapSystemFilter");
        const award = document.getElementById("zzapAwardFilter");

        search?.addEventListener("input", () => { state.query = search.value.trim(); render(); });
        year?.addEventListener("change", () => { state.year = year.value; render(); });
        system?.addEventListener("change", () => { state.system = system.value; render(); });
        award?.addEventListener("change", () => { state.award = award.value; render(); });
    }

    async function init() {
        renderYearCards();
        bindFilters();
        try {
            await loadAll();
            const total = document.getElementById("zzapTotalCount");
            if (total) total.textContent = state.entries.length.toLocaleString("en-GB");
            render();
        } catch (error) {
            const grid = document.getElementById("zzapAwardsGrid");
            if (grid) grid.innerHTML = `<div class="zzap-empty">The awards index could not be loaded. Please refresh and try again.</div>`;
            console.error("[CCG] Zzap awards archive failed:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
