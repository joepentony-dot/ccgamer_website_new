
async function ccgFetchGames() {
  const response = await fetch('/data/games.json');
  if (!response.ok) {
    throw new Error('Failed to load games.json');
  }
  return await response.json();
}

// Utility: render list into a container
function ccgRenderGames(list, container) {
  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = '<p>No games found.</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'game-list';

  list.forEach(game => {
    const li = document.createElement('li');
    li.className = 'game-item';

    const title = document.createElement('h3');
    title.textContent = game.title;
    li.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'game-meta';
    meta.textContent = (game.genres || []).join(' • ');
    li.appendChild(meta);

    const links = document.createElement('div');
    links.className = 'game-links';

    if (game.videoId) {
      const yt = document.createElement('a');
      yt.href = 'https://www.youtube.com/watch?v=' + game.videoId;
      yt.target = '_blank';
      yt.rel = 'noopener noreferrer';
      yt.textContent = 'Watch on YouTube';
      links.appendChild(yt);
    }

    if (game.lemonUrl) {
      const lemon = document.createElement('a');
      lemon.href = game.lemonUrl;
      lemon.target = '_blank';
      lemon.rel = 'noopener noreferrer';
      lemon.textContent = 'Lemon64';
      links.appendChild(lemon);
    }

    li.appendChild(links);
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// Hook for A–Z index page
async function ccgInitIndexPage() {
  try {
    const games = await ccgFetchGames();
    const container = document.querySelector('#games-container');
    const searchInput = document.querySelector('#game-search');

    let current = games.slice().sort((a, b) =>
      (a.sortTitle || a.title).localeCompare(b.sortTitle || b.title)
    );

    function applyFilter() {
      const term = (searchInput.value || '').toLowerCase();
      const filtered = current.filter(g =>
        (g.title || '').toLowerCase().includes(term) ||
        (g.sortTitle || '').toLowerCase().includes(term)
      );
      ccgRenderGames(filtered, container);
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    applyFilter();
  } catch (err) {
    console.error('Error loading games:', err);
    const container = document.querySelector('#games-container');
    if (container) {
      container.innerHTML = '<p class="error">Error loading game data. Please try again later.</p>';
    }
  }
}

// Hook for genre pages
async function ccgInitGenrePage(genreName) {
  try {
    const games = await ccgFetchGames();
    const container = document.querySelector('#games-container');
    const filtered = games.filter(g =>
      (g.genres || []).some(gen => gen.toLowerCase() === genreName.toLowerCase())
    ).sort((a, b) =>
      (a.sortTitle || a.title).localeCompare(b.sortTitle || b.title)
    );
    ccgRenderGames(filtered, container);
  } catch (err) {
    console.error('Error loading games:', err);
    const container = document.querySelector('#games-container');
    if (container) {
      container.innerHTML = '<p class="error">Error loading game data. Please try again later.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const indexEl = document.querySelector('[data-ccg-page="index"]');
  const genreEl = document.querySelector('[data-ccg-genre]');

  if (indexEl) {
    ccgInitIndexPage();
  } else if (genreEl) {
    const genreName = genreEl.getAttribute('data-ccg-genre');
    ccgInitGenrePage(genreName);
  }
});
