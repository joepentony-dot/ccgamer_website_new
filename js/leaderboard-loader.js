// ======================================================================
//  OMEGA LEADERBOARD LOADER — Cheeky Commodore Gamer 😇🕹️👌
// ======================================================================
//  Responsibilities:
//   • Fetch scores from Google Apps Script backend
//   • Filter by quiz pack
//   • Filter by date range (7 days / 30 days / all-time)
//   • Sort by score (desc) then timestamp (asc)
//   • Render Omega leaderboard table with:
//        ✓ Neon Crown for Rank #1
//        ✓ "Your Best Score" highlight
//        ✓ Pack selector
//        ✓ Animated fade-in
//   • Fully compatible with quiz-engine.js save payload
// ======================================================================

(function () {
    "use strict";

    // -------------------------------------------------------------
    // CONFIG — UPDATE ONLY IF YOUR GAS ENDPOINT EVER CHANGES
    // -------------------------------------------------------------
    const API_URL =
        "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_CjNlywKPZHTP3FPGCKMNWDy6/exec";

    const BEST_STORE_KEY = "ccg_quiz_best_scores";
    const LOCAL_SCORE_KEY = "ccg_quiz_local_scores";

    // -------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------
    const LB = {
        rawScores: [],
        filtered: [],
        sets: [],
        currentRange: "7",  // "7" | "30" | "all"
        currentPack: "",
    };

    // -------------------------------------------------------------
    // DOM HELPERS
    // -------------------------------------------------------------
    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }
    function clear(el) { if (el) el.innerHTML = ""; }

    function setStatusNote(message, tone) {
        const note = qs("#lb-status-note");
        if (!note) return;

        note.textContent = message || "";
        note.dataset.tone = tone || "info";
        note.hidden = !message;
    }

    function loadBestScoresMap() {
        try {
            const raw = localStorage.getItem(BEST_STORE_KEY);
            if (!raw) return {};
            return JSON.parse(raw) || {};
        } catch {
            return {};
        }
    }

    function getBestScoreForPack(packId) {
        const map = loadBestScoresMap();
        return map[String(packId)] || 0;
    }

    function loadLocalScores() {
        try {
            const raw = localStorage.getItem(LOCAL_SCORE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    async function fetchLocalPacks() {
        const candidates = ["./quiz-data.json", "/quiz/quiz-data.json", "/quiz-data.json"]; // relative to /quiz/
        for (const url of candidates) {
            try {
                const res = await fetch(url, { cache: "no-store" });
                if (!res.ok) continue;
                const data = await res.json();
                const packs = (data && (data.packs || data.sets)) || [];
                return packs
                    .map((p) => ({ id: p.id || p.slug || p.name, name: p.name || p.title || "Quiz Pack" }))
                    .filter((p) => p.id);
            } catch (_) { }
        }
        return [];
    }

    async function loadLocalFallback() {
        const scores = loadLocalScores();
        if (!scores.length) return false;

        let packs = await fetchLocalPacks();

        LB.rawScores = scores.map((s) => ({
            name: s.name || "Anonymous",
            score: Number(s.score) || 0,
            setId: s.setId || s.set || "",
            timestamp: s.time || s.timestamp || Date.now()
        }));
        if (!packs.length) {
            const seen = new Set();
            packs = LB.rawScores
                .map((s) => s.setId)
                .filter(Boolean)
                .filter((id) => {
                    const str = String(id);
                    if (seen.has(str)) return false;
                    seen.add(str);
                    return true;
                })
                .map((id) => ({ id, name: `Pack ${id}` }));
        }

        LB.sets = packs;
        LB.currentRange = "all";
        LB.currentPack = LB.currentPack || "";
        return true;
    }

    // -------------------------------------------------------------
    // FETCH SCORES
    // -------------------------------------------------------------
    async function fetchScores() {
        try {
            const url = API_URL + "?t=" + Date.now(); // anti-cache
            const res = await fetch(url, { method: "GET" });

            if (!res.ok) throw new Error("Failed to load leaderboard");

            const data = await res.json();

            if (!data || !Array.isArray(data.scores)) {
                throw new Error("Invalid leaderboard data format");
            }

            LB.rawScores = data.scores;
            LB.sets = data.sets || [];

            return true;
        } catch (err) {
            console.error("LEADERBOARD ERROR", err);
            return false;
        }
    }

    // -------------------------------------------------------------
    // POPULATE PACK SELECTOR
    // -------------------------------------------------------------
    function populatePackSelect() {
        const select = qs("#lb-pack-select");
        if (!select) return;

        clear(select);

        // All packs
        const optAll = document.createElement("option");
        optAll.value = "";
        optAll.textContent = "All Packs";
        select.appendChild(optAll);

        // Each set from backend
        LB.sets.forEach((set) => {
            const opt = document.createElement("option");
            opt.value = set.id || set.ID || set.slug || "";
            opt.textContent = set.name || set.title || "Untitled Pack";
            select.appendChild(opt);
        });

        select.value = LB.currentPack;
    }

    // -------------------------------------------------------------
    // TIME WINDOW FILTER
    // -------------------------------------------------------------
    function filterTimeWindow(entries) {
        if (LB.currentRange === "all") return entries;

        const days = LB.currentRange === "7" ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

        return entries.filter(entry => {
            const ts = new Date(entry.timestamp).getTime();
            return ts >= cutoff;
        });
    }

    // -------------------------------------------------------------
    // PACK FILTER
    // -------------------------------------------------------------
    function filterByPack(entries) {
        if (!LB.currentPack) return entries;

        return entries.filter(e => {
            return String(e.setId) === String(LB.currentPack);
        });
    }

    // -------------------------------------------------------------
    // SORTING
    // -------------------------------------------------------------
    function sortEntries(entries) {
        return entries.slice().sort((a, b) => {
            // score DESC
            if (b.score !== a.score) return b.score - a.score;

            // earlier timestamp = better rank
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
    }

    // -------------------------------------------------------------
    // MAIN FILTER PIPELINE
    // -------------------------------------------------------------
    function computeFiltered() {
        let arr = LB.rawScores;

        arr = filterByPack(arr);
        arr = filterTimeWindow(arr);
        arr = sortEntries(arr);

        LB.filtered = arr;
    }

    // -------------------------------------------------------------
    // RENDER LEADERBOARD
    // -------------------------------------------------------------
    function renderTable() {
        const container = qs("#lb-table-container");
        if (!container) return;

        clear(container);

        if (!LB.filtered.length) {
            container.innerHTML = `
                <div class="lb-no-results">No scores found for this filter.</div>
            `;
            return;
        }

        const bestScore = getBestScoreForPack(LB.currentPack);

        const table = document.createElement("table");
        table.className = "lb-table";

        // HEADER
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Pack</th>
                    <th>Date</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement("tbody");

        LB.filtered.forEach((row, index) => {
            const tr = document.createElement("tr");

            const rank = index + 1;
            const packName = resolvePackName(row.setId);
            const isBest = row.score === bestScore && bestScore > 0;

            tr.className = "lb-row";

            // Neon crown for rank 1
            let rankDisplay = rank;
            if (rank === 1) {
                rankDisplay = `<span class="lb-crown">👑</span> 1`;
                tr.classList.add("lb-rank-one");
            }

            if (isBest) {
                tr.classList.add("lb-your-best");
            }

            tr.innerHTML = `
                <td class="lb-rank">${rankDisplay}</td>
                <td class="lb-player">${escapeHtml(row.name || "Anonymous")}</td>
                <td class="lb-score">${row.score}</td>
                <td class="lb-pack">${escapeHtml(packName)}</td>
                <td class="lb-date">${formatDate(row.timestamp)}</td>
            `;

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        table.classList.add("lb-fade-in");
    }

    // -------------------------------------------------------------
    // PACK NAME RESOLUTION
    // -------------------------------------------------------------
    function resolvePackName(id) {
        const set = LB.sets.find(s => String(s.id) === String(id));
        if (!set) return `Pack ${id}`;
        return set.name || set.title || `Pack ${id}`;
    }

    // -------------------------------------------------------------
    // FORMATTERS
    // -------------------------------------------------------------
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[m]));
    }

    function formatDate(ts) {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // -------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------
    function initTabs() {
        const tabs = qsa(".lb-tab");

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("lb-tab--active"));
                tab.classList.add("lb-tab--active");

                LB.currentRange = tab.dataset.lbRange;
                refreshLeaderboard();
            });
        });
    }

    function initPackSelect() {
        const sel = qs("#lb-pack-select");
        if (!sel) return;

        sel.addEventListener("change", () => {
            LB.currentPack = sel.value;
            refreshLeaderboard();
        });
    }

    // -------------------------------------------------------------
    // MAIN REFRESH CYCLE
    // -------------------------------------------------------------
    function refreshLeaderboard() {
        computeFiltered();
        renderTable();
    }

    async function init() {
        const ok = await fetchScores();
        let usingLocalFallback = false;

        if (!ok) {
            usingLocalFallback = await loadLocalFallback();

            if (!usingLocalFallback) {
                const c = qs("#lb-table-container");
                if (c) c.innerHTML = `<div class="lb-error">Leaderboard unavailable right now. Finish a quiz to build a local history.</div>`;
                setStatusNote("Live leaderboard unreachable. No local scores found yet.", "error");
                return;
            }
        }

        populatePackSelect();
        initTabs();
        initPackSelect();

        refreshLeaderboard();

        if (usingLocalFallback) {
            setStatusNote("Showing scores saved in this browser. Connect online to see the global leaderboard.", "warning");
        } else {
            setStatusNote("Live leaderboard loaded.", "info");
        }
    }

    // -------------------------------------------------------------
    // START
    // -------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", init);
})();
