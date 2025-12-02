// js/genre-loader.js
// Universal GENRE LOADER (Final WOW Edition) 😇🕹️👌
// - Uses <body data-genre="..."> to filter games
// - Works on GitHub Pages AND future Fasthosts root
// - Auto-fixes /ccgamer_website_new prefixes in paths
// - Builds neon card grid using genre.css

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

        const REPO_PREFIX = '/ccgamer_website_new';
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        const basePrefix = usingRepoPrefix ? REPO_PREFIX : '';

        const GAMES_JSON_URL = basePrefix + '/games/games.json';

        fetch(GAMES_JSON_URL, { cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load games.json: ' + response.status);
                }
                return response.json();
            })
            .then(function (games) {
                if (!Array.isArray(games)) {
                    throw new Error('games.json did not return an array');
                }
                buildGenreGrid(games, genreKey, { countEl: countEl, gridEl: gridEl, basePrefix: basePrefix, usingRepoPrefix: usingRepoPrefix });
            })
            .catch(function (err) {
                console.error('Genre loader error:', err);
                if (countEl) {
                    countEl.textContent = 'Unable to load games for this genre.';
                }
            });
    }

    function buildGenreGrid(allGames, genreKey, context) {
        const countEl = context.countEl;
        const gridEl = context.gridEl;
        const basePrefix = context.basePrefix;
        const usingRepoPrefix = context.usingRepoPrefix;

        var keyNorm = genreKey.toLowerCase();

        var filtered = allGames.filter(function (game) {
            if (!game || !Array.isArray(game.genres)) return false;
            return game.genres.some(function (g) {
                return (g || '').toLowerCase().trim() === keyNorm;
            });
        });

        filtered.sort(function (a, b) {
            var at = (a.sorttitle || a.title || '').toLowerCase();
            var bt = (b.sorttitle || b.title || '').toLowerCase();
            if (at < bt) return -1;
            if (at > bt) return 1;
            return 0;
        });

        if (countEl) {
            var n = filtered.length;
            countEl.textContent = n === 0
                ? 'No games found in this genre yet.'
                : n + ' game' + (n !== 1 ? 's' : '') + ' found in this genre.';
        }

        gridEl.innerHTML = '';

        if (filtered.length === 0) {
            return;
        }

        filtered.forEach(function (game) {
            var card = createGameCard(game, basePrefix, usingRepoPrefix);
            gridEl.appendChild(card);
        });
    }

    function createGameCard(game, basePrefix, usingRepoPrefix) {
        var link = document.createElement('a');
        link.className = 'genre-game-card';
        link.href = buildGameUrl(game, basePrefix);

        var img = document.createElement('img');
        img.alt = (game.title || 'Game') + ' thumbnail';
        img.loading = 'lazy';
        img.src = normaliseThumbnailPath(game.thumbnail, basePrefix, usingRepoPrefix);
        img.onerror = function () {
            img.onerror = null;
            img.src = fallbackThumb();
        };

        var title = document.createElement('div');
        title.className = 'genre-game-title';
        title.textContent = game.title || game.id || 'Untitled';

        link.appendChild(img);
        link.appendChild(title);

        return link;
    }

    function buildGameUrl(game, basePrefix) {
        var id = game.id || '';
        var basePath = basePrefix + '/games/game.html';
        try {
            var u = new URL(basePath, window.location.origin);
            if (id) {
                u.searchParams.set('id', id);
            }
            return u.pathname + u.search;
        } catch (e) {
            // Fallback to relative link if URL constructor fails for any reason
            return '../game.html' + (id ? ('?id=' + encodeURIComponent(id)) : '');
        }
    }

    function normaliseThumbnailPath(rawThumb, basePrefix, usingRepoPrefix) {
        if (!rawThumb) return fallbackThumb();

        var url = String(rawThumb).trim();
        if (!url) return fallbackThumb();

        // External URL or data URI — leave as is
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }

        var REPO_PREFIX = '/ccgamer_website_new';

        // If path starts with /ccgamer_website_new and we are NOT running under that prefix,
        // strip it so the site works from a future root domain (Fasthosts).
        if (url.indexOf(REPO_PREFIX) === 0 && !usingRepoPrefix) {
            url = url.substring(REPO_PREFIX.length);
        }

        // Ensure it starts with a single leading slash
        if (!url.startsWith('/')) {
            url = '/' + url;
        }

        // If we are on GitHub Pages (using repo prefix) and the URL does not already include it,
        // add the prefix so paths resolve correctly.
        if (usingRepoPrefix && url.indexOf(REPO_PREFIX) !== 0) {
            url = REPO_PREFIX + url;
        }

        return url;
    }

    function fallbackThumb() {
        // Tiny transparent GIF as a safe fallback so we never 404 on missing thumbnails
        return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    }
})();
