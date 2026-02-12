(function () {
  function esc(str) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.esc === 'function') {
      return window.ccgCommunityAuth.esc(str);
    }
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
  }

  async function getSupabaseClient() {
    await window.ccgSupabase.waitForAuth();
    return window.ccgSupabase.getClient();
  }

  async function fetchBadgeDefinitions(supabaseClient) {
    const supabase = supabaseClient || await getSupabaseClient();
    let res = await supabase.from('badges').select('id,slug,name,description,icon,category,is_active,created_at').eq('is_active', true);
    if (res.error) {
      res = await supabase.from('badge_definitions').select('id,slug,name,description,icon,category,active,created_at').eq('active', true);
    }
    return (res.data || []).map(function (row) {
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category || 'activity',
        is_active: row.is_active !== undefined ? row.is_active : row.active !== false,
        created_at: row.created_at
      };
    });
  }

  async function fetchUserBadges(userId, supabaseClient) {
    if (!userId) return [];
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) return [];

    const supabase = supabaseClient || await getSupabaseClient();
    let userBadgeRes = await supabase.from('user_badges').select('id,user_id,badge_id,awarded_at,awarded_by,earned_at').eq('user_id', userId).order('awarded_at', { ascending: false });
    if (userBadgeRes.error) {
      userBadgeRes = await supabase.from('user_badges').select('id,user_id,badge_id,earned_at').eq('user_id', userId).order('earned_at', { ascending: false });
    }
    if (userBadgeRes.error) return [];

    const defs = await fetchBadgeDefinitions(supabase);
    const byId = {};
    defs.forEach(function (badge) { byId[badge.id] = badge; });

    return (userBadgeRes.data || []).map(function (row) {
      return {
        id: row.id,
        user_id: row.user_id,
        badge_id: row.badge_id,
        awarded_at: row.awarded_at || row.earned_at,
        awarded_by: row.awarded_by || 'system',
        badges: byId[row.badge_id] || null
      };
    }).filter(function (row) { return !!row.badges; });
  }

  async function awardBadge(userId, slug, awardedBy) {
    if (!userId || !slug) return;
    const supabase = await getSupabaseClient();
    let badgeRes = await supabase.from('badges').select('id').eq('slug', slug).maybeSingle();
    if (badgeRes.error || !badgeRes.data) {
      badgeRes = await supabase.from('badge_definitions').select('id').eq('slug', slug).maybeSingle();
    }
    if (!badgeRes.data || !badgeRes.data.id) return;

    await supabase.from('user_badges').upsert({
      user_id: userId,
      badge_id: badgeRes.data.id,
      awarded_by: awardedBy || 'system'
    }, { onConflict: 'user_id,badge_id' });
  }

  function renderBadge(row) {
    var badge = row && row.badges ? row.badges : {};
    var icon = badge.icon || '🏅';
    var name = badge.name || 'Badge';
    var description = badge.description || name;
    var category = badge.category || 'activity';
    var title = name + ' • ' + category + ' • ' + description;
    return '<span class="ccg-badge ccg-badge--icon" title="' + esc(title) + '"><span class="ccg-badge__icon" aria-hidden="true">' + esc(icon) + '</span><span class="ccg-badge__label">' + esc(name) + '</span></span>';
  }

  function renderBadgeIcons(rows, limit) {
    var list = (rows || []).slice(0, typeof limit === 'number' ? limit : rows.length);
    if (!list.length) return '<span class="ccg-community-muted">No badges yet</span>';
    return '<div class="ccg-badges ccg-badges--mini">' + list.map(function (row) {
      var badge = row && row.badges ? row.badges : {};
      var icon = badge.icon || '🏅';
      var name = badge.name || 'Badge';
      return '<span class="ccg-badge ccg-badge--icon-only" title="' + esc(name) + '">' + esc(icon) + '</span>';
    }).join('') + '</div>';
  }

  function renderBadges(rows, options) {
    var className = options && options.className ? options.className : 'ccg-badges';
    var emptyText = options && options.emptyText ? options.emptyText : 'No badges yet';
    if (!rows || !rows.length) return '<p class="ccg-community-muted">' + esc(emptyText) + '</p>';
    return '<div class="' + esc(className) + '">' + rows.map(renderBadge).join('') + '</div>';
  }


  async function awardCommentBadges() { return; }
  async function awardRatingBadges() { return; }

  window.ccgCommunityBadges = window.ccgCommunityBadges || {};
  window.ccgCommunityBadges.awardBadge = awardBadge;
  window.ccgCommunityBadges.fetchBadgeDefinitions = fetchBadgeDefinitions;
  window.ccgCommunityBadges.fetchUserBadges = fetchUserBadges;
  window.ccgCommunityBadges.renderBadge = renderBadge;
  window.ccgCommunityBadges.renderBadges = renderBadges;
  window.ccgCommunityBadges.renderBadgeIcons = renderBadgeIcons;
  window.ccgCommunityBadges.awardCommentBadges = awardCommentBadges;
  window.ccgCommunityBadges.awardRatingBadges = awardRatingBadges;
})();
