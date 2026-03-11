#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SITE_ROOT = 'https://www.cheekycommodoregamer.co.uk';
const repoRoot = path.resolve(__dirname, '..');

const templatePath = path.join(repoRoot, 'templates', 'retro-page-template.html');
const retroEventsPath = path.join(repoRoot, 'data', 'retro-events.json');
const amigaDemoMusicPath = path.join(repoRoot, 'data', 'amiga-demo-music.json');

const collectionConfig = {
  retro_special: {
    outputDir: path.join(repoRoot, 'retro-specials'),
    routePrefix: '/retro-specials',
    collectionName: 'Retro Specials',
    collectionUrl: '/games/collections/retro-specials.html'
  },
  retro_event: {
    outputDir: path.join(repoRoot, 'retro-events'),
    routePrefix: '/retro-events',
    collectionName: 'Retro Events',
    collectionUrl: '/games/collections/retro-events.html'
  },
  demo_music: {
    outputDir: path.join(repoRoot, 'amiga-demo-music'),
    routePrefix: '/amiga-demo-music',
    collectionName: 'Amiga Demo Music',
    collectionUrl: '/games/collections/amiga-demo-music.html'
  },
  amiga_demo_music: {
    outputDir: path.join(repoRoot, 'amiga-demo-music'),
    routePrefix: '/amiga-demo-music',
    collectionName: 'Amiga Demo Music',
    collectionUrl: '/games/collections/amiga-demo-music.html'
  }
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function readJsonArray(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`${path.basename(filePath)} must contain an array.`);
  }
  return data;
}

function resolveYoutubeId(entry) {
  return String(entry.youtube_video_id || entry.youtubeId || entry.youtube || '').trim();
}

function resolveSlug(entry) {
  return slugify(entry.slug || entry.id || entry.title);
}

function resolveSummary(entry) {
  const summary = String(entry.summary || '').trim();
  if (summary) return summary;
  const description = String(entry.description || '').trim();
  if (description) {
    const firstSentence = description.split('. ')[0].trim();
    return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
  }
  return 'Watch this retro video from Cheeky Commodore Gamer.';
}

function resolveDescription(entry, summary) {
  const description = String(entry.description || '').trim();
  return description || summary;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  return fallbackDate;
}

function buildVideoSchema({ title, description, thumbnailUrl, uploadDate, canonicalUrl, youtubeId }) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description,
    thumbnailUrl,
    uploadDate,
    embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    url: canonicalUrl
  }, null, 4);
}

function buildBreadcrumbSchema({ collectionName, collectionAbsoluteUrl, canonicalUrl, title }) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_ROOT
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Collections',
        item: `${SITE_ROOT}/games/collections/`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: collectionName,
        item: collectionAbsoluteUrl
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: title,
        item: canonicalUrl
      }
    ]
  }, null, 4);
}

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.order !== b.order) return a.order - b.order;
    return a.index - b.index;
  });
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function buildRetroPageHtml(template, payload) {
  return template
    .replaceAll('__SEO_TITLE__', escapeHtml(payload.seoTitle))
    .replaceAll('__SEO_DESCRIPTION__', escapeHtml(payload.seoDescription))
    .replaceAll('__CANONICAL_URL__', escapeHtml(payload.canonicalUrl))
    .replaceAll('__THUMBNAIL_URL__', escapeHtml(payload.thumbnailUrl))
    .replaceAll('__SCHEMA_BLOCKS__', payload.schemaBlocks)
    .replaceAll('__PAGE_CONTENT__', payload.pageContentHtml);
}

function buildPageContentHtml({ collectionUrl, collectionName, title, summary, description, youtubeId, relatedItemsHtml }) {
  return [
    '  <section class="retro-video-page">',
    `    <p class="retro-video-page__back"><a class="ccg-btn ccg-btn--primary" href="${escapeHtml(collectionUrl)}">← Back to ${escapeHtml(collectionName)}</a></p>`,
    `    <h1 class="game-hero__title retro-video-page__title">${escapeHtml(title)}</h1>`,
    `    <p class="retro-video-page__summary">${escapeHtml(summary)}</p>`,
    '    <div class="retro-video-page__video">',
    '      <iframe',
    `        src="https://www.youtube.com/embed/${escapeHtml(youtubeId)}"`,
    `        title="${escapeHtml(title)}"`,
    '        loading="lazy"',
    '        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
    '        allowfullscreen>',
    '      </iframe>',
    '    </div>',
    `    <p class="retro-video-page__description">${escapeHtml(description)}</p>`,
    relatedItemsHtml ? `    ${relatedItemsHtml}` : '',
    '  </section>'
  ].filter(Boolean).join('\n');
}

function normaliseEntryType(rawType, fallbackType) {
  const cleaned = String(rawType || '').trim().toLowerCase();
  if (cleaned === 'retro_special') return 'retro_special';
  if (cleaned === 'retro_event') return 'retro_event';
  if (cleaned === 'demo_music' || cleaned === 'amiga_demo_music') return 'demo_music';
  if (fallbackType === 'demo_music') return 'demo_music';
  return 'retro_event';
}

function collectRetroEntries() {
  const retroEvents = readJsonArray(retroEventsPath).map((entry) => ({ ...entry, __fallbackType: 'retro_event' }));
  const demoTracks = readJsonArray(amigaDemoMusicPath).map((entry) => ({ ...entry, __fallbackType: 'demo_music' }));
  return [...retroEvents, ...demoTracks];
}

function generateRetroPages() {
  const template = fs.readFileSync(templatePath, 'utf8');
  const retroDataMtime = formatDate(fs.statSync(retroEventsPath).mtime);
  const demoDataMtime = formatDate(fs.statSync(amigaDemoMusicPath).mtime);

  const normalisedEntries = collectRetroEntries().map((entry, index) => {
    const type = normaliseEntryType(entry.type, entry.__fallbackType);
    const slug = resolveSlug(entry);
    const youtubeId = resolveYoutubeId(entry);
    const visible = entry.visible !== false && entry.published !== false;
    return {
      ...entry,
      type,
      slug,
      youtubeId,
      visible,
      sortOrder: toFiniteNumber(entry.sort_order),
      order: toFiniteNumber(entry.order),
      index
    };
  }).filter((entry) => {
    const config = collectionConfig[entry.type];
    return Boolean(config && entry.slug && entry.youtubeId && entry.visible);
  });

  const byType = {
    retro_special: sortByOrder(normalisedEntries.filter((entry) => entry.type === 'retro_special')),
    retro_event: sortByOrder(normalisedEntries.filter((entry) => entry.type === 'retro_event')),
    demo_music: sortByOrder(normalisedEntries.filter((entry) => entry.type === 'demo_music'))
  };

  const pageEntries = [];
  const created = [];

  for (const entry of normalisedEntries) {
    const config = collectionConfig[entry.type];
    const { slug, youtubeId } = entry;

    const sourceDate = entry.__fallbackType === 'demo_music' ? demoDataMtime : retroDataMtime;
    const title = String(entry.title || '').trim();
    const summary = resolveSummary(entry);
    const description = resolveDescription(entry, summary);
    const seoTitle = String(entry?.seo?.title || '').trim() || `${title} | ${config.collectionName} | Cheeky Commodore Gamer`;
    const seoDescription = String(entry?.seo?.description || '').trim() || summary;

    const canonicalPath = `${config.routePrefix}/${slug}/`;
    const canonicalUrl = `${SITE_ROOT}${canonicalPath}`;
    const thumbnailUrl = resolveThumbnail(entry, youtubeId);
    const uploadDate = resolveUploadDate(entry, sourceDate);
    const hasEligibleVideoSchema = /^\d{4}-\d{2}-\d{2}$/.test(String(entry.published_date || entry.publishedDate || '').trim());
    const breadcrumbSchema = buildBreadcrumbSchema({
      collectionName: config.collectionName,
      collectionAbsoluteUrl: `${SITE_ROOT}${config.collectionUrl}`,
      canonicalUrl,
      title
    });

    const schemaBlocks = [
      `<script type="application/ld+json">\n${breadcrumbSchema}\n    </script>`
    ];

    if (hasEligibleVideoSchema) {
      schemaBlocks.push(`<script type="application/ld+json">\n${buildVideoSchema({ title, description, thumbnailUrl, uploadDate, canonicalUrl, youtubeId })}\n    </script>`);
    }

    const relatedItems = byType[entry.type]
      .filter((item) => item.slug !== slug)
      .slice(0, 6)
      .map((item) => {
        const itemTitle = escapeHtml(String(item.title || '').trim());
        return `<li><a href="${config.routePrefix}/${escapeHtml(item.slug)}/">${itemTitle}</a></li>`;
      });

    const relatedItemsHtml = relatedItems.length
      ? `<section class="retro-video-page__related">\n      <h2 class="game-subtitle">Related ${escapeHtml(config.collectionName)} videos</h2>\n      <ul>\n        ${relatedItems.join('\n        ')}\n      </ul>\n    </section>`
      : '';

    const pageContentHtml = buildPageContentHtml({
      collectionUrl: config.collectionUrl,
      collectionName: config.collectionName,
      title,
      summary,
      description,
      youtubeId,
      relatedItemsHtml
    });

    const html = buildRetroPageHtml(template, {
      seoTitle,
      seoDescription,
      canonicalUrl,
      thumbnailUrl,
      schemaBlocks: schemaBlocks.join('\n\n    '),
      pageContentHtml
    });

    const outputDir = path.join(config.outputDir, slug);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputFile, html, 'utf8');

    created.push(outputFile);
    pageEntries.push({
      loc: `${SITE_ROOT}${canonicalPath}`,
      file: outputFile
    });
  }

  return { pageEntries, created };
}

if (require.main === module) {
  const result = generateRetroPages();
  console.log(`Retro video pages generated: ${result.created.length}`);
}

module.exports = {
  generateRetroPages
};
