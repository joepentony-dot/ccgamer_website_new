/* ============================================================
   CCG COMMUNITY — API HELPERS (Supabase)
   File: /resources/js/community/community-api.js

   Depends on global `supabase` already created by:
   - /js/ccg-supabase-config.js
   - /js/ccg-supabase-client.js

   No console spam; debug via ?debug=1
============================================================ */

const COMMUNITY_DEBUG = new URLSearchParams(location.search).has('debug');

function cLog(...args) {
  if (COMMUNITY_DEBUG) console.log('[ccg-community]', ...args);
}

export async function getAuthedUserOrNull() {
  if (!window.supabase) return null;
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error) cLog('getUser error', error);
  return user ?? null;
}

export async function getPublicProfileById(profileId) {
  const { data, error } = await supabase
    .from('profiles_public')
    .select('id, display_name, joined_at')
    .eq('id', profileId)
    .single();

  if (error) cLog('getPublicProfileById error', error);
  return { data, error };
}

export async function listComments(gameSlug, limit = 50) {
  const { data, error } = await supabase
    .from('game_comments')
    .select('id, profile_id, game_slug, content, created_at, updated_at')
    .eq('game_slug', gameSlug)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) cLog('listComments error', error);
  return { data: data ?? [], error };
}

export async function listLatestComments(limit = 25) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));

  const { data, error } = await supabase
    .from('latest_comments_public')
    .select('id, profile_id, game_slug, content, created_at, display_name')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) cLog('listLatestComments error', error);
  return { data: data ?? [], error };
}

export async function refreshMemberBadges(profileId) {
  if (!window.supabase || !profileId) return { data: [], error: null };

  try {
    const { data, error } = await supabase.rpc('award_badge_if_eligible', {
      target_user_id: profileId
    });

    if (error) {
      cLog('award_badge_if_eligible error', error);
      return { data: [], error };
    }

    document.dispatchEvent(new CustomEvent('ccg:member-badges-updated'));
    return { data: data ?? [], error: null };
  } catch (error) {
    cLog('award_badge_if_eligible exception', error);
    return { data: [], error };
  }
}

export async function addComment(profileId, gameSlug, content) {
  const payload = {
    profile_id: profileId,
    game_slug: gameSlug,
    content: String(content || '').trim()
  };

  const { data, error } = await supabase
    .from('game_comments')
    .insert(payload)
    .select('id, profile_id, game_slug, content, created_at')
    .single();

  if (error) cLog('addComment error', error);
  if (!error) {
    await logActivity('comment', gameSlug, { len: payload.content.length });
    await refreshMemberBadges(profileId);
  }
  return { data, error };
}

export async function softDeleteComment(commentId, profileId) {
  const { data, error } = await supabase
    .from('game_comments')
    .update({ is_deleted: true })
    .eq('id', commentId)
    .eq('profile_id', profileId);

  if (error) cLog('softDeleteComment error', error);
  if (!error) await logActivity('comment_delete', null, { id: commentId });
  return { data, error };
}

export async function getMyRating(profileId, gameSlug) {
  const { data, error } = await supabase
    .from('game_ratings')
    .select('rating, updated_at')
    .eq('profile_id', profileId)
    .eq('game_slug', gameSlug)
    .single();

  // if not found, Supabase returns error; treat as empty rating
  return { data: error ? null : data, error: null };
}

export async function upsertRating(profileId, gameSlug, rating) {
  const r = Number(rating);
  const payload = {
    profile_id: profileId,
    game_slug: gameSlug,
    rating: r
  };

  const { data, error } = await supabase
    .from('game_ratings')
    .upsert(payload, { onConflict: 'profile_id,game_slug' })
    .select('rating, updated_at')
    .single();

  if (error) cLog('upsertRating error', error);
  if (!error) {
    await logActivity('rating', gameSlug, { rating: r });
    await refreshMemberBadges(profileId);
  }
  return { data, error };
}

export async function getRatingStats(gameSlug) {
  const { data, error } = await supabase
    .from('game_ratings')
    .select('rating')
    .eq('game_slug', gameSlug);

  if (error) cLog('getRatingStats error', error);

  const ratings = (data ?? []).map((r) => r.rating).filter((n) => typeof n === 'number');
  const count = ratings.length;
  const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : 0;

  return { count, avg: Math.round(avg * 10) / 10 };
}

export async function listTopRated(limit = 25) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));

  const { data, error } = await supabase
    .from('game_rating_stats')
    .select('game_slug, avg_rating, rating_count')
    .order('avg_rating', { ascending: false })
    .order('rating_count', { ascending: false })
    .limit(safeLimit);

  if (error) cLog('listTopRated error', error);
  return { data: data ?? [], error };
}

export async function listActivity(limit = 50) {
  const { data, error } = await supabase
    .from('community_activity')
    .select('id, profile_id, activity_type, game_slug, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) cLog('listActivity error', error);
  return { data: data ?? [], error };
}

export async function logActivity(type, gameSlug = null, meta = {}) {
  // Uses SECURITY DEFINER RPC; only works when authed
  try {
    await supabase.rpc('log_activity', {
      p_activity_type: type,
      p_game_slug: gameSlug,
      p_meta: meta ?? {}
    });
  } catch (e) {
    cLog('logActivity rpc exception', e);
  }
}

export async function getAdminSummary() {
  const { data, error } = await supabase.rpc('get_admin_summary');

  if (error) cLog('getAdminSummary error', error);

  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error };
}

export async function unsubscribeByToken(token) {
  const normalizedToken = String(token || '').trim();
  const { data, error } = await supabase.rpc('unsubscribe_by_token', {
    p_token: normalizedToken
  });

  if (error) cLog('unsubscribeByToken error', error);
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error };
}
