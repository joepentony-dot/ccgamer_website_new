// ============================================================================
// HOME DYNAMIC — FEATURED GAME + VIDEO ENGINE (OMEGA V2)
// Cheeky Commodore Gamer 😇🕹️👌
// ============================================================================
//
// Behaviour:
//  - Loads /games/games.json (repo-prefix aware for GitHub Pages).
//  - Optionally hard-locks Featured Game and/or Featured Video by slug.
//  - Otherwise picks a random game with a valid thumbnail + (ideally) video ID.
//  - Populates:
//      • Featured Game panel (title, meta line, thumbnail, link)
//      • Featured Video panel (YouTube iframe, title, blurb)
//  - If anything fails, leaves placeholder content intact.
//
// HOW TO HARD-LOCK A GAME:
//  - Set FEATURED_CONFIG.lockFeaturedSlug = 'your-game-slug';
//  - (Optional) FEATURED_CONFIG.lockVideoSlug for a different video source.
// ============================================================================

(function () {
    // -------------------------------
    // CONFIG
    // -------------------------------
    const FEATURED_CONFIG = {
        // For GitHub Pages project site:
        //   https://<user>.github.io/ccgamer_website_new/
        // Keep this as your repo folder name.
        REPO_PREFIX: '/ccgamer_website_new',

        // Hard-lock the Featured Game by slug (exact match to games.json `slug`).
        // Example: 'sid-meiers-pirates'
        lockFeaturedSlug: null,

        // Optional: Hard-lock the video panel to a different game slug.
        // If null, will use the same game as Featured Game where possible.
        lockVideoSlug: null,

        // Fallback YouTube video ID if chosen game has no `videoid`.
        fallbackYouTubeId: 'dQw4w9WgXcQ'
    };

    // -------------------------------
    // INIT
    // -------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        hydrateFeaturedFromGames();
        updateFooterYear();
    });

    // Ensure footer year always current
    function updateFooterYear() {
        const yearNode = document.getElementById('ccg-year');
        if (!yearNode) return;
        const year = new Date().getFullYear();
        yearNode.textContent = year;
    }

    // -------------------------------
    // PATH HELPERS
    // -------------------------------

    function getBasePrefix() {
        const { REPO_PREFIX } = FEATURED_CONFIG;
        if (!REPO_PREFIX) return '';
        // If running under /ccgamer_website_new/ (GitHub Pages project site)
        const inRepo = window.location.pathname.startsWith(REPO_PREFIX);
        return inRepo ? REPO_PREFIX : '';
    }

    function resolveJsonPath() {
        const base = getBasePrefix();
        return base + '/games/games.json';
    }

    function buildGameUrl(id) {
        const base = getBasePrefix();
        const path = base + '/games/game.html';

        if (!id) return path;

        try {
            const url = new URL(path, window.location.origin);
            url.searchParams.set('id', id);
            return url.pathname + url.search;
        } catch (e) {
            return path + '?id=' + encodeURIComponent(id);
        }
    }

    function normaliseThumb(raw) {
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw; // already absolute

        const base = getBasePrefix();

        // Remove any leading slash so we can safely re-build from site root.
        const cleaned = raw.replace(/^\/+/, '');
        return base + '/' + cleaned;
    }

    // -------------------------------
    // MAIN HYDRATION LOGIC
    // -------------------------------

    async function hydrateFeaturedFromGames() {
        // DOM hooks
        const featuredGameTitle  = document.getElementById('featured-game-title');
        const featuredGameBlurb  = document.getElementById('featured-game-blurb');
        const featuredGameMeta   = document.getElementById('featured-game-meta');
        const featuredGameLink   = document.getElementById('featured-game-link');
        const featuredGameThumb  = document.getElementById('featured-game-thumb');

        const featuredVideoFrame = document.getElementById('featured-video-frame');
        const featuredVideoTitle = document.getElementById('featured-video-title');
        const featuredVideoBlurb = document.getElementById('featured-video-blurb');

        if (!featuredGameTitle || !featuredGameThumb || !featuredVideoFrame) {
            console.warn('[CCG HOME] Required featured elements missing. Skipping dynamic hydrate.');
            return;
        }

        try {
            const response = await fetch(resolveJsonPath(), { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Failed to load games.json: ' + response.status);
            }

            const games = await response.json();
            if (!Array.isArray(games) || games.length === 0) {
                throw new Error('games.json is empty or not an array');
            }

            const gamePool = games.filter(g => g && typeof g.title === 'string' && g.title.trim().length);

            // 1) Pick Featured Game
            const featuredGame =
                pickLockedGame(gamePool, FEATURED_CONFIG.lockFeaturedSlug, true) ||
                pickRandomValidGame(gamePool, true) ||
                pickRandomValidGame(gamePool, false) ||
                pickRandom(gamePool);

            if (!featuredGame) {
                throw new Error('No suitable featured game candidate found');
            }

            // 2) Pick Video Game (may be same or different lock)
            const videoGame =
                pickLockedGame(gamePool, FEATURED_CONFIG.lockVideoSlug, false) ||
                featuredGame ||
                pickRandomValidGame(gamePool, true) ||
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
                    featuredGameThumb.alt = featuredGame.title + ' thumbnail';
                }
            }

            // ------------------------
            // Populate Featured Video
            // ------------------------
            const videoId = (videoGame && isValidVideo(videoGame))
                ? String(videoGame.videoid).trim()
                : FEATURED_CONFIG.fallbackYouTubeId;

            featuredVideoFrame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId);

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
            console.error('[CCG HOME] Error hydrating featured content:', error);

            // Soft fallback: keep layout intact but with safe text
            if (featuredGameTitle) {
                featuredGameTitle.textContent = 'Featured game coming soon';
            }
            if (featuredGameBlurb) {
                featuredGameBlurb.textContent =
                    'We’re lining up more Commodore 64 and Amiga gems for this featured slot.';
            }
            if (featuredGameMeta) {
                featuredGameMeta.textContent = 'Cheeky Commodore Gamer database';
            }
            if (featuredVideoTitle) {
                featuredVideoTitle.textContent = 'Featured video coming soon';
            }
            if (featuredVideoBlurb) {
                featuredVideoBlurb.textContent =
                    'The featured video will appear here once games.json is available and wired to the channel.';
            }
        }
    }

    // -------------------------------
    // SELECTION HELPERS
    // -------------------------------

    function pickLockedGame(games, slug, requireFullMedia) {
        if (!slug) return null;
        const target = String(slug).toLowerCase();

        const match = games.find(g => {
            if (!g) return false;
            const gSlug = (g.slug || '').toString().toLowerCase();
            if (!gSlug || gSlug !== target) return false;
            if (!requireFullMedia) return true;
            return isValidThumbnail(g) && isValidVideo(g);
        });

        return match || null;
    }

    function pickRandomValidGame(games, requireVideo) {
        if (!Array.isArray(games)) return null;

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
    // VALIDATION HELPERS
    // -------------------------------

    function isValidThumbnail(game) {
        if (!game || typeof game.thumbnail !== 'string') return false;
        const t = game.thumbnail.trim();
        if (!t) return false;
        return /\.(png|jpe?g|webp|gif)$/i.test(t);
    }

    function isValidVideo(game) {
        if (!game) return false;
        if (typeof game.videoid !== 'string') return false;
        return game.videoid.trim().length > 0;
    }

    // -------------------------------
    // TEXT HELPERS
    // -------------------------------

    function buildGameBlurb(game) {
        const parts = [];

        if (Array.isArray(game.genres) && game.genres.length) {
            parts.push(game.genres[0]);
        }

        if (game.developer) {
            parts.push('by ' + game.developer);
        }

        if (game.year) {
            parts.push(String(game.year));
        }

        if (!parts.length) {
            return 'Retro classics queued up from the Cheeky Commodore Gamer vault.';
        }

        return parts.join(' • ');
    }

    function buildMetaLine(game) {
        const bits = [];

        if (game.system) {
            bits.push(String(game.system));
        }
        if (game.year) {
            bits.push(String(game.year));
        }
        if (Array.isArray(game.genres) && game.genres.length) {
            const genreLine = game.genres.slice(0, 2).join(' • ');
            bits.push(genreLine);
        }

        return bits.length
            ? bits.join('  ·  ')
            : 'From the Cheeky Commodore Gamer collection';
    }
})();
