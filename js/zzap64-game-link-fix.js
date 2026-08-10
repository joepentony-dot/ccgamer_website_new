/* ============================================================
   CCG ZZAP!64 AWARD → GAME LINK RESOLVER
   ------------------------------------------------------------
   Repairs a small set of verified magazine-title differences that
   the conservative shared matcher intentionally does not guess.

   IMPORTANT: a Zzap scan page can contain more than one review, so
   issue/page identity alone must never be used to choose a CCG game.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_GAME_LINK_FIX_READY) return;
    window.CCG_ZZAP64_GAME_LINK_FIX_READY = true;

    const DATA_BASE = "/data/zzap64-game-reviews/";
    const MANIFEST_URL = `${DATA_BASE}manifest.json`;

    // Key format: normalized award title | issue | page.
    // These are intentionally explicit. Do not broaden this to page-only matching:
    // several Zzap pages contain multiple reviews and therefore map to several games.
    const VERIFIED_OVERRIDES = new Map([
        ["cauldron ii|14|16", "cauldron-2-the-pumpkin-strikes-back"],
        ["leaderboard|15|19", "leader-board"],
        ["dan dare|19|26", "dan-dare-pilot-of-the-future"],
        ["escape from singe s castle|22|78", "dragons-lair-2-escape-from-singes-castle"],
        ["international karate plus|31|12", "ik-c64"],
        ["last ninja 2|41|16", "last-ninja-2-back-with-a-vengeance"],
        ["zak mckracken|47|70", "zak-mckracken-and-the-alien-mindbenders"],
        ["rambo|53|58", "rambo-first-blood-part-2"],
        ["turbo outrun|56|8", "turbo-out-run"],
        ["myth|56|14", "myth-history-in-the-making"]
    ]);

    const state = {
        knownSlugs: new Set(),
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

    function normalizeTitle(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function scanIdentity(value) {
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

    async function loadKnownSlugs() {
        const manifestResponse = await fetch(MANIFEST_URL, { cache: "default" });
        if (!manifestResponse.ok) throw new Error(`Review manifest HTTP ${manifestResponse.status}`);
        const manifest = await manifestResponse.json();
        const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
        if (!chunks.length) throw new Error("Review manifest contains no chunks");

        const datasets = await Promise.all(chunks.map(async (chunk) => {
            const response = await fetch(`${DATA_BASE}${encodeURIComponent(chunk)}`, { cache: "default" });
            if (!response.ok) throw new Error(`${chunk} HTTP ${response.status}`);
            return response.json();
        }));

        datasets.forEach((data) => {
            Object.keys(data?.games || {}).forEach((rawSlug) => {
                const slug = safeSlug(rawSlug);
                if (slug) state.knownSlugs.add(slug);
            });
        });
    }

    function overrideForCard(card) {
        const titleNode = card.querySelector(".zzap-award-card__game-name");
        const scanLink = card.querySelector(".zzap-award-card__magazine-link--page[href]");
        const scan = scanIdentity(scanLink?.href);
        const title = normalizeTitle(titleNode?.textContent);
        if (!title || !scan) return null;

        const slug = VERIFIED_OVERRIDES.get(`${title}|${scan}`);
        if (!slug || !state.knownSlugs.has(slug)) return null;
        return { slug, title: titleNode.textContent.trim() };
    }

    function repairCard(card) {
        if (!(card instanceof Element) || card.dataset.gameLinked === "true") return;
        const match = overrideForCard(card);
        if (!match) return;

        const heading = card.querySelector(".zzap-award-card__title");
        if (!heading || !match.title) return;

        heading.innerHTML = `
            <a class="zzap-award-card__game-link" href="/games/${encodeURIComponent(match.slug)}/" aria-label="Open the CCG game page for ${escapeHtml(match.title)}">
                <span class="zzap-award-card__game-name">${escapeHtml(match.title)}</span>
                <span class="zzap-award-card__game-action">Open game page <span aria-hidden="true">→</span></span>
            </a>
        `;
        card.dataset.gameLinked = "true";
        card.dataset.gameLinkResolvedByAlias = "true";
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
            await loadKnownSlugs();
            observeGrid();
        } catch (error) {
            console.warn("[CCG] Verified Zzap title-alias resolver unavailable:", error);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
