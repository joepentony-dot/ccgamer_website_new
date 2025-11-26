/* ===============================================
   CHEEKY COMMODORE GAMER – ENGINE JS
   Starfield • CRT • Navigation • Shared Logic
   =============================================== */

// ------------------------------
// STARFIELD BACKGROUND
// ------------------------------
const starCanvas = document.getElementById("starfield");
if (starCanvas) {
    const ctx = starCanvas.getContext("2d");
    let stars = [];

    function resizeStarCanvas() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
        createStars();
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * starCanvas.width,
                y: Math.random() * starCanvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 3 + 0.5
            });
        }
    }

    function animateStars() {
        ctx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        ctx.fillStyle = "#fff";
        stars.forEach(s => {
            ctx.fillRect(s.x, s.y, s.size, s.size);
            s.y += s.speed;
            if (s.y > starCanvas.height) s.y = 0;
        });
        requestAnimationFrame(animateStars);
    }

    window.addEventListener("resize", resizeStarCanvas);
    resizeStarCanvas();
    animateStars();
}

// ------------------------------
// RETRO CLICK SOUND
// ------------------------------
function playClickSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();

        o.connect(g);
        g.connect(ctx.destination);
        o.type = "square";
        o.frequency.value = 140;
        g.gain.value = 0.08;

        o.start();
        o.stop(ctx.currentTime + 0.12);
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".play-sound")
        .forEach(el => el.addEventListener("click", playClickSound));
});

// ------------------------------
// SEARCH BOX LOGIC (shared)
// ------------------------------
window.ccgSearchInit = function(searchInputId, resultsBoxId, dataSource) {

    const input = document.getElementById(searchInputId);
    const results = document.getElementById(resultsBoxId);

    if (!input || !results || !dataSource) return;

    input.addEventListener("input", () => {
        const q = input.value.toLowerCase().trim();
        results.innerHTML = "";

        if (q.length < 2) {
            results.classList.remove("active");
            return;
        }

        const matches = dataSource
            .filter(g => g.title.toLowerCase().includes(q))
            .slice(0, 12);

        if (!matches.length) {
            results.innerHTML = `<div class="result-item">NO MATCHES FOUND</div>`;
        } else {
            results.innerHTML = matches.map(m => `
                <div class="result-item play-sound" onclick="window.open('https://www.youtube.com/watch?v=${m.video}', '_blank')">
                    ${m.title} <span style="color:var(--c64-light-blue)">[${m.system}]</span>
                </div>
            `).join("");
        }

        results.classList.add("active");
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".search-wrapper")) {
            results.classList.remove("active");
        }
    });
};

// ------------------------------
// SOCIAL ICONS (used by every page)
// ------------------------------
window.ccgSocialBar = function() {
    return `
        <div class="social-bar">
            <a href="https://www.youtube.com/@CheekyCommodoreGamer" target="_blank"><i class="fab fa-youtube"></i></a>
            <a href="https://www.patreon.com/CheekyCommodoreGamer" target="_blank"><i class="fab fa-patreon"></i></a>
            <a href="https://twitter.com/CheekyC64Gamer" target="_blank"><i class="fab fa-twitter"></i></a>
            <a href="https://facebook.com/CheekyCommodoreGamer" target="_blank"><i class="fab fa-facebook"></i></a>
            <a href="https://discord.gg/cheekycommodoregamer" target="_blank"><i class="fab fa-discord"></i></a>
            <a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" target="_blank"><i class="fa-solid fa-hand-holding-dollar"></i></a>
        </div>
    `;
};
