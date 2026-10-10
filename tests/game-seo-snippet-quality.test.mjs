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

test('recovers a game-specific factual clause after a long introductory phrase', () => {
  const cases = [
    {
      title: '1942',
      year: 1986,
      system: 'C64',
      publisher: 'Elite',
      description: "1942 (1986) – Commodore 64 WWII Vertical Shoot Em Up Arcade Classic Originally developed by Capcom and brought to the Commodore 64 in 1986 by Elite Systems, 1942 is a vertically scrolling shoot 'em up set against the backdrop of World War II. Further discussion.",
      expected: "1942 is a vertically scrolling shoot 'em up set against the backdrop of World War II."
    },
    {
      title: 'Kingpin',
      year: 1995,
      system: 'AMIGA',
      publisher: 'Team17',
      description: 'Kingpin: Arcade Sports Bowling (1995) – Commodore Amiga Sports Sim Released in 1995 by Team17 for the Commodore Amiga, Kingpin: Arcade Sports Series Bowling is a dedicated ten-pin bowling simulation designed for both solo players and multiplayer groups. You can control multiple bowlers.',
      expected: 'Kingpin: Arcade Sports Series Bowling is a dedicated ten-pin bowling simulation designed for both solo players and multiplayer groups.'
    },
    {
      title: 'Chuckie Egg',
      year: 1984,
      system: 'C64',
      publisher: 'A&F Software',
      description: "Chuckie Egg (1984) – Commodore 64 Platform Action Released in 1984 by A&F Software for the Commodore 64 with the conversion handled by Sean Townsend and Martin Webb, Chuckie Egg is a fast-paced platform game based on Nigel Alderton's popular ZX Spectrum original. Climb ladders.",
      expected: "Chuckie Egg is a fast-paced platform game based on Nigel Alderton's popular ZX Spectrum original."
    },
    {
      title: 'Dune',
      year: 1992,
      system: 'AMIGA',
      publisher: 'Virgin Games',
      description: "Dune (1992) – Commodore Amiga Strategy Adventure Released in 1992 by Virgin Interactive and developed by Cryo Interactive, Dune is a bold adventure-strategy hybrid set in Frank Herbert's science-fiction universe. Explore Arrakis.",
      expected: "Dune is a bold adventure-strategy hybrid set in Frank Herbert's science-fiction universe."
    }
  ];
  for (const game of cases) {
    const actual = snippet.buildSnippet(game, game.title);
    assert.equal(actual, game.expected, game.title);
    assert.equal(actual, routes.buildRuntimeDescription(game, game.title));
    assert.equal(buildGameSeoPreview({ ...game, slug: game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }, snippet).description, actual);
    assert.ok(actual.length <= 155);
    assert.doesNotMatch(actual, /…|\.\.\.$/);
  }
});

test('does not salvage an arbitrary dangling clause without the game title as subject', () => {
  const game = {
    title: 'Kingpin',
    year: 1995,
    system: 'AMIGA',
    publisher: 'Team17',
    description: 'After a very long introduction about the history of computers, the developers also included numerous mechanics that cannot be summarised without missing key context or losing the point of the original sentence in its entirety.'
  };
  assert.equal(snippet.buildSnippet(game, game.title), 'Kingpin (1995) is an Amiga game published by Team17.');
});

test('admin warns about generic fallback SEO snippets without blocking a valid route', () => {
  const source = {
    title: '1942',
    system: 'C64',
    year: 1986,
    publisher: 'Elite',
    slug: '1942',
    description: 'A long promotional introduction without a complete sentence that fits the search snippet limit and without a factual subject clause, followed much later by other sentences. The historical detail stays in the editorial description.'
  };
  const preview = buildGameSeoPreview(source, snippet);
  assert.equal(preview.url, 'https://www.cheekycommodoregamer.co.uk/games/1942/');
  assert.equal(preview.description, snippet.buildSnippet(source, source.title));
  assert.ok(preview.warnings.some((message) => message.includes('basic release details')));
  assert.ok(preview.description.endsWith('.'));
});

test('admin keeps specific factual game snippets free of fallback warnings', () => {
  const source = {
    title: 'Fire King',
    system: 'C64',
    year: 1989,
    publisher: 'Strategic Studies Group',
    slug: 'fire-king',
    description: 'Fire King is a Commodore 64 action RPG developed by Micro Forté and published by Strategic Studies Group.'
  };
  const preview = buildGameSeoPreview(source, snippet);
  assert.match(preview.description, /action RPG/);
  assert.equal(preview.warnings.length, 0);
});

test('three-dot punctuation inside a long Super Pipeline sentence is not a completed SEO sentence', () => {
  const game = {
    title: 'Super Pipeline',
    slug: 'super-pipeline',
    system: 'C64',
    year: 1983,
    publisher: 'Taskset',
    description: 'Super Pipeline (1983) – Commodore 64 Puzzle-Action Classic Released in 1983 by Taskset and developed by Andy Walker, Pipeline... also known as Super Pipeline, is a distinctive puzzle-action game about keeping an industrial pipe network operating under constant threat.'
  };
  const result = snippet.buildSnippet(game, game.title);
  assert.equal(result, 'Super Pipeline (1983) is a Commodore 64 game published by Taskset.');
  assert.ok(result.endsWith('.'));
  assert.doesNotMatch(result, /\.\.\.$|…$/);
  assert.equal(buildGameSeoPreview(game, snippet).description, result);
});

test('rejects an editorial sentence ending in three dots even when short enough', () => {
  const result = snippet.firstCompleteSentence('A lengthy historic description that was abruptly cut off...', 155);
  assert.equal(result, '');
});
