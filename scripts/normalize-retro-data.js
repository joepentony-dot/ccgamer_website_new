#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const DATASETS = [
  {
    file: path.join(repoRoot, 'data', 'retro-events.json'),
    type: 'retro-events',
    collection: 'retro-events'
  },
  {
    file: path.join(repoRoot, 'data', 'retro-specials.json'),
    type: 'retro-specials',
    collection: 'retro-specials',
    append: [
      {
        id: 'hardest-c64-games',
        slug: 'hardest-commodore-64-games',
        type: 'retro-specials',
        title: 'Hardest Commodore 64 Games Ever Made',
        youtubeId: 'EpkUyLF-VsQ',
        thumbnail: 'https://img.youtube.com/vi/EpkUyLF-VsQ/hqdefault.jpg',
        membersOnly: false,
        order: 1,
        summary: 'A look at the hardest Commodore 64 games ever made.',
        description: 'Explore the toughest C64 games ever released, known for brutal difficulty and unforgiving gameplay.',
        collection: 'retro-specials'
      }
    ]
  },
  {
    file: path.join(repoRoot, 'data', 'amiga-demo-music.json'),
    type: 'amiga-demo-music',
    collection: 'amiga-demo-music'
  }
];

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normaliseYoutubeId(entry) {
  return String(
    entry.youtubeId ||
    entry.youtube_video_id ||
    entry.youtube_url ||
    entry.youtube ||
    ''
  )
    .trim()
    .replace(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/i, '')
    .replace(/[?&].*$/, '');
}

function getSortValue(entry, fallbackIndex) {
  const raw = entry.order ?? entry.sort_order;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallbackIndex;
}

function orderKeys(entry) {
  const ordered = {};
  const priority = [
    'id',
    'slug',
    'type',
    'title',
    'youtubeId',
    'thumbnail',
    'membersOnly',
    'order',
    'summary',
    'description',
    'collection',
    'seo'
  ];

  for (const key of priority) {
    if (key in entry) ordered[key] = entry[key];
  }

  for (const [key, value] of Object.entries(entry)) {
    if (!(key in ordered)) ordered[key] = value;
  }

  return ordered;
}

function normaliseDataset(config) {
  const source = JSON.parse(fs.readFileSync(config.file, 'utf8'));
  const items = Array.isArray(source) ? source : [];
  const byId = new Map();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    byId.set(String(item.id || '').trim(), { ...item });
  }

  for (const extra of config.append || []) {
    byId.set(extra.id, { ...(byId.get(extra.id) || {}), ...extra });
  }

  const normalised = [...byId.values()]
    .map((entry, index) => {
      const youtubeId = normaliseYoutubeId(entry);
      const slug = String(entry.slug || '').trim() || toSlug(entry.id || entry.title || youtubeId);
      const thumbnail = String(entry.thumbnail || '').trim() || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '');
      const cleaned = {
        ...entry,
        slug,
        type: config.type,
        youtubeId,
        thumbnail,
        order: getSortValue(entry, index),
        collection: config.collection
      };

      delete cleaned.youtube_url;
      delete cleaned.youtube_video_id;
      delete cleaned.youtube;
      delete cleaned.sort_order;

      return cleaned;
    })
    .sort((a, b) => (a.order - b.order) || String(a.title).localeCompare(String(b.title)))
    .map((entry, index) => orderKeys({ ...entry, order: index }));

  fs.writeFileSync(config.file, `${JSON.stringify(normalised, null, 2)}\n`);
  return normalised.length;
}

for (const dataset of DATASETS) {
  const count = normaliseDataset(dataset);
  console.log(`Normalized ${path.relative(repoRoot, dataset.file)} (${count} entries)`);
}
