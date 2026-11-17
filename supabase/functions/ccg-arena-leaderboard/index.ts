/**
 * CCG High Score Arena — read-only, NOT DEPLOYED.
 * Future public API for approved all-time and time-limited records only.
 *
 * SECURITY: intentionally uses the Supabase PUBLIC key so all reads obey
 * public Row Level Security policies, including the hidden "pilot" game gate.
 * Never switch this to a service-role client, allow browser writes, or
 * query ccg_arena_attempts / private player records.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import {
  ARENA_LEADERBOARD_LIMIT,
  parseArenaReadRequest,
  projectArenaRows,
  unavailableArenaBoard
} from './contract.mjs';

const ORIGINS = new Set([
  'https://www.cheekycommodoregamer.co.uk',
  'https://cheekycommodoregamer.co.uk'
]);
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const PUBLIC_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
  Deno.env.get('SUPABASE_ANON_KEY') || '';
const MAX_BODY_BYTES = 1024;

function cors(request: Request) {
  const supplied = request.headers.get('origin') || '';
  const origin = ORIGINS.has(supplied)
    ? supplied : 'https://www.cheekycommodoregamer.co.uk';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}
function respond(req: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(req),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return respond(req, 405, { ok: false, error: 'Method not allowed' });
  const origin = req.headers.get('origin') || '';
  if (origin && !ORIGINS.has(origin)) return respond(req, 403, { ok: false, error: 'Origin not allowed' });
  const declaredSize = Number(req.headers.get('content-length') || 0);
  if (!Number.isFinite(declaredSize) || declaredSize > MAX_BODY_BYTES) {
    return respond(req, 413, { ok: false, error: 'Request too large' });
  }

  let input: unknown;
  try {
    const body = await req.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return respond(req, 413, { ok: false, error: 'Request too large' });
    }
    input = JSON.parse(body);
  } catch {
    return respond(req, 400, { ok: false, error: 'Invalid request' });
  }
  const query = parseArenaReadRequest(input);
  if (!query) return respond(req, 400, { ok: false, error: 'Invalid leaderboard selection' });
  if (!SUPABASE_URL || !PUBLIC_KEY) return respond(req, 503, { ok: false, error: 'Leaderboard unavailable' });

  // Public-key access only. RLS decides whether a game/challenge is exposed;
  // the server deliberately returns no placeholder names or invented scores.
  const db = createClient(SUPABASE_URL, PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-CCG-Arena': 'public-read-only' } }
  });
  const game = await db.from('ccg_arena_games')
    .select('game_key,title').eq('game_key', query.gameKey).maybeSingle();
  if (game.error) return respond(req, 503, { ok: false, error: 'Leaderboard unavailable' });
  if (!game.data) return respond(req, 200, unavailableArenaBoard(query));

  let challenge: { id: string; title: string } | null = null;
  if (query.board === 'challenge') {
    const selected = await db.from('ccg_arena_challenges')
      .select('id,title').eq('game_key', query.gameKey)
      .eq('slug', query.challengeSlug).maybeSingle();
    if (selected.error) return respond(req, 503, { ok: false, error: 'Leaderboard unavailable' });
    if (!selected.data) return respond(req, 200, unavailableArenaBoard(query, 'no-published-challenge'));
    challenge = selected.data;
  }

  let list = db.from(query.board === 'alltime'
    ? 'ccg_arena_alltime_public'
    : 'ccg_arena_challenge_public')
    .select('player_name,score,achieved_at');
  if (query.board === 'alltime') list = list.eq('game_key', query.gameKey);
  else list = list.eq('challenge_id', challenge!.id).eq('game_key', query.gameKey);

  const result = await list.order('score', { ascending: false })
    .order('achieved_at', { ascending: true }).limit(ARENA_LEADERBOARD_LIMIT);
  if (result.error) return respond(req, 503, { ok: false, error: 'Leaderboard unavailable' });

  return respond(req, 200, {
    ok: true,
    status: 'available',
    gameKey: query.gameKey,
    gameTitle: game.data.title,
    board: query.board,
    challengeSlug: query.challengeSlug,
    challengeTitle: challenge?.title ?? null,
    records: projectArenaRows(result.data)
  });
});
