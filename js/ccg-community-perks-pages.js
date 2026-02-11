(function () {
  function esc(value) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.esc === 'function') return window.ccgCommunityAuth.esc(value);
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function memberCard(row) {
    return '<article class="ccg-community-card">'
      + '<h3>@' + esc(row.username || 'member') + '</h3>'
      + '<p class="ccg-community-muted">REP ' + Number(row.rep_points || 0) + ' · Lvl ' + Number(row.rep_level || 1) + '</p>'
      + '<p>' + esc(row.level_title || 'New Recruit') + '</p>'
      + '<p class="ccg-supporter-flair ccg-supporter-flair--' + esc(row.supporter_level || 'none') + '">'
      + (row.supporter_level && row.supporter_level !== 'none' ? ('Supporter: ' + esc(row.supporter_level)) : 'Community member')
      + '</p>'
      + '</article>';
  }

  async function renderRankings(supabase, mount) {
    const { data, error } = await supabase
      .from('community_member_overview')
      .select('username,rep_points,rep_level,level_title,supporter_level')
      .order('rep_points', { ascending: false })
      .limit(24);

    if (error) {
      mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">Unable to load rankings right now.</p></section>';
      return;
    }

    mount.innerHTML = (data || []).map(memberCard).join('') || '<section class="ccg-community-card"><p class="ccg-community-muted">No rankings data yet.</p></section>';
  }

  async function renderBadges(supabase, mount) {
    const { data, error } = await supabase
      .from('badge_definitions')
      .select('slug,name,description,category,rarity')
      .eq('active', true)
      .order('category', { ascending: true })
      .limit(120);

    if (error) {
      mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">Unable to load badges right now.</p></section>';
      return;
    }

    mount.innerHTML = (data || []).map(function (badge) {
      return '<article class="ccg-community-card">'
        + '<h3>' + esc(badge.name || badge.slug) + '</h3>'
        + '<p class="ccg-community-muted">' + esc((badge.category || 'activity') + ' · ' + (badge.rarity || 'common')) + '</p>'
        + '<p>' + esc(badge.description || '') + '</p>'
        + '</article>';
    }).join('') || '<section class="ccg-community-card"><p class="ccg-community-muted">Badge catalog is empty.</p></section>';
  }

  async function renderChallenges(supabase, mount, userId) {
    const { data, error } = await supabase
      .from('challenges')
      .select('id,title,description,is_supporter_only,start_at,end_at,reward_json')
      .eq('active', true)
      .order('start_at', { ascending: false })
      .limit(32);

    if (error) {
      mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">Unable to load challenge board right now.</p></section>';
      return;
    }

    let progressById = {};
    if (userId) {
      const progressRes = await supabase
        .from('user_challenge_progress')
        .select('challenge_id,progress_json,completed_at')
        .eq('user_id', userId);
      (progressRes.data || []).forEach(function (row) { progressById[row.challenge_id] = row; });
    }

    mount.innerHTML = (data || []).map(function (challenge) {
      const progress = progressById[challenge.id];
      return '<article class="ccg-community-card">'
        + '<h3>' + esc(challenge.title) + '</h3>'
        + '<p class="ccg-community-muted">' + (challenge.is_supporter_only ? 'Supporter-only bonus lane' : 'Open challenge') + '</p>'
        + '<p>' + esc(challenge.description) + '</p>'
        + '<p class="ccg-community-muted">Rewards: ' + esc(JSON.stringify(challenge.reward_json || {})) + '</p>'
        + '<p class="ccg-community-muted">Progress: ' + esc(progress ? JSON.stringify(progress.progress_json || {}) : 'Not started') + '</p>'
        + '</article>';
    }).join('') || '<section class="ccg-community-card"><p class="ccg-community-muted">No active challenges.</p></section>';
  }

  async function init() {
    const supabase = await window.ccgSupabase.getClient();
    const context = await window.ccgSupabase.getCurrentUserContext();

    const rankingsRoot = document.getElementById('ccg-community-rankings-root');
    const badgesRoot = document.getElementById('ccg-community-badges-root');
    const challengesRoot = document.getElementById('ccg-community-challenges-root');

    if (rankingsRoot) await renderRankings(supabase, rankingsRoot);
    if (badgesRoot) await renderBadges(supabase, badgesRoot);
    if (challengesRoot) await renderChallenges(supabase, challengesRoot, context && context.user ? context.user.id : null);
  }

  document.addEventListener('DOMContentLoaded', function () {
    init().catch(function (error) {
      console.error('[CCG-PERKS-PAGES]', error);
    });
  });
})();
