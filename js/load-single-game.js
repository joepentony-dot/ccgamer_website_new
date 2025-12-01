// js/load-single-game.js
// Single game loader for Cheeky Commodore Gamer
// Reads /games/games.json and populates game.html 😇🕹️👌

(function () {
    const GAMES_JSON_PATH = 'games.json'; // relative to /games/game.html

    function qs(sel) {
        return document.querySelector(sel);
    }

    function setText(selector, value, fallback = '–') {
        const el = qs(selector);
        if (!el) return;
        const v = (value === undefined || value === null || String(value).trim() === '')
            ? fallback
            : String(value);
        el.textContent = v;
    }

    function showError(message) {
        const el = qs('#game-error');
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
    }

    function getGameIdFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function resolveThumbUrl(game) {
        const t = game.thumbnail || '';
        if (!t) return '';

        // Absolute URL
        if (/^https?:\/\//i.test(t)) return t;

        // Already root-relative
        if (t.startsWith('/')) return t;

        // Your JSON has: "resources/images/thumbnails/all/xxx.jpg"
        // From /games/game.html we need "../" in front.
        return '../' + t.replace(/^\.?\//, '');
    }

    function buildGenresString(game) {
        if (Array.isArray(game.genres) && game.genres.length) {
            return game.genres.join(' • ');
        }
        return 'Unclassified';
    }

    function buildCollectionsString(game) {
        // For future use if you add collection fields.
        // For now, we infer from genres like "BPJS Games", "Top Picks" etc.
        const genreList = Array.isArray(game.genres) ? game.genres : [];
        const collections = genreList.filter(g =>
            /BPJS|Top Picks|Collection|Big Thumbs/i.test(g)
        );
        return collections.length ? collections.join(' • ') : '—';
    }

    function populateExternalLinks(game) {
        // Lemon / external archives
        const lemonBlock = qs('#lemon-links-block');
        const lemonList  = qs('#lemon-links-list');

        if (lemonBlock && lemonList && Array.isArray(game.lemon) && game.lemon.length) {
            lemonList.innerHTML = '';
            game.lemon.forEach(url => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = 'Lemon database entry';
                li.appendChild(a);
                lemonList.appendChild(li);
            });
            lemonBlock.hidden = false;
        }

        // Video (YouTube)
        const videoButton = qs('#video-button');
        if (videoButton) {
            if (game.videoid) {
                videoButton.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(game.videoid);
                videoButton.hidden = false;
            } else {
                videoButton.hidden = true;
            }
        }

        // PDF / Manual
        const pdfButton = qs('#pdf-button');
        if (pdfButton) {
            if (game.pdf && String(game.pdf).trim() !== '') {
                pdfButton.href = game.pdf;
                pdfButton.hidden = false;
            } else {
                pdfButton.hidden = true;
            }
        }

        // Disk(s)
        const diskButton = qs('#disk-button');
        if (diskButton) {
            const disks = Array.isArray(game.disk) ? game.disk : [];
            if (disks.length) {
                diskButton.href = disks[0]; // first disk link
                diskButton.hidden = false;
            } else {
                diskButton.hidden = true;
            }
        }
    }

    function populateGame(game) {
        const title = game.title || game.id || 'Unknown Game';
        const system = game.system || 'Unknown System';
        const year = game.year || '';

        // Title + system labels
        setText('#game-title', title);
        setText('#game-system', system);
        setText('#game-system-label', system.toUpperCase());
        setText('#game-system-meta', system);
        if (year) {
            setText('#game-year', year);
            setText('#game-year-pill', '• ' + year);
        } else {
            setText('#game-year', '—');
            setText('#game-year-pill', '');
        }

        setText('#game-developer', game.developer || 'Unknown');
        setText('#game-genre', buildGenresString(game));
        setText('#game-collection', buildCollectionsString(game));
        setText('#game-id-label', game.id ? `ID: ${game.id}` : '');

        // Tagline = first 2–3 genres or a simple string
        if (Array.isArray(game.genres) && game.genres.length) {
            setText('#game-tagline', game.genres.slice(0, 3).join(' • '), '');
        } else {
            setText('#game-tagline', '', '');
        }

        // Description – currently no field in JSON, so keep placeholder
        // (When you add descriptions later we can hook them here.)

        // Thumbnail
        const thumbEl = qs('#game-thumbnail');
        if (thumbEl) {
            const url = resolveThumbUrl(game);
            if (url) {
                thumbEl.src = url;
                thumbEl.alt = title + ' artwork';
            } else {
                thumbEl.alt = 'No artwork available';
            }
        }

        populateExternalLinks(game);
    }

    async function loadGame() {
        const gameId = getGameIdFromQuery();
        if (!gameId) {
            showError('No game ID supplied in the URL.');
            setText('#game-title', 'Unknown Game');
            return;
        }

        try {
            const response = await fetch(GAMES_JSON_PATH, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Unable to load games.json (status ${response.status})`);
            }

            const data = await response.json();
            const gamesArray = Array.isArray(data) ? data : data.games || [];
            const game = gamesArray.find(g => g.id === gameId);

            if (!game) {
                showError(`No data found for game ID "${gameId}".`);
                setText('#game-title', 'Unknown Game');
                return;
            }

            populateGame(game);
        } catch (err) {
            console.error('Error loading game details', err);
            showError('There was a problem loading this game. Please try again later.');
        }
    }

    document.addEventListener('DOMContentLoaded', loadGame);
})();
