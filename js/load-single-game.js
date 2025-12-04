// ===============================================================
// OMEGA LOAD-SINGLE-GAME ENGINE 😇🕹️👌
// Fully compatible with FINAL game.html (Omega Hero Edition)
// Reads /games/games.json and populates the whole page
// ===============================================================

(function () {

    const REPO_PREFIX = '/ccgamer_website_new';

    function qs(sel) { return document.querySelector(sel); }

    function setText(el, value, fallback = '—') {
        if (!el) return;
        const v = (value === undefined || value === null || String(value).trim() === '')
            ? fallback
            : String(value);
        el.textContent = v;
    }

    function getGameId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function resolveJsonPath() {
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        return (usingRepoPrefix ? REPO_PREFIX : '') + '/games/games.json';
    }

    function normaliseThumb(raw, usingRepoPrefix) {
        if (!raw) return '../resources/images/thumbnails/all/fallback.jpg';

        // HTTP URLs remain unchanged
        if (/^https?:\/\//i.test(raw)) return raw;

        let url = raw.replace(/^\/+/, ''); // remove all leading slashes
        url = '../' + url; // relative from /games/game.html

        return url;
    }

    // -------------------------------------------------------
    // Populate the page with the selected game
    // -------------------------------------------------------
    function populateGame(game, usingRepoPrefix) {

        // HERO
        setText(qs('#game-title'), game.title || game.id);
        setText(qs('#game-system'), game.system || 'Unknown');
        setText(qs('#game-year'), game.year || '—');

        // Genres
        const genresStr = Array.isArray(game.genres) && game.genres.length
            ? game.genres.join(' • ')
            : 'Unclassified';

        setText(qs('#game-genres'), genresStr);

        // Hero Image
        const heroImg = qs('#game-hero-image');
        if (heroImg) {
            heroImg.src = normaliseThumb(game.thumbnail, usingRepoPrefix);
            heroImg.alt = `${game.title} cover`;
        }

        // Description placeholder (no description field yet)
        setText(qs('#game-description'), 'A full description will appear here once added to games.json.');

        // ---------------------------------------------------
        // External Links: Video / Manual / Disk
        // ---------------------------------------------------

        // VIDEO
        const videoBtn = qs('#game-play-video');
        const videoSection = qs('#game-video-section');
        const videoEmbed = qs('#game-video-embed');

        if (game.videoid) {
            if (videoBtn) {
                videoBtn.href = `https://www.youtube.com/watch?v=${encodeURIComponent(game.videoid)}`;
                videoBtn.hidden = false;
            }
            if (videoSection && videoEmbed) {
                videoEmbed.src = `https://www.youtube.com/embed/${encodeURIComponent(game.videoid)}`;
                videoSection.hidden = false;
            }
        }

        // MANUAL PDF
        const manualBtn = qs('#game-open-manual');
        const manualSection = qs('#game-manual-section');

        if (manualBtn && manualSection) {
            if (game.pdf) {
                manualBtn.href = game.pdf;
                manualBtn.hidden = false;
                manualSection.hidden = false;
            }
        }

        // Disk links (first disk only for now)
        const diskBtn = qs('#game-open-disk');
        if (diskBtn && Array.isArray(game.disk) && game.disk.length) {
            diskBtn.href = game.disk[0];
            diskBtn.hidden = false;
        }
    }

    // -------------------------------------------------------
    // Load and find the correct game entry
    // -------------------------------------------------------
    async function loadGame() {

        const gameId = getGameId();
        if (!gameId) {
            setText(qs('#game-title'), 'Unknown Game');
            return;
        }

        try {
            const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
            const response = await fetch(resolveJsonPath(), { cache: 'no-store' });

            if (!response.ok) throw new Error('Failed loading games.json');

            const json = await response.json();
            const games = Array.isArray(json) ? json : json.games || [];

            const game = games.find(g => g.id === gameId);

            if (!game) {
                setText(qs('#game-title'), 'Game Not Found');
                return;
            }

            populateGame(game, usingRepoPrefix);

        } catch (err) {
            console.error('Single Game Loader Error:', err);
            setText(qs('#game-title'), 'Error Loading Game');
        }
    }

    document.addEventListener('DOMContentLoaded', loadGame);

})();
