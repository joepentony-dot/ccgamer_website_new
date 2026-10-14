import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { selectDescription, wordCount } = require('../scripts/build-game-description-enrichments.js');

test('uses games.json description when verified YouTube metadata is unavailable', () => {
  const description = "Ruff ’n’ Tumble is a superb 1994 Commodore Amiga run-and-gun platformer from Wunderkind Software and Renegade. Guide Ruff Rodgers through 16 action-packed stages filled with Tinheads, weapon upgrades, hidden routes and demanding platforming, all backed by detailed OCS/ECS graphics and a memorable Jason Page soundtrack.";
  assert.equal(wordCount(description), 45);
  const selected = selectDescription({ slug: 'ruff-n-tumble', description }, null, null);
  assert.equal(selected.sourceKind, 'games-json');
  assert.equal(selected.description, description);
});

test('keeps verified YouTube editorial copy ahead of the source fallback', () => {
  const youtubeDescription = Array.from({ length: 95 }, (_, index) => `word${index + 1}`).join(' ') + '.';
  const selected = selectDescription(
    {
      slug: 'verified-game',
      description: 'This source description is deliberately long enough to be a fallback. It contains enough additional wording to satisfy the minimum word requirement if the verified metadata ever disappears temporarily from the metadata store during a future publishing run. The fallback remains safe, finished copy for the archive.'
    },
    { description: youtubeDescription },
    null
  );
  assert.equal(selected.sourceKind, 'youtube');
});

test('rejects an unavailable video when the source description is also too short', () => {
  assert.throws(
    () => selectDescription({ slug: 'too-short', description: 'Too short.' }, null, null),
    /Add at least 40 words of finished source copy/
  );
});

test('five curated C64 editorial fixes survive repeatable YouTube enrichment', () => {
  const { curatedGameOverrides, selectDescription, wordCount } =
    require('../scripts/build-game-description-enrichments.js');
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const source = JSON.parse(readFileSync(join(import.meta.dirname, '../data/game-description-enrichments.json'), 'utf8'));
  for (const slug of ["asterix-and-the-magic-cauldron","barbarian-2-the-dungeon-of-drax","cybernoid","donald-ducks-playground","the-new-zealand-story"]) {
    const override = curatedGameOverrides[slug];
    assert.ok(override?.description, slug + ' must remain in the authoritative generator');
    assert.ok(wordCount(override.description) >= 90 && wordCount(override.description) <= 165, slug);
    assert.ok(override.sources.length >= 2, slug + ' must retain video and independent fact-check sources');
    const result = selectDescription(
      { slug, description: 'A generic source fallback must not be selected.' },
      { description: Array.from({ length: 105 }, () => 'unverified').join(' ') + '.' },
      override
    );
    assert.equal(result.sourceKind, 'override', slug);
    assert.equal(result.description, source.games[slug].description, slug + ' publisher source diverged');
    assert.deepEqual(override.sources, source.games[slug].sources, slug + ' citation links lost');
  }
});
