import test from 'node:test';
import assert from 'node:assert/strict';
import discovery from '../scripts/discover-new-lemon-source.js';

const {
  candidateUrlsForGame,
  gamesForDiscovery,
  newlyAddedGames,
  sourceMatchesGame,
  uniqueCandidateMatch
} = discovery;

test('builds a conservative Lemon64 candidate from a new C64 game slug', () => {
  const urls = candidateUrlsForGame({
    title: 'Speed King',
    slug: 'speed-king',
    system: 'C64',
    year: 1985,
    credits: { publisher: ['Digital Integration'] }
  });
  assert.deepEqual(urls, ['https://www.lemon64.com/game/speed-king']);
});

test('builds a Lemon Amiga candidate and does not cross platforms', () => {
  const urls = candidateUrlsForGame({
    title: 'Premiere',
    slug: 'premiere',
    system: 'AMIGA',
    year: 1992,
    credits: { publisher: ['Core Design'] }
  });
  assert.deepEqual(urls, ['https://www.lemonamiga.com/game/premiere']);
});

test('does not guess a source when an explicit Lemon URL already exists', () => {
  const urls = candidateUrlsForGame({
    title: 'Speed King',
    slug: 'speed-king',
    system: 'C64',
    lemon: ['https://www.lemon64.com/game/speed-king']
  });
  assert.deepEqual(urls, []);
});

test('discovers only records newly added relative to the base revision', () => {
  const previous = [
    { id: 'speed_king', slug: 'speed-king', title: 'Speed King' }
  ];
  const current = [
    ...previous,
    { id: 'premiere', slug: 'premiere', title: 'Premiere' }
  ];
  assert.deepEqual(newlyAddedGames(previous, current).map((game) => game.slug), ['premiere']);
});

test('retries unresolved games on later publishing runs without broadening discovery', () => {
  const previous = [
    { id: 'speed_king', slug: 'speed-king', title: 'Speed King' },
    { id: 'premiere', slug: 'premiere', title: 'Premiere' }
  ];
  const current = [...previous];
  assert.deepEqual(
    gamesForDiscovery(previous, current, ['premiere']).map((game) => game.slug),
    ['premiere']
  );
  assert.deepEqual(gamesForDiscovery(previous, current, []).map((game) => game.slug), []);
});

test('combines new games and pending retries without duplicate discovery', () => {
  const previous = [
    { id: 'speed_king', slug: 'speed-king', title: 'Speed King' }
  ];
  const premiere = { id: 'premiere', slug: 'premiere', title: 'Premiere' };
  const current = [...previous, premiere];
  assert.deepEqual(
    gamesForDiscovery(previous, current, ['premiere']).map((game) => game.slug),
    ['premiere']
  );
});

test('accepts a fetched source only when title, platform, year and publisher match', () => {
  const game = {
    title: 'Speed King',
    slug: 'speed-king',
    system: 'C64',
    year: 1985,
    credits: { publisher: ['Digital Integration'] }
  };
  const exactHtml = `
    <html><head>
      <meta property="og:title" content="Speed King">
      <link rel="canonical" href="https://www.lemon64.com/game/speed-king">
    </head><body><table>
      <tr><td>Released:</td><td>1985</td></tr>
      <tr><td>Publisher:</td><td><a href="/games/list_company.php?id=1">Digital Integration</a></td></tr>
    </table></body></html>`;
  const wrongReleaseHtml = exactHtml.replace('1985</td>', '1986</td>');
  const wrongPublisherHtml = exactHtml.replace('Digital Integration</a>', 'Mastertronic</a>');
  const wrongPlatformHtml = exactHtml.replaceAll('lemon64.com', 'lemonamiga.com');

  assert.equal(sourceMatchesGame(game, exactHtml, 'lemon64.com'), true);
  assert.equal(sourceMatchesGame(game, wrongReleaseHtml, 'lemon64.com'), false);
  assert.equal(sourceMatchesGame(game, wrongPublisherHtml, 'lemon64.com'), false);
  assert.equal(sourceMatchesGame(game, wrongPlatformHtml, 'lemon64.com'), false);
});

test('accepts inferred discovery only when exactly one verified candidate remains', () => {
  const one = { canonical: 'https://www.lemon64.com/game/example' };
  assert.equal(uniqueCandidateMatch([one]), one);
  assert.equal(uniqueCandidateMatch([]), null);
  assert.equal(uniqueCandidateMatch([one, { canonical: 'https://www.lemon64.com/game/example-alt' }]), null);
});
