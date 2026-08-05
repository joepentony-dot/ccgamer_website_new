/* ============================================================
   CCG SEARCH RANKING ENHANCEMENT
   ------------------------------------------------------------
   Reorders global-search results by relevance and supplies
   restrained typo/alias suggestions when a direct search fails.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_SEARCH_RANKING_READY) return;
    window.CCG_SEARCH_RANKING_READY = true;

    const GAME_INDEX = "/games/games-search.json";
    const RETRO_INDEX = "/data/retro-specials.json";
    const MAX_SUGGESTIONS = 8;

    const QUERY_ALIASES = new Map([
        ["c64", "commodore 64"],
        ["commodore", "commodore 64"],
        ["ea", "electronic arts"],
        ["usg", "us gold"],
        ["u s gold", "us gold"],
        ["code masters", "codemasters"],
        ["micro prose", "microprose"],
        ["team 17", "team17"],
        ["ocean", "ocean software"],
        ["gremlin", "gremlin graphics"],
        ["virgin", "virgin games"],
        ["system three", "system 3"],
        ["firebird software", "firebird"],
        ["rpg", "role playing"],
        ["zzap", "zzap64"]
    ]);

    const state = {
        input: null,
        results: null,
        status: null,
        observer: null,
        applying: false,
        fallbackIndex: null,
        fallbackPromise: null
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

    function slugify(value) {
        return normalize(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
    }

    function toArray(value) {
        if (Array.isArray(value)) return value;
        return value ? [value] : [];
    }

    function queryVariants(rawQuery) {
        const query = normalize(rawQuery);
        if (!query) return [];
        const variants = new Set([query]);
        const alias = QUERY_ALIASES.get(query);
        if (alias) variants.add(normalize(alias));
        QUERY_ALIASES.forEach((expanded, compact) => {
            if (normalize(expanded) === query) variants.add(normalize(compact));
        });
        return Array.from(variants);
    }

    function levenshtein(a, b, maximum = 3) {
        const left = normalize(a);
        const right = normalize(b);
        if (left === right) return 0;
        if (!left || !right) return Math.max(left.length, right.length);
        if (Math.abs(left.length - right.length) > maximum) return maximum + 1;

        let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
        for (let i = 1; i <= left.length; i += 1) {
            const current = [i];
            let rowMinimum = current[0];
            for (let j = 1; j <= right.length; j += 1) {
                const cost = left[i - 1] === right[j - 1] ? 0 : 1;
                const value = Math.min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + cost
                );
                current.push(value);
                rowMinimum = Math.min(rowMinimum, value);
            }
            if (rowMinimum > maximum) return maximum + 1;
            previous = current;
        }
        return previous[right.length];
    }

    function typoAllowance(query) {
        if (query.length <= 4) return 1;
        if (query.length <= 8) return 2;
        return 3;
    }

    function scoreTitle(title, rawQuery) {
        const normalizedTitle = normalize(title);
        const variants = queryVariants(rawQuery);
        if (!normalizedTitle || !variants.length) return Number.POSITIVE_INFINITY;

        let best = Number.POSITIVE_INFINITY;
        variants.forEach((query, variantIndex) => {
            const aliasPenalty = variantIndex === 0 ? 0 : 2;
            const titleWords = normalizedTitle.split(" ");
            const queryWords = query.split(" ");

            if (normalizedTitle === query) best = Math.min(best, 0 + aliasPenalty);
            else if (normalizedTitle.startsWith(query)) best = Math.min(best, 8 + aliasPenalty);
            else if (titleWords.some((word) => word.startsWith(query))) best = Math.min(best, 14 + aliasPenalty);
            else if (normalizedTitle.includes(query)) best = Math.min(best, 20 + aliasPenalty);
            else if (queryWords.every((queryWord) => titleWords.some((word) => word.startsWith(queryWord)))) {
                best = Math.min(best, 28 + aliasPenalty);
            } else {
                const allowance = typoAllowance(query);
                const compactDistance = levenshtein(normalizedTitle.replace(/\s+/g, ""), query.replace(/\s+/g, ""), allowance);
                const wordDistance = Math.min(...titleWords.map((word) => levenshtein(word, query, allowance)));
                const distance = Math.min(compactDistance, wordDistance);
                if (distance <= allowance) best = Math.min(best, 50 + distance * 5 + aliasPenalty);
            }
        });

        return best;
    }

    function reorderExistingResults() {
        if (state.applying || !state.results || !state.input) return;
        const query = state.input.value.trim();
        if (normalize(query).length < 2) return;

        state.applying = true;
        try {
            state.results.querySelectorAll(".ccg-global-search__list").forEach((list) => {
                const items = Array.from(list.children);
                items
                    .map((item, index) => ({
                        item,
                        index,
                        title: item.querySelector(".ccg-global-search__result-title")?.textContent || "",
                        score: scoreTitle(item.querySelector(".ccg-global-search__result-title")?.textContent || "", query)
                    }))
                    .sort((a, b) => a.score - b.score || a.index - b.index)
                    .forEach((entry) => list.appendChild(entry.item));
            });
        } finally {
            state.applying = false;
        }

        maybeRenderFallbackSuggestions(query);
    }

    function createUniqueEntries(games, key, type, hrefBuilder) {
        const seen = new Set();
        const output = [];
        games.forEach((game) => {
            toArray(game[key]).forEach((raw) => {
                const title = String(raw || "").trim();
                const normalized = normalize(title);
                if (!normalized || seen.has(normalized)) return;
                seen.add(normalized);
                output.push({ title, type, href: hrefBuilder(title) });
            });
        });
        return output;
    }

    async function loadFallbackIndex() {
        if (state.fallbackIndex) return state.fallbackIndex;
        if (state.fallbackPromise) return state.fallbackPromise;

        state.fallbackPromise = Promise.allSettled([
            fetch(GAME_INDEX, { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
            fetch(RETRO_INDEX, { cache: "no-store" }).then((response) => response.ok ? response.json() : [])
        ]).then(([gameResult, retroResult]) => {
            const games = gameResult.status === "fulfilled" && Array.isArray(gameResult.value) ? gameResult.value : [];
            const specials = retroResult.status === "fulfilled" && Array.isArray(retroResult.value) ? retroResult.value : [];

            const entries = games.map((game) => ({
                title: String(game.title || "Untitled game"),
                type: "Game",
                href: `/games/${String(game.slug || "").replace(/^\/+|\/+$/g, "")}/`
            }));

            entries.push(
                ...createUniqueEntries(games, "publisher", "Publisher", (title) => `/games/publishers/${slugify(title)}/`),
                ...createUniqueEntries(games, "composer", "Composer", (title) => `/music/${slugify(title)}/`),
                ...specials.map((item) => ({
                    title: String(item.title || "Retro Special"),
                    type: "Special",
                    href: `/retro-specials/${String(item.slug || item.id || "").replace(/^\/+|\/+$/g, "")}/`
                }))
            );

            state.fallbackIndex = entries;
            return entries;
        }).finally(() => {
            state.fallbackPromise = null;
        });

        return state.fallbackPromise;
    }

    function hasDirectResults() {
        return Boolean(state.results?.querySelector(".ccg-global-search__group .ccg-global-search__result"));
    }

    function removeOldSuggestions() {
        state.results?.querySelector("[data-ccg-search-suggestions]")?.remove();
    }

    async function maybeRenderFallbackSuggestions(rawQuery) {
        removeOldSuggestions();
        if (!state.results || !state.input || hasDirectResults()) return;
        const query = normalize(rawQuery);
        if (query.length < 3) return;

        const requestQuery = state.input.value;
        const index = await loadFallbackIndex();
        if (state.input.value !== requestQuery || hasDirectResults()) return;

        const suggestions = index
            .map((entry) => ({ entry, score: scoreTitle(entry.title, query) }))
            .filter((candidate) => Number.isFinite(candidate.score) && candidate.score < 70)
            .sort((a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title))
            .slice(0, MAX_SUGGESTIONS);

        if (!suggestions.length) return;

        const existingEmpty = state.results.querySelector(".ccg-global-search__empty");
        if (existingEmpty) existingEmpty.textContent = `No exact matches for “${rawQuery}”. Closest archive entries:`;

        const section = document.createElement("section");
        section.className = "ccg-global-search__group";
        section.setAttribute("data-ccg-search-suggestions", "true");

        const heading = document.createElement("h3");
        heading.className = "ccg-global-search__group-title";
        heading.textContent = "Closest matches";

        const list = document.createElement("ul");
        list.className = "ccg-global-search__list";

        suggestions.forEach(({ entry }) => {
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.className = "ccg-global-search__result";
            link.href = entry.href;

            const main = document.createElement("span");
            main.className = "ccg-global-search__result-main";
            const title = document.createElement("span");
            title.className = "ccg-global-search__result-title";
            title.textContent = entry.title;
            const meta = document.createElement("span");
            meta.className = "ccg-global-search__result-meta";
            meta.textContent = "Suggested from spelling or common naming";
            main.append(title, meta);

            const badge = document.createElement("span");
            badge.className = "ccg-global-search__result-type";
            badge.textContent = entry.type;

            link.append(main, badge);
            li.appendChild(link);
            list.appendChild(li);
        });

        section.append(heading, list);
        state.results.appendChild(section);
        if (state.status) state.status.textContent = `${suggestions.length} close archive matches found.`;
    }

    function bind() {
        state.input = document.getElementById("ccgGlobalSearchInput");
        state.results = document.getElementById("ccgGlobalSearchResults");
        state.status = document.getElementById("ccgGlobalSearchStatus");
        if (!state.input || !state.results) return false;

        state.input.addEventListener("input", () => requestAnimationFrame(reorderExistingResults));
        state.observer = new MutationObserver(() => {
            if (!state.applying) requestAnimationFrame(reorderExistingResults);
        });
        state.observer.observe(state.results, { childList: true, subtree: true });
        reorderExistingResults();
        return true;
    }

    function init() {
        if (bind()) return;
        const observer = new MutationObserver(() => {
            if (bind()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
