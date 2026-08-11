/* ============================================================
   CCG MAGAZINE REVIEW SELECTOR
   ------------------------------------------------------------
   Combines verified multi-magazine records with the existing
   Zzap!64 scan index. Lemon links remain separate resources.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_MAGAZINE_GAME_REVIEWS_READY) return;
    window.CCG_MAGAZINE_GAME_REVIEWS_READY = true;

    const MAGAZINE_BASE = "/data/magazine-game-reviews/";
    const ZZAP_BASE = "/data/zzap64-game-reviews/";
    const PANEL_ATTR = "data-ccg-magazine-review-panel";
    let observer = null;
    let applying = false;
    let magazineRowsPromise = null;
    let zzapRowsPromise = null;

    function currentSlug() {
        const match = String(window.location.pathname || "").match(/\/games\/([^/?#]+)\/(?:index\.html)?$/i);
        if (!match || !match[1]) return "";
        try {
            return decodeURIComponent(match[1]).trim().toLowerCase();
        } catch {
            return String(match[1]).trim().toLowerCase();
        }
    }

    function currentSystem() {
        const text = String(document.getElementById("gameMetaSystem")?.textContent || "").trim().toLowerCase();
        if (text.includes("amiga")) return "amiga";
        return "c64";
    }

    function chunkName(slug) {
        const first = String(slug || "").charAt(0).toLowerCase();
        if (!first) return "";
        if (/\d/.test(first) || first < "e") return "0-d.json";
        if (first < "i") return "e-h.json";
        if (first < "m") return "i-l.json";
        if (first < "q") return "m-p.json";
        if (first < "u") return "q-t.json";
        return "u-z.json";
    }

    async function fetchJson(url) {
        try {
            const response = await fetch(url, { cache: "default" });
            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    }

    function loadMagazineRows() {
        if (magazineRowsPromise) return magazineRowsPromise;
        const slug = currentSlug();
        const system = currentSystem();
        const chunk = chunkName(slug);
        magazineRowsPromise = (async () => {
            if (!slug || !chunk) return [];
            const data = await fetchJson(`${MAGAZINE_BASE}${chunk}`);
            return Array.isArray(data?.games?.[`${system}:${slug}`]) ? data.games[`${system}:${slug}`] : [];
        })();
        return magazineRowsPromise;
    }

    function zzapReviewUrl(issue, page) {
        const issueNumber = Number(issue);
        const pageNumber = Number(page);
        if (!Number.isInteger(issueNumber) || issueNumber < 1 || !Number.isInteger(pageNumber) || pageNumber < 1) return "";
        return `https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=${issueNumber}&page=${pageNumber}`;
    }

    function loadZzapRows() {
        if (zzapRowsPromise) return zzapRowsPromise;
        const slug = currentSlug();
        const system = currentSystem();
        const chunk = chunkName(slug);
        zzapRowsPromise = (async () => {
            if (!slug || !chunk) return [];
            const data = await fetchJson(`${ZZAP_BASE}${chunk}`);
            const rows = Array.isArray(data?.games?.[slug]) ? data.games[slug] : [];
            return rows
                .filter((row) => Array.isArray(row) && (system === "amiga" ? row[2] === "a" : row[2] === "c"))
                .map((row) => ({
                    magazine: "Zzap!64",
                    issue: String(row[0] || ""),
                    date: "",
                    page: Number(row[1]) || null,
                    reviewer: "",
                    score: "Not recorded",
                    scorePercent: null,
                    url: zzapReviewUrl(row[0], row[1]),
                    language: "English",
                    scanStatus: "available",
                    era: "contemporary"
                }));
        })();
        return zzapRowsPromise;
    }

    function dedupe(rows) {
        const seen = new Set();
        return rows.filter((row) => {
            const key = [row.magazine, row.issue, row.page, row.score, row.url].join("|").toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function scoreClass(percent) {
        if (!Number.isFinite(Number(percent))) return "is-unscored";
        if (Number(percent) >= 90) return "is-excellent";
        if (Number(percent) >= 75) return "is-good";
        if (Number(percent) >= 60) return "is-mixed";
        return "is-low";
    }

    function reviewLabel(row) {
        const parts = [row.magazine];
        if (row.issue) parts.push(`Issue ${row.issue}`);
        if (row.score && row.score !== "Not recorded") parts.push(row.score);
        return parts.join(" · ");
    }

    function stats(rows) {
        const contemporary = rows.filter((row) => row.era !== "retrospective" && Number.isFinite(Number(row.scorePercent)));
        const scored = contemporary.length ? contemporary : rows.filter((row) => Number.isFinite(Number(row.scorePercent)));
        if (!scored.length) return null;
        const values = scored.map((row) => Number(row.scorePercent));
        return {
            average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
            low: Math.min(...values),
            high: Math.max(...values),
            count: scored.length
        };
    }

    function createText(className, text) {
        const element = document.createElement("span");
        element.className = className;
        element.textContent = text;
        return element;
    }

    function updateReview(panel, rows, index) {
        const row = rows[index] || rows[0];
        if (!row) return;
        const score = panel.querySelector("[data-magazine-score]");
        const magazine = panel.querySelector("[data-magazine-name]");
        const meta = panel.querySelector("[data-magazine-meta]");
        const reviewer = panel.querySelector("[data-magazine-reviewer]");
        const link = panel.querySelector("[data-magazine-link]");

        score.className = `ccg-magazine-review__score ${scoreClass(row.scorePercent)}`;
        score.textContent = row.score || "Not recorded";
        magazine.textContent = row.magazine;

        const details = [];
        if (row.issue) details.push(`Issue ${row.issue}`);
        if (row.date) details.push(row.date);
        if (row.page) details.push(`page ${row.page}`);
        if (row.language && row.language !== "English") details.push(row.language);
        if (row.era === "retrospective") details.push("modern retrospective");
        meta.textContent = details.join(" · ") || "Magazine review";
        reviewer.textContent = row.reviewer ? `Reviewed by ${row.reviewer}` : "Reviewer not recorded";

        if (row.url && row.scanStatus !== "missing") {
            link.href = row.url;
            link.hidden = false;
            link.textContent = "Read Original Review";
            link.removeAttribute("aria-disabled");
        } else {
            link.removeAttribute("href");
            link.hidden = false;
            link.textContent = "Scan Not Available";
            link.setAttribute("aria-disabled", "true");
        }
    }

    function buildPanel(rows) {
        const panel = document.createElement("section");
        panel.className = "ccg-magazine-reviews";
        panel.setAttribute(PANEL_ATTR, "true");
        panel.setAttribute("aria-label", "Magazine reviews");

        const heading = document.createElement("div");
        heading.className = "ccg-magazine-reviews__heading";
        heading.append(createText("ccg-magazine-reviews__title", `Magazine Reviews · ${rows.length}`));
        const summary = stats(rows);
        if (summary) {
            heading.append(createText(
                "ccg-magazine-reviews__summary",
                `Contemporary average ${summary.average}% · range ${summary.low}–${summary.high}%`
            ));
        } else {
            heading.append(createText("ccg-magazine-reviews__summary", "Original review scans and issue references"));
        }

        const label = document.createElement("label");
        label.className = "ccg-magazine-reviews__select-label";
        label.textContent = "Choose a magazine review";
        const select = document.createElement("select");
        select.className = "ccg-magazine-reviews__select";
        rows.forEach((row, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = reviewLabel(row);
            select.appendChild(option);
        });
        label.appendChild(select);

        const selected = document.createElement("article");
        selected.className = "ccg-magazine-review";
        selected.innerHTML = [
            '<span class="ccg-magazine-review__score" data-magazine-score></span>',
            '<div class="ccg-magazine-review__body">',
            '<strong class="ccg-magazine-review__name" data-magazine-name></strong>',
            '<span class="ccg-magazine-review__meta" data-magazine-meta></span>',
            '<span class="ccg-magazine-review__reviewer" data-magazine-reviewer></span>',
            '</div>',
            '<a class="game-pill ccg-magazine-review__link" data-magazine-link target="_blank" rel="noopener noreferrer external"></a>'
        ].join("");

        panel.append(heading, label, selected);
        select.addEventListener("change", () => updateReview(panel, rows, Number(select.value)));
        updateReview(panel, rows, 0);
        return panel;
    }

    function isZzapLink(link) {
        try {
            return new URL(link.href).hostname.replace(/^www\./i, "").toLowerCase() === "zzap64.co.uk";
        } catch {
            return false;
        }
    }

    async function render() {
        if (applying) return;
        const container = document.getElementById("gameLemonLinks");
        if (!container) return;
        applying = true;
        if (observer) observer.disconnect();
        try {
            const rows = dedupe([...(await loadMagazineRows()), ...(await loadZzapRows())]);
            container.querySelectorAll(`[${PANEL_ATTR}]`).forEach((panel) => panel.remove());
            container.querySelectorAll("a[href]").forEach((link) => {
                if (isZzapLink(link)) link.remove();
            });
            if (!rows.length) return;

            container.appendChild(buildPanel(rows));
            const card = document.getElementById("game-reading-card");
            const hub = document.getElementById("game-utility-hub-section");
            const title = card?.querySelector(".ccg-utility-card__title");
            if (title) title.textContent = "Reviews & Resources";
            if (card) card.hidden = false;
            if (hub) hub.hidden = false;
        } finally {
            applying = false;
            if (observer && container.isConnected) observer.observe(container, { childList: true });
        }
    }

    function observe() {
        const container = document.getElementById("gameLemonLinks");
        if (!container || observer) return;
        observer = new MutationObserver(() => {
            if (!applying) window.setTimeout(render, 0);
        });
        observer.observe(container, { childList: true });
    }

    function init() {
        const isGamePage = document.documentElement.matches('[data-ccg-page="single-game"]')
            || document.querySelector(".ccg-page--single-game");
        if (!isGamePage) return;
        render();
        observe();
        window.setTimeout(render, 500);
        window.setTimeout(render, 1500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
