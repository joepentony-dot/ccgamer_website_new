(function () {
  const BADGE_META = {
    FIRST_RATING: { label: 'First Rating', icon: '★', description: 'Awarded when you post your first game rating.' },
    RATED_10: { label: 'Rated 10', icon: '✦', description: 'Awarded after posting 10 game ratings.' },
    RATED_50: { label: 'Rated 50', icon: '✶', description: 'Awarded after posting 50 game ratings.' },
    FIRST_COMMENT: { label: 'First Comment', icon: '💬', description: 'Awarded when you post your first comment.' },
    COMMENTER_10: { label: 'Commenter 10', icon: '🗨', description: 'Awarded after posting 10 comments.' }
  };

  function esc(str) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.esc === 'function') {
      return window.ccgCommunityAuth.esc(str);
    }
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
  }

  function getBadgeMeta(code) {
    return BADGE_META[code] || {
      label: code,
      icon: '⬢',
      description: 'Community badge earned through activity.'
    };
  }

  async function fetchUserBadges(userId) {
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready || !userId) return [];

    await window.ccgSupabase.waitForAuth();
    const supabase = await window.ccgSupabase.getClient();
    const { data, error } = await supabase
      .from('user_badges')
      .select('badge_code,awarded_at')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  function renderBadges(badges, options) {
    const className = options && options.className ? options.className : 'ccg-badges';
    const emptyText = options && options.emptyText ? options.emptyText : 'No badges yet.';

    if (!badges || !badges.length) {
      return '<p class="ccg-community-muted">' + esc(emptyText) + '</p>';
    }

    return '<div class="' + esc(className) + '">' + badges.map(function (badge) {
      const code = String(badge.badge_code || '').trim();
      const meta = getBadgeMeta(code);
      const awardedAt = badge.awarded_at ? new Date(badge.awarded_at).toLocaleDateString() : 'Unknown date';
      return '' +
        '<span class="ccg-badge ccg-badge--icon" title="' + esc(meta.description + ' Earned: ' + awardedAt) + '" data-badge-code="' + esc(code) + '">' +
        '  <span class="ccg-badge__icon" aria-hidden="true">' + esc(meta.icon) + '</span>' +
        '  <span class="ccg-badge__label">' + esc(meta.label) + '</span>' +
        '</span>';
    }).join('') + '</div>';
  }

  async function awardEligibleBadge(userId) {
    if (!userId) return;
    await window.ccgSupabase.waitForAuth();
    const supabase = await window.ccgSupabase.getClient();
    await supabase.rpc('award_badge_if_eligible', { target_user_id: userId });
  }

  window.ccgCommunityBadges = window.ccgCommunityBadges || {};
  window.ccgCommunityBadges.getBadgeMeta = getBadgeMeta;
  window.ccgCommunityBadges.fetchUserBadges = fetchUserBadges;
  window.ccgCommunityBadges.renderBadges = renderBadges;
  window.ccgCommunityBadges.awardEligibleBadge = awardEligibleBadge;
})();
