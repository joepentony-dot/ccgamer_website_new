/* ============================================================
   CCG SECONDARY PUBLISHER RUNTIME
   ------------------------------------------------------------
   Adds source-backed secondary/re-release publisher associations
   without rewriting primary publisher credits in games.json.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_SECONDARY_PUBLISHER_READY) return;
    window.CCG_SECONDARY_PUBLISHER_READY = true;

    const DATA_PATH = "/data/publisher-secondary-credits.json";
    let rulesPromise = null;

    function normalizeTitle(value) {
        let normalized = String(value ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’‘]/g, "'")
            .toLowerCase();

        normalized = normalized
            .replace(/\([^)]*(?:version|edition)[^)]*\)/gi, " ")
            .replace(/\biii\b/g, "3")
            .replace(/\bii\b/g, "2")
            .replace(/\bi\b/g, "1")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (normalized.startsWith("the ")) normalized = normalized.slice(4).trim();
        if (normalized.endsWith(" the")) normalized = normalized.slice(0, -4).trim();
        return normalized;
    }

    function normalizeSystem(game) {
        const raw = String(game?.system || game?.platform || game?.computer || "").trim().toLowerCase();
        if (raw.includes("amiga")) return "Amiga";
        if (raw === "c64" || raw.includes("commodore 64")) return "C64";
        return String(game?.system || game?.platform || "").trim();
    }

    function slugifyPublisher(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/&/g, " and ")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-{2,}/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    async function loadRules() {
        if (rulesPromise) return rulesPromise;
        rulesPromise = fetch(DATA_PATH, { cache: "default" })
            .then((response) => {
                if (!response.ok) throw new Error(`${DATA_PATH} returned HTTP ${response.status}`);
                return response.json();
            })
            .then((payload) => Array.isArray(payload?.rules) ? payload.rules : [])
            .catch((error) => {
                console.warn("[CCG secondary publisher] Data unavailable", error);
                return [];
            });
        return rulesPromise;
    }

    function matchingPublishers(game, rules) {
        const system = normalizeSystem(game);
        const titleKeys = new Set([
            normalizeTitle(game?.title),
            normalizeTitle(game?.sorttitle)
        ].filter(Boolean));
        const seen = new Set();
        const publishers = [];

        rules.forEach((rule) => {
            const publisher = String(rule?.publisher || "").trim();
            const ruleSystem = String(rule?.system || "").trim();
            if (!publisher || (ruleSystem && ruleSystem !== system)) return;

            const matched = (Array.isArray(rule?.titles) ? rule.titles : []).some((entry) => {
                const values = typeof entry === "string"
                    ? [entry]
                    : [entry?.title, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])];
                return values.some((value) => titleKeys.has(normalizeTitle(value)));
            });

            const key = publisher.toLowerCase();
            if (!matched || seen.has(key)) return;
            seen.add(key);
            publishers.push(publisher);
        });

        return publishers;
    }

    function decorateCredits(publishers) {
        const list = document.querySelector(".ccg-behind-pixels-inline__list");
        if (!list) return;

        list.querySelectorAll("[data-secondary-publisher-credit]").forEach((node) => node.remove());
        if (!publishers.length) return;

        const term = document.createElement("dt");
        term.dataset.secondaryPublisherCredit = "true";
        term.textContent = publishers.length > 1 ? "Secondary Publishers" : "Secondary Publisher";

        const detail = document.createElement("dd");
        detail.dataset.secondaryPublisherCredit = "true";

        publishers.forEach((publisher, index) => {
            if (index > 0) detail.appendChild(document.createTextNode(", "));
            const slug = slugifyPublisher(publisher);
            const link = document.createElement("a");
            link.href = slug ? `/games/publishers/${slug}/` : "/games/publishers/";
            link.textContent = publisher;
            link.title = `Browse ${publisher} games in the CCG publisher archive`;
            detail.appendChild(link);
        });

        list.append(term, detail);
        const block = list.closest(".ccg-behind-pixels-inline");
        if (block) block.hidden = false;
    }

    async function applyForGame(game) {
        if (!game || typeof game !== "object") return;
        const rules = await loadRules();
        decorateCredits(matchingPublishers(game, rules));
    }

    window.addEventListener("ccg:game-loaded", (event) => {
        void applyForGame(event?.detail?.game || null);
    });
})();
