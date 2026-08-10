/* ============================================================
   CCG ZZAP!64 AWARD → GAME LINK RESOLVER
   ------------------------------------------------------------
   Uses verified issue/page scan identity from the compact all-game
   review data to repair award cards whose magazine title differs
   from the title used by the CCG archive (for example, Rambo).
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_GAME_LINK_FIX_READY) return;
    window.CCG_ZZAP64_GAME_LINK_FIX_READY = true;

    const DATA_BASE = "/data/zzap64-game-reviews/";
    const MANIFEST_URL = `${DATA_BASE}manifest.json`;
    const state = {
        byScan: new Map(),
        observer: null
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

    function normalizeScan(value) {
        try {
            const url = new URL(String(value || ""), window.location.origin);
            const host = url.hostname.replace(/^www\./i, "").toLowerCase();
            const issue = Number(url.searchParams.get("issue"));
            const page = Number(url.searchParams.get("page"));
            if (host !== "zzap64.co.uk") return "";
            if (url.pathname.toLowerCase() !== "/cgi-bin/displaypage.pl") return "";
            if (!Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) return "";
            return `${issue}|${page}`;
        } catch {
            return "";
        }
    }

    function safeSlug(value) {
        const slug = String(value || "").trim().replace(/^\/+|\/+$/g, "");
        return /^[a-z0-9-]+$/i.test(slug) ? slug : "";
    }

    function addScan(scan, match, ambiguous) {
        if (!scan || !match?.slug || ambiguous.has(scan)) return;
        const existing = state.byScan.get(scan);
        if (existing && existing.slug !== match.slug) {
            state.byScan.delete(scan);
            ambiguous.add(scan);
            return;
        }
        state.byScan.set(scan, match);
    }

    function buildIndex(chunks) {
        const ambiguous = new Set();
        chunks.forEach((data) => {
            Object.entries(data?.games || {}).forEach(([rawSlug, rows]) => {
                const slug = safeSlug(rawSlug);
                if (!slug || !Array.isArray(rows)) return;
                rows.forEach((row) => {
                    if (!Array.isArray(row) || row.length < 4) return;
                    const issue = Number(row[0]);
                    const page = Number(row[1]);
                    if (!Number.isInteger(issue) || !Number.isInteger(page)) return;
                    addScan(`${issue}|${page}`, {
                        slug,
                        title: String(row[3] || "").trim()
                    }, ambiguous);
                });
            });
        });
    }

    async function loadChunks() {
        const manifestResponse = await fetch(MANIFEST_URL, { cache: "default" });
        if (!manifestResponse.ok) throw new Error(`Review manifest HTTP ${manifestResponse.status}`);
        const manifest = await manifestResponse.json();
        const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
        if (!chunks.length) throw new Error("Review manifest contains no chunks");
        return Promise.all(chunks.map(async (chunk) => {
            const response = await fetch(`${DATA_BASE}${encodeURIComponent(chunk)}`, { cache: "default" });
            if (!response.ok) throw new Error(`${chunk} HTTP ${response.status}`);
            return response.json();
        }));
    }

    function repairCard(card) {
        if (!(card instanceof Element) || card.dataset.gameLinked === "true") return;
        const scanLink = card.querySelector(".zzap-award-card__magazine-link--page[href]");
        const scan = normalizeScan(scanLink?.href);
        const match = scan ? state.byScan.get(scan) : null;
        if (!match) return;

        const heading = card.querySelector(".zzap-award-card__title");
        const titleNode = heading?.querySelector(".zzap-award-card__game-name");
        if (!heading || !titleNode) return;
        const visibleTitle = titleNode.textContent.trim() || match.title;
        if (!visibleTitle) return;

        heading.innerHTML = `
            <a class="zzap-award-card__game-link" href="/games/${encodeURIComponent(match.slug)}/" aria-label="Open the CCG game page for ${escapeHtml(visibleTitle)}">
                <span class="zzap-award-card__game-name">${escapeHtml(visibleTitle)}</span>
                <span class="zzap-award-card__game-action">Open game page <span aria-hidden="true">→</span></span>
            </a>
        `;
        card.dataset.gameLinked = "true";
        card.dataset.gameLinkResolvedByScan = "true";
    }

    function repairAll(root = document) {
        root.querySelectorAll?.(".zzap-award-card").forEach(repairCard);
    }

    function observeGrid() {
        const grid = document.getElementById("zzapAwardsGrid");
        if (!grid) return;
        repairAll(grid);
        state.observer?.disconnect();
        state.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.matches(".zzap-award-card")) repairCard(node);
                    repairAll(node);
                });
            });
        });
        state.observer.observe(grid, { childList: true, subtree: true });
    }

    async function init() {
        try {
            buildIndex(await loadChunks());
            observeGrid();
        } catch (error) {
            console.warn("[CCG] Zzap award scan-to-game resolver unavailable:", error);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
