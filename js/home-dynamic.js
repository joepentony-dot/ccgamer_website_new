(function () {
    const REPO_PREFIX = '/ccgamer_website_new';

    document.addEventListener('DOMContentLoaded', () => {
        hydrateFeaturedFromGames();
    });

    function resolveJsonPath() {
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        return (usingRepoPrefix ? REPO_PREFIX : '') + '/games/games.json';
    }

    async function hydrateFeaturedFromGames() {
        const featuredGameTitle = document.getElementById('featured-game-title');
        const featuredGameBlurb = document.getElementById('featured-game-blurb');
        const featuredGameMeta = document.getElementById('featured-game-meta');
        const featuredGameLink = document.getElementById('featured-game-link');
        const featuredGameThumb = document.getElementById('featured-game-thumb');
        const featuredVideoFrame = document.getElementById('featured-video-frame');
        const featuredVideoTitle = document.getElementById('featured-video-title');
        const featuredVideoBlurb = document.getElementById('featured-video-blurb');

        try {
            const response = await fetch(resolveJsonPath(), { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load games.json');
            const games = await response.json();
            if (!Array.isArray(games) || games.length === 0) throw new Error('No games found');

            const gamePool = games.filter(g => g && g.title);
            const randomGame = pickRandom(gamePool);
            if (randomGame && featuredGameTitle) {
                featuredGameTitle.textContent = randomGame.title;
                featuredGameBlurb.textContent = buildGameBlurb(randomGame);
                if (featuredGameMeta) {
                    const metaParts = [];
                    if (randomGame.system) metaParts.push(randomGame.system);
                    if (randomGame.year) metaParts.push(randomGame.year);
                    if (Array.isArray(randomGame.genres)) metaParts.push(randomGame.genres.slice(0, 2).join(' • '));
                    featuredGameMeta.textContent = metaParts.join('  ·  ');
                }
                if (featuredGameLink) {
                    featuredGameLink.href = buildGameUrl(randomGame.id);
                }
                if (featuredGameThumb) {
                    featuredGameThumb.src = normaliseThumb(randomGame.thumbnail);
                    featuredGameThumb.alt = `${randomGame.title} thumbnail`;
                }
            }

            const videoCandidates = gamePool.filter(g => g.videoid);
            const pickVideoFrom = videoCandidates.length ? videoCandidates : gamePool;
            const videoGame = pickRandom(pickVideoFrom);
            if (videoGame && featuredVideoFrame) {
                const id = videoGame.videoid || 'dQw4w9WgXcQ';
                featuredVideoFrame.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
                if (featuredVideoTitle) featuredVideoTitle.textContent = videoGame.title + ' — Featured Video';
                if (featuredVideoBlurb) featuredVideoBlurb.textContent =
                    videoGame.videoid
                        ? 'Captured straight from the Cheeky Commodore Gamer channel.'
                        : 'Gameplay energy from the vault.';
            }
        } catch (error) {
            console.error('Featured content error', error);
            if (featuredGameTitle) featuredGameTitle.textContent = 'Featured game coming soon';
            if (featuredGameBlurb) featuredGameBlurb.textContent = 'We are fetching the retro gems for you.';
            if (featuredVideoTitle) featuredVideoTitle.textContent = 'Video not available';
        }
    }

    function pickRandom(list) {
        if (!Array.isArray(list) || list.length === 0) return null;
        const index = Math.floor(Math.random() * list.length);
        return list[index];
    }

    function buildGameUrl(id) {
        const base = 'games/game.html';
        if (!id) return base;
        try {
            const url = new URL(base, window.location.origin);
            url.searchParams.set('id', id);
            return url.pathname + url.search;
        } catch (e) {
            return `${base}?id=${encodeURIComponent(id)}`;
        }
    }

    function normaliseThumb(raw) {
        const fallbackPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
        if (!raw) return fallbackPixel;
        if (/^https?:\/\//.test(raw)) return raw;
        const cleaned = raw.replace(/^\/?/, '');
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        const prefix = usingRepoPrefix ? REPO_PREFIX + '/' : '';
        return prefix + cleaned;
    }

    function buildGameBlurb(game) {
        const pieces = [];
        if (Array.isArray(game.genres) && game.genres.length) pieces.push(game.genres[0]);
        if (game.developer) pieces.push(`by ${game.developer}`);
        if (game.year) pieces.push(game.year);
        return pieces.length ? pieces.join(' • ') : 'Retro goodness queued up for you.';
    }
})();
