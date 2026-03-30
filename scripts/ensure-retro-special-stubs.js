#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'data', 'retro-specials.json');
const outputDir = path.join(repoRoot, 'retro-specials');
const siteRoot = 'https://www.cheekycommodoregamer.co.uk';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildHtml({ slug, youtubeId, title, description }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const canonical = `${siteRoot}/retro-specials/${slug}/`;
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} | Retro Special | Cheeky Commodore Gamer</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${canonical}" />
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    <iframe
      src="${embedUrl}"
      title="${safeTitle}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen></iframe>
  </main>
</body>
</html>
`;
}

function main() {
  const raw = fs.readFileSync(dataPath, 'utf8');
  const entries = JSON.parse(raw);

  for (const entry of entries) {
    const slug = normalizeSlug(entry.slug);
    const youtubeId = String(entry.youtubeId || '').trim();
    const title = String(entry.title || '').trim();
    const description = String(entry.description || '').trim();

    if (!slug || !youtubeId || !title || !description) {
      console.log(`[SKIPPED] invalid data for entry ${entry.id || slug || 'unknown'}`);
      continue;
    }

    const htmlPath = path.join(outputDir, `${slug}.html`);
    const indexDir = path.join(outputDir, slug);
    const indexPath = path.join(indexDir, 'index.html');
    const html = buildHtml({ slug, youtubeId, title, description });

    if (fs.existsSync(htmlPath)) {
      console.log(`[SKIPPED] already exists`);
    } else {
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`[STUB CREATED] retro-specials/${slug}.html`);
    }

    if (!fs.existsSync(indexPath)) {
      fs.mkdirSync(indexDir, { recursive: true });
      fs.writeFileSync(indexPath, html, 'utf8');
      console.log(`[STUB CREATED] retro-specials/${slug}/index.html`);
    }
  }
}

main();
