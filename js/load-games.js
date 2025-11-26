async function loadGamesForGenre(genreName) {
  const container = document.getElementById('games-container');
  if (!container) return;

  container.innerHTML = '<p>Loading games...</p>';

  // Decide JSON path based on current location (root vs /games/)
  let jsonPath = 'data/games.json';
  if (window.location.pathname.includes('/games/')) {
    jsonPath = '../data/games.json';
  }

  try {
    const res = await fetch(jsonPath);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid games data');

    let games = data;

    if (genreName) {
      games = games.filter(g => Array.isArray(g.genres) && g.genres.includes(genreName));
    }

    if (!games.length) {
      container.innerHTML = '<p>No games found yet for this section.</p>';
      return;
    }

    // Sort by sort title then by game title
    games.sort((a, b) => {
      const sa = (a.sort || a.title || '').toString().toLowerCase();
      const sb = (b.sort || b.title || '').toString().toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    });

    const ul = document.createElement('ul');
    ul.className = 'games-list';

    games.forEach(game => {
      const li = document.createElement('li');
      li.className = 'game-item';

      const title = document.createElement('div');
      title.className = 'game-title';
      title.textContent = game.title || 'Untitled';

      const meta = document.createElement('div');
      meta.className = 'game-meta';
      const system = game.system ? game.system.toUpperCase() : '';
      const genresText = Array.isArray(game.genres) ? game.genres.join(' / ') : '';
      meta.textContent = [system, genresText].filter(Boolean).join(' • ');

      const links = document.createElement('div');
      links.className = 'game-links';

      if (game.videoId) {
        const a = document.createElement('a');
        a.href = 'https://www.youtube.com/watch?v=' + game.videoId;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = '▶ Watch';
        links.appendChild(a);
      }

      if (game.lemon) {
        const a = document.createElement('a');
        a.href = game.lemon;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Lemon';
        links.appendChild(a);
      }

      if (game.manual) {
        const a = document.createElement('a');
        a.href = game.manual;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Manual';
        links.appendChild(a);
      }

      if (game.download) {
        const a = document.createElement('a');
        a.href = game.download;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Download';
        links.appendChild(a);
      }

      li.appendChild(title);
      li.appendChild(meta);
      if (links.children.length) {
        li.appendChild(links);
      }

      ul.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(ul);
  } catch (err) {
    console.error('Error loading games:', err);
    container.innerHTML = '<p>There was an error loading the games list.</p>';
  }
}

window.addEventListener('load', () => {
  const genre = document.body.getAttribute('data-genre');
  loadGamesForGenre(genre || null);
});
