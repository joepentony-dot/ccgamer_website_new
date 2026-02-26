import { APP_PATHS } from './config.js?v=admin-stable-20260207';

const LOCAL_BACKUPS_KEY = 'ccg-admin-games-backups';
const MAX_BACKUPS = 20;
const GLOBAL_LIBRARY_KEY = 'CCG_GAMES_LIBRARY';
const DEFAULT_SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const GAME_PAGE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- Canonical route enforcement: redirect /games/{{slug}}.html -> /games/{{slug}}/ -->
    <meta http-equiv="refresh" content="0; url=/games/{{slug}}/">
    <script>
      (function () {
        var suffix = window.location.search + window.location.hash;
        window.location.replace("/games/{{slug}}/" + suffix);
      })();
    </script>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>{{title}} | Cheeky Commodore Gamer</title>
    <meta name="description" content="{{description}}" />

    <link rel="canonical" href="{{canonicalUrl}}" />

    <meta property="og:title" content="{{title}} | Cheeky Commodore Gamer" />
    <meta property="og:description" content="{{description}}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{{canonicalUrl}}" />
    <meta property="og:image" content="{{ogImageUrl}}" />

    <link rel="icon" href="../favicon.ico" />

    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="../resources/css/ccg-master.css" />
    <link rel="stylesheet" href="../resources/css/ccg-mode.css" />
    <link rel="stylesheet" href="../resources/css/ccg-effects.css" />
    <link rel="stylesheet" href="../resources/css/ccg-anim.css" />
    <link rel="stylesheet" href="../resources/css/ccg-overlays.css" />
    <link rel="stylesheet" href="../resources/css/ccg-cards.css" />
    <link rel="stylesheet" href="../resources/css/games.css" />
    <link rel="stylesheet" href="../resources/css/ccg-footer.css" />
    <link rel="stylesheet" href="../resources/css/ccg-mobile-lite.css" />
    <script src="../js/ccg-mobile-lite.js" defer></script>

    <script type="application/ld+json">
{{jsonLd}}
    </script>
</head>
<body class="ccg-body" data-ccg-mode="{{mode}}" data-mode="{{mode}}" data-game-slug="{{slug}}" data-game-id="{{id}}">

<div class="ccg-bg" aria-hidden="true">
    <div class="ccg-bg-starfield" aria-hidden="true"></div>
    <div class="ccg-bg-grid" aria-hidden="true"></div>
    <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
</div>

<div class="ccg-page">
    <main class="ccg-main">

        <section class="game-hero">
            <div class="game-hero__inner">

                <div class="game-hero__media">
                    <img
                        class="game-hero__thumb"
                        src="{{thumbSrc}}"
                        alt="{{thumbAlt}}"
                        loading="lazy"
                     width="460" height="215"  srcset="{{thumbSrc}} 460w" sizes="(max-width: 720px) 90vw, 460px" />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">{{title}}</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">{{year}}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">{{platform}}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">{{publisher}}</span>
                    </div>
                </div>

            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Overview</p>
            <h2 class="game-section__title">Game Summary</h2>

            <div class="game-description">
                {{description}}
            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Explore</p>
            <h2 class="game-section__title">More Details</h2>

            <div class="game-downloads">
                <a class="ccg-btn ccg-btn--primary"
                   href="{{interactiveHref}}">
                    View the full interactive game page
                </a>

                <a class="ccg-btn ccg-btn--ghost"
                   href="{{browseHref}}">
                    Browse all games
                </a>
            </div>
        </section>

    </main>

    <footer class="ccg-footer">
        <p class="ccg-footer__text">
            © <span data-ccg-year></span> Cheeky Commodore Gamer.
            Not affiliated with Commodore, Amiga or publishers.
        </p>
    </footer>
</div>

<script>
  window.CCG_GAME_STUB = {{gameStubJson}};
</script>
<script src="../js/ccg-base.js" defer></script>

</body>
</html>
`;

const DESCRIPTION_SUFFIX = 'on Commodore — screenshots, manual, downloads and video.';

function ensureLibraryCache() {
  if (!window[GLOBAL_LIBRARY_KEY]) {
    window[GLOBAL_LIBRARY_KEY] = {
      games: null,
      loadedAt: null,
      source: 'unset'
    };
  }
  return window[GLOBAL_LIBRARY_KEY];
}

function downloadJson(filename, payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function fetchJson(path, label) {
  // Path correction: canonical static path works on localhost and GitHub Pages.
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${label} failed to load (${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
}

function readBackups() {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackups(backups) {
  try {
    localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
  } catch {
    // Keep the editor usable even when localStorage is unavailable.
  }
}

function buildFileIndex(games) {
  const fileRefs = new Set();

  for (const game of games) {
    const candidates = [
      game.thumbnail,
      game.pdf,
      game.box_3d,
      ...(Array.isArray(game.disk) ? game.disk : []),
      ...(Array.isArray(game.lemon) ? game.lemon : [])
    ];

    for (const value of candidates) {
      if (!value || typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed || /^https?:\/\//i.test(trimmed)) continue;
      fileRefs.add(trimmed.replace(/^\/+/, ''));
    }
  }

  return [...fileRefs].sort();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function resolvePublisher(entry) {
  const creditsPublisher = entry?.credits?.publisher;
  if (Array.isArray(creditsPublisher) && creditsPublisher[0]) return String(creditsPublisher[0]);
  if (entry?.publisher) return String(entry.publisher);
  if (entry?.developer) return String(entry.developer);
  if (entry?.credits?.developer) return String(entry.credits.developer);
  return 'Unknown Publisher';
}

function resolveDescription(entry) {
  if (entry?.description) return String(entry.description);
  const title = entry?.title || entry?.id || '';
  return title ? `${title} ${DESCRIPTION_SUFFIX}` : DESCRIPTION_SUFFIX;
}

function resolveRelativeAsset(path, { prefix = '../' } = {}) {
  if (!path) return '';
  const trimmed = String(path).replace(/^\/+/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('../')) return trimmed;
  return `${prefix}${trimmed}`;
}

function resolveAbsoluteAsset(path, siteOrigin) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin.replace(/\/$/, '')}/${String(path).replace(/^\/+/, '')}`.replace(
    /(?<!:)\/{2,}/g,
    '/'
  );
}

function resolveMode(system) {
  return String(system || '').toLowerCase().includes('amiga') ? 'amiga' : 'c64';
}

export function buildGamePageHtml(entry, { siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Entry is required to build a game page.');
  }
  const slug = String(entry.slug || '').trim();
  if (!slug) {
    throw new Error('Slug is required to build a game page.');
  }

  const title = String(entry.title || entry.id || slug);
  const description = resolveDescription(entry);
  const canonicalUrl = `${siteOrigin.replace(/\/$/, '')}/games/${slug}.html`;
  const ogImageUrl = resolveAbsoluteAsset(entry.thumbnail, siteOrigin);
  const publisher = resolvePublisher(entry);
  const platform = String(entry.system || '').trim().toUpperCase() || 'C64';
  const year = String(entry.year || '').trim();
  const mode = resolveMode(entry.system);
  const thumbSrc = resolveRelativeAsset(entry.thumbnail, { prefix: '../' });
  const thumbAlt = `${title} cover`;
  const interactiveHref = `/games/game.html?id=${encodeURIComponent(entry.id || slug)}`;
  const browseHref = '/games/index.html';
  const jsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: title,
      description,
      datePublished: year,
      gamePlatform: platform,
      publisher,
      image: ogImageUrl,
      url: canonicalUrl
    },
    null,
    4
  );
  const gameStubJson = JSON.stringify({ slug, id: entry.id || slug });

  const replacements = {
    slug: escapeAttribute(slug),
    id: escapeAttribute(entry.id || slug),
    title: escapeHtml(title),
    description: escapeAttribute(description),
    canonicalUrl: escapeAttribute(canonicalUrl),
    ogImageUrl: escapeAttribute(ogImageUrl),
    thumbSrc: escapeAttribute(thumbSrc),
    thumbAlt: escapeAttribute(thumbAlt),
    platform: escapeHtml(platform),
    publisher: escapeHtml(publisher),
    year: escapeHtml(year),
    mode: escapeAttribute(mode),
    interactiveHref: escapeAttribute(interactiveHref),
    browseHref: escapeAttribute(browseHref),
    jsonLd,
    gameStubJson
  };

  return GAME_PAGE_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key];
    }
    return match;
  });
}

export async function fetchGamesJson() {
  const games = await fetchJson(APP_PATHS.gamesJson, 'games.json');
  if (!Array.isArray(games)) {
    throw new Error('games.json is expected to be a top-level array.');
  }
  return { games };
}

export async function loadGamesLibrary({ force = false } = {}) {
  const cache = ensureLibraryCache();
  if (!force && Array.isArray(cache.games) && cache.games.length) {
    return cache;
  }

  const { games } = await fetchGamesJson();
  cache.games = games;
  cache.loadedAt = new Date().toISOString();
  cache.source = 'remote';
  return cache;
}

export function updateGamesLibrary(games, source = 'local') {
  const cache = ensureLibraryCache();
  cache.games = games;
  cache.loadedAt = new Date().toISOString();
  cache.source = source;
  return cache;
}

export function getGamesLibrarySync() {
  return ensureLibraryCache();
}

export function buildStubStructure({ slug, meta = {} } = {}) {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) {
    throw new Error('Slug is required to build a stub structure.');
  }

  return {
    root: `stubs/${cleanSlug}/`,
    folders: ['screenshots', 'box', 'docs'],
    metaJson: `${JSON.stringify(meta, null, 2)}\n`
  };
}

export async function fetchFileIndex() {
  const { games } = await fetchGamesJson();
  return { files: buildFileIndex(games) };
}

export async function fetchBackups() {
  return { backups: readBackups() };
}

export async function restoreBackup(backupId) {
  const backups = readBackups();
  const backup = backups.find((entry) => entry.id === backupId);
  if (!backup) {
    throw new Error('Backup not found in local browser storage.');
  }

  downloadJson('games.json', backup.games);
  return { restored: true, backupId };
}

export async function saveGamesJson({ games, message, role }) {
  if (!Array.isArray(games)) {
    throw new Error('Cannot save: games payload must be an array.');
  }

  const backupEntry = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    commit_message: message || `Local export by ${role || 'admin'}`,
    role: role || 'unknown',
    games
  };

  const existing = readBackups();
  writeBackups([backupEntry, ...existing]);

  updateGamesLibrary(games, 'client-download');

  // Path correction: export to client download instead of server write for static hosting.
  downloadJson('games.json', games);

  return {
    saved: true,
    mode: 'client-download',
    backup: backupEntry
  };
}
