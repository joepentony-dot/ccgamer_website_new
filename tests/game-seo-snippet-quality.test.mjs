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

test('Omega Race recovers the verified C64 conversion clause from its editorial introduction', () => {
  const game = {
    title: 'Omega Race',
    slug: 'omega-race',
    system: 'C64',
    year: 1982,
    publisher: 'Commodore',
    description: 'Omega Race (1982) – Commodore 64 Vector Arcade Shooter Classic Originally developed by Ron Haliburton and released by Midway in 1981, Omega Race arrived on the Commodore 64 in 1982 as a remarkably faithful home conversion of the arcade original. It delivers fast, precision-based shooting action.'
  };
  const expected = 'Omega Race arrived on the Commodore 64 in 1982 as a remarkably faithful home conversion of the arcade original.';
  assert.equal(snippet.buildSnippet(game, game.title), expected);
  assert.equal(routes.buildRuntimeDescription(game, game.title), expected);
  assert.equal(buildGameSeoPreview(game, snippet).description, expected);
  assert.ok(expected.length <= 155);
  assert.doesNotMatch(expected, /…|\.\.\.$/);
});

test('publisher initials do not cut off Gauntlet SEO descriptions', () => {
  const game = {
    title: 'Gauntlet',
    slug: 'gauntlet',
    system: 'C64',
    year: 1986,
    publisher: 'US Gold',
    description: 'Gauntlet (1986) – Commodore 64 Co-Op Dungeon Crawling Arcade Legend Released in 1986 and brought to the Commodore 64 by U. S. Gold, Gauntlet delivers a faithful home version of Atari’s iconic arcade dungeon crawler. You choose from four classic heroes.'
  };
  const expected = 'Released in 1986 and brought to the Commodore 64 by U. S. Gold, Gauntlet delivers a faithful home version of Atari’s iconic arcade dungeon crawler.';
  const actual = snippet.buildSnippet(game, game.title);
  assert.equal(actual, expected);
  assert.equal(actual, routes.buildRuntimeDescription(game, game.title));
  assert.equal(buildGameSeoPreview(game, snippet).description, actual);
  assert.ok(actual.length <= 155);
  assert.doesNotMatch(actual, /^Gauntlet: Released in 1986 and brought to the Commodore 64 by U\.$/);
});

test('single-letter initials inside a factual sentence are not false sentence endings', () => {
  const complete = 'The 1986 Commodore 64 game was published by U.S. Gold and features colourful arcade action.';
  assert.equal(snippet.firstCompleteSentence(complete + ' Another factual sentence.', 155), complete);
  const spaced = 'The 1986 Commodore 64 game was published by U. S. Gold and features colourful arcade action.';
  assert.equal(snippet.firstCompleteSentence(spaced + ' Another factual sentence.', 155), spaced);
});

test('single-letter mode labels and H.E.R.O. titles retain real sentence boundaries', () => {
  const endings = [
    {
      title: 'Modes',
      slug: 'modes',
      description: 'The three difficulty settings in Modes each have a choice of mode A. Another mode is available.',
      expected: 'The three difficulty settings in Modes each have a choice of mode A.'
    },
    {
      title: 'H.E.R.O.',
      slug: 'h-e-r-o',
      description: 'A wide range of home-computer games includes the Commodore 64 title H.E.R.O. Another classic follows.',
      expected: 'A wide range of home-computer games includes the Commodore 64 title H.E.R.O.'
    },
    {
      title: 'H.E.R.O.',
      slug: 'h-e-r-o',
      description: 'A wide range of home-computer games includes H.E.R.O. as a playable Commodore 64 title. More details follow.',
      expected: 'A wide range of home-computer games includes H.E.R.O. as a playable Commodore 64 title.'
    }
  ];
  for (const game of endings) {
    assert.equal(snippet.firstCompleteSentence(game.description, 155), game.expected, game.title);
    assert.equal(snippet.buildSnippet(game, game.title), game.expected, game.title);
    assert.equal(routes.buildRuntimeDescription(game, game.title), game.expected);
    assert.equal(buildGameSeoPreview(game, snippet).description, game.expected);
  }
});

test('terminal U.S. and Chase H.Q. acronyms do not consume the next sentence', () => {
  const cases = [
    {
      title: 'US Test',
      slug: 'us-test',
      description: 'The US Test game was first sold to American players in the U.S. Players elsewhere bought it later.',
      expected: 'The US Test game was first sold to American players in the U.S.'
    },
    {
      title: 'Chase H.Q.',
      slug: 'chase-h-q',
      description: 'Retro gaming enthusiasts still talk about the arcade conversion Chase H.Q. Another racing game followed.',
      expected: 'Retro gaming enthusiasts still talk about the arcade conversion Chase H.Q.'
    }
  ];
  for (const game of cases) {
    assert.equal(snippet.firstCompleteSentence(game.description, 155), game.expected);
    assert.equal(snippet.buildSnippet(game, game.title), game.expected);
    assert.equal(routes.buildRuntimeDescription(game, game.title), game.expected);
    assert.equal(buildGameSeoPreview(game, snippet).description, game.expected);
  }
});

test('publisher and author multi-letter initials retain their complete factual sentence', () => {
  for (const text of [
    'The Commodore 64 game was published by U.S. Gold and includes arcade action.',
    'The Commodore 64 game was published by U. S. Gold and includes arcade action.',
    'The fantasy game was written by J. R. R. Tolkien and sold worldwide.'
  ]) {
    assert.equal(snippet.firstCompleteSentence(text + ' Another sentence follows.', 155), text);
  }
});

test('Bubble Bobble factual game subject recovers game-specific meta and social summary', () => {
  const game = {
    title: 'Bubble Bobble',
    slug: 'bubble-bobble',
    year: 1987,
    system: 'C64',
    publisher: 'Firebird',
    description: 'Bubble Bobble (1987) – Commodore 64 Arcade Platform Classic with Co-Op Magic Originally developed by Taito in 1986 and expertly brought to the Commodore 64 in 1987 by Software Creations and Firebird, Bubble Bobble stars Bub and Bob—two bubble-blowing dragons on a quest to rescue their girlfriends from the Cave of Monsters. The adventure unfolds across 100 single-screen stages.'
  };
  const expected = 'Bubble Bobble stars Bub and Bob—two bubble-blowing dragons on a quest to rescue their girlfriends from the Cave of Monsters.';
  const actual = snippet.buildSnippet(game, game.title);
  assert.equal(actual, expected);
  assert.equal(actual, routes.buildRuntimeDescription(game, game.title));
  assert.equal(buildGameSeoPreview(game, snippet).description, expected);
  assert.ok(actual.length <= 155);
  assert.doesNotMatch(actual, /…|\.\.\.$/);
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
    description: 'A long promotional introduction without a complete sentence that fits the search snippet limit and without a factual subject clause continues for hundreds of characters without a full stop or any later independent sourced gameplay sentence that could safely be promoted into a factual search description without fabricating the missing mechanics and specific game details.'
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

test('new initial-led sentences do not join preceding mode labels', () => {
  const cases = [
    {
      title: 'Mode Trial', slug: 'mode-trial', system: 'C64', year: 1987,
      description: 'Mode Trial is a Commodore 64 game in which players select difficulty A. B. Smith designed another mode.',
      expected: 'Mode Trial is a Commodore 64 game in which players select difficulty A.'
    },
    {
      title: 'Modes', slug: 'modes', system: 'C64', year: 1987,
      description: 'Modes offers several Commodore 64 difficulty settings including mode B. C. Jones introduced a further setting.',
      expected: 'Modes offers several Commodore 64 difficulty settings including mode B.'
    }
  ];
  for (const game of cases) {
    assert.equal(snippet.firstCompleteSentence(game.description, 155), game.expected);
    assert.equal(snippet.buildSnippet(game, game.title), game.expected);
    assert.equal(routes.buildRuntimeDescription(game, game.title), game.expected);
    assert.equal(buildGameSeoPreview(game, snippet).description, game.expected);
  }
});

test('all 666 enriched game records prefer sourced game-specific snippets over generic boilerplate', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const root = join(import.meta.dirname, '..');
  const games = JSON.parse(readFileSync(join(root, 'games/games.json'), 'utf8'));
  const payload = JSON.parse(readFileSync(join(root, 'data/game-description-enrichments.json'), 'utf8'));
  const enrichments = payload.games || payload;
  assert.equal(games.length, 666, 'Unexpected catalogue change; review before regenerating metadata');

  let generic = 0;
  let complete = 0;
  const pending = [];
  for (const game of games) {
    const enriched = enrichments[game.slug]?.description || game.description;
    const record = { ...game, description: enriched };
    const description = snippet.buildSnippet(record, game.title);
    assert.ok(description.length <= 155, game.slug);
    assert.match(description, /[.!?]$/, game.slug);
    assert.doesNotMatch(description, /…|\.\.\.$/, game.slug);
    assert.equal(routes.buildRuntimeDescription(record, game.title), description, game.slug);

    const isBasic = description === snippet.buildSnippet({ ...record, description: '' }, game.title);
    if (isBasic) {
      generic++;
      pending.push(game.slug);
    } else {
      complete++;
    }
  }
  const permittedSourceFallbacks = new Set([
    'asterix-and-the-magic-cauldron',
    'barbarian-2-the-dungeon-of-drax',
    'blagger-goes-to-hollywood',
    'cybernoid',
    'davy-king-of-the-wild-frontier',
    'desert-strike',
    'donald-ducks-playground',
    'eye-of-the-beholder-2-the-legend-of-darkmoon',
    'force-seven',
    'he-man-and-the-masters-of-the-universe-the-ilearth-stone',
    'he-man-and-the-masters-of-the-universe-the-movie',
    'hunchback-at-the-olympics',
    'indiana-jones-and-the-fate-of-atlantis',
    'danny-sullivans-indy-heat',
    'insects-in-space',
    'antheads-it-came-from-the-desert-2',
    'monkey-island-2-lechucks-revenge',
    'montezumas-revenge',
    'mountie-micks-death-ride',
    'mr-robot-and-his-robot-factory',
    'the-new-zealand-story',
    'nightbreed-the-interactive-movie',
    'teenage-mutant-hero-turtles-the-coin-op',
    'tir-na-nog'
  ]);
  assert.deepEqual(pending.filter((slug) => !permittedSourceFallbacks.has(slug)), [],
    'A game not in the previously audited source backlog fell back to generic metadata');
  // Rich editorial text is present, but some source sentences still require
  // manual fact-checked editing; never invent detail to force this to zero.
  assert.ok(complete >= 642, 'Specific source snippets regressed: ' + pending.join(', '));
  assert.ok(generic <= 24, 'More basic snippets than reviewed threshold: ' + pending.join(', '));
});

test('recover complete later gameplay facts from an oversized enriched introduction', () => {
  for (const game of [
    {
      title: 'B.C. Bill', slug: 'bc-bill', system: 'C64', year: 1984,
      description: 'A detailed historical introduction about development, publication and reception that deliberately exceeds the permitted search-description space while remaining a single oversized sentence and cannot be shortened without dropping essential claims. You take on the role of Bill, a caveman protecting his family in a dangerous stone-age world. The controls are simple.'
    },
    {
      title: '720 Degrees', slug: '720-degrees', system: 'C64', year: 1987,
      description: 'This unusually lengthy piece of source history introduces the original arcade design and publisher while deliberately exceeding the entire search snippet allocation, preventing any complete opening sentence being used for metadata. You skate through Skate City completing timed arcade challenges. More discussion.'
    }
  ]) {
    const actual = snippet.buildSnippet(game, game.title);
    assert.match(actual, /(?:Bill, a caveman|Skate City)/);
    assert.equal(actual, routes.buildRuntimeDescription(game, game.title));
    assert.equal(buildGameSeoPreview(game, snippet).description, actual);
    assert.ok(actual.length <= 155, game.title);
  }
});

test('editorial fallback does not assert contradictory dates or fabricate absent facts', () => {
  const game = {
    title: 'Example Racer', slug: 'example-racer', system: 'C64', year: 1989,
    publisher: 'Example',
    description: 'A long single-sentence introduction that continues beyond the available search snippet length and gives no safe grammatical clause to extract even though it provides an extensive overview of publisher credits and game development for this example computer game. Released on another system in 1987, the game had unrelated hardware. The remaining brief fragment is incomplete'
  };
  assert.equal(snippet.buildSnippet(game, game.title),
    'Example Racer (1989) is a Commodore 64 game published by Example.');
});

test('Batman: The Movie and RoboCop C64 catalogue years match owner-approved 1989', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const records = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'games/games.json'), 'utf8'));
  const batman = records.find((game) => game.slug === 'batman-the-movie');
  const robocop = records.find((game) => game.slug === 'robocop');
  assert.equal(batman.year, 1989);
  assert.match(batman.description, /1989 Commodore 64 adaptation of Tim Burton's Batman film/);
  assert.doesNotMatch(batman.description, /released by Ocean in 1986|rather than a specific movie plot/);
  assert.equal(robocop.year, 1989);
});

test('C64 names and spaced acronyms survive initials without swallowing actual sentence boundaries', () => {
  const examples = [
    [
      'Released in 1984 by Firebird and developed by Kevin A. Moughtin, Booty features pirate ship rooms. More info.',
      'Released in 1984 by Firebird and developed by Kevin A. Moughtin, Booty features pirate ship rooms.'
    ],
    [
      'The soldier is an elite U. S. Army Ranger operating deep behind enemy lines. Other tasks follow.',
      'The soldier is an elite U. S. Army Ranger operating deep behind enemy lines.'
    ],
    [
      'The Commodore 64 game features M. A. D. label credits before describing dungeon combat. Other games follow.',
      'The Commodore 64 game features M. A. D. label credits before describing dungeon combat.'
    ],
    [
      'The long-running Commodore 64 game is called H. E. R. O. Another classic game follows.',
      'The long-running Commodore 64 game is called H. E. R. O.'
    ],
    [
      'The Commodore 64 game requires players to choose difficulty type B. Another difficulty can be selected.',
      'The Commodore 64 game requires players to choose difficulty type B.'
    ],
    [
      'The Commodore 64 arcade conversion is known as Chase H.Q. Another notable game followed.',
      'The Commodore 64 arcade conversion is known as Chase H.Q.'
    ],
    [
      'The Commodore 64 game was originally launched in the U.S. Players in Europe found another edition.',
      'The Commodore 64 game was originally launched in the U.S.'
    ]
  ];
  for (const [source, expected] of examples) {
    assert.equal(snippet.firstCompleteSentence(source, 155), expected);
  }
});

test('all existing enriched game snippets avoid accidental standalone initials and doubled stops', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const root = join(import.meta.dirname, '..');
  const games = JSON.parse(readFileSync(join(root, 'games/games.json'), 'utf8'));
  const payload = JSON.parse(readFileSync(join(root, 'data/game-description-enrichments.json'), 'utf8'));
  const enriched = payload.games || payload;
  assert.equal(games.length, 666);
  for (const game of games) {
    const record = { ...game, description: enriched[game.slug]?.description || game.description };
    const actual = snippet.buildSnippet(record, game.title);
    assert.ok(actual.length <= 155, game.slug);
    assert.doesNotMatch(actual, /(?:^|\s)[A-Z]\.$/, game.slug + ' has a broken initial');
    assert.doesNotMatch(actual, /\.\.$/, game.slug + ' has doubled punctuation');
    assert.equal(actual, routes.buildRuntimeDescription(record, game.title), game.slug);
  }
});

test('editorial source platform checks reject new C64-versus-Amiga misattribution', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const root = join(import.meta.dirname, '..');
  const games = JSON.parse(readFileSync(join(root, 'games/games.json'), 'utf8'));
  const payload = JSON.parse(readFileSync(join(root, 'data/game-description-enrichments.json'), 'utf8'));
  const enriched = payload.games || payload;
  // These pre-existing source defects MUST be corrected before output
  // regeneration. Listing them here does not mark their copy as approved.
  const knownEditorialDefects = new Set([
    'the-immortal',
    'santas-xmas-caper',
    'shadow-of-the-beast'
  ]);
  const unexpected = [];
  for (const game of games) {
    const description = String(enriched[game.slug]?.description || game.description || '')
      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    const saysC64 = /\b(?:Commodore 64|C64)\b/i.test(description);
    const saysAmiga = /\bAmiga\b/i.test(description);
    const isAmiga = /amiga/i.test(String(game.system || game.platform || ''));
    const conflict = isAmiga ? saysC64 && !saysAmiga : saysAmiga && !saysC64;
    if (conflict && !knownEditorialDefects.has(game.slug)) {
      unexpected.push({ slug: game.slug, system: game.system, opening: description });
    }
  }
  assert.deepEqual(unexpected, [], 'New source descriptions must not misidentify the game platform');
});

test('prefers documented gameplay objectives over shorter editorial filler', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const root = join(import.meta.dirname, '..');
  const catalogue = JSON.parse(readFileSync(join(root, 'games/games.json'), 'utf8'));
  const data = JSON.parse(readFileSync(join(root, 'data/game-description-enrichments.json'), 'utf8'));
  const enrichments = data.games || data;
  const examples = new Map([
    ['olli-and-lissa', /Olli must therefore collect eight ingredients/],
    ['up-n-down', /collect ten coloured flags/],
    ['doriath', /16×16 screen map/],
    ['the-castles-of-dr-creep', /conveyor belts, force fields, switches/],
    ['dino-eggs', /build and maintain fire to keep Mama Dino at bay/],
    ['cadaver', /push barrels, collect keys, trigger mechanisms/],
    ['up-up-and-away', /careful balloon control as the screen scrolls/],
    ['dan-dare-iii-the-escape', /side-view shooting and multi-directional scrolling/]
  ]);
  for (const [slug, expected] of examples) {
    const game = catalogue.find((item) => item.slug === slug);
    assert.ok(game, slug);
    const editorial = enrichments[slug]?.description || game.description;
    const record = { ...game, description: editorial };
    const result = snippet.buildSnippet(record, game.title);
    assert.match(result, expected, slug);
    assert.equal(result, routes.buildRuntimeDescription(record, game.title), slug);
    assert.equal(result, buildGameSeoPreview(record, snippet).description, slug);
    assert.ok(result.length <= 155 && /[.!?]$/.test(result), slug);
  }
});

test('mechanic-specific descriptions for Gribbly Joe Blade and Stifflip', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const root = join(import.meta.dirname, '..');
  const games = JSON.parse(readFileSync(join(root, 'games/games.json'), 'utf8'));
  const data = JSON.parse(readFileSync(join(root, 'data/game-description-enrichments.json'), 'utf8'));
  const enriched = data.games || data;
  // All three details were checked against source documentation for the C64.
  const examples = [
    ['gribblys-day-out', /hops and levitates.*psychic bubble shots/],
    ['joe-blade-2', /rescue kidnapped civilians.*gangs/],
    ['stifflip-and-co', /Rubbertronic Ray.*properties of rubber/],
    // Keep the two existing stronger summaries that a broad scoring penalty
    // mistakenly replaced in the research-only candidate.
    ['nightbreed-the-action-game', /side-scrolling platforming with combat and light exploration/],
    ['the-lost-patrol', /strategic map of Vietnam/]
  ];
  for (const [slug, matcher] of examples) {
    const game = games.find((row) => row.slug === slug);
    assert.ok(game, slug);
    // The Lost Patrol is the Amiga entry; the three authored C64 gameplay
    // checks and Nightbreed action port remain tied to their C64 catalogue.
    const isAmiga = /amiga/i.test(game.system || game.platform || '');
    assert.equal(isAmiga, slug === 'the-lost-patrol', slug);
    const record = { ...game, description: enriched[slug]?.description || game.description };
    const description = snippet.buildSnippet(record, game.title);
    assert.match(description, matcher, slug);
    assert.equal(description, routes.buildRuntimeDescription(record, game.title), slug);
    assert.equal(buildGameSeoPreview(record, snippet).description, description, slug);
    assert.ok(description.length <= 155, slug);
  }
});

test('one-time Batman correction preserves all other catalogue bytes in both PWA guards', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const root = join(import.meta.dirname, '..');
  const current = readFileSync(join(root, 'games/games.json'), 'utf8');
  const target = JSON.parse(current).find((game) => game.slug === 'batman-the-movie');
  assert.equal(target.year, 1989);
  const originalDescription = "Batman: The Movie is a Commodore 64 action-adventure game released by Ocean in 1986. Inspired by the iconic film character rather than a specific movie plot, the game mixes side-scrolling action with puzzle elements. It became one of Ocean's most recognisable licensed releases.";
  const changedDescription = "Batman: The Movie is Ocean Software's 1989 Commodore 64 adaptation of Tim Burton's Batman film. Its five stages mix platform action, Batmobile driving, puzzles and Batwing sequences.";
  assert.equal(target.description, changedDescription);
  const anchor = '"slug": "batman-the-movie"';
  const start = current.indexOf(anchor);
  const end = current.indexOf('\n  },', start);
  assert.ok(start > 0 && end > start);
  const currentSection = current.slice(start, end);
  assert.equal(currentSection.split('"year": 1989').length, 2);
  assert.equal(currentSection.split('"description": ' + JSON.stringify(changedDescription)).length, 2);
  const previousSection = currentSection
    .replace('"year": 1989', '"year": 1986')
    .replace('"description": ' + JSON.stringify(changedDescription),
      '"description": ' + JSON.stringify(originalDescription));
  const original = current.slice(0, start) + previousSection + current.slice(end);

  for (const path of ['scripts/audit-installable-pwa.js', 'scripts/audit-visible-pwa-install.js']) {
    const source = readFileSync(join(root, path), 'utf8');
    const marker = 'function isApprovedBatman1989CatalogueCorrection(relativePath) {';
    const begin = source.indexOf(marker);
    const finish = source.indexOf('\n}\n', begin);
    assert.ok(begin > 0 && finish > begin, path + ' missing one-time gate');
    const body = source.slice(begin, finish + 2);
    const check = (baseline, candidate, relativePath = 'games/games.json') =>
      new Function('readGitFile', 'read',
        body + '\nreturn isApprovedBatman1989CatalogueCorrection;')(
          (ref, file) => ref === 'origin/main' && file === 'games/games.json' ? baseline : null,
          () => candidate
        )(relativePath);

    assert.equal(check(original, current), true, path + ' rejects exact approved migration');
    assert.equal(check(original, current + '\n'), false, path + ' ignores incidental byte changes');
    assert.equal(check(original, current.replace('"year": 1989', '"year": 1990')),
      false, path + ' ignores other year changes');
    assert.equal(check(current, current), false, path + ' remains open after main is corrected');
    assert.equal(check(original, original), false, path + ' should not match unchanged source');
    assert.equal(check(original, current, 'index.html'), false, path + ' must protect intro');
  }
});

