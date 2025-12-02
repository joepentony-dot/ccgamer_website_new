// js/genre-loader.js
// FINAL WOW EDITION 😇🕹️👌
// Ultra-stable, fast, future-proof genre loader
// Supports GitHub Pages and Fasthosts automatically

(function () {
    document.addEventListener('DOMContentLoaded', initGenrePage);

    function initGenrePage() {
        const body = document.body;
        if (!body) return;

        const genreKey = (body.getAttribute('data-genre') || '').trim();
        if (!genreKey) return;

        const countEl = document.getElementById('genreGamesCount');
        const gridEl = document.getElementById('genreGamesGrid');
        if (!gridEl) return;

        // Auto-detect whether we are running under a repo folder (GitHub Pages)
        const REPO_PREFIX = '/ccgamer_website_new';
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        const basePrefix = usingRepoPrefix ? REPO_PREFIX : '';

        // JSON path (works for GitHub & future Fasthosts)
        const GAMES_JSON_URL = basePrefix + '/games/games.json';

        fetch(GAMES_JSON_URL, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load games.json');
                return res.json();
            })
            .then(json => {
                if (!Array.isArray(json)) throw new Error('games.json must be an array');
                buildGenreGrid(json, genreKey, {
                    countEl,
                    gridEl,
                    basePrefix,
                    usingRepoPrefix
                });
            })
            .catch(err => {
                console.error('Genre Loader Error:', err);
                if (countEl) countEl.textContent = 'Unable to load games.';
            });
    }

    // Convert any genre to a slug ("RPG Games" → "rpg-games")
    function slugifyGenre(str) {
        return String(str || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function buildGenreGrid(allGames, genreKey, ctx) {
        const { countEl, gridEl, basePrefix, usingRepoPrefix } = ctx;

        const genreSlug = slugifyGenre(genreKey);

        // Filter: match any game whose slugged genre matches
        const filtered = allGames.filter(game => {
            if (!game || !Array.isArray(game.genres)) return false;
            return game.genres.some(g => slugifyGenre(g) === genreSlug);
        });

        // Sort by sorttitle or title
        filtered.sort((a, b) => {
            const at = (a.sorttitle || a.title || '').toLowerCase();
            const bt = (b.sorttitle || b.title || '').toLowerCase();
            return at.localeCompare(bt);
        });

        // Write count
        if (countEl) {
            const n = filtered.length;
            countEl.textContent = n === 0
                ? 'No games found in this genre yet.'
                : `${n} game${n !== 1 ? 's' : ''} found in this genre.`;
        }

        gridEl.innerHTML = '';

        if (filtered.length === 0) return;

        // Build cards
        filtered.forEach(game => {
            const card = createGameCard(game, basePrefix, usingRepoPrefix);
            gridEl.appendChild(card);
        });
    }

    function createGameCard(game, basePrefix, usingRepoPrefix) {
        const link = document.createElement('a');
        link.className = 'genre-game-card';
        link.href = buildGameUrl(game, basePrefix);

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = `${game.title} thumbnail`;
        img.src = normaliseThumbnailPath(game.thumbnail, basePrefix, usingRepoPrefix);
        img.onerror = () => { img.src = fallbackThumb(); };

        const title = document.createElement('div');
        title.className = 'genre-game-title';
        title.textContent = game.title || 'Untitled';

        link.appendChild(img);
        link.appendChild(title);

        return link;
    }

    function buildGameUrl(game, basePrefix) {
        const id = game.id || '';
        try {
            const u = new URL(basePrefix + '/games/game.html', window.location.origin);
            if (id) u.searchParams.set('id', id);
            return u.pathname + u.search;
        } catch (err) {
            return '../game.html' + (id ? '?id=' + encodeURIComponent(id) : '');
        }
    }

    function normaliseThumbnailPath(rawThumb, basePrefix, usingRepoPrefix) {
        if (!rawThumb) return fallbackThumb();

        let url = String(rawThumb).trim();
        if (!url) return fallbackThumb();

        // External → leave unchanged
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }

        const REPO_PREFIX = '/ccgamer_website_new';

        // Remove repo prefix if not running under it
        if (url.startsWith(REPO_PREFIX) && !usingRepoPrefix) {
            url = url.substring(REPO_PREFIX.length);
        }

        // Ensure single leading slash
        if (!url.startsWith('/')) url = '/' + url;

        // Add repo prefix when running on GitHub Pages
        if (usingRepoPrefix && !url.startsWith(REPO_PREFIX)) {
            url = REPO_PREFIX + url;
        }

        return url;
    }

    function fallbackThumb() {
        return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    }
})();
