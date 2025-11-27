async function fetchGames() {
    const res = await fetch("../games.json");
    return await res.json();
}

function createAccordionSection(title, games) {
    const id = title.toLowerCase().replace(/\s+/g, "-");

    return `
        <div class="accordion-section">
            <div class="accordion-header" data-target="${id}">
                ${title}
            </div>
            <div class="accordion-content" id="${id}">
                <div class="game-grid">
                    ${games.map(g => `
                        <div class="game-card">
                            <a href="game.html?id=${g.id}">
                                <img src="${g.thumbnail}" alt="${g.title}">
                            </a>
                            <div>${g.title}</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>
    `;
}

async function buildAccordion() {
    const games = await fetchGames();

    // ================
    // Build GENRE list
    // ================
    const genreGroups = {};

    games.forEach(g => {
        const genre = g.genre || "Miscellaneous";
        if (!genreGroups[genre]) genreGroups[genre] = [];
        genreGroups[genre].push(g);
    });

    const genreContainer = document.getElementById("accordion-genre");
    genreContainer.innerHTML = Object.keys(genreGroups)
        .sort()
        .map(genre => createAccordionSection(genre, genreGroups[genre]))
        .join("");

    // =====================
    // Build SPECIAL lists
    // =====================
    const specialContainer = document.getElementById("accordion-special");

    const specials = {
        "C64 Cartridge Games": games.filter(g => g.special === "cartridge"),
        "BPjS Indexed Games": games.filter(g => g.special === "bpjs"),
        "Top Picks": games.filter(g => g.special === "top"),
        "Licensed Games": games.filter(g => g.special === "licensed"),
    };

    specialContainer.innerHTML = Object.entries(specials)
        .filter(([name, list]) => list.length > 0)
        .map(([name, list]) => createAccordionSection(name, list))
        .join("");

    // ============================
    // Enable accordion behaviour
    // ============================
    document.querySelectorAll(".accordion-header").forEach(header => {
        header.addEventListener("click", () => {
            const target = document.getElementById(header.dataset.target);
            const visible = target.style.display === "block";

            document.querySelectorAll(".accordion-content")
                .forEach(div => div.style.display = "none");

            if (!visible) target.style.display = "block";
        });
    });
}

buildAccordion();
