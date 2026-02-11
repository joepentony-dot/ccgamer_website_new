import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';
const YOUTUBE_CREATOR_CHANNEL_ID = Deno.env.get('YOUTUBE_CREATOR_CHANNEL_ID') || '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function bestEffortMembersList(channelId: string) {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CREATOR_CHANNEL_ID) {
    return { ok: false, reason: 'youtube api not configured' };
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/members');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('mode', 'updates');
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return { ok: false, reason: `members.list denied (${response.status})` };
  }

  const payload = await response.json();
  const hit = (payload.items || []).find((item: any) => item?.snippet?.memberDetails?.channelId === channelId);
  if (!hit) return { ok: false, reason: 'member not found by API' };

  return {
    ok: true,
    level: hit?.snippet?.membershipsLevelName || 'yt_supporter'
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Missing auth token' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return json({ error: 'Invalid session' }, 401);

  const body = await req.json().catch(() => ({}));
  const channelId = String(body.channel_id || '').trim();
  const phraseCode = String(body.verification_code || '').trim();

  if (!channelId) return json({ error: 'channel_id is required' }, 400);

  const autoResult = await bestEffortMembersList(channelId);
  if (autoResult.ok) {
    await supabase.from('supporter_links').upsert({
      user_id: userData.user.id,
      youtube_channel_id: channelId,
      youtube_member_status: true,
      youtube_level: autoResult.level,
      youtube_manual_status: 'approved',
      youtube_last_sync: new Date().toISOString(),
      last_sync: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return json({ ok: true, mode: 'automatic', youtube_level: autoResult.level });
  }

  await supabase.from('supporter_links').upsert({
    user_id: userData.user.id,
    youtube_channel_id: channelId,
    youtube_member_status: false,
    youtube_manual_status: 'pending',
    youtube_manual_code: phraseCode || crypto.randomUUID().slice(0, 8),
    youtube_manual_requested_at: new Date().toISOString(),
    youtube_last_sync: new Date().toISOString(),
    last_sync: new Date().toISOString(),
    metadata_json: {
      youtube_fallback_reason: autoResult.reason,
      youtube_channel_id: channelId
    }
  }, { onConflict: 'user_id' });

  return json({ ok: true, mode: 'manual_review_required', reason: autoResult.reason });
});
