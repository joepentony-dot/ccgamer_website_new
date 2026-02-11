(function () {
  const ENDPOINTS = {
    rankings: 'supabase:public.community_rankings',
    badges: 'supabase:public.badge_definitions',
    challenges: 'supabase:public.challenges'
  };

  function esc(value) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.esc === 'function') return window.ccgCommunityAuth.esc(value);
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function classifyStatus(error, fallback) {
    const status = Number(error && (error.status || error.code || error.statusCode));
    if (status === 401) return 'Login required.';
    if (status === 403) return 'Permission denied.';
    if (status === 404) return 'Endpoint missing / not deployed.';
    if (status >= 500) return 'Server error.';
    return fallback || 'Unable to load data right now.';
  }

  function logEndpointFailure(endpoint, error) {
    console.error('[CCG-PERKS-PAGES] endpoint failure', {
      endpoint: endpoint,
      status: error && (error.status || error.code || error.statusCode) || 'unknown',
      bodySnippet: String(error && (error.details || error.message || error.hint) || '').slice(0, 300)
    });
  }

  function memberCard(row) {
    return '<article class="ccg-community-card ccg-perks-card">'
      + '<h3>@' + esc(row.username || 'member') + '</h3>'
      + '<p class="ccg-community-muted">REP ' + Number(row.rep_points || 0) + ' · Lvl ' + Number(row.rep_level || 1) + '</p>'
      + '<p>' + esc(row.level_title || 'New Recruit') + '</p>'
      + '<p class="ccg-supporter-flair ccg-supporter-flair--' + esc(row.supporter_level || 'none') + '">'
      + (row.supporter_level && row.supporter_level !== 'none' ? ('Supporter: ' + esc(row.supporter_level)) : 'Community member')
      + '</p>'
      + '</article>';
  }

  async function loadRankingsRows(supabase) {
    const primary = await supabase
      .from('community_rankings')
      .select('user_id,username,rep_points,rep_level,level_title,supporter_level')
      .order('rep_points', { ascending: false })
      .limit(24);

    if (!primary.error) return primary.data || [];

    const commentsRes = await supabase.from('comments').select('user_id');
    if (commentsRes.error) throw primary.error;

    const profilesRes = await supabase.from('profiles').select('id,username');
    if (profilesRes.error) throw profilesRes.error;

    const commentCount = {};
    (commentsRes.data || []).forEach(function (row) {
      const key = row.user_id;
      if (!key) return;
      commentCount[key] = (commentCount[key] || 0) + 1;
    });

    return (profilesRes.data || []).map(function (profile) {
      return {
        username: profile.username,
        rep_points: commentCount[profile.id] || 0,
        rep_level: Math.max(1, Math.floor((commentCount[profile.id] || 0) / 5) + 1),
        level_title: 'Community Member',
        supporter_level: 'none'
      };
    }).sort(function (a, b) {
      return Number(b.rep_points || 0) - Number(a.rep_points || 0);
    }).slice(0, 24);
  }

  async function renderRankings(supabase, mount) {
    mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">Loading rankings…</p></section>';
    try {
      const rows = await loadRankingsRows(supabase);
      mount.innerHTML = rows.length
        ? rows.map(memberCard).join('')
        : '<section class="ccg-community-card"><p class="ccg-community-muted">No rankings data yet.</p></section>';
    } catch (error) {
      logEndpointFailure(ENDPOINTS.rankings, error);
      mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">' + esc(classifyStatus(error, 'Unable to load rankings right now.')) + '</p></section>';
    }
  }

  async function loadBadgeRows(supabase) {
    const primary = await supabase
      .from('badge_definitions')
      .select('slug,name,description,category,rarity')
      .eq('active', true)
      .order('category', { ascending: true })
      .limit(120);

    if (!primary.error) return primary.data || [];

    const fallback = await supabase.from('user_badges').select('badge_key').limit(120);
    if (fallback.error) throw primary.error;

    const unique = new Map();
    (fallback.data || []).forEach(function (row) {
      const key = row.badge_key || row.badge_key;
      if (!key || unique.has(key)) return;
      unique.set(key, {
        slug: key,
        name: key.replace(/[-_]/g, ' '),
        description: 'Community achievement badge.',
        category: 'activity',
        rarity: 'common'
      });
    });
    return Array.from(unique.values());
  }

  async function renderBadges(supabase, mount) {
    mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">Loading badges…</p></section>';
    try {
      const rows = await loadBadgeRows(supabase);
      mount.innerHTML = rows.length ? rows.map(function (badge) {
        return '<article class="ccg-community-card ccg-perks-card">'
          + '<h3>' + esc(badge.name || badge.slug) + '</h3>'
          + '<p class="ccg-community-muted">' + esc((badge.category || 'activity') + ' · ' + (badge.rarity || 'common')) + '</p>'
          + '<p>' + esc(badge.description || '') + '</p>'
          + '</article>';
      }).join('') : '<section class="ccg-community-card"><p class="ccg-community-muted">Badge catalog is empty.</p></section>';
    } catch (error) {
      logEndpointFailure(ENDPOINTS.badges, error);
      mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">' + esc(classifyStatus(error, 'Unable to load badges right now.')) + '</p></section>';
    }
  }

  async function loadChallengesRows(supabase) {
    const primary = await supabase
      .from('challenges')
      .select('id,title,description,is_supporter_only,start_at,end_at,reward_json')
      .eq('active', true)
      .order('start_at', { ascending: false })
      .limit(32);

    if (!primary.error) return primary.data || [];
    return [];
  }

  async function renderChallenges(supabase, mount, userId) {
    mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">Loading challenge board…</p></section>';
    try {
      const rows = await loadChallengesRows(supabase);
      if (!rows.length) {
        mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">No active challenges right now.</p></section>';
        return;
      }

      let progressById = {};
      if (userId) {
        const progressRes = await supabase
          .from('user_challenge_progress')
          .select('challenge_id,progress_json,completed_at')
          .eq('user_id', userId);
        if (!progressRes.error) {
          (progressRes.data || []).forEach(function (row) { progressById[row.challenge_id] = row; });
        }
      }

      mount.innerHTML = rows.map(function (challenge) {
        const progress = progressById[challenge.id];
        return '<article class="ccg-community-card ccg-perks-card">'
          + '<h3>' + esc(challenge.title) + '</h3>'
          + '<p class="ccg-community-muted">' + (challenge.is_supporter_only ? 'Supporter-only bonus lane' : 'Open challenge') + '</p>'
          + '<p>' + esc(challenge.description || '') + '</p>'
          + '<p class="ccg-community-muted">Rewards: ' + esc(JSON.stringify(challenge.reward_json || {})) + '</p>'
          + '<p class="ccg-community-muted">Progress: ' + esc(progress ? JSON.stringify(progress.progress_json || {}) : 'Not started') + '</p>'
          + '</article>';
      }).join('');
    } catch (error) {
      logEndpointFailure(ENDPOINTS.challenges, error);
      mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">' + esc(classifyStatus(error, 'Unable to load challenge board right now.')) + '</p></section>';
    }
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
