
async function loadGamesForGenre(genreName) {
  const container = document.getElementById('games-container');
  if (!container) return;
  container.innerHTML = '<p>Loading games...</p>';
  try {
    const res = await fetch('../data/games.json');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid games data');
    const filtered = genreName ? data.filter(g => (g.genres || []).includes(genreName)) : data;
    if (!filtered.length) {
      container.innerHTML = '<p>No games found yet for this genre. Data file can be updated later.</p>';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'games-list';
    filtered.forEach(game => {
      const li = document.createElement('li');
      li.className = 'game-item';
      const title = document.createElement('div');
      title.className = 'game-title';
      title.textContent = game.title || 'Unknown title';
      const meta = document.createElement('div');
      meta.className = 'game-meta';
      const bits = [];
      if (game.year) bits.push(game.year);
      if (game.system) bits.push(game.system);
      if ((game.genres || []).length) bits.push((game.genres || []).join(', '));
      meta.textContent = bits.join(' · ');
      const linksDiv = document.createElement('div');
      linksDiv.className = 'game-links';
      if (game.youtube) {
        const a = document.createElement('a');
        a.href = game.youtube;
        a.target = '_blank';
        a.textContent = 'Video';
        linksDiv.appendChild(a);
      }
      if (game.lemon) {
        const a = document.createElement('a');
        a.href = game.lemon;
        a.target = '_blank';
        a.textContent = 'Lemon';
        linksDiv.appendChild(a);
      }
      if (game.manual) {
        const a = document.createElement('a');
        a.href = game.manual;
        a.target = '_blank';
        a.textContent = 'Manual';
        linksDiv.appendChild(a);
      }
      if (game.download) {
        const a = document.createElement('a');
        a.href = game.download;
        a.target = '_blank';
        a.textContent = 'Download';
        linksDiv.appendChild(a);
      }
      li.appendChild(title);
      li.appendChild(meta);
      li.appendChild(linksDiv);
      ul.appendChild(li);
    });
    container.innerHTML = '';
    container.appendChild(ul);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>There was an error loading the games list.</p>';
  }
}

window.addEventListener('load', () => {
  const genre = document.body.getAttribute('data-genre');
  if (genre) {
    loadGamesForGenre(genre);
  }
});
