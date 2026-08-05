/* ============================================================
   CCG ARCHIVE SHORTCUTS
   Adds distinctive archive destinations without rewriting the
   duplicated static navigation markup on generated pages.
============================================================ */

(function () {
    "use strict";

    const SHORTCUTS = [
        { href: "/zzap64/", label: "Zzap!64 Awards", terms: "zzap zzap64 gold medal sizzler silver medal awards magazine" }
    ];

    function normalize(value) {
        return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    }

    function addNavigationLinks() {
        document.querySelectorAll("[data-ccg-nav-secondary]").forEach((list) => {
            SHORTCUTS.forEach((shortcut) => {
                if (list.querySelector(`a[href="${shortcut.href}"]`)) return;
                const li = document.createElement("li");
                const link = document.createElement("a");
                link.className = "ccg-nav__link";
                link.href = shortcut.href;
                link.textContent = shortcut.label;
                li.appendChild(link);
                list.prepend(li);
            });
        });
    }

    function createSearchResult(shortcut) {
        const section = document.createElement("section");
        section.className = "ccg-global-search__group";
        section.setAttribute("data-ccg-archive-shortcut-result", shortcut.href);
        section.innerHTML = `
            <h3 class="ccg-global-search__group-title">Distinctive CCG Archives <span class="ccg-global-search__group-count">1</span></h3>
            <ul class="ccg-global-search__list">
                <li>
                    <a class="ccg-global-search__result" href="${shortcut.href}">
                        <span class="ccg-global-search__result-main">
                            <span class="ccg-global-search__result-title">${shortcut.label}</span>
                            <span class="ccg-global-search__result-meta">Searchable CCG magazine awards archive</span>
                        </span>
                        <span class="ccg-global-search__result-type">Archive</span>
                    </a>
                </li>
            </ul>
        `;
        return section;
    }

    function syncSearchShortcuts() {
        const input = document.getElementById("ccgGlobalSearchInput");
        const results = document.getElementById("ccgGlobalSearchResults");
        if (!input || !results) return;

        results.querySelectorAll("[data-ccg-archive-shortcut-result]").forEach((node) => node.remove());
        const query = normalize(input.value);
        if (query.length < 2) return;

        SHORTCUTS.forEach((shortcut) => {
            const haystack = normalize(`${shortcut.label} ${shortcut.terms}`);
            if (haystack.includes(query) || query.split(" ").every((term) => haystack.includes(term))) {
                results.prepend(createSearchResult(shortcut));
            }
        });
    }

    function bindSearch() {
        const input = document.getElementById("ccgGlobalSearchInput");
        const results = document.getElementById("ccgGlobalSearchResults");
        if (!input || !results || input.dataset.ccgArchiveShortcutBound === "true") return false;
        input.dataset.ccgArchiveShortcutBound = "true";
        input.addEventListener("input", () => setTimeout(syncSearchShortcuts, 0));
        new MutationObserver(() => {
            if (!results.querySelector("[data-ccg-archive-shortcut-result]")) syncSearchShortcuts();
        }).observe(results, { childList: true });
        return true;
    }

    function init() {
        addNavigationLinks();
        if (bindSearch()) return;
        const observer = new MutationObserver(() => {
            addNavigationLinks();
            if (bindSearch()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
