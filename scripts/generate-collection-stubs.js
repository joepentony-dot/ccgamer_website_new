#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const DOMAIN = 'https://www.cheekycommodoregamer.co.uk';

const COLLECTIONS = [
  {
    key: 'retro-specials',
    dataFile: path.join(repoRoot, 'data', 'retro-specials.json'),
    parentPage: path.join(repoRoot, 'games', 'collections', 'retro-specials.html'),
    parentTitle: 'Retro Specials'
  },
  {
    key: 'retro-events',
    dataFile: path.join(repoRoot, 'data', 'retro-events.json'),
    parentPage: path.join(repoRoot, 'games', 'collections', 'retro-events.html'),
    parentTitle: 'Retro Events'
  },
  {
    key: 'amiga-demo-music',
    dataFile: path.join(repoRoot, 'data', 'amiga-demo-music.json'),
    parentPage: path.join(repoRoot, 'games', 'collections', 'amiga-demo-music.html'),
    parentTitle: 'Amiga Demo Music'
  }
];

function htmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSlug(entry) {
  return String(entry?.slug || entry?.id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeYoutubeId(entry) {
  return String(
    entry?.youtubeId ||
      entry?.youtube_video_id ||
      entry?.videoId ||
      entry?.videoid ||
      entry?.youtube ||
      ''
  ).trim();
}

function readJsonArray(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array JSON in ${path.relative(repoRoot, filePath)}`);
  }
  return parsed;
}

function extractStylesheets(parentFilePath, parentUrlPath) {
  const html = fs.readFileSync(parentFilePath, 'utf8');
  const linkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi;
  const hrefRegex = /href=["']([^"']+)["']/i;
  const links = html.match(linkRegex) || [];
  const baseUrl = new URL(parentUrlPath, DOMAIN);

  return links
    .map((tag) => {
      const hrefMatch = tag.match(hrefRegex);
      if (!hrefMatch) return null;
      const href = hrefMatch[1];
      if (!href) return null;

      if (/^https?:\/\//i.test(href) || href.startsWith('//')) {
        return href;
      }

      if (href.startsWith('/')) {
        return href;
      }

      const resolved = new URL(href, baseUrl);
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    })
    .filter(Boolean);
}

function buildStubHtml({
  title,
  collectionTitle,
  description,
  youtubeId,
  canonicalUrl,
  parentLink,
  stylesheetHrefs
}) {
  const safeTitle = htmlEscape(title);
  const safeDescription = htmlEscape(description);
  const pageTitle = `${safeTitle} | ${htmlEscape(collectionTitle)} | Cheeky Commodore Gamer`;
  const stylesheetTags = stylesheetHrefs
    .map((href) => `  <link rel="stylesheet" href="${htmlEscape(href)}" />`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${htmlEscape(canonicalUrl)}" />
${stylesheetTags}
</head>
<body>
  <main>
    <article>
      <h1>${safeTitle}</h1>
      <p><a href="${htmlEscape(parentLink)}">← Back to ${htmlEscape(collectionTitle)}</a></p>
      <div>
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/${htmlEscape(youtubeId)}"
          title="${safeTitle}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      </div>
      <p>${safeDescription}</p>
    </article>
  </main>
</body>
</html>
`;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function processCollection(config) {
  const items = readJsonArray(config.dataFile);
  const parentUrlPath = `/games/collections/${config.key}.html`;
  const cssLinks = extractStylesheets(config.parentPage, parentUrlPath);

  let created = 0;
  let skipped = 0;

  for (const entry of items) {
    const slug = normalizeSlug(entry);
    const title = String(entry?.title || '').trim();
    const youtubeId = normalizeYoutubeId(entry);
    const description = String(entry?.description || entry?.summary || '').trim();

    if (!slug || !title || !youtubeId || !description) {
      throw new Error(
        `[${config.key}] Invalid entry. Required fields: slug, title, youtubeId, description. Received slug="${slug}", title="${title}", youtubeId="${youtubeId}"`
      );
    }

    const canonicalUrl = `${DOMAIN}/${config.key}/${slug}/`;
    const parentLink = `/games/collections/${config.key}.html`;
    const htmlPath = path.join(repoRoot, config.key, `${slug}.html`);
    const indexPath = path.join(repoRoot, config.key, slug, 'index.html');

    const htmlExists = fs.existsSync(htmlPath);
    const indexExists = fs.existsSync(indexPath);

    if (htmlExists && indexExists) {
      skipped += 1;
      console.log(`[SKIPPED] ${slug} exists`);
      continue;
    }

    const pageHtml = buildStubHtml({
      title,
      collectionTitle: config.parentTitle,
      description,
      youtubeId,
      canonicalUrl,
      parentLink,
      stylesheetHrefs: cssLinks
    });

    const createdTargets = [];

    if (!htmlExists) {
      ensureDirectory(htmlPath);
      fs.writeFileSync(htmlPath, pageHtml, 'utf8');
      createdTargets.push(`${config.key}/${slug}.html`);
    }

    if (!indexExists) {
      ensureDirectory(indexPath);
      fs.writeFileSync(indexPath, pageHtml, 'utf8');
      createdTargets.push(`${config.key}/${slug}/index.html`);
    }

    created += 1;
    console.log(`[CREATED] ${slug} (${createdTargets.join(', ')})`);
  }

  return { created, skipped };
}

function main() {
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const collection of COLLECTIONS) {
    const result = processCollection(collection);
    totalCreated += result.created;
    totalSkipped += result.skipped;
  }

  console.log(`[SUMMARY] created=${totalCreated} skipped=${totalSkipped}`);
}

main();
