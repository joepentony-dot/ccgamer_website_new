// =====================================================
// COMPLETE INDEX ENGINE — GRID + LIST MODE
// Cheeky Commodore Gamer
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    const gridEl = document.getElementById("gridView");
    const listEl = document.getElementById("listBody");

    const searchEl = document.getElementById("indexSearch");
    const sortEl = document.getElementById("sortSelect");

    const gridBtn = document.getElementById("gridBtn");
    const listBtn = document.getElementById("listBtn");

    let games = [];
    let filtered = [];

    // Load games
    try {
        games = await ccgFetchGames();
        filtered = [...games];
        renderGrid();
        renderList();
    } catch (e) {
        console.error("Error loading complete index:", e);
        gridEl.innerHTML = "<p style='color:red;'>ERROR LOADING GAME DATA</p>";
        return;
    }

    // ================================
    // SEARCH
    // ================================
    searchEl.addEventListener("input", () => {
        applyFilters();
    });

    // ================================
    // SORT
    // ================================
    sortEl.addEventListener("change", () => {
        applyFilters();
    });

    // ================================
    // VIEW SWITCH
    // ================================
    gridBtn.addEventListener("click", () => {
        gridBtn.classList.add("active");
        listBtn.classList.remove("active");
        document.getElementById("gridView").style.display = "grid";
        document.getElementById("listView").style.display = "none";
    });

    listBtn.addEventListener("click", () => {
        listBtn.classList.add("active");
        gridBtn.classList.remove("active");
        document.getElementById("gridView").style.display = "none";
        document.getElementById("listView").style.display = "block";
    });

    // ================================
    // APPLY FILTERS (search + sort)
    // ================================
    function applyFilters() {
        const q = searchEl.value.trim().toLowerCase();

        filtered = games.filter(g =>
            g.title.toLowerCase().includes(q) ||
            (g.genreLabels.join(", ").toLowerCase().includes(q)) ||
            (g.system.toLowerCase().includes(q))
        );

        sortFiltered();
        renderGrid();
        renderList();
    }

    // ================================
    // SORT LOGIC
    // ================================
    function sortFiltered() {
        const mode = sortEl.value;

        if (mode === "title-asc") {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        }
        else if (mode === "title-desc") {
            filtered.sort((a, b) => b.title.localeCompare(a.title));
        }
        else if (mode === "system") {
            filtered.sort((a, b) => a.system.localeCompare(b.system));
        }
    }

    // ================================
    // GRID RENDERER
    // ================================
    function renderGrid() {
        gridEl.innerHTML = "";

        filtered.forEach(g => {
            const card = document.createElement("div");
            card.className = "game-card";

            card.innerHTML = `
                <div class="game-thumb">
                    ${g.thumb ? `<img src="${g.thumb}" loading="lazy">` : ""}
                </div>
                <div class="game-info">
                    <h3>${g.title}</h3>
                    <p class="game-system">[${g.system.toUpperCase()}]</p>
                    <p class="game-genres">${g.genreLabels.join(" · ")}</p>
                </div>
            `;

            gridEl.appendChild(card);
        });
    }

    // ================================
    // LIST RENDERER
    // ================================
    function renderList() {
        listEl.innerHTML = "";

        filtered.forEach(g => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${g.title}</td>
                <td>${g.system.toUpperCase()}</td>
                <td>${g.genreLabels.join(", ")}</td>
            `;

            listEl.appendChild(row);
        });
    }

});
