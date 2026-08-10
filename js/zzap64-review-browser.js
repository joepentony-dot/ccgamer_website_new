/* ============================================================
   CCG ZZAP!64 ALL-REVIEWS BROWSER
   ------------------------------------------------------------
   Displays every verified Zzap!64 scan tied to an existing CCG
   game page, including ordinary reviews and later re-reviews.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_REVIEW_BROWSER_READY) return;
    window.CCG_ZZAP64_REVIEW_BROWSER_READY = true;

    const DATA_BASE = "/data/zzap64-game-reviews/";
    const MANIFEST_URL = `${DATA_BASE}manifest.json`;
    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const state = {
        records: [],
        query: "",
        system: "all",
        year: "all",
        totals: null
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

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function issueDate(issue) {
        const numericIssue = Number(issue);
        if (!Number.isInteger(numericIssue) || numericIssue < 1) return null;
        const absoluteMonth = (1985 * 12 + 4) + (numericIssue - 1);
        return {
            year: Math.floor(absoluteMonth / 12),
            month: MONTHS[absoluteMonth % 12]
        };
    }

    function gameHref(slug) {
        const value = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
        return /^[a-z0-9-]+$/i.test(value) ? `/games/${encodeURIComponent(value)}/` : "";
    }

    function reviewUrl(issue, page) {
        const numericIssue = Number(issue);
        const numericPage = Number(page);
        if (!Number.isInteger(numericIssue) || numericIssue < 1) return "";
        if (!Number.isInteger(numericPage) || numericPage < 1) return "";
        return `https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=${numericIssue}&page=${numericPage}`;
    }

    function parseChunk(data) {
        const records = [];
        Object.entries(data?.games || {}).forEach(([slug, rows]) => {
            const href = gameHref(slug);
            if (!href || !Array.isArray(rows)) return;
            rows.forEach((row) => {
                if (!Array.isArray(row) || row.length < 4) return;
                const issue = Number(row[0]);
                const page = Number(row[1]);
                const system = row[2] === "a" ? "amiga" : "c64";
                const title = String(row[3] || slug);
                const url = reviewUrl(issue, page);
                const date = issueDate(issue);
                if (!url || !date) return;
                records.push({
                    gameSlug: slug,
                    gameTitle: title,
                    gameHref: href,
                    system,
                    issue,
                    page,
                    url,
                    year: date.year,
                    month: date.month
                });
            });
        });
        return records;
    }

    async function loadRecords() {
        const manifestResponse = await fetch(MANIFEST_URL, { cache: "default" });
        if (!manifestResponse.ok) throw new Error(`Review manifest HTTP ${manifestResponse.status}`);
        const manifest = await manifestResponse.json();
        const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
        if (!chunks.length) throw new Error("Review manifest contains no chunks");

        const responses = await Promise.all(chunks.map(async (chunk) => {
            const response = await fetch(`${DATA_BASE}${encodeURIComponent(chunk)}`, { cache: "default" });
            if (!response.ok) throw new Error(`${chunk} HTTP ${response.status}`);
            return response.json();
        }));

        state.totals = manifest.totals || null;
        return responses
            .flatMap(parseChunk)
            .sort((a, b) => (
                a.gameTitle.localeCompare(b.gameTitle, "en-GB", { numeric: true })
                || a.issue - b.issue
                || a.page - b.page
            ));
    }

    function filteredRecords() {
        const query = normalize(state.query);
        return state.records.filter((record) => {
            const haystack = normalize([
                record.gameTitle,
                record.month,
                record.year,
                record.system,
                `issue ${record.issue}`,
                `page ${record.page}`,
                "zzap64 review magazine scan"
            ].join(" "));
            const queryMatch = !query || query.split(" ").filter(Boolean).every((term) => haystack.includes(term));
            const systemMatch = state.system === "all" || record.system === state.system;
            const yearMatch = state.year === "all" || String(record.year) === state.year;
            return queryMatch && systemMatch && yearMatch;
        });
    }

    function renderCard(record) {
        const article = document.createElement("article");
        article.className = "zzap-review-card";
        article.dataset.system = record.system;
        const platform = record.system === "amiga" ? "Amiga" : "C64";

        article.innerHTML = `
            <div class="zzap-review-card__top">
                <span class="zzap-review-card__type">Zzap!64 review</span>
                <span class="zzap-review-card__platform">${escapeHtml(platform)}</span>
            </div>
            <h3 class="zzap-review-card__title"><a href="${escapeHtml(record.gameHref)}">${escapeHtml(record.gameTitle)}</a></h3>
            <p class="zzap-review-card__date">${escapeHtml(record.month)} ${escapeHtml(record.year)}</p>
            <p class="zzap-review-card__issue">Zzap!64 Issue ${escapeHtml(record.issue)} · p${escapeHtml(record.page)}</p>
            <div class="zzap-review-card__actions">
                <a class="zzap-review-card__game" href="${escapeHtml(record.gameHref)}">View CCG game <span aria-hidden="true">→</span></a>
                <a class="zzap-review-card__scan" href="${escapeHtml(record.url)}" target="_blank" rel="noopener noreferrer external">Read original review <span aria-hidden="true">↗</span></a>
            </div>
        `;
        return article;
    }

    function updateYearOptions() {
        const select = document.getElementById("zzapReviewYearFilter");
        if (!select) return;
        const years = [...new Set(state.records.map((record) => record.year).filter(Boolean))].sort((a, b) => a - b);
        select.textContent = "";
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "All review years";
        select.appendChild(all);
        years.forEach((year) => {
            const option = document.createElement("option");
            option.value = String(year);
            option.textContent = String(year);
            select.appendChild(option);
        });
    }

    function updateSummary(records) {
        const count = document.getElementById("zzapReviewVisibleCount");
        const total = document.getElementById("zzapReviewTotalCount");
        const games = document.getElementById("zzapReviewGameCount");
        const summary = document.getElementById("zzapReviewSummary");
        if (count) count.textContent = records.length.toLocaleString("en-GB");
        if (total) total.textContent = Number(state.totals?.records || state.records.length).toLocaleString("en-GB");
        if (games) games.textContent = Number(state.totals?.games || new Set(state.records.map((record) => record.gameSlug)).size).toLocaleString("en-GB");
        if (!summary) return;

        const parts = [];
        if (state.system !== "all") parts.push(state.system === "amiga" ? "Amiga" : "C64");
        if (state.year !== "all") parts.push(state.year);
        if (state.query) parts.push(`“${state.query}”`);
        summary.textContent = parts.length ? parts.join(" · ") : "All verified Zzap!64 scans linked to CCG game pages";
    }

    function render() {
        const grid = document.getElementById("zzapReviewGrid");
        if (!grid) return;
        const records = filteredRecords();
        grid.textContent = "";
        updateSummary(records);

        if (!records.length) {
            const empty = document.createElement("div");
            empty.className = "zzap-review-browser__empty";
            empty.textContent = "No linked Zzap!64 reviews match those filters.";
            grid.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        records.forEach((record) => fragment.appendChild(renderCard(record)));
        grid.appendChild(fragment);
    }

    function bindFilters() {
        const search = document.getElementById("zzapReviewSearch");
        const system = document.getElementById("zzapReviewSystemFilter");
        const year = document.getElementById("zzapReviewYearFilter");
        search?.addEventListener("input", () => {
            state.query = search.value.trim();
            render();
        });
        system?.addEventListener("change", () => {
            state.system = system.value;
            render();
        });
        year?.addEventListener("change", () => {
            state.year = year.value;
            render();
        });
    }

    async function init() {
        const grid = document.getElementById("zzapReviewGrid");
        if (!grid) return;
        try {
            state.records = await loadRecords();
            updateYearOptions();
            bindFilters();
            render();
        } catch (error) {
            grid.innerHTML = '<div class="zzap-review-browser__empty">The full Zzap!64 review index could not be loaded. Refresh the page to try again.</div>';
            console.warn("[CCG] Full Zzap!64 review browser unavailable:", error);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
