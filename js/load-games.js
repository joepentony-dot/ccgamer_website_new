
async function ccgFetchGames() {
  // JSON is stored at /data/games.json relative to the site root.
  // From /games/*.html we need to go up one level.
  const response = await fetch('../data/games.json');
  if (!response.ok) {
    throw new Error('Failed to load games.json');
  }
  return await response.json();
}

// Utility: render a list of games into a container
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

    const left = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.title || '';
    left.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'game-meta';
    meta.textContent = (game.genres || []).join(' • ');
    left.appendChild(meta);

    li.appendChild(left);

    const links = document.createElement('div');
    links.className = 'game-links';

    if (game.videoId) {
      const yt = document.createElement('a');
      yt.href = 'https://www.youtube.com/watch?v=' + game.videoId;
      yt.target = '_blank';
      yt.rel = 'noopener noreferrer';
      yt.textContent = 'Watch';
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

    if (game.pdfUrl) {
      const pdf = document.createElement('a');
      pdf.href = game.pdfUrl;
      pdf.target = '_blank';
      pdf.rel = 'noopener noreferrer';
      pdf.textContent = 'Info';
      links.appendChild(pdf);
    }

    if (game.diskLinks) {
      const disk = document.createElement('a');
      disk.href = game.diskLinks;
      disk.target = '_blank';
      disk.rel = 'noopener noreferrer';
      disk.textContent = 'Download';
      links.appendChild(disk);
    }

    li.appendChild(links);
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// A–Z index page (search + full list)
async function ccgInitIndexPage() {
  try {
    const games = await ccgFetchGames();
    const container = document.querySelector('#games-container');
    const searchInput = document.querySelector('#game-search');

    let current = games.slice().sort((a, b) =>
      (a.sortTitle || a.title || '').localeCompare(b.sortTitle || b.title || '')
    );

    function applyFilter() {
      const term = (searchInput && searchInput.value || '').toLowerCase();
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

// Genre-specific page
async function ccgInitGenrePage(genreName) {
  try {
    const games = await ccgFetchGames();
    const container = document.querySelector('#games-container');
    const filtered = games.filter(g =>
      (g.genres || []).some(gen => gen.toLowerCase() === genreName.toLowerCase())
    ).sort((a, b) =>
      (a.sortTitle || a.title || '').localeCompare(b.sortTitle || b.title || '')
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
