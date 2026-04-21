#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { applyTemplate, readTemplate } = require('./template-engine');

const repoRoot = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const RETRO_SPECIAL_MAX_SLUG_LENGTH = 55;
const RETRO_SPECIAL_FILLER_WORDS = new Set(['the', 'about', 'these', 'this', 'a', 'an']);

const retroVideoTemplatePath = path.join(repoRoot, 'admin', 'templates', 'retro-video-template.html');

const DATASETS = [
  {
    dataPath: path.join(repoRoot, 'data', 'retro-events.json'),
    outputDir: path.join(repoRoot, 'retro-events'),
    pagePrefix: '/retro-events/',
    label: 'retro-events',
    collectionName: 'Retro Events',
    collectionUrl: '/games/collections/retro-events.html'
  },
  {
    dataPath: path.join(repoRoot, 'data', 'retro-specials.json'),
    outputDir: path.join(repoRoot, 'retro-specials'),
    pagePrefix: '/retro-specials/',
    label: 'retro-specials',
    collectionName: 'Retro Specials',
    collectionUrl: '/games/collections/retro-specials.html'
  },
  {
    dataPath: path.join(repoRoot, 'data', 'amiga-demo-music.json'),
    outputDir: path.join(repoRoot, 'amiga-demo-music'),
    pagePrefix: '/amiga-demo-music/',
    label: 'amiga-demo-music',
    collectionName: 'Amiga Demo Music',
    collectionUrl: '/games/collections/amiga-demo-music.html'
  }
];

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(data) ? data : [];
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeKebab(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortenRetroSpecialSlug(baseSlug, fallbackValue) {
  const normalized = normalizeKebab(baseSlug || fallbackValue);
  if (!normalized) return '';
  if (normalized.length <= RETRO_SPECIAL_MAX_SLUG_LENGTH) return normalized;

  const parts = normalized.split('-').filter(Boolean);
  const filtered = parts.filter((part) => !RETRO_SPECIAL_FILLER_WORDS.has(part));
  const source = filtered.length ? filtered : parts;

  const kept = [];
  for (const token of source) {
    const candidate = kept.length ? `${kept.join('-')}-${token}` : token;
    if (candidate.length > RETRO_SPECIAL_MAX_SLUG_LENGTH) break;
    kept.push(token);
  }

  if (kept.length) return kept.join('-');
  return normalized.slice(0, RETRO_SPECIAL_MAX_SLUG_LENGTH).replace(/-+$/g, '');
}

function resolveYoutubeId(entry) {
  return String(
    entry.youtubeId ||
      entry.youtube_video_id ||
      entry.videoId ||
      entry.videoid ||
      entry.youtube ||
      ''
  )
    .trim()
    .replace(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/i, '')
    .replace(/[?&].*$/, '');
}

function normalizeRetroSlug(entry, datasetLabel) {
  const source = String(entry.slug || entry.id || entry.title || '').trim();
  if (!source) return '';
  if (datasetLabel !== 'retro-specials') return normalizeKebab(source);
  return shortenRetroSpecialSlug(source, entry.title || entry.id || source);
}

function ensurePageUrl(prefix, slug) {
  return `${prefix}${slug}/`;
}

function normalizeCreatedAt(entry) {
  if (!entry || !entry.created_at) return null;
  const stamp = new Date(entry.created_at);
  if (Number.isNaN(stamp.getTime())) return null;
  return stamp;
}

function isWithinLast7Days(dateValue) {
  if (!dateValue) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - dateValue.getTime() <= sevenDaysMs;
}

function buildSeo(entry, title, description) {
  const seoTitle = String(entry?.seo?.title || `${title} | Retro Special | Cheeky Commodore Gamer`).trim();
  const seoDescription = String(entry?.seo?.description || description).trim();
  return { seoTitle, seoDescription };
}

function buildRelatedItems(items, currentSlug, pagePrefix) {
  const related = items.filter((item) => item.slug !== currentSlug).slice(0, 6);
  if (!related.length) return '';

  const cards = related
    .map((item) => {
      const href = `${pagePrefix}${item.slug}/`;
      return `<li><a class="retro-video-page__related-card" href="${escapeHtml(href)}"><span class="retro-video-page__related-title">${escapeHtml(item.title)}</span><p class="retro-video-page__related-summary">${escapeHtml(item.summary || item.description || '')}</p></a></li>`;
    })
    .join('\n    ');

  return `<section class="retro-video-page__related">\n    <h2 class="game-subtitle">More from this collection</h2>\n    <ul class="retro-video-page__related-grid">\n    ${cards}\n    </ul>\n  </section>`;
}

function toIsoDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function buildFlatRedirectHtml({ canonicalUrl, seoTitle, seoDescription }) {
  const pathOnly = new URL(canonicalUrl).pathname;
  const safeDescription = String(seoDescription || 'Redirecting to the canonical Retro Special page on Cheeky Commodore Gamer.').trim();
  const safeTitle = String(seoTitle || 'Redirecting…').trim();
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${escapeHtml(safeTitle)}</title>\n  <meta name="description" content="${escapeHtml(safeDescription)}" />\n  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n  <meta http-equiv="refresh" content="0; url=${escapeHtml(pathOnly)}" />\n  <script>\n    (function(){\n      var target = ${JSON.stringify(pathOnly)} + (window.location.search || '') + (window.location.hash || '');\n      window.location.replace(target);\n    })();\n  </script>\n</head>\n<body></body>\n</html>\n`;
}

function validateRetroEntry(config, entry, slug, youtubeId, canonicalUrl) {
  const problems = [];

  if (!String(entry.id || '').trim()) problems.push('id missing');
  if (!slug) problems.push('slug missing');
  if (!String(entry.title || '').trim()) problems.push('title missing');
  if (!youtubeId || !/^[A-Za-z0-9_-]{6,}$/.test(youtubeId)) problems.push('youtubeId missing/invalid');
  if (!String(entry.thumbnail || '').trim()) problems.push('thumbnail missing');
  if (!String(entry.summary || '').trim()) problems.push('summary missing');
  if (!String(entry.description || '').trim()) problems.push('description missing');
  if (!String(entry.collection || '').trim()) problems.push('collection missing');
  if (config.label === 'retro-specials' && slug.length > RETRO_SPECIAL_MAX_SLUG_LENGTH) {
    problems.push(`retro-special slug exceeds ${RETRO_SPECIAL_MAX_SLUG_LENGTH} chars after normalization`);
  }
  if (canonicalUrl !== `${SITE_ORIGIN}${config.pagePrefix}${slug}/`) {
    problems.push('canonical does not match final slug');
  }

  return problems;
}

function validateGeneratedHtml(html, canonicalUrl) {
  const problems = [];
  if (!html.includes('class="retro-video-page')) problems.push('generated HTML missing retro-video-page root class');
  if (!html.includes('/resources/css/retro-video-pages.css')) problems.push('generated HTML missing retro-video-pages.css');
  if (!html.includes(`<link rel="canonical" href="${canonicalUrl}"`)) problems.push('generated canonical mismatch');
  return problems;
}

function generateDatasetPages(config, template) {
  const items = readJsonArray(config.dataPath);

  if (!items.length) {
    console.warn(`[retro] No entries found in ${path.relative(repoRoot, config.dataPath)}.`);
    return { generatedCount: 0, skippedCount: 0 };
  }

  const normalizedItems = items.map((entry) => {
    const slug = normalizeRetroSlug(entry, config.label);
    const youtubeId = resolveYoutubeId(entry);
    return { ...entry, slug, youtubeId };
  });

  const seenSlugs = new Set();
  let generatedCount = 0;
  let skippedCount = 0;

  normalizedItems.forEach((entry, index) => {
    let slug = entry.slug;
    const youtubeId = entry.youtubeId;
    const label = entry.id || entry.title || `item-${index + 1}`;

    // Accept all retro-specials entries
    if (!slug) return;

    if (seenSlugs.has(slug)) {
      const suffixSeed = normalizeKebab(entry.id || `item-${index + 1}`);
      const suffix = (suffixSeed.split('-').pop() || String(index + 1)).slice(0, 10);
      const trimmedBase = slug.slice(0, Math.max(1, RETRO_SPECIAL_MAX_SLUG_LENGTH - (suffix.length + 1))).replace(/-+$/g, '');
      slug = `${trimmedBase}-${suffix}`;
    }

    const canonicalUrl = `${SITE_ORIGIN}${config.pagePrefix}${slug}/`;

    const entryProblems = validateRetroEntry(config, entry, slug, youtubeId, canonicalUrl);
    if (entryProblems.length) {
      skippedCount += 1;
      console.error(`[retro] BLOCKED ${config.label}:${label}: ${entryProblems.join('; ')}`);
      return;
    }

    seenSlugs.add(slug);

    const createdAt = normalizeCreatedAt(entry);
    const summary = String(entry.summary || entry.description || '').trim();
    const description = String(entry.description || summary).trim();
    const { seoTitle, seoDescription } = buildSeo(entry, entry.title || '', description);
    const relatedItemsHtml = buildRelatedItems(normalizedItems, slug, config.pagePrefix);

    const html = applyTemplate(template, {
      SEO_TITLE: escapeHtml(seoTitle),
      SEO_DESCRIPTION: escapeHtml(seoDescription),
      CANONICAL_URL: canonicalUrl,
      THUMBNAIL_URL: escapeHtml(entry.thumbnail),
      COLLECTION_LABEL: escapeHtml(config.collectionName),
      COLLECTION_URL: escapeHtml(config.collectionUrl),
      TITLE: escapeHtml(entry.title || ''),
      SUMMARY: escapeHtml(summary),
      YOUTUBE_ID: escapeHtml(youtubeId),
      DESCRIPTION: escapeHtml(description),
      UPLOAD_DATE: escapeHtml(toIsoDate(entry.created_at)),
      MEMBERS_BADGE: entry.membersOnly ? '<p class="game-tag">Members only</p>' : '',
      RELATED_ITEMS: relatedItemsHtml
    });

    const htmlProblems = validateGeneratedHtml(html, canonicalUrl);
    if (htmlProblems.length) {
      skippedCount += 1;
      console.error(`[retro] BLOCKED HTML ${config.label}:${label}: ${htmlProblems.join('; ')}`);
      return;
    }

    const outputDir = path.join(config.outputDir, slug);
    const outputFile = path.join(outputDir, 'index.html');
    const flatRedirectFile = path.join(config.outputDir, `${slug}.html`);

    console.log('[retro] generating:', slug);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, html, 'utf8');
    if (!fs.existsSync(outputFile)) {
      throw new Error(`Failed to generate page for ${slug}`);
    }
    fs.writeFileSync(flatRedirectFile, buildFlatRedirectHtml({ canonicalUrl, seoTitle, seoDescription }), 'utf8');

    generatedCount += 1;
    console.log(`[retro] Generated ${config.label}:${label} -> ${outputFile} (new=${!createdAt || isWithinLast7Days(createdAt)})`);
  });

  return { generatedCount, skippedCount };
}

function generateRetroPages() {
  const retroVideoTemplate = readTemplate(retroVideoTemplatePath);

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (const dataset of DATASETS) {
    const result = generateDatasetPages(dataset, retroVideoTemplate);
    totalGenerated += result.generatedCount;
    totalSkipped += result.skippedCount;
  }

  if (totalSkipped > 0) {
    console.error(`[retro] Completed with failures. Generated: ${totalGenerated}. Blocked: ${totalSkipped}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`[retro] Completed. Generated: ${totalGenerated}. Blocked: ${totalSkipped}.`);
}

generateRetroPages();
