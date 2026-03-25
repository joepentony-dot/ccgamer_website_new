#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { applyTemplate, readTemplate } = require('./template-engine');

const repoRoot = path.resolve(__dirname, '..');

const baseTemplatePath = path.join(repoRoot, 'templates', 'base-omega.html');
const retroContentTemplatePath = path.join(repoRoot, 'templates', 'retro-video-content.html');

const DATASETS = [
  {
    dataPath: path.join(repoRoot, 'data', 'retro-events.json'),
    outputDir: path.join(repoRoot, 'retro-events'),
    pagePrefix: '/retro-events/',
    label: 'retro-events'
  },
  {
    dataPath: path.join(repoRoot, 'data', 'retro-specials.json'),
    outputDir: path.join(repoRoot, 'retro-specials'),
    pagePrefix: '/retro-specials/',
    label: 'retro-specials'
  },
  {
    dataPath: path.join(repoRoot, 'data', 'amiga-demo-music.json'),
    outputDir: path.join(repoRoot, 'amiga-demo-music'),
    pagePrefix: '/amiga-demo-music/',
    label: 'amiga-demo-music'
  }
];

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(data) ? data : [];
}

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

function ensurePageUrl(prefix, slug) {
  return `${prefix}${slug}/`;
}

function generateDatasetPages(config, baseTemplate, contentTemplate) {
  const items = readJsonArray(config.dataPath);

  if (!items.length) {
    console.warn(`[retro] No entries found in ${path.relative(repoRoot, config.dataPath)}.`);
    return { generatedCount: 0, skippedCount: 0 };
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
      console.warn(`[retro] SKIPPED ${config.label}:${label}: ${reasons.join(', ')}`);
      return;
    }

    const outputDir = path.join(config.outputDir, slug);
    const outputFile = path.join(outputDir, 'index.html');

    const pageUrl = ensurePageUrl(config.pagePrefix, slug);

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
    console.log(`[retro] Generated ${config.label}:${label} -> ${outputFile}`);
  });

  return { generatedCount, skippedCount };
}

function generateRetroPages() {
  const baseTemplate = readTemplate(baseTemplatePath);
  const contentTemplate = readTemplate(retroContentTemplatePath);

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (const dataset of DATASETS) {
    const result = generateDatasetPages(dataset, baseTemplate, contentTemplate);
    totalGenerated += result.generatedCount;
    totalSkipped += result.skippedCount;
  }

  console.log(`[retro] Completed. Generated: ${totalGenerated}. Skipped: ${totalSkipped}.`);
}

generateRetroPages();
