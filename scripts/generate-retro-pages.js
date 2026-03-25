#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { applyTemplate, readTemplate } = require('./template-engine');

const SITE_ROOT = 'https://www.cheekycommodoregamer.co.uk';
const repoRoot = path.resolve(__dirname, '..');

const baseTemplatePath = path.join(repoRoot, 'templates', 'base-omega.html');
const retroContentTemplatePath = path.join(repoRoot, 'templates', 'retro-video-content.html');
const retroEventsPath = path.join(repoRoot, 'data', 'retro-events.json');
const retroSpecialsPath = path.join(repoRoot, 'data', 'retro-specials.json');
const amigaDemoMusicPath = path.join(repoRoot, 'data', 'amiga-demo-music.json');

const collectionConfig = {
  'retro-specials': {
    outputDir: path.join(repoRoot, 'retro-specials'),
    routePrefix: '/retro-specials',
    collectionName: 'Retro Specials',
    collectionUrl: '/games/collections/retro-specials.html'
  },
  'retro-events': {
    outputDir: path.join(repoRoot, 'retro-events'),
    routePrefix: '/retro-events',
    collectionName: 'Retro Events',
    collectionUrl: '/games/collections/retro-events.html'
  },
  'amiga-demo-music': {
    outputDir: path.join(repoRoot, 'amiga-demo-music'),
    routePrefix: '/amiga-demo-music',
    collectionName: 'Amiga Demo Music',
    collectionUrl: '/games/collections/amiga-demo-music.html'
  },
};

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${path.basename(filePath)} must contain an array.`);
  return data;
}

function resolveYoutubeId(entry) {
  return String(entry.youtubeId || entry.youtube_video_id || entry.videoid || entry.videoId || entry.youtube || '').trim();
}

function resolveSlug(entry) {
  return slugify(entry.slug || entry.id || entry.title);
}

function resolveSummary(entry) {
  const summary = String(entry.summary || '').trim();
  if (summary) return summary;
  const description = String(entry.description || '').trim();
  if (!description) return 'Watch this retro video from Cheeky Commodore Gamer.';
  const firstSentence = description.split('. ')[0].trim();
  return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
}

function resolveDescription(entry, summary) {
  return String(entry.description || '').trim() || summary;
}

function resolveThumbnail(entry, youtubeId) {
  const raw = String(entry.thumbnail || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (youtubeId) return `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
  if (raw.startsWith('/')) return `${SITE_ROOT}${raw}`;
  if (raw) return `${SITE_ROOT}/${raw}`;
  return `${SITE_ROOT}/resources/images/collections/retro-specials.png`;
}

function resolveUploadDate(entry, fallbackDate) {
  const candidate = String(entry.published_date || entry.publishedDate || entry.uploadDate || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallbackDate;
}

function buildVideoSchema({ title, description, thumbnailUrl, uploadDate, canonicalUrl, youtubeId }) {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description,
    thumbnailUrl,
    uploadDate,
    embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    contentUrl: watchUrl,
    url: canonicalUrl
  };
}

function buildBreadcrumbSchema({ collectionName, collectionAbsoluteUrl, canonicalUrl, title }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ROOT },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_ROOT}/games/collections/` },
      { '@type': 'ListItem', position: 3, name: collectionName, item: collectionAbsoluteUrl },
      { '@type': 'ListItem', position: 4, name: title, item: canonicalUrl }
    ]
  };
}

function sortByOrder(items) {
  return [...items].sort((a, b) => (a.order - b.order) || (a.index - b.index));
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function normaliseEntryType(rawType, fallbackType) {
  const cleaned = String(rawType || '').trim().toLowerCase();
  if (cleaned === 'retro-specials' || cleaned === 'retro-events' || cleaned === 'amiga-demo-music') return cleaned;
  if (cleaned === 'retro_special') return 'retro-specials';
  if (cleaned === 'retro_event') return 'retro-events';
  if (cleaned === 'demo_music' || cleaned === 'amiga_demo_music') return 'amiga-demo-music';
  if (fallbackType === 'retro-specials' || fallbackType === 'retro-events' || fallbackType === 'amiga-demo-music') return fallbackType;
  return 'retro-events';
}

function collectRetroEntries() {
  const retroEvents = readJsonArray(retroEventsPath).map((entry) => ({ ...entry, __fallbackType: 'retro-events' }));
  const retroSpecials = readJsonArray(retroSpecialsPath).map((entry) => ({ ...entry, __fallbackType: 'retro-specials' }));
  const demoTracks = readJsonArray(amigaDemoMusicPath).map((entry) => ({ ...entry, __fallbackType: 'amiga-demo-music' }));
  return [...retroEvents, ...retroSpecials, ...demoTracks];
}

function buildHeadExtras({ seoTitle, seoDescription, canonicalUrl, thumbnailUrl, schemas }) {
  const tags = [
    '<meta property="og:site_name" content="Cheeky Commodore Gamer" />',
    '<meta property="og:type" content="video.other" />',
    `<meta property="og:title" content="${escapeHtml(seoTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(seoDescription)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(thumbnailUrl)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seoTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seoDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(thumbnailUrl)}" />`
  ];

  const schemaTags = schemas.map((schema) => `<script type="application/ld+json">\n${JSON.stringify(schema, null, 4)}\n</script>`);
  return [...tags, ...schemaTags].join('\n    ');
}

function buildContent(retroContentTemplate, payload) {
  return applyTemplate(retroContentTemplate, {
    collection_url: escapeHtml(payload.collectionUrl),
    collection_name: escapeHtml(payload.collectionName),
    video_title: escapeHtml(payload.title),
    video_summary: escapeHtml(payload.summary),
    youtube_id: escapeHtml(payload.youtubeId),
    video_description: escapeHtml(payload.description),
    youtube_watch_url: escapeHtml(payload.youtubeWatchUrl),
    related_items: payload.relatedItemsHtml
  });
}

function generateRetroPages() {
  const baseTemplate = readTemplate(baseTemplatePath);
  const retroContentTemplate = readTemplate(retroContentTemplatePath);
  const retroDataMtime = formatDate(fs.statSync(retroEventsPath).mtime);
  const retroSpecialsMtime = fs.existsSync(retroSpecialsPath) ? formatDate(fs.statSync(retroSpecialsPath).mtime) : retroDataMtime;
  const demoDataMtime = formatDate(fs.statSync(amigaDemoMusicPath).mtime);

  const normalisedEntries = collectRetroEntries().map((entry, index) => {
    const type = normaliseEntryType(entry.type, entry.__fallbackType);
    return {
      ...entry,
      type,
      slug: resolveSlug(entry),
      youtubeId: resolveYoutubeId(entry),
      visible: entry.visible !== false && entry.published !== false,
      order: toFiniteNumber(entry.order),
      index
    };
  }).filter((entry) => Boolean(collectionConfig[entry.type] && entry.slug && entry.youtubeId && entry.visible));

  const byType = {
    'retro-specials': sortByOrder(normalisedEntries.filter((entry) => entry.type === 'retro-specials')),
    'retro-events': sortByOrder(normalisedEntries.filter((entry) => entry.type === 'retro-events')),
    'amiga-demo-music': sortByOrder(normalisedEntries.filter((entry) => entry.type === 'amiga-demo-music'))
  };

  const pageEntries = [];
  const created = [];

  for (const entry of normalisedEntries) {
    const config = collectionConfig[entry.type];
    const sourceDate = entry.__fallbackType === 'amiga-demo-music'
      ? demoDataMtime
      : entry.__fallbackType === 'retro-specials'
        ? retroSpecialsMtime
        : retroDataMtime;
    const title = String(entry.title || '').trim();
    const summary = resolveSummary(entry);
    const description = resolveDescription(entry, summary);
    const isDemoMusic = entry.type === 'amiga-demo-music';
    const defaultSeoTitle = isDemoMusic
      ? `${title} – Amiga Demo Scene | Cheeky Commodore Gamer`
      : `${title} | ${config.collectionName} | Cheeky Commodore Gamer`;
    const defaultSeoDescription = isDemoMusic
      ? `${description} This amiga demo scene feature explores commodore amiga demos, amiga demoscene music, retro computing demos, and the wider Cheeky Commodore Gamer archive.`
      : summary;
    const seoTitle = String(entry?.seo?.title || '').trim() || defaultSeoTitle;
    const seoDescription = String(entry?.seo?.description || '').trim() || defaultSeoDescription;
    const canonicalPath = `${config.routePrefix}/${entry.slug}/`;
    const canonicalUrl = `${SITE_ROOT}${canonicalPath}`;
    const thumbnailUrl = resolveThumbnail(entry, entry.youtubeId);
    const uploadDate = resolveUploadDate(entry, sourceDate);

    const schemas = [
      buildBreadcrumbSchema({
        collectionName: config.collectionName,
        collectionAbsoluteUrl: `${SITE_ROOT}${config.collectionUrl}`,
        canonicalUrl,
        title
      }),
      buildVideoSchema({ title, description, thumbnailUrl, uploadDate, canonicalUrl, youtubeId: entry.youtubeId })
    ];

    const relatedItems = byType[entry.type]
      .filter((item) => item.slug !== entry.slug)
      .slice(0, 6)
      .map((item) => {
        const relatedTitle = escapeHtml(String(item.title || '').trim());
        const relatedSummary = escapeHtml(resolveSummary(item));
        const relatedHref = `${config.routePrefix}/${escapeHtml(item.slug)}/`;
        return `<li><a class="retro-video-page__related-card" href="${relatedHref}"><span class="retro-video-page__related-title">${relatedTitle}</span><p class="retro-video-page__related-summary">${relatedSummary}</p></a></li>`;
      });

    const relatedItemsHtml = relatedItems.length
      ? `<section class="retro-video-page__related">\n  <h2 class="game-subtitle">More from ${escapeHtml(config.collectionName)}</h2>\n  <ul class="retro-video-page__related-grid">\n    ${relatedItems.join('\n    ')}\n  </ul>\n</section>`
      : '';

    const html = applyTemplate(baseTemplate, {
      title: escapeHtml(seoTitle),
      description: escapeHtml(seoDescription),
      canonical: escapeHtml(canonicalUrl),
      head_extra: buildHeadExtras({ seoTitle, seoDescription, canonicalUrl, thumbnailUrl, schemas }),
      css_extra: '<link rel="stylesheet" href="/resources/css/retro-video-pages.css" />',
      content: buildContent(retroContentTemplate, {
        collectionUrl: config.collectionUrl,
        collectionName: config.collectionName,
        title,
        summary,
        description,
        youtubeId: entry.youtubeId,
        youtubeWatchUrl: `https://www.youtube.com/watch?v=${entry.youtubeId}`,
        relatedItemsHtml
      }),
      scripts_extra: ''
    });

    const outputDir = path.join(config.outputDir, entry.slug);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputFile, html, 'utf8');

    const flatOutputFile = path.join(config.outputDir, `${entry.slug}.html`);
    const safeSlug = escapeHtml(entry.slug);
    const flatRedirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta http-equiv="refresh" content="0; url=${config.routePrefix}/${safeSlug}/" />
  <script>
    (function () {
      var suffix = window.location.search + window.location.hash;
      window.location.replace("${config.routePrefix}/${safeSlug}/" + suffix);
    })();
  </script>
</head>
<body></body>
</html>
`;
    fs.writeFileSync(flatOutputFile, flatRedirectHtml, 'utf8');

    created.push(outputFile);
    created.push(flatOutputFile);
    pageEntries.push({ loc: `${SITE_ROOT}${canonicalPath}`, file: outputFile });
  }

  return { pageEntries, created };
}

if (require.main === module) {
  const result = generateRetroPages();
  console.log(`Retro video pages generated: ${result.created.length}`);
}

module.exports = { generateRetroPages };
