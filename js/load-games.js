(function () {
  async function loadGames() {
    try {
      const response = await fetch('/games/games.json', { cache: 'no-store' });
      if (!response.ok) {
        window.games = [];
        return;
      }

      const data = await response.json();
      window.games = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to load games data', error);
      window.games = [];
    }
  }

  loadGames();
})();
