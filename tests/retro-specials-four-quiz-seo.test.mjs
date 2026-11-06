import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const specials = JSON.parse(read('data/retro-specials.json'));
const collection = read('games/collections/retro-specials.html');
const generator = read('scripts/generate-retro-pages.js');
const videoLibrary = read('scripts/generate-video-library.js');
const videoSitemap = read('scripts/generate-retro-video-seo.js');
const slugs = [
  '50-arcade-games-can-you-identify-them',
  '50-commodore-64-games-can-you-identify-them',
  '50-amiga-games-can-you-identify-them',
  '50-zx-spectrum-games-can-you-identify-them'
];
const ids = ['cNv9J-MhMA0', 'qJZa1zB2zHU', 'kc86gnQh7ww', 'XxEhpjSoYc8'];
const bySlug = new Map(specials.map((entry) => [entry.slug, entry]));

test('each of the four quiz cards is represented once in source data and static collection', () => {
  for (let i = 0; i < slugs.length; i++) {
    assert.equal(specials.filter((item) => item.slug === slugs[i]).length, 1);
    assert.equal(bySlug.get(slugs[i])?.youtubeId, ids[i]);
    assert.equal(collection.split('https://img.youtube.com/vi/' + ids[i] + '/hqdefault.jpg').length - 1, 1);
    assert.ok(collection.includes('/retro-specials/' + slugs[i] + '/'));
  }
});

test('each quiz recommends the other three without self-references or duplicates', () => {
  for (const slug of slugs) {
    const related = bySlug.get(slug).relatedSlugs;
    assert.equal(new Set(related).size, related.length, slug);
    assert.ok(related.length <= 4, slug);
    assert.ok(!related.includes(slug), slug);
    for (const other of slugs.filter((item) => item !== slug)) {
      assert.ok(related.includes(other), slug + ' must link to ' + other);
    }
  }
  assert.ok(generator.includes('current?.relatedSlugs'));
});

test('collection SEO metadata and structured data cover all four quiz platforms', () => {
  const title = collection.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  const description = collection.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? '';
  for (const name of ['C64', 'Amiga', 'Spectrum', 'Arcade']) {
    assert.ok(title.toLowerCase().includes(name.toLowerCase()), name);
    assert.ok(description.toLowerCase().includes(name.toLowerCase()), name);
  }
  const block = collection.match(/<script type="application\/ld\+json" data-ccg-category-static-schema>([\s\S]*?)<\/script>/)?.[1];
  const structured = JSON.parse(block);
  const page = structured['@graph'].find((obj) => obj['@type'] === 'CollectionPage');
  assert.ok(page);
  for (const name of ['Commodore 64', 'Amiga', 'ZX Spectrum', 'Arcade video games']) {
    assert.ok(page.about.some((obj) => obj.name === name), name);
  }
  assert.ok(collection.includes('rel="canonical"'));
});

test('video library and sitemap generators ingest the authoritative retro dataset', () => {
  assert.ok(videoLibrary.includes('dataPath: path.join(repoRoot, "data", "retro-specials.json")'));
  assert.ok(videoSitemap.includes('dataPath: path.join(repoRoot, "data", "retro-specials.json")'));
});
