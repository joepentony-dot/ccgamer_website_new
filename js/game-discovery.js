/* CCG FIND ME A GAME */
(function () {
    "use strict";

    const state = { games: [], pool: [], last: "" };
    const $ = (selector) => document.querySelector(selector);
    const arr = (value) => Array.isArray(value) ? value : (value ? [value] : []);

    function norm(value) {
        return String(value || "").toLowerCase().trim();
    }

    function system(value) {
        const current = String(value || "").toUpperCase();
        return current.includes("AMIGA") ? "amiga" : "c64";
    }

    function publishers(game) {
        return arr(game.publisher || game.credits?.publisher).filter(Boolean);
    }

    function genres(game) {
        return arr(game.genres || game.genre).filter(Boolean);
    }

    function thumb(game) {
        const value = game.thumbnail || game.image || "";
        if (!value) return "";
        return value.startsWith("http") || value.startsWith("/")
            ? value
            : `/${value.replace(/^\.\//, "")}`;
    }

    function options(select, values, label) {
        select.innerHTML = `<option value="all">${label}</option>`;
        values.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
    }

    function gameYear(game) {
        const year = parseInt(game.year, 10);
        return Number.isFinite(year) ? year : null;
    }

    function buildFilters() {
        const years = [...new Set(state.games.map(gameYear).filter(Number.isFinite))]
            .sort((a, b) => a - b)
            .map(String);

        options($("#discoverYear"), years, "Any year");
        options(
            $("#discoverGenre"),
            [...new Set(state.games.flatMap(genres).map(String))].sort((a, b) => a.localeCompare(b)),
            "Any genre"
        );
        options(
            $("#discoverPublisher"),
            [...new Set(state.games.flatMap(publishers).map(String))].sort((a, b) => a.localeCompare(b)),
            "Any publisher"
        );
    }

    function eligible() {
        const selectedSystem = $("#discoverSystem")?.value || "all";
        const selectedYear = $("#discoverYear")?.value || "all";
        const selectedGenre = $("#discoverGenre")?.value || "all";
        const selectedPublisher = $("#discoverPublisher")?.value || "all";
        const requireVideo = $("#discoverVideo")?.checked;
        const avoidFavourites = $("#discoverObscure")?.checked;

        return state.games.filter((game) => {
            if (selectedSystem !== "all" && system(game.system) !== selectedSystem) return false;
            if (selectedYear !== "all" && String(gameYear(game)) !== selectedYear) return false;
            if (selectedGenre !== "all" && !genres(game).some((value) => norm(value) === norm(selectedGenre))) return false;
            if (selectedPublisher !== "all" && !publishers(game).some((value) => norm(value) === norm(selectedPublisher))) return false;
            if (requireVideo && !game.videoid) return false;
            if (avoidFavourites && Number(game.ccg_rating || 0) > 7) return false;
            return Boolean(game.slug && game.title);
        });
    }

    function esc(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function show(game) {
        const box = $("#discoverResult");
        const status = $("#discoverStatus");
        if (!box) return;

        const image = thumb(game);
        const meta = [game.system, game.year, ...publishers(game).slice(0, 2)].filter(Boolean).join(" · ");
        const description = game.description || "Open the game page for available video, manual and archive details.";

        box.innerHTML = `
            <article class="ccg-discover-card">
                <span class="ccg-discover-card__image">${image ? `<img src="${esc(image)}" alt="${esc(game.title)} thumbnail" loading="eager">` : ""}</span>
                <div class="ccg-discover-card__body">
                    <p class="ccg-discover-card__system">${esc(game.system || "CCG archive")}</p>
                    <h2 class="ccg-discover-card__title">${esc(game.title)}</h2>
                    <p class="ccg-discover-card__meta">${esc(meta)}</p>
                    <p class="ccg-discover-card__description">${esc(description)}</p>
                    <div class="ccg-discover-card__actions">
                        <a href="/games/${esc(game.slug)}/">Open game page</a>
                        ${game.videoid ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(game.videoid)}" target="_blank" rel="noopener">Watch CCG video</a>` : ""}
                    </div>
                </div>
            </article>`;

        state.last = game.slug;
        if (status) status.textContent = `Selected from ${state.pool.length.toLocaleString("en-GB")} matching games.`;
    }

    function pick() {
        state.pool = eligible();
        const status = $("#discoverStatus");
        const box = $("#discoverResult");

        if (!state.pool.length) {
            if (status) status.textContent = "No games match those filters.";
            if (box) box.innerHTML = '<div class="ccg-discover__empty">Try removing one or two filters and search again.</div>';
            return;
        }

        let candidates = state.pool.filter((game) => game.slug !== state.last);
        if (!candidates.length) candidates = state.pool;
        show(candidates[Math.floor(Math.random() * candidates.length)]);
    }

    function reset() {
        ["discoverSystem", "discoverYear", "discoverGenre", "discoverPublisher"].forEach((id) => {
            const element = $("#" + id);
            if (element) element.value = "all";
        });

        ["discoverVideo", "discoverObscure"].forEach((id) => {
            const element = $("#" + id);
            if (element) element.checked = false;
        });

        const box = $("#discoverResult");
        if (box) box.innerHTML = '<div class="ccg-discover__empty">Choose a few preferences or leave everything open, then find a game.</div>';
        const status = $("#discoverStatus");
        if (status) status.textContent = `${state.games.length.toLocaleString("en-GB")} games available for discovery.`;
    }

    async function init() {
        $("#discoverFind")?.addEventListener("click", pick);
        $("#discoverAgain")?.addEventListener("click", pick);
        $("#discoverReset")?.addEventListener("click", reset);

        try {
            const response = await fetch("/games/games.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            state.games = await response.json();
            buildFilters();
            reset();
        } catch (error) {
            const box = $("#discoverResult");
            if (box) box.innerHTML = '<div class="ccg-discover__empty">The game finder could not load the archive. Please refresh and try again.</div>';
            console.error("[CCG] discovery failed", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
