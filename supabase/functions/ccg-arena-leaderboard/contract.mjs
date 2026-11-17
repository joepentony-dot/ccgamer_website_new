/**
 * CCG High Score Arena: reusable, untrusted-input read contract.
 *
 * The caller must only query PUBLIC approved projections under RLS.
 * No personal records, raw attempts or scores typed by a browser are read here.
 * Adding another game requires a separate verified game profile and active
 * ccg_arena_games row; this module never decides scoring eligibility.
 */
export const ARENA_LEADERBOARD_LIMIT = 5;
const GAME_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,78})[a-z0-9]$/;
const CHALLENGE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{2,98})[a-z0-9]$/;
const MAX_SCORE = 99999999;

export function parseArenaReadRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { gameKey, board, challengeSlug } = value;
  if (typeof gameKey !== 'string' || !GAME_KEY_PATTERN.test(gameKey)) return null;
  if (board !== 'alltime' && board !== 'challenge') return null;
  if (board === 'alltime' && challengeSlug !== undefined && challengeSlug !== null) return null;
  if (board === 'challenge' &&
      (typeof challengeSlug !== 'string' || !CHALLENGE_SLUG_PATTERN.test(challengeSlug))) return null;
  return Object.freeze({
    gameKey,
    board,
    challengeSlug: board === 'challenge' ? challengeSlug : null
  });
}

export function projectArenaRows(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  // Never pass upstream rows through to the public response. Explicitly copy
  // ONLY the displayed name, score and time; no account or evidence fields.
  const records = [];
  for (const raw of rawRows.slice(0, ARENA_LEADERBOARD_LIMIT)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    if (typeof raw.player_name !== 'string' ||
        !Number.isSafeInteger(raw.score) ||
        raw.score < 0 || raw.score > MAX_SCORE) continue;
    const name = raw.player_name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
    if (!name || name.length > 64) continue;
    if (typeof raw.achieved_at !== 'string' ||
        !Number.isFinite(Date.parse(raw.achieved_at))) continue;
    records.push(Object.freeze({
      rank: records.length + 1,
      playerName: name,
      score: raw.score,
      achievedAt: new Date(raw.achieved_at).toISOString()
    }));
  }
  return records;
}

export function unavailableArenaBoard(request, reason = 'unavailable') {
  return Object.freeze({
    ok: true,
    gameKey: request.gameKey,
    board: request.board,
    challengeSlug: request.challengeSlug,
    status: reason,
    gameTitle: null,
    challengeTitle: null,
    records: []
  });
}
