const GAMES_JSON_URL = '../../games/games.json';

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const genreSlug = body.getAttribute('data-genre');
    if (!genreSlug) return;

    const countEl = document.getElementById('genreGamesCount');
    const gridEl = document.getElementById('genreGamesGrid');

    fetch(GAMES_JSON_URL)
        .then(res => res.json())
        .then(data => {
            let games = Array.isArray(data) ? data : data.games || [];

            const filtered = games.filter(g => {
                const g1 = (g.genre || '').toLowerCase();
                const g2 = Array.isArray(g.genres) ? g.genres.map(x => x.toLowerCase()) : [];
                const p1 = (g.primaryGenre || '').toLowerCase();
                const p2 = (g.secondaryGenre || '').toLowerCase();
                const slug = genreSlug.toLowerCase();
                return g1 === slug || g2.includes(slug) || p1 === slug || p2 === slug;
            });

            countEl.textContent = filtered.length.toString();

            const frag = document.createDocumentFragment();

            filtered.forEach(game => {
                const item = document.createElement('div');
                item.className = 'game-item';

                const img = document.createElement('img');
                img.loading = 'lazy';
                img.alt = game.title || 'Game';
                img.src = game.thumbnail || '../../resources/images/thumbnails/fallback.jpg';
                img.onerror = () => {
                    img.src = '../../resources/images/thumbnails/fallback.jpg';
                };

                const title = document.createElement('div');
                title.className = 'game-title';
                title.textContent = game.title || 'Unknown Title';

                const system = document.createElement('div');
                system.className = 'game-system';
                system.textContent = game.system || '';

                item.appendChild(img);
                item.appendChild(title);
                item.appendChild(system);

                frag.appendChild(item);
            });

            gridEl.innerHTML = '';
            gridEl.appendChild(frag);
        })
        .catch(() => {
            countEl.textContent = '0';
            gridEl.innerHTML = '<p>Unable to load games for this category.</p>';
        });
});
