import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessGameEnrichment,
  auditAllC64,
  changedGamesForEnrichment,
  pendingSlugs
} from '../scripts/validate-new-game-enrichment.mjs';

const wonderBoy = {
  system: 'C64',
  slug: 'wonder-boy',
  title: 'Wonder Boy',
  year: 1987,
  lemon: ['https://www.lemon64.com/game/wonderboy'],
  credits: {
    publisher: ['Activision'],
    re_releaser: ['The Hit Squad']
  }
};

function state(overrides = {}) {
  return {
    pending: new Set(),
    reviewKeys: new Set(['c64:wonder-boy']),
    cachedLemon: new Set(['https://www.lemon64.com/game/wonderboy']),
    utaMap: {
      games: {
        'wonder-boy': {
          releases: [
            { archiveId: '6764' },
            { archiveId: '1677' }
          ]
        }
      }
    },
    utaManual: { entries: [] },
    ...overrides
  };
}

test('Wonder Boy passes only when magazine reviews and both confident UTA releases are available', () => {
  const result = assessGameEnrichment(wonderBoy, state());
  assert.deepEqual(result.issues, []);
});

test('known-publisher UTA year conflicts are release blockers instead of silent omissions', () => {
  const result = assessGameEnrichment(
    { ...wonderBoy, year: 1979 },
    state({
      utaMap: { games: { 'wonder-boy': { releases: [{ archiveId: '1677' }] } } },
      utaManual: {
        entries: [{
          gameSlug: 'wonder-boy',
          excludedCandidates: [{
            archiveId: '6764',
            publisherMatched: true,
            yearCompatible: false
          }]
        }]
      }
    })
  );

  assert.ok(result.issues.some((issue) => /rejected only by release-year data/i.test(issue)));
});

test('a title-matched UTA candidate with no confident mapping requires source verification', () => {
  const result = assessGameEnrichment(
    {
      system: 'C64',
      slug: 'example-game',
      title: 'Example Game',
      year: 1987,
      credits: { publisher: ['Example'], re_releaser: [] }
    },
    state({
      reviewKeys: new Set(['c64:example-game']),
      utaMap: { games: {} },
      utaManual: {
        entries: [{
          gameSlug: 'example-game',
          excludedCandidates: [{
            archiveId: '999',
            publisherMatched: false,
            yearCompatible: true
          }]
        }]
      }
    })
  );

  assert.ok(result.issues.some((issue) => /publisher\/re-release verification/i.test(issue)));
});

test('pending magazine discovery blocks completion when no verified review record exists', () => {
  const result = assessGameEnrichment(
    { ...wonderBoy, lemon: [] },
    state({
      reviewKeys: new Set(),
      pending: pendingSlugs(['wonder-boy'])
    })
  );
  assert.ok(result.issues.some((issue) => /magazine review source discovery is unresolved/i.test(issue)));
});

test('enrichment validator rechecks existing games when release identity changes', () => {
  const previous = [{ ...wonderBoy, year: 1979, lemon: [] }];
  const current = [wonderBoy];
  assert.deepEqual(changedGamesForEnrichment(previous, current).map((game) => game.slug), ['wonder-boy']);
});

test('full C64 audit reports unresolved UTA candidates without treating Amiga as tape-archive work', () => {
  const rows = auditAllC64(
    [
      wonderBoy,
      { system: 'AMIGA', slug: 'wonder-boy-amiga', title: 'Wonder Boy', year: 1989 }
    ],
    state({
      utaMap: { games: { 'wonder-boy': { releases: [{ archiveId: '1677' }] } } },
      utaManual: {
        entries: [{
          gameSlug: 'wonder-boy',
          excludedCandidates: [{
            archiveId: '6764',
            publisherMatched: true,
            yearCompatible: false
          }]
        }]
      }
    })
  );
  assert.deepEqual(rows.map((row) => row.slug), ['wonder-boy']);
});
