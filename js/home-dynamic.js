// ============================================================================
// HOME DYNAMIC — FEATURED GAME + VIDEO ENGINE
// Cheeky Commodore Gamer 😇🕹️👌
// ============================================================================
//
// Behaviour:
//  - Loads games/games.json (GitHub Pages–aware via REPO_PREFIX).
//  - Optionally hard-locks the featured game and/or video by slug.
//  - Otherwise picks a random game that has BOTH a thumbnail and video ID.
//  - Populates:
//      * Featured Game panel (title, blurb, system, year, genres, thumbnail, link)
//      * Featured Video panel (YouTube iframe, title, blurb)
//  - If no fully valid candidates exist, relaxes rules but keeps sensible fallbacks.
//  - If anything fails, leaves your placeholder content intact.
//
// To hard-lock a specific game:
//  - Set FEATURED_CONFIG.lockFeaturedSlug to a valid game.slug (string).
//  - Optionally set FEATURED_CONFIG.lockVideoSlug separately.
// ============================================================================

(function () {
    // -------------------------------
    // CONFIG
    // -------------------------------
    const FEATURED_CONFIG = {
        // GitHub Pages repo prefix (for /username/repo paths). Leave as-is for your setup.
        REPO_PREFIX: '/ccgamer_website_new',

        // Hard-lock the featured game by slug (e.g. "sid-meiers-pirates").
        // Set to null to allow random selection.
        lockFeaturedSlug: null,

        // Optional: lock the video panel to a different slug.
        // If null, it uses the same game as the Featured Game.
        lockVideoSlug: null,

        // Fallback YouTube video ID if a chosen game has no video.
        fallbackYouTubeId: 'dQw4w9WgXcQ'
    };

    document.addEventListener('DOMContentLoaded', () => {
        hydrateFeaturedFromGames();
    });

    // Resolve the correct JSON path depending on GitHub Pages vs root hosting
    function resolveJsonPath() {
        const usingRepoPrefix = window.location.pathname.startsWith(FEATURED_CONFIG.REPO_PREFIX);
        return (usingRepoPrefix ? FEATURED_CONFIG.REPO_PREFIX : '') + '/games/games.json';
    }

    async function hydrateFeaturedFromGames() {
        // Grab DOM hooks once
        const featuredGameTitle  = document.getElementById('featured-game-title');
        const featuredGameBlurb  = document.getElementById('featured-game-blurb');
        const featuredGameMeta   = document.getElementById('featured-game-meta');
        const featuredGameLink   = document.getElementById('featured-game-link');
        const featuredGameThumb  = document.getElementById('featured-game-thumb');

        const featuredVideoFrame = document.getElementById('featured-video-frame');
        const featuredVideoTitle = document.getElementById('featured-video-title');
        const featuredVideoBlurb = document.getElementById('featured-video-blurb');

        // If any of the critical nodes are missing, bail early to avoid errors
        if (!featuredGameTitle || !featuredGameThumb || !featuredVideoFrame) {
            console.warn('[CCG HOME] Featured DOM nodes not found; skipping dynamic hydrate.');
            return;
        }

        try {
            const response = await fetch(resolveJsonPath(), { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load games.json');

            const games = await response.json();
            if (!Array.isArray(games) || games.length === 0) {
                throw new Error('games.json is empty or invalid');
            }

            const gamePool = games.filter(g => g && typeof g.title === 'string' && g.title.trim().length);

            // 1) Pick Featured Game
            const featuredGame =
                pickLockedGame(gamePool, FEATURED_CONFIG.lockFeaturedSlug, true) ||
                pickRandomValidGame(gamePool, true) ||
                pickRandom(gamePool);

            if (!featuredGame) {
                throw new Error('No suitable featured game found');
            }

            // 2) Pick Video Game (can be separate lock, otherwise same as featuredGame)
            const videoGame =
                pickLockedGame(gamePool, FEATURED_CONFIG.lockVideoSlug, false) ||
                featuredGame ||
                pickRandomValidGame(gamePool, false) ||
                pickRandom(gamePool);

            // ------------------------
            // Populate Featured Game
            // ------------------------
            featuredGameTitle.textContent = featuredGame.title;

            if (featuredGameBlurb) {
                featuredGameBlurb.textContent = buildGameBlurb(featuredGame);
            }

            if (featuredGameMeta) {
                featuredGameMeta.textContent = buildMetaLine(featuredGame);
            }

            if (featuredGameLink) {
                featuredGameLink.href = buildGameUrl(featuredGame.id);
            }

            if (featuredGameThumb) {
                const thumbSrc = normaliseThumb(featuredGame.thumbnail);
                if (thumbSrc) {
                    featuredGameThumb.src = thumbSrc;
                    featuredGameThumb.alt = `${featuredGame.title} thumbnail`;
                }
            }

            // ------------------------
            // Populate Featured Video
            // ------------------------
            const chosenVideoId = (videoGame && isValidVideo(videoGame))
                ? String(videoGame.videoid).trim()
                : FEATURED_CONFIG.fallbackYouTubeId;

            featuredVideoFrame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(chosenVideoId);

            if (featuredVideoTitle && videoGame) {
                featuredVideoTitle.textContent = `${videoGame.title} — Featured Video`;
            }

            if (featuredVideoBlurb && videoGame) {
                if (isValidVideo(videoGame)) {
                    featuredVideoBlurb.textContent =
                        'Captured straight from the Cheeky Commodore Gamer channel — the perfect showcase for this classic.';
                } else {
                    featuredVideoBlurb.textContent =
                        'No dedicated capture yet, so here’s a highlight from the channel to keep the CRT warm.';
                }
            }
        } catch (error) {
            console.error('[CCG HOME] Featured content error:', error);

            // Fall back to safe, readable copy – keep layout intact
            if (featuredGameTitle) {
                featuredGameTitle.textContent = 'Featured game coming soon';
            }
            if (featuredGameBlurb) {
                featuredGameBlurb.textContent = 'We’re lining up more Commodore 64 and Amiga gems for this slot.';
            }
            if (featuredGameMeta) {
                featuredGameMeta.textContent = 'Cheeky Commodore Gamer database';
            }
            if (featuredVideoTitle) {
                featuredVideoTitle.textContent = 'Video not available right now';
            }
            if (featuredVideoBlurb) {
                featuredVideoBlurb.textContent =
                    'The featured video will kick in once games.json is available and linked to the channel.';
            }
        }
    }

    // -------------------------------
    // Selection helpers
    // -------------------------------

    // Pick a game by slug, with optional "strict" requirement for thumbnail + video
    function pickLockedGame(games, slug, requireFullMedia) {
        if (!slug) return null;
        const lower = String(slug).toLowerCase();

        const match = games.find(g => {
            const gSlug = (g.slug || '').toString().toLowerCase();
            if (!gSlug || gSlug !== lower) return false;
            return requireFullMedia ? isValidThumbnail(g) && isValidVideo(g) : true;
        });

        return match || null;
    }

    // Prefer games that have BOTH thumbnail and video
    function pickRandomValidGame(games, requireVideo) {
        const candidates = games.filter(g => {
            if (!isValidThumbnail(g)) return false;
            if (requireVideo && !isValidVideo(g)) return false;
            return true;
        });
        return pickRandom(candidates);
    }

    function pickRandom(list) {
        if (!Array.isArray(list) || list.length === 0) return null;
        const index = Math.floor(Math.random() * list.length);
        return list[index];
    }

    // -------------------------------
    // Validation helpers
    // -------------------------------

    function isValidThumbnail(game) {
        if (!game || typeof game.thumbnail !== 'string') return false;
        const trimmed = game.thumbnail.trim();
        if (!trimmed) return false;
        // Loose check: must end with an image extension
        return /\.(png|jpe?g|webp|gif)$/i.test(trimmed);
    }

    function isValidVideo(game) {
        if (!game) return false;
        if (typeof game.videoid !== 'string') return false;
        return game.videoid.trim().length > 0;
    }

    // -------------------------------
    // URL + text helpers
    // -------------------------------

    function buildGameUrl(id) {
        const base = 'games/game.html';
        if (!id) return base;
        try {
            const url = new URL(base, window.location.origin);
            url.searchParams.set('id', id);
            return url.pathname + url.search;
        } catch (e) {
            return base + '?id=' + encodeURIComponent(id);
        }
    }

    function normaliseThumb(raw) {
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;

        const cleaned = raw.replace(/^\/?/, ''); // strip leading slash if present
        const usingRepoPrefix = window.location.pathname.startsWith(FEATURED_CONFIG.REPO_PREFIX);
        const prefix = usingRepoPrefix ? FEATURED_CONFIG.REPO_PREFIX + '/' : '';

        return prefix + cleaned;
    }

    function buildGameBlurb(game) {
        const pieces = [];

        if (Array.isArray(game.genres) && game.genres.length) {
            pieces.push(game.genres[0]);
        }

        if (game.developer) {
            pieces.push('by ' + game.developer);
        }

        if (game.year) {
            pieces.push(String(game.year));
        }

        if (pieces.length === 0) {
            return 'Retro goodness queued up for you.';
        }

        return pieces.join(' • ');
    }

    function buildMetaLine(game) {
        const parts = [];

        if (game.system) {
            parts.push(String(game.system));
        }
        if (game.year) {
            parts.push(String(game.year));
        }

        if (Array.isArray(game.genres) && game.genres.length) {
            // Up to two genres for a compact line
            parts.push(game.genres.slice(0, 2).join(' • '));
        }

        return parts.length ? parts.join('  ·  ') : 'From the Cheeky Commodore Gamer vault';
    }
})();
