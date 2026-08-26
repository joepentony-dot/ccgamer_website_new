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
