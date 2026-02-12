(function () {
  const RARITY_CLASS = {
    common: 'ccg-badge-common',
    rare: 'ccg-badge-rare',
    epic: 'ccg-badge-epic',
    legendary: 'ccg-badge-legendary'
  };

  const RARITY_ICON = {
    common: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡'
  };

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

  async function awardBadge(userId, slug) {
    if (!userId || !slug) return;
    const supabase = await getSupabaseClient();
    const { data: badge } = await supabase
      .from('badges')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!badge || !badge.id) return;

    await supabase.from('user_badges').upsert({
      user_id: userId,
      badge_id: badge.id
    }, { onConflict: 'user_id,badge_id' });
  }

  async function fetchUserBadges(userId) {
    if (!userId) return [];
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) return [];

    const supabase = await getSupabaseClient();
    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select('badge_id, awarded_at, badges(name, slug, icon, category, rarity, points)')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false });

    if (error) return [];
    return userBadges || [];
  }

  function rarityClass(rarity) {
    const key = String(rarity || 'common').toLowerCase();
    return RARITY_CLASS[key] || RARITY_CLASS.common;
  }

  function rarityIcon(rarity, explicitIcon) {
    if (explicitIcon) return explicitIcon;
    const key = String(rarity || 'common').toLowerCase();
    return RARITY_ICON[key] || RARITY_ICON.common;
  }

  function renderBadge(badgeRow) {
    const badge = badgeRow && badgeRow.badges ? badgeRow.badges : {};
    const rarity = String(badge.rarity || 'common').toLowerCase();
    const className = rarityClass(rarity);
    const icon = rarityIcon(rarity, badge.icon);
    const name = badge.name || 'Badge';
    const title = name + ' · ' + rarity.toUpperCase() + ' · ' + Number(badge.points || 0) + ' pts';

    return '' +
      '<span class="ccg-badge ccg-badge--rarity ' + esc(className) + '" title="' + esc(title) + '">' +
      '  <span class="ccg-badge__icon" aria-hidden="true">' + esc(icon) + '</span>' +
      '  <span class="ccg-badge__label">' + esc(name) + '</span>' +
      '</span>';
  }

  function renderBadgeIcons(rows, limit) {
    const list = (rows || []).slice(0, typeof limit === 'number' ? limit : rows.length);
    if (!list.length) return '<span class="ccg-community-muted">No badges yet</span>';

    return '<div class="ccg-badges ccg-badges--mini">' + list.map(function (row) {
      const badge = row && row.badges ? row.badges : {};
      const rarity = String(badge.rarity || 'common').toLowerCase();
      const className = rarityClass(rarity);
      const icon = rarityIcon(rarity, badge.icon);
      const name = badge.name || 'Badge';
      return '<span class="ccg-badge ccg-badge--icon-only ' + esc(className) + '" title="' + esc(name) + '">' + esc(icon) + '</span>';
    }).join('') + '</div>';
  }

  function renderBadges(badges, options) {
    const className = options && options.className ? options.className : 'ccg-badges';
    const emptyText = options && options.emptyText ? options.emptyText : 'No badges yet';

    if (!badges || !badges.length) {
      return '<p class="ccg-community-muted">' + esc(emptyText) + '</p>';
    }

    return '<div class="' + esc(className) + '">' + badges.map(renderBadge).join('') + '</div>';
  }

  async function getActionCount(userId, tableName) {
    const supabase = await getSupabaseClient();
    const { count } = await supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return Number(count || 0);
  }

  async function awardCommentBadges(userId) {
    const count = await getActionCount(userId, 'comments');
    if (count >= 1) await awardBadge(userId, 'first_comment');
    if (count >= 10) await awardBadge(userId, 'comment_10');
    if (count >= 50) await awardBadge(userId, 'comment_50');
  }

  async function awardRatingBadges(userId) {
    const count = await getActionCount(userId, 'ratings');
    if (count >= 1) await awardBadge(userId, 'first_rating');
    if (count >= 25) await awardBadge(userId, 'critic_25');
  }

  window.ccgCommunityBadges = window.ccgCommunityBadges || {};
  window.ccgCommunityBadges.awardBadge = awardBadge;
  window.ccgCommunityBadges.fetchUserBadges = fetchUserBadges;
  window.ccgCommunityBadges.renderBadge = renderBadge;
  window.ccgCommunityBadges.renderBadges = renderBadges;
  window.ccgCommunityBadges.renderBadgeIcons = renderBadgeIcons;
  window.ccgCommunityBadges.awardCommentBadges = awardCommentBadges;
  window.ccgCommunityBadges.awardRatingBadges = awardRatingBadges;
})();
