/* ============================================================
   CCG ZZAP!64 ALL-REVIEWS BROWSER
   ------------------------------------------------------------
   Displays every verified Zzap!64 scan that can be tied to an
   existing CCG game page, including ordinary reviews and re-reviews.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_REVIEW_BROWSER_READY) return;
    window.CCG_ZZAP64_REVIEW_BROWSER_READY = true;

    const INDEX_URL = "/data/zzap64-review-links.json";
    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const state = {
        records: [],
        query: "",
        system: "all",
        year: "all"
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

    function safeGameHref(slug) {
        const value = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
        return /^[a-z0-9-]+$/i.test(value) ? `/games/${encodeURIComponent(value)}/` : "";
    }

    function safeZzapUrl(value) {
        try {
            const url = new URL(String(value || ""));
            if (url.protocol !== "https:" || url.hostname !== "www.zzap64.co.uk") return "";
            if (url.pathname.toLowerCase() !== "/cgi-bin/displaypage.pl") return "";
            if (!Number.isInteger(Number(url.searchParams.get("issue")))) return "";
            if (!Number.isInteger(Number(url.searchParams.get("page")))) return "";
            return url.toString();
        } catch {
            return "";
        }
    }

    function parseRecords(data) {
        const grouped = new Map();

        Object.entries(data?.entries || {}).forEach(([key, row]) => {
            if (!row || typeof row !== "object") return;
            const gameSlug = String(row.gameSlug || "").trim();
            const href = safeGameHref(gameSlug);
            const zzapUrl = safeZzapUrl(row.url);
            const issue = Number(row.issue);
            const page = Number(row.page);
            if (!href || !zzapUrl || !Number.isInteger(issue) || !Number.isInteger(page)) return;

            const parts = key.split("|");
            const systemFromKey = String(parts[2] || "").toLowerCase();
            const date = issueDate(issue);
            const identity = `${gameSlug}|${issue}|${page}`;
            const existing = grouped.get(identity);
            const record = existing || {
                gameSlug,
                gameTitle: String(row.gameTitle || parts.slice(3).join("|") || gameSlug),
                gameHref: href,
                system: String(row.gameSystem || systemFromKey || "c64").toLowerCase() === "amiga" ? "amiga" : "c64",
                issue,
                page,
                url: zzapUrl,
                year: date?.year || Number(parts[0]) || 0,
                month: date?.month || "",
                awardLinked: false
            };

            if (row.scope !== "game-review") record.awardLinked = true;
            if (!record.gameTitle && row.gameTitle) record.gameTitle = String(row.gameTitle);
            grouped.set(identity, record);
        });

        return Array.from(grouped.values()).sort((a, b) => (
            a.gameTitle.localeCompare(b.gameTitle, "en-GB", { numeric: true })
            || a.year - b.year
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
                record.awardLinked ? "award winner medal sizzler silver gold" : "standard review"
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
        article.dataset.awardLinked = record.awardLinked ? "true" : "false";
        const platform = record.system === "amiga" ? "Amiga" : "C64";
        const reviewType = record.awardLinked ? "Award-linked review" : "Standard review";

        article.innerHTML = `
            <div class="zzap-review-card__top">
                <span class="zzap-review-card__type">${escapeHtml(reviewType)}</span>
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
        if (total) total.textContent = state.records.length.toLocaleString("en-GB");
        if (games) games.textContent = new Set(state.records.map((record) => record.gameSlug)).size.toLocaleString("en-GB");
        if (!summary) return;

        const parts = [];
        if (state.system !== "all") parts.push(state.system === "amiga" ? "Amiga" : "C64");
        if (state.year !== "all") parts.push(state.year);
        if (state.query) parts.push(`“${state.query}”`);
        summary.textContent = parts.length ? parts.join(" · ") : "All verified reviews linked to CCG game pages";
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
            const response = await fetch(INDEX_URL, { cache: "default" });
            if (!response.ok) throw new Error(`Review index HTTP ${response.status}`);
            const data = await response.json();
            state.records = parseRecords(data);
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
