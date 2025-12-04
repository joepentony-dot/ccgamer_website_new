(function () {
    const REPO_PREFIX = '/ccgamer_website_new';

    document.addEventListener('DOMContentLoaded', () => {
        renderGames();
        wireRandomButton();
    });

    function resolveJsonPath() {
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        return (usingRepoPrefix ? REPO_PREFIX : '') + '/games/games.json';
    }

    function normaliseThumb(raw, usingRepoPrefix) {
        const fallbackPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
        if (!raw) return fallbackPixel;
        if (/^https?:\/\//.test(raw)) return raw;
        let url = raw.replace(/^\/?/, '/');
        if (usingRepoPrefix && !url.startsWith(REPO_PREFIX)) {
            url = REPO_PREFIX + url;
        }
        if (!usingRepoPrefix && url.startsWith(REPO_PREFIX)) {
            url = url.slice(REPO_PREFIX.length);
        }
        return url;
    }

    async function renderGames() {
        const grid = document.getElementById('games-list');
        const count = document.getElementById('games-count');
        const search = document.getElementById('games-search');
        if (!grid) return;

        try {
            const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
            const response = await fetch(resolveJsonPath(), { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load games.json');
            const games = await response.json();
            if (!Array.isArray(games)) throw new Error('games.json must be an array');

            const sorted = games.slice().sort((a, b) => {
                const at = (a.sorttitle || a.title || '').toLowerCase();
                const bt = (b.sorttitle || b.title || '').toLowerCase();
                return at.localeCompare(bt);
            });

            let filtered = sorted;
            const render = () => {
                grid.innerHTML = '';
                const query = (search?.value || '').trim().toLowerCase();
                filtered = sorted.filter(game => {
                    if (!query) return true;
                    return (
                        (game.title || '').toLowerCase().includes(query) ||
                        (game.id || '').toLowerCase().includes(query) ||
                        (Array.isArray(game.genres) && game.genres.some(g => g.toLowerCase().includes(query)))
                    );
                });

                filtered.forEach(game => {
                    const card = document.createElement('article');
                    card.className = 'game-card';

                    const link = document.createElement('a');
                    link.href = buildGameUrl(game.id);
                    link.className = 'game-card__link';

                    const thumb = document.createElement('img');
                    thumb.src = normaliseThumb(game.thumbnail, usingRepoPrefix);
                    thumb.alt = `${game.title || 'Game'} thumbnail`;
                    thumb.loading = 'lazy';
                    thumb.className = 'game-card__thumb';
                    thumb.onerror = () => { thumb.src = normaliseThumb('', usingRepoPrefix); };

                    const body = document.createElement('div');
                    body.className = 'game-card__body';

                    const title = document.createElement('h3');
                    title.className = 'game-card__title';
                    title.textContent = game.title || 'Untitled';

                    const meta = document.createElement('p');
                    meta.className = 'game-card__meta';
                    const parts = [];
                    if (game.system) parts.push(game.system);
                    if (game.year) parts.push(game.year);
                    meta.textContent = parts.join(' • ');

                    const genres = document.createElement('p');
                    genres.className = 'game-card__genres';
                    genres.textContent = Array.isArray(game.genres) ? game.genres.join(' • ') : 'Unclassified';

                    body.appendChild(title);
                    body.appendChild(meta);
                    body.appendChild(genres);

                    link.appendChild(thumb);
                    link.appendChild(body);
                    card.appendChild(link);
                    grid.appendChild(card);
                });

                if (count) {
                    count.textContent = `${filtered.length} game${filtered.length !== 1 ? 's' : ''}`;
                }
            };

            render();
            if (search) search.addEventListener('input', render);
        } catch (error) {
            console.error('Games render error', error);
            grid.innerHTML = '<p class="ccg-section-subtitle">Unable to load games right now.</p>';
            if (count) count.textContent = '—';
        }
    }

    function buildGameUrl(id) {
        const base = 'game.html';
        if (!id) return base;
        return `${base}?id=${encodeURIComponent(id)}`;
    }

    function wireRandomButton() {
        const button = document.getElementById('random-game-btn');
        if (!button) return;
        button.addEventListener('click', async () => {
            try {
                const response = await fetch(resolveJsonPath(), { cache: 'no-store' });
                const games = await response.json();
                if (!Array.isArray(games) || games.length === 0) return;
                const choice = games[Math.floor(Math.random() * games.length)];
                window.location.href = buildGameUrl(choice.id);
            } catch (err) {
                console.error('Random game error', err);
            }
        });
    }
})();
