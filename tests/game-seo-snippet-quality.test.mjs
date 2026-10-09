import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildGameSeoPreview } from '../admin/js/content-publisher-source-preflight.mjs';

const require = createRequire(import.meta.url);
const snippet = require('../js/ccg-game-seo-snippet.js');
const routes = require('../scripts/prepare-seo-game-routes.js');

test('canonical renderer and admin use exactly the same snippet builder', () => {
  const game = {
    title: 'Fire King',
    system: 'C64',
    year: 1989,
    publisher: 'Strategic Studies Group',
    description: 'Fire King is a 1989 Commodore 64 fantasy action adventure from Australian developer Micro Forté, published by Strategic Studies Group. Explore dungeons and towns.'
  };
  const actual = snippet.buildSnippet(game, game.title);
  const preview = buildGameSeoPreview({ ...game, slug: 'fire-king' }, snippet);
  assert.equal(actual, routes.buildRuntimeDescription(game, game.title));
  assert.equal(preview.description, actual);
  assert.equal(preview.url, 'https://www.cheekycommodoregamer.co.uk/games/fire-king/');
  assert.equal(preview.title, 'Fire King (1989) – C64 | Review, Screens & History');
  assert.ok(actual.endsWith('.'));
  assert.ok(actual.length <= 155);
  assert.ok(actual.includes('fantasy action adventure'));
});

test('removes a redundant editorial heading and does not cut a sentence short', () => {
  const game = {
    title: '20 Tons',
    system: 'C64',
    year: 1985,
    publisher: '64 Tape Computing',
    description: '️ 20 Tons (1985) – Commodore 64 Puzzle Action Maze Challenge Released in 1985 by Chris Newcombe and published by Argus Press Software. Guide the vehicle through the puzzle maze.'
  };
  const output = snippet.buildSnippet(game, game.title);
  assert.match(output, /Released in 1985 by Chris Newcombe/);
  assert.doesNotMatch(output, /Puzzle Action Maze Challenge/);
  assert.doesNotMatch(output, /…|\.\.\.$/);
  assert.ok(output.length <= 155);
});

test('oversized source sentence receives a truthful factual fallback rather than an ellipsis', () => {
  const game = {
    title: 'Kingpin',
    system: 'AMIGA',
    year: 1995,
    publisher: 'Team17',
    description: 'Kingpin is an arcade bowling game that includes an extensive series of interconnected mechanics and lengthy descriptive clauses carefully assembled to exceed the allocated SEO text limit without creating any complete sentence earlier in the paragraph, which forces the generator to prefer verified release facts rather than chopping a clause in the middle.'
  };
  const actual = snippet.buildSnippet(game, game.title);
  assert.equal(actual, 'Kingpin (1995) is an Amiga game published by Team17.');
  assert.doesNotMatch(actual, /…|\.\.\./);
});

test('preview never turns a malformed slug into a clickable canonical URL', () => {
  const preview = buildGameSeoPreview({ title: 'Demo', system: 'C64', year: 1986, slug: '../secret', description: '' }, snippet);
  assert.ok(preview.warnings.some((warning) => warning.includes('slug')));
  assert.equal(preview.url, 'https://www.cheekycommodoregamer.co.uk/games/…/');
});

test('generated descriptions are limited to a complete sentence for social sharing and search', () => {
  for (const game of [
    { title: 'Zorro', system: 'C64', year: 1985, publisher: 'Datasoft', description: 'Zorro is an action adventure on Commodore 64. The player searches for clues.' },
    { title: 'Another World', system: 'AMIGA', year: 1991, publisher: 'Delphine Software', description: 'A large science fiction adventure with cinematic animation and puzzles.' },
    { title: 'Very Long Game Title of the Greatest Fantastic Adventure', system: 'C64', year: 1984, publisher: 'Archive Records', description: '' }
  ]) {
    const output = snippet.buildSnippet(game, game.title);
    assert.ok(output.length <= 155, game.title);
    assert.match(output, /[.!?]$/, game.title);
    assert.doesNotMatch(output, /…|\.\.\./, game.title);
  }
});
