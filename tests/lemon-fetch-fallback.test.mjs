import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  parseWaybackSnapshot,
  waybackAvailabilityUrl,
  waybackRawUrl
} = require('../scripts/lemon-fetch.js');

test('Lemon archive fallback asks Wayback for the exact original game URL', () => {
  assert.equal(
    waybackAvailabilityUrl('https://www.lemonamiga.com/game/road-rash'),
    'https://archive.org/wayback/available?url=https%3A%2F%2Fwww.lemonamiga.com%2Fgame%2Froad-rash'
  );
});

test('Lemon archive fallback accepts only an available HTTP 200 snapshot', () => {
  assert.deepEqual(
    parseWaybackSnapshot({
      archived_snapshots: {
        closest: {
          available: true,
          status: '200',
          timestamp: '20260901012345',
          url: 'http://web.archive.org/web/20260901012345/https://www.lemonamiga.com/game/road-rash'
        }
      }
    }),
    {
      url: 'http://web.archive.org/web/20260901012345/https://www.lemonamiga.com/game/road-rash',
      timestamp: '20260901012345'
    }
  );

  assert.equal(parseWaybackSnapshot({ archived_snapshots: {} }), null);
  assert.equal(parseWaybackSnapshot({ archived_snapshots: { closest: { available: true, status: '404', url: 'x' } } }), null);
});

test('Lemon archive fallback converts a Wayback capture to raw id_ HTML', () => {
  assert.equal(
    waybackRawUrl('http://web.archive.org/web/20260901012345/https://www.lemonamiga.com/game/road-rash'),
    'https://web.archive.org/web/20260901012345id_/https://www.lemonamiga.com/game/road-rash'
  );
  assert.equal(waybackRawUrl('https://example.com/not-wayback'), '');
});
