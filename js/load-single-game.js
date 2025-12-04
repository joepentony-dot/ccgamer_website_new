// =====================================================================
// OMEGA SINGLE GAME LOADER — FINAL EDITION 😇🕹️👌
// Loads ALL DATA from games.json:
// title, system, year, genres, developer, lemon links, thumbnail,
// video, manual PDF, disks, meta tags, hero image, embedded video.
// =====================================================================

(function () {

    const REPO_PREFIX = '/ccgamer_website_new';

    function qs(sel) { return document.querySelector(sel); }

    function setText(sel, value, fallback = '—') {
        const el = typeof sel === 'string' ? qs(sel) : sel;
        if (!el) return;
        const v = (value === undefined || value === null || String(value).trim() === '')
            ? fallback
            : String(value);
        el.textContent = v;
    }

    function getParamId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function jsonPath() {
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        return (usingRepoPrefix ? REPO_PREFIX : '') + '/games/games.json';
    }

    function normaliseThumb(raw, usingRepoPrefix) {
        if (!raw) return '../resources/images/thumbnails/all/fallback.jpg';

        if (/^https?:\/\//i.test(raw)) return raw;

        let url = raw.replace(/^\/+/, '');
        return '../' + url;
    }

    function setMeta(title, description) {
        const metaTitle = qs('#game-meta-title');
        const metaDesc = qs('#game-meta-description');
        if (metaTitle) metaTitle.textContent = title;
        if (metaDesc) metaDesc.content = description;
        document.title = title;
    }

    function buildGenresString(game) {
        return Array.isArray(game.genres) && game.genres.length
            ? game.genres.join(' • ')
            : 'Unclassified';
    }

    function populateLemonLinks(game) {
        const block = qs('#lemon-links-block');
        const list  = qs('#lemon-links-list');
        if (!block || !list) return;

        if (!Array.isArray(game.lemon) || game.lemon.length === 0) {
            block.hidden = true;
            return;
        }

        list.innerHTML = '';
        game.lemon.forEach(url => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = 'Lemon Entry';
            li.appendChild(a);
            list.appendChild(li);
        });

        block.hidden = false;
    }

    function populateGame(game, usingRepoPrefix) {

        // ============================================================
        // HERO + BASIC INFO
        // ============================================================
        setText('#game-title', game.title);
        setText('#game-system', game.system);
        setText('#game-year', game.year);
        setText('#game-genres', buildGenresString(game));
        setText('#game-description', game.description || 'A full game description will appear here once added.');

        // ============================================================
        // HERO IMAGE
        // ============================================================
        const heroImg = qs('#game-hero-image');
        if (heroImg) {
            heroImg.src = normaliseThumb(game.thumbnail, usingRepoPrefix);
            heroImg.alt = `${game.title} cover`;
        }

        // ============================================================
        // META TAGS
        // ============================================================
        const metaTitle = `${game.title} (${game.year || 'Unknown'}) | Cheeky Commodore Gamer`;
        const metaDesc = `Details, media, manual and gameplay resources for ${game.title} — a ${buildGenresString(game)} title released for the ${game.system}.`;
        setMeta(metaTitle, metaDesc);

        // ============================================================
        // EXTERNAL LINKS — Lemon databases
        // ============================================================
        populateLemonLinks(game);

        // ============================================================
        // VIDEO — button + embedded iframe
        // ============================================================
        const playBtn = qs('#game-play-video');
        const videoSection = qs('#game-video-section');
        const videoEmbed = qs('#game-video-embed');

        if (game.videoid) {
            if (playBtn) {
                playBtn.href = `https://www.youtube.com/watch?v=${encodeURIComponent(game.videoid)}`;
                playBtn.hidden = false;
            }
            if (videoSection && videoEmbed) {
                videoEmbed.src = `https://www.youtube.com/embed/${encodeURIComponent(game.videoid)}`;
                videoSection.hidden = false;
            }
        }

        // ============================================================
        // MANUAL PDF
        // ============================================================
        const manualBtn = qs('#game-open-manual');
        const manualSection = qs('#game-manual-section');

        if (manualBtn && manualSection) {
            if (game.pdf && String(game.pdf).trim() !== '') {
                manualBtn.href = game.pdf;
                manualSection.hidden = false;
                manualBtn.hidden = false;
            }
        }

        // ============================================================
        // DISK(S)
        // ============================================================
        // Optional button — create only if present on the page
        const diskButtons = document.querySelectorAll('[data-disk-button]');
        if (diskButtons.length) {
            if (Array.isArray(game.disk) && game.disk.length) {
                diskButtons.forEach(btn => {
                    btn.href = game.disk[0];
                    btn.hidden = false;
                });
            }
        }
    }

    // =================================================================
    // LOAD GAME JSON + FIND MATCH
    // =================================================================
    async function loadGame() {
        const gameId = getParamId();
        if (!gameId) {
            setText('#game-title', 'Unknown Game');
            return;
        }

        try {
            const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
            const response = await fetch(jsonPath(), { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to load games.json');

            const data = await response.json();
            const gamesArray = Array.isArray(data) ? data : data.games || [];
            const game = gamesArray.find(g => g.id === gameId);

            if (!game) {
                setText('#game-title', 'Game Not Found');
                return;
            }

            populateGame(game, usingRepoPrefix);

        } catch (err) {
            console.error('SINGLE GAME LOADER ERROR', err);
            setText('#game-title', 'Error Loading Game');
        }
    }

    document.addEventListener('DOMContentLoaded', loadGame);

})();
