// js/genre-loader.js
// Central loader for genre pages & game grids
// Cheeky Commodore Gamer 😇🕹️👌

(function () {
    let gamesCache = null;
    let loadPromise = null;

    function getGamesJsonUrl() {
        const path = window.location.pathname;

        // Works on GitHub Pages & local:
        // /ccgamer_website_new/games/genres/... → ../games.json
        // /ccgamer_website_new/games/...       → games.json
        // /ccgamer_website_new/home.html       → games/games.json (for future use)
        if (path.includes('/games/genres/')) return '../games.json';
        if (path.includes('/games/')) return 'games.json';
        return 'games/games.json';
    }

    async function loadAllGames() {
        if (gamesCache) return gamesCache;
        if (!loadPromise) {
            const url = getGamesJsonUrl();
            loadPromise = fetch(url, { cache: 'no-store' })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Failed to load games.json (${res.status})`);
                    }
                    return res.json();
                })
                .then(data => {
                    const arr = Array.isArray(data) ? data : data.games || [];
                    gamesCache = arr;
                    return arr;
                })
                .catch(err => {
                    console.error('Error loading games.json', err);
                    gamesCache = [];
                    return [];
                });
        }
        return loadPromise;
    }

    // --- Helpers ---------------------------------------------------------

    function normaliseGenre(str) {
        if (!str) return '';
        return String(str)
            .replace(/\bgames?\b/gi, '')   // remove "Games" / "Game"
            .replace(/_/g, ' ')
            .trim()
            .toLowerCase();
    }

    function gameMatchesGenre(game, genreSlug) {
        const slugNorm = normaliseGenre(genreSlug);
        const list = Array.isArray(game.genres) ? game.genres : [];

        if (!slugNorm) return true; // "all" fallback if needed

        for (const raw of list) {
            const gNorm = normaliseGenre(raw);
            if (!gNorm) continue;

            // Exact match
            if (gNorm === slugNorm) return true;
            // Partial matches both ways (covers BPJS / BPJS Indexed etc.)
            if (gNorm.includes(slugNorm) || slugNorm.includes(gNorm)) return true;
        }
        return false;
    }

    function resolveThumbUrl(game) {
        const t = game.thumbnail || '';
        if (!t) return null;

        // Absolute URL (if you ever add YouTube/thumb CDN etc.)
        if (/^https?:\/\//i.test(t)) return t;

        // Your JSON uses: "resources/images/thumbnails/all/xxx.jpg"
        const path = window.location.pathname;
        if (path.includes('/games/genres/')) {
            return '../../' + t;
        }
        if (path.includes('/games/')) {
            return '../' + t;
        }
        // Fallback for root-level usage
        return t;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function createGameCard(game) {
        const card = document.createElement('article');
        card.className = 'ccg-game-card';

        const thumbUrl = resolveThumbUrl(game);
        const safeTitle = escapeHtml(game.title || game.id || 'Untitled');

        const genres = Array.isArray(game.genres) ? game.genres : [];
        const tagLine = genres.slice(0, 3).join(' • ');

        const system = game.system || '';
        const year = game.year ? ` • ${game.year}` : '';

        card.innerHTML = `
            <button class="ccg-game-card__inner" type="button" data-game-id="${escapeHtml(game.id)}">
                <div class="ccg-game-card__thumb-wrap">
                    ${
                        thumbUrl
                            ? `<img src="${thumbUrl}" alt="${safeTitle} cover" loading="lazy">`
                            : `<div class="ccg-game-card__thumb-placeholder">NO ART</div>`
                    }
                </div>
                <div class="ccg-game-card__meta">
                    <h3 class="ccg-game-card__title">${safeTitle}</h3>
                    <div class="ccg-game-card__system">${escapeHtml(system)}${year}</div>
                    <div class="ccg-game-card__tags">${escapeHtml(tagLine)}</div>
                </div>
            </button>
        `;

        const btn = card.querySelector('.ccg-game-card__inner');
        if (btn) {
            btn.addEventListener('click', () => {
                if (!game.id) return;
                window.location.href = `../game.html?id=${encodeURIComponent(game.id)}`;
            });
        }

        return card;
    }

    // --- Public API: loadGenreGames & randomGameInGenre -------------------

    async function loadGenreGames(genreSlug, gridEl, countEl) {
        if (!gridEl) return;

        gridEl.innerHTML = '<div class="ccg-loading">Loading games…</div>';
        if (countEl) countEl.textContent = 'Loading…';

        const allGames = await loadAllGames();
        const filtered = allGames.filter(g => gameMatchesGenre(g, genreSlug));

        // Sort by sorttitle then title
        filtered.sort((a, b) => {
            const sa = (a.sorttitle || a.title || '').toLowerCase();
            const sb = (b.sorttitle || b.title || '').toLowerCase();
            if (sa < sb) return -1;
            if (sa > sb) return 1;
            return 0;
        });

        gridEl.innerHTML = '';

        if (!filtered.length) {
            gridEl.innerHTML = '<div class="ccg-empty">No games found in this genre (yet!).</div>';
            if (countEl) countEl.textContent = '0 titles';
            return;
        }

        const frag = document.createDocumentFragment();
        filtered.forEach(game => {
            frag.appendChild(createGameCard(game));
        });
        gridEl.appendChild(frag);

        if (countEl) {
            countEl.textContent = `${filtered.length} title${filtered.length !== 1 ? 's' : ''}`;
        }
    }

    async function randomGameInGenre(genreSlug) {
        const allGames = await loadAllGames();
        let pool = allGames.filter(g => gameMatchesGenre(g, genreSlug));
        if (!pool.length) pool = allGames;
        if (!pool.length) return;

        const picked = pool[Math.floor(Math.random() * pool.length)];
        if (picked && picked.id) {
            window.location.href = `../game.html?id=${encodeURIComponent(picked.id)}`;
        }
    }

    // Expose to pages
    window.loadGenreGames = loadGenreGames;
    window.randomGameInGenre = randomGameInGenre;
})();
