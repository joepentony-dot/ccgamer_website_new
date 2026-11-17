import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_LEADERBOARD_LIMIT, parseArenaReadRequest,
  projectArenaRows, unavailableArenaBoard
} from '../supabase/functions/ccg-arena-leaderboard/contract.mjs';

test('only supported query shapes can select all-time and challenges', () => {
  assert.deepEqual(parseArenaReadRequest({
    gameKey: 'c64-crossfire-atlantis', board: 'alltime'
  }), { gameKey: 'c64-crossfire-atlantis', board: 'alltime', challengeSlug: null });
  assert.deepEqual(parseArenaReadRequest({
    gameKey: 'c64-crossfire-atlantis', board: 'challenge', challengeSlug: 'crossfire-week-one'
  }), { gameKey: 'c64-crossfire-atlantis', board: 'challenge', challengeSlug: 'crossfire-week-one' });
  for (const invalid of [
    null, [], {}, 'crossfire',
    { gameKey: 'Crossfire', board: 'alltime' },
    { gameKey: 'c64-crossfire-atlantis', board: 'unknown' },
    { gameKey: 'c64-crossfire-atlantis', board: 'alltime', challengeSlug: 'anything' },
    { gameKey: 'c64-crossfire-atlantis', board: 'challenge' },
    { gameKey: '../ccq_weekly_attempts', board: 'alltime' },
    { gameKey: 'c64-crossfire-atlantis', board: 'challenge', challengeSlug: "x');drop table users;--" }
  ]) assert.equal(parseArenaReadRequest(invalid), null);
});
test('public records only include rank, player name, approved score and achieved date', () => {
  const items = projectArenaRows([{
    player_name: '  R\u0000etro Fan  ', score: 775,
    achieved_at: '2026-11-16T17:02:03Z',
    user_id: 'private-id', email: 'hidden@example.org',
    nonce_sha256: 'private-nonce', evidence: { private: 'never' }
  }]);
  assert.deepEqual(items, [{
    rank: 1, playerName: 'Retro Fan', score: 775,
    achievedAt: '2026-11-16T17:02:03.000Z'
  }]);
  assert.equal(JSON.stringify(items).includes('hidden@example.org'), false);
  assert.equal(JSON.stringify(items).includes('private-id'), false);
});
test('only verified shaped records are rendered, with five entries maximum', () => {
  const fake = Array.from({ length: 8 }, (_, i) => ({
    player_name: 'Test ' + i, score: 1000-i,
    achieved_at: '2026-11-16T17:02:03Z'
  }));
  assert.equal(projectArenaRows(fake).length, ARENA_LEADERBOARD_LIMIT);
  assert.deepEqual(projectArenaRows([
    { player_name: '  ', score: 100, achieved_at: '2026-11-16T17:00:00Z' },
    { player_name: 'Test', score: -1, achieved_at: '2026-11-16T17:00:00Z' },
    { player_name: 'Test', score: 25.1, achieved_at: '2026-11-16T17:00:00Z' },
    { player_name: 'Test', score: 900000000, achieved_at: '2026-11-16T17:00:00Z' },
    { player_name: 'Test', score: 10, achieved_at: 'not a date' }
  ]), []);
});
test('missing or unpublished games never produce invented score rows', () => {
  const request = parseArenaReadRequest({ gameKey: 'c64-crossfire-atlantis', board: 'alltime' });
  assert.deepEqual(unavailableArenaBoard(request), {
    ok: true, gameKey: 'c64-crossfire-atlantis', board: 'alltime',
    challengeSlug: null, status: 'unavailable', gameTitle: null,
    challengeTitle: null, records: []
  });
});
