/* ============================================================
   CCG ZZAP!64 ADDITIONAL-REVIEWS BROWSER
   ------------------------------------------------------------
   Lazy A-Z browser for verified Zzap!64 reviews tied to CCG game
   pages that are not already represented in the award index above.
   Uses the existing compact full-review chunks and filters award
   issues at request time, avoiding a second generated data archive.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_REVIEW_BROWSER_READY) return;
    window.CCG_ZZAP64_REVIEW_BROWSER_READY = true;

    const DATA_BASE = "/data/zzap64-game-reviews/";
    const MANIFEST_URL = `${DATA_BASE}manifest.json`;
    const REVIEW_INDEX_URL = "/data/zzap64-review-links.json";
    const PAGE_SIZE = 24;
    const SEARCH_MIN_LENGTH = 2;
    const LETTERS = ["0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const state = {
        manifest: null,
        manifestPromise: null,
        awardIssueKeys: null,
        awardIssuePromise: null,
        chunkCache: new Map(),
        chunkPromises: new Map(),
        allRecords: null,
        allRecordsPromise: null,
        scopeRecords: [],
        query: "",
        system: "all",
        year: "all",
        activeLetter: "",
        mode: "idle",
        visibleLimit: PAGE_SIZE,
        requestToken: 0,
        controlsReady: false,
        observed: false,
        searchTimer: 0
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

    function normalizedSystem(value) {
        return String(value || "").toLowerCase().includes("amiga") ? "amiga" : "c64";
    }

    function safeSlug(value) {
        const slug = String(value || "").trim().replace(/^\/+|\/+$/g, "");
        return /^[a-z0-9-]+$/i.test(slug) ? slug : "";
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
        const value = safeSlug(slug);
        return value ? `/games/${encodeURIComponent(value)}/` : "";
    }

    function reviewUrl(issue, page) {
        const numericIssue = Number(issue);
        const numericPage = Number(page);
        if (!Number.isInteger(numericIssue) || numericIssue < 1) return "";
        if (!Number.isInteger(numericPage) || numericPage < 1) return "";
        return `https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=${numericIssue}&page=${numericPage}`;
    }

    function awardIssueKey(slug, system, issue) {
        const gameSlug = safeSlug(slug);
        const numericIssue = Number(issue);
        if (!gameSlug || !Number.isInteger(numericIssue) || numericIssue < 1) return "";
        return `${gameSlug}|${normalizedSystem(system)}|${numericIssue}`;
    }

    async function loadAwardIssueKeys() {
        if (state.awardIssueKeys) return state.awardIssueKeys;
        if (state.awardIssuePromise) return state.awardIssuePromise;

        state.awardIssuePromise = fetch(REVIEW_INDEX_URL, { cache: "default" })
            .then((response) => {
                if (!response.ok) throw new Error(`Review index HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => {
                const keys = new Set();
                Object.entries(data?.entries || {}).forEach(([recordKey, row]) => {
                    if (!row || typeof row !== "object" || row.scope === "game-review") return;
                    const parts = recordKey.split("|");
                    const key = awardIssueKey(row.gameSlug, row.gameSystem || parts[2], row.issue);
                    if (key) keys.add(key);
                });
                state.awardIssueKeys = keys;
                return keys;
            })
            .finally(() => {
                state.awardIssuePromise = null;
            });

        return state.awardIssuePromise;
    }

    function parseChunk(data, awardIssues) {
        const recordsByReview = new Map();

        Object.entries(data?.games || {}).forEach(([slug, rows]) => {
            const href = gameHref(slug);
            if (!href || !Array.isArray(rows)) return;

            rows.forEach((row) => {
                if (!Array.isArray(row) || row.length < 4) return;
                const issue = Number(row[0]);
                const page = Number(row[1]);
                const system = row[2] === "a" ? "amiga" : "c64";
                const title = String(row[3] || slug);
                const exclusionKey = awardIssueKey(slug, system, issue);
                if (exclusionKey && awardIssues.has(exclusionKey)) return;

                const url = reviewUrl(issue, page);
                const date = issueDate(issue);
                if (!url || !date) return;

                const reviewKey = `${slug}|${system}|${issue}`;
                const existing = recordsByReview.get(reviewKey);
                if (existing && existing.page <= page) return;

                recordsByReview.set(reviewKey, {
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

        return Array.from(recordsByReview.values()).sort(compareRecords);
    }

    function compareRecords(a, b) {
        return a.gameTitle.localeCompare(b.gameTitle, "en-GB", { numeric: true })
            || a.issue - b.issue
            || a.page - b.page;
    }

    async function loadManifest() {
        if (state.manifest) return state.manifest;
        if (state.manifestPromise) return state.manifestPromise;

        state.manifestPromise = fetch(MANIFEST_URL, { cache: "default" })
            .then((response) => {
                if (!response.ok) throw new Error(`Review manifest HTTP ${response.status}`);
                return response.json();
            })
            .then((manifest) => {
                const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
                if (!chunks.length) throw new Error("Review manifest contains no chunks");
                state.manifest = manifest;
                updateIdleSummary();
                return manifest;
            });

        return state.manifestPromise;
    }

    function chunkForLetter(letter, chunks) {
        const token = String(letter || "").toUpperCase();
        let expected = "";
        if (token === "0-9" || /^[A-D]$/.test(token)) expected = "0-d.json";
        else if (/^[E-H]$/.test(token)) expected = "e-h.json";
        else if (/^[I-L]$/.test(token)) expected = "i-l.json";
        else if (/^[M-P]$/.test(token)) expected = "m-p.json";
        else if (/^[Q-T]$/.test(token)) expected = "q-t.json";
        else if (/^[U-Z]$/.test(token)) expected = "u-z.json";
        if (!expected) return "";
        return chunks.includes(expected) ? expected : "";
    }

    async function loadChunk(chunk) {
        if (state.chunkCache.has(chunk)) return state.chunkCache.get(chunk);
        if (state.chunkPromises.has(chunk)) return state.chunkPromises.get(chunk);

        const promise = Promise.all([
            fetch(`${DATA_BASE}${encodeURIComponent(chunk)}`, { cache: "default" }).then((response) => {
                if (!response.ok) throw new Error(`${chunk} HTTP ${response.status}`);
                return response.json();
            }),
            loadAwardIssueKeys()
        ])
            .then(([data, awardIssues]) => {
                const records = parseChunk(data, awardIssues);
                state.chunkCache.set(chunk, records);
                state.chunkPromises.delete(chunk);
                return records;
            })
            .catch((error) => {
                state.chunkPromises.delete(chunk);
                throw error;
            });

        state.chunkPromises.set(chunk, promise);
        return promise;
    }

    async function loadAllRecords() {
        if (state.allRecords) return state.allRecords;
        if (state.allRecordsPromise) return state.allRecordsPromise;

        state.allRecordsPromise = (async () => {
            const manifest = await loadManifest();
            const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
            const responses = await Promise.all(chunks.map((chunk) => loadChunk(chunk)));
            state.allRecords = responses.flat().sort(compareRecords);
            return state.allRecords;
        })().finally(() => {
            state.allRecordsPromise = null;
        });

        return state.allRecordsPromise;
    }

    function matchesLetter(record, letter) {
        const first = normalize(record.gameTitle).charAt(0).toUpperCase();
        if (letter === "0-9") return /[0-9]/.test(first);
        return first === letter;
    }

    function filteredRecords() {
        const query = normalize(state.query);
        return state.scopeRecords.filter((record) => {
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

    function updateYearOptions(records) {
        const select = document.getElementById("zzapReviewYearFilter");
        if (!select) return;
        const current = state.year;
        const years = [...new Set(records.map((record) => record.year).filter(Boolean))].sort((a, b) => a - b);
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
        state.year = years.some((year) => String(year) === current) ? current : "all";
        select.value = state.year;
        select.disabled = records.length === 0;
    }

    function updateIdleSummary() {
        if (state.mode !== "idle") return;
        const count = document.getElementById("zzapReviewVisibleCount");
        const summary = document.getElementById("zzapReviewSummary");
        if (count) count.textContent = "0";
        if (!summary) return;
        summary.textContent = "Choose a letter or search. Award reviews already shown above are automatically excluded.";
    }

    function updateSummary(records) {
        const count = document.getElementById("zzapReviewVisibleCount");
        const summary = document.getElementById("zzapReviewSummary");
        if (count) count.textContent = Math.min(records.length, state.visibleLimit).toLocaleString("en-GB");
        if (!summary) return;

        const parts = [];
        if (state.mode === "letter" && state.activeLetter) parts.push(state.activeLetter === "0-9" ? "0–9" : state.activeLetter);
        if (state.mode === "all") parts.push("All additional reviews");
        if (state.mode === "search" && state.query) parts.push(`Search: “${state.query}”`);
        if (state.system !== "all") parts.push(state.system === "amiga" ? "Amiga" : "C64");
        if (state.year !== "all") parts.push(state.year);
        parts.push(`${records.length.toLocaleString("en-GB")} matching review${records.length === 1 ? "" : "s"}`);
        summary.textContent = parts.join(" · ");
    }

    function setGridMessage(message, busy = false) {
        const grid = document.getElementById("zzapReviewGrid");
        if (!grid) return;
        grid.setAttribute("aria-busy", busy ? "true" : "false");
        grid.innerHTML = `<div class="zzap-review-browser__empty">${escapeHtml(message)}</div>`;
        updateLoadMore(0, 0);
    }

    function updateLoadMore(visible, total) {
        const wrap = document.querySelector(".zzap-review-browser__more");
        const button = wrap?.querySelector("button");
        if (!wrap || !button) return;
        const remaining = Math.max(0, total - visible);
        wrap.hidden = remaining === 0;
        if (remaining) button.textContent = `Load more (${remaining.toLocaleString("en-GB")} remaining)`;
    }

    function render() {
        const grid = document.getElementById("zzapReviewGrid");
        if (!grid) return;
        const records = filteredRecords();
        grid.textContent = "";
        grid.setAttribute("aria-busy", "false");
        updateSummary(records);

        if (!records.length) {
            const empty = document.createElement("div");
            empty.className = "zzap-review-browser__empty";
            empty.textContent = "No additional Zzap!64 reviews match those filters.";
            grid.appendChild(empty);
            updateLoadMore(0, 0);
            return;
        }

        const visibleRecords = records.slice(0, state.visibleLimit);
        const fragment = document.createDocumentFragment();
        visibleRecords.forEach((record) => fragment.appendChild(renderCard(record)));
        grid.appendChild(fragment);
        updateLoadMore(visibleRecords.length, records.length);
    }

    function updateBrowseControls() {
        document.querySelectorAll("[data-zzap-review-letter]").forEach((button) => {
            const token = button.getAttribute("data-zzap-review-letter") || "";
            const active = (state.mode === "all" && token === "all")
                || (state.mode === "letter" && token === state.activeLetter);
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        const select = document.getElementById("zzapReviewLetterSelect");
        if (select) select.value = state.mode === "all" ? "all" : (state.activeLetter || "");
    }

    function updateHash(token) {
        const next = token === "all" ? "#reviews-all" : `#reviews-${String(token).toLowerCase()}`;
        if (window.location.hash === next) return;
        window.history.pushState(null, "", next);
    }

    async function selectLetter(letter, options = {}) {
        const token = String(letter || "").toUpperCase();
        if (!LETTERS.includes(token)) return;
        const requestToken = ++state.requestToken;
        state.mode = "letter";
        state.activeLetter = token;
        state.query = "";
        state.year = "all";
        state.visibleLimit = PAGE_SIZE;
        const search = document.getElementById("zzapReviewSearch");
        if (search) search.value = "";
        updateBrowseControls();
        setGridMessage(`Loading ${token === "0-9" ? "0–9" : token} reviews…`, true);

        try {
            const manifest = await loadManifest();
            const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
            const chunk = chunkForLetter(token, chunks);
            if (!chunk) throw new Error(`No review chunk is available for ${token}`);
            const records = await loadChunk(chunk);
            if (requestToken !== state.requestToken) return;
            state.scopeRecords = records.filter((record) => matchesLetter(record, token));
            updateYearOptions(state.scopeRecords);
            render();
            if (options.updateHash !== false) updateHash(token);
        } catch (error) {
            if (requestToken !== state.requestToken) return;
            setGridMessage("That review section could not be loaded. Please try again.");
            console.warn("[CCG] Zzap!64 letter reviews unavailable:", error);
        }
    }

    async function selectAll(options = {}) {
        const requestToken = ++state.requestToken;
        state.mode = "all";
        state.activeLetter = "";
        state.query = "";
        state.year = "all";
        state.visibleLimit = PAGE_SIZE;
        const search = document.getElementById("zzapReviewSearch");
        if (search) search.value = "";
        updateBrowseControls();
        setGridMessage("Loading the additional review index…", true);

        try {
            const records = await loadAllRecords();
            if (requestToken !== state.requestToken) return;
            state.scopeRecords = records;
            updateYearOptions(records);
            render();
            if (options.updateHash !== false) updateHash("all");
        } catch (error) {
            if (requestToken !== state.requestToken) return;
            setGridMessage("The additional review index could not be loaded. Please try again.");
            console.warn("[CCG] Additional Zzap!64 review browser unavailable:", error);
        }
    }

    async function runSearch(query) {
        const trimmed = String(query || "").trim();
        state.query = trimmed;
        state.visibleLimit = PAGE_SIZE;

        if (!trimmed) {
            if (state.mode === "search") {
                state.mode = "idle";
                state.activeLetter = "";
                state.scopeRecords = [];
                state.year = "all";
                updateBrowseControls();
                updateYearOptions([]);
                setGridMessage("Choose a letter above to browse additional reviews, or search for a game.");
                updateIdleSummary();
            } else {
                render();
            }
            return;
        }

        if (normalize(trimmed).length < SEARCH_MIN_LENGTH) {
            state.mode = "search";
            state.activeLetter = "";
            state.scopeRecords = [];
            updateBrowseControls();
            setGridMessage(`Type at least ${SEARCH_MIN_LENGTH} characters to search additional reviews.`);
            return;
        }

        const requestToken = ++state.requestToken;
        state.mode = "search";
        state.activeLetter = "";
        updateBrowseControls();
        setGridMessage("Searching the additional review index…", true);

        try {
            const records = await loadAllRecords();
            if (requestToken !== state.requestToken) return;
            state.scopeRecords = records;
            updateYearOptions(records);
            render();
        } catch (error) {
            if (requestToken !== state.requestToken) return;
            setGridMessage("The review search could not be loaded. Please try again.");
            console.warn("[CCG] Zzap!64 review search unavailable:", error);
        }
    }

    function createBrowseControls() {
        const heading = document.querySelector(".zzap-review-browser__heading");
        const tools = document.querySelector(".zzap-review-browser__tools");
        const grid = document.getElementById("zzapReviewGrid");
        if (!heading || !tools || !grid || document.querySelector(".zzap-review-browser__az")) return;

        const nav = document.createElement("div");
        nav.className = "zzap-review-browser__az";
        nav.setAttribute("aria-label", "Browse additional Zzap!64 reviews alphabetically");

        const desktop = document.createElement("div");
        desktop.className = "zzap-review-browser__alphabet";
        const tokens = ["all", ...LETTERS];
        tokens.forEach((token) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "zzap-review-browser__letter";
            button.setAttribute("data-zzap-review-letter", token);
            button.setAttribute("aria-pressed", "false");
            button.textContent = token === "all" ? "All" : (token === "0-9" ? "0–9" : token);
            desktop.appendChild(button);
        });

        const mobileLabel = document.createElement("label");
        mobileLabel.className = "zzap-review-browser__letter-select-wrap";
        mobileLabel.innerHTML = '<span>Browse by letter</span><select id="zzapReviewLetterSelect" aria-label="Browse additional Zzap!64 reviews by letter"><option value="">Choose a letter…</option><option value="all">All additional reviews</option></select>';
        const mobileSelect = mobileLabel.querySelector("select");
        LETTERS.forEach((letter) => {
            const option = document.createElement("option");
            option.value = letter;
            option.textContent = letter === "0-9" ? "0–9" : letter;
            mobileSelect.appendChild(option);
        });

        nav.append(desktop, mobileLabel);
        tools.parentNode.insertBefore(nav, tools);

        const more = document.createElement("div");
        more.className = "zzap-review-browser__more";
        more.hidden = true;
        more.innerHTML = '<button type="button" class="zzap-review-browser__more-button">Load more</button>';
        grid.insertAdjacentElement("afterend", more);
    }

    function bindControls() {
        if (state.controlsReady) return;
        state.controlsReady = true;
        const search = document.getElementById("zzapReviewSearch");
        const system = document.getElementById("zzapReviewSystemFilter");
        const year = document.getElementById("zzapReviewYearFilter");
        const letterSelect = document.getElementById("zzapReviewLetterSelect");

        document.querySelectorAll("[data-zzap-review-letter]").forEach((button) => {
            button.addEventListener("click", () => {
                const token = button.getAttribute("data-zzap-review-letter") || "";
                if (token === "all") selectAll();
                else selectLetter(token);
            });
        });

        letterSelect?.addEventListener("change", () => {
            const token = letterSelect.value;
            if (token === "all") selectAll();
            else if (token) selectLetter(token);
        });

        search?.addEventListener("input", () => {
            window.clearTimeout(state.searchTimer);
            state.searchTimer = window.setTimeout(() => runSearch(search.value), 220);
        });

        system?.addEventListener("change", () => {
            state.system = system.value;
            state.visibleLimit = PAGE_SIZE;
            if (state.mode === "idle") {
                setGridMessage("Choose a letter above to browse additional reviews, or search for a game.");
                updateIdleSummary();
                return;
            }
            render();
        });

        year?.addEventListener("change", () => {
            state.year = year.value;
            state.visibleLimit = PAGE_SIZE;
            if (state.mode !== "idle") render();
        });

        document.querySelector(".zzap-review-browser__more-button")?.addEventListener("click", () => {
            state.visibleLimit += PAGE_SIZE;
            render();
        });

        window.addEventListener("popstate", applyHashSelection);
    }

    function hashSelection() {
        const match = String(window.location.hash || "").match(/^#reviews-(all|0-9|[a-z])$/i);
        if (!match) return "";
        return match[1].toLowerCase() === "all" ? "all" : match[1].toUpperCase();
    }

    function applyHashSelection() {
        const token = hashSelection();
        if (!token) return;
        if (token === "all") selectAll({ updateHash: false });
        else selectLetter(token, { updateHash: false });
    }

    function observeBrowser() {
        const section = document.querySelector(".zzap-review-browser");
        if (!section) return;

        const warmManifest = () => {
            if (state.observed) return;
            state.observed = true;
            loadManifest().catch((error) => {
                console.warn("[CCG] Zzap!64 review manifest unavailable:", error);
            });
            const token = hashSelection();
            if (token === "all") selectAll({ updateHash: false });
            else if (token) selectLetter(token, { updateHash: false });
        };

        if (!("IntersectionObserver" in window)) {
            warmManifest();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            observer.disconnect();
            warmManifest();
        }, { rootMargin: "300px 0px" });
        observer.observe(section);
    }

    function init() {
        const grid = document.getElementById("zzapReviewGrid");
        if (!grid) return;
        createBrowseControls();
        bindControls();
        updateYearOptions([]);
        setGridMessage("Choose a letter above to browse additional reviews, or search for a game.");
        updateIdleSummary();
        observeBrowser();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();