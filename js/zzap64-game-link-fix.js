/* ============================================================
   CCG ZZAP!64 AWARD → GAME LINK RESOLVER
   ------------------------------------------------------------
   Uses verified issue/page scan identity from the enriched review
   index to repair award cards whose magazine title differs from
   the title used by the CCG game archive (for example, Rambo).
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_GAME_LINK_FIX_READY) return;
    window.CCG_ZZAP64_GAME_LINK_FIX_READY = true;

    const INDEX_URL = "/data/zzap64-review-links.json";
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

    function buildIndex(data) {
        const ambiguous = new Set();
        Object.values(data?.entries || {}).forEach((record) => {
            const scan = normalizeScan(record?.url);
            const slug = safeSlug(record?.gameSlug);
            if (!scan || !slug || ambiguous.has(scan)) return;
            const existing = state.byScan.get(scan);
            if (existing && existing.slug !== slug) {
                state.byScan.delete(scan);
                ambiguous.add(scan);
                return;
            }
            state.byScan.set(scan, {
                slug,
                title: String(record?.gameTitle || "").trim()
            });
        });
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
            const response = await fetch(INDEX_URL, { cache: "default" });
            if (!response.ok) throw new Error(`Review index HTTP ${response.status}`);
            buildIndex(await response.json());
            observeGrid();
        } catch (error) {
            console.warn("[CCG] Zzap award scan-to-game resolver unavailable:", error);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
