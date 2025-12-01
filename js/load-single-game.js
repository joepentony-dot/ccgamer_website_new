// js/load-single-game.js
// Single game viewer loader for Cheeky Commodore Gamer

(function () {
    const GAMES_JSON_PATH = 'games.json'; // relative to /games/game.html

    function qs(selector) {
        return document.querySelector(selector);
    }

    function getGameIdFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function showError(message) {
        const errorEl = qs('#game-error');
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.hidden = false;
    }

    function setText(id, value, fallback = '–') {
        const el = qs(id);
        if (!el) return;
        el.textContent = value && String(value).trim().length ? value : fallback;
    }

    function buildThumbnailUrl(game) {
        // Try multiple property names just in case
        const file =
            game.thumbnail ||
            game.thumb ||
            game.thumbnail_file ||
            '';

        if (!file) return '';
        // From /games/ to /resources/images/thumbnails/all/
        return `../resources/images/thumbnails/all/${file}`;
    }

    function populateGame(game) {
        // Title & header bits
        setText('#game-title', game.title || game.id || 'Unknown Game');
        setText('#game-system', game.system || 'Unknown');
        setText('#game-system-label', (game.system || 'Game').toUpperCase());
        setText('#game-year', game.year);
        setText('#game-publisher', game.publisher || game.publisher_name);
        setText('#game-developer', game.developer || game.developer_name);
        setText('#game-genre', game.genre || game.category);
        setText('#game-collection', game.collection || game.set || '—');

        // Optional tagline / notes
        const tagline = game.tagline || game.one_liner || '';
        const notes = game.notes || game.description || '';
        setText('#game-tagline', tagline, '');
        setText('#game-description', notes, 'No mission briefing has been logged for this title yet.');

        // Thumbnail
        const thumbEl = qs('#game-thumbnail');
        if (thumbEl) {
            const url = buildThumbnailUrl(game);
            if (url) {
                thumbEl.src = url;
                thumbEl.alt = game.title || 'Game artwork';
            } else {
                thumbEl.alt = 'No artwork available';
            }
        }

        // Back link – if we have a genre, send back to its page
        const backLink = qs('#back-to-genre');
        if (backLink) {
            if (game.genre_slug) {
                backLink.href = `genres/${game.genre_slug}.html`;
            } else {
                // Fallback to games hub
                backLink.href = 'index.html';
            }
        }
    }

    async function loadGame() {
        const gameId = getGameIdFromQuery();
        if (!gameId) {
            showError('No game ID supplied in the URL.');
            setText('#game-title', 'Unknown Game');
            return;
        }

        try {
            const response = await fetch(GAMES_JSON_PATH, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Unable to load games.json (status ${response.status})`);
            }

            const data = await response.json();
            // Support either an array or { games: [...] }
            const gamesArray = Array.isArray(data) ? data : data.games || [];
            const game = gamesArray.find(g => g.id === gameId);

            if (!game) {
                showError(`No data found for game ID "${gameId}".`);
                setText('#game-title', 'Unknown Game');
                return;
            }

            populateGame(game);
        } catch (err) {
            console.error('Error loading game details', err);
            showError('There was a problem loading this game. Please try again later.');
        }
    }

    document.addEventListener('DOMContentLoaded', loadGame);
})();
