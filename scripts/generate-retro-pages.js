#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { applyTemplate, readTemplate } = require('./template-engine');

const SITE_ROOT = 'https://www.cheekycommodoregamer.co.uk';
const repoRoot = path.resolve(__dirname, '..');

const baseTemplatePath = path.join(repoRoot, 'templates', 'base-omega.html');
const retroContentTemplatePath = path.join(repoRoot, 'templates', 'retro-video-content.html');
const retroSpecialsPath = path.join(repoRoot, 'data', 'retro-specials.json');

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(data) ? data : [];
}

/* =========================
   HARDENED NORMALISERS
========================= */

function resolveYoutubeId(entry) {
  return String(
    entry.youtubeId ||
    entry.youtube_video_id ||
    entry.videoId ||
    entry.videoid ||
    entry.youtube ||
    ''
  ).trim();
}

function resolveSlug(entry) {
  return String(entry.slug || entry.id || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensurePageUrl(slug) {
  return `/retro-specials/${slug}/`;
}

/* =========================
   MAIN GENERATION
========================= */

function generateRetroSpecialPages() {
  const items = readJsonArray(retroSpecialsPath);
  const baseTemplate = readTemplate(baseTemplatePath);
  const contentTemplate = readTemplate(retroContentTemplatePath);

  if (!items.length) {
    console.warn('[retro] No retro specials found.');
    return;
  }

  let generatedCount = 0;
  let skippedCount = 0;

  items.forEach((entry, index) => {
    const youtubeId = resolveYoutubeId(entry);
    const slug = resolveSlug(entry);
    const label = entry.id || entry.title || `item-${index + 1}`;

    if (!youtubeId || !slug) {
      const reasons = [];
      if (!youtubeId) reasons.push('missing youtubeId');
      if (!slug) reasons.push('missing slug');
      skippedCount += 1;
      console.warn(`[retro] SKIPPED ${label}: ${reasons.join(', ')}`);
      return;
    }

    const outputDir = path.join(repoRoot, 'retro-specials', slug);
    const outputFile = path.join(outputDir, 'index.html');

    const pageUrl = ensurePageUrl(slug);

    /* FORCE CONSISTENCY BACK INTO DATA OBJECT */
    entry.pageUrl = pageUrl;
    entry.youtubeId = youtubeId;
    entry.slug = slug;

    const contentHtml = applyTemplate(contentTemplate, {
      title: entry.title || '',
      description: entry.description || entry.summary || '',
      youtubeId,
      pageUrl
    });

    const fullHtml = applyTemplate(baseTemplate, {
      content: contentHtml,
      title: entry.title || '',
      description: entry.description || entry.summary || ''
    });

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, fullHtml, 'utf8');

    generatedCount += 1;
    console.log(`[retro] Generated ${label} -> ${outputFile}`);
  });

  console.log(`[retro] Completed. Generated: ${generatedCount}. Skipped: ${skippedCount}. Source: ${retroSpecialsPath}`);
}

generateRetroSpecialPages();
