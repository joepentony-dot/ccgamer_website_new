(function () {

function initGlobalMusicPlayers() {

    if (!window.ccgGameMusic?.renderGameMusicPlayer) return;

    const players = document.querySelectorAll(".music-player");

    players.forEach(el => {

        // Prevent double rendering
        if (el.dataset.initialised === "true") return;

        const slug = el.dataset.slug;
        if (!slug) return;

        window.ccgGameMusic.renderGameMusicPlayer(el, slug);

        el.dataset.initialised = "true";
    });
}

// Run on initial page load
document.addEventListener("DOMContentLoaded", initGlobalMusicPlayers);

// Run after dynamic content loads (IMPORTANT for composer pages)
document.addEventListener("gamesLoaded", initGlobalMusicPlayers);

})();
