(function () {
  const HUB_LIMITS = {
    trending: 8,
    topRated: 10,
    discussed: 10,
    activity: 15,
    members: 10,
    minRatingCount: 5
  };

  const state = {
    unavailableMessageShown: false
  };

  function esc(value) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.esc === 'function') {
      return window.ccgCommunityAuth.esc(value);
    }
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = toDate(value);
    if (!date) return 'Unknown time';
    return date.toLocaleString();
  }

  function nowMinusDays(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  function gameLink(slug) {
    return '/games/' + encodeURIComponent(slug || '') + '/';
  }

  function profileLink(username) {
    return '/community/profile.html?u=' + encodeURIComponent(username || '');
  }

  function setSectionState(id, html) {
    const mount = document.getElementById(id);
    if (!mount) return;
    mount.innerHTML = html;
  }

  function renderUnavailableSections(message) {
    const copy = '<p class="ccg-community-muted">' + esc(message) + '</p>';
    setSectionState('ccg-hub-trending', copy);
    setSectionState('ccg-hub-top-rated', copy);
    setSectionState('ccg-hub-discussed', copy);
    setSectionState('ccg-hub-latest-activity', copy);
    setSectionState('ccg-hub-top-members', copy);
  }

  function renderGameTiles(list, emptyText) {
    if (!list.length) return '<p class="ccg-community-muted">' + esc(emptyText) + '</p>';

    return '<div class="mini-game-tile-grid">' + list.map(function (item) {
      return '' +
        '<a class="mini-game-tile" href="' + gameLink(item.game_slug) + '">' +
        '  <h3 class="mini-game-tile__title">' + esc(item.game_slug || 'Unknown game') + '</h3>' +
        '  <dl class="mini-game-tile__stats">' +
        '    <div><dt>Avg</dt><dd>' + (Number(item.avg_rating || 0) ? Number(item.avg_rating).toFixed(2) : '—') + '</dd></div>' +
        '    <div><dt>Ratings</dt><dd>' + Number(item.rating_count || 0) + '</dd></div>' +
        '    <div><dt>Comments</dt><dd>' + Number(item.comment_count || 0) + '</dd></div>' +
        '  </dl>' +
        '</a>';
    }).join('') + '</div>';
  }

  function renderActivityRows(rows) {
    if (!rows.length) return '<p class="ccg-community-muted">No recent activity yet. Be the first to post.</p>';

    return '<ul class="activity-list">' + rows.map(function (row) {
      const typeLabel = row.type === 'badge'
        ? 'Badge'
        : row.type === 'rating'
          ? 'Rating'
          : 'Comment';

      const actor = row.username
        ? '<a href="' + profileLink(row.username) + '">@' + esc(row.username) + '</a>'
        : '<span>Community member</span>';

      let details = '';
      if (row.type === 'badge') {
        details = 'earned <span class="ccg-badge ccg-badge--icon">🏆 ' + esc(row.badge_key || 'Badge') + '</span>';
      } else if (row.type === 'rating') {
        details = 'rated <a href="' + gameLink(row.game_slug) + '">' + esc(row.game_slug || 'a game') + '</a> · ' + Number(row.rating || 0) + '/10';
      } else {
        details = 'commented on <a href="' + gameLink(row.game_slug) + '">' + esc(row.game_slug || 'a game') + '</a>';
      }

      return '' +
        '<li class="activity-row">' +
        '  <span class="activity-row__type">' + typeLabel + '</span>' +
        '  <div class="activity-row__body">' + actor + ' ' + details + '</div>' +
        '  <time datetime="' + esc(row.created_at || '') + '">' + esc(formatDate(row.created_at)) + '</time>' +
        '</li>';
    }).join('') + '</ul>';
  }

  function renderMembers(rows) {
    if (!rows.length) return '<p class="ccg-community-muted">Top members are still warming up.</p>';

    return '<ul class="member-list">' + rows.map(function (row) {
      return '' +
        '<li class="member-row">' +
        '  <div class="member-row__main">' +
        '    <a href="' + profileLink(row.username) + '" class="member-row__name">@' + esc(row.username || 'user') + '</a>' +
        '    <span class="member-row__points">' + Number(row.points || 0) + ' pts</span>' +
        '  </div>' +
        '  <div class="member-row__meta">' +
        '    <span>' + Number(row.comment_count || 0) + ' comments</span>' +
        '    <span>' + Number(row.rating_count || 0) + ' ratings</span>' +
        '    <span>' + Number(row.badge_count || 0) + ' badges</span>' +
        '  </div>' +
        (row.badges && row.badges.length
          ? '<div class="ccg-badges ccg-badges--mini">' + row.badges.slice(0, 5).map(function (badge) {
            return '<span class="ccg-badge">' + esc(badge) + '</span>';
          }).join('') + '</div>'
          : '') +
        '</li>';
    }).join('') + '</ul>';
  }

  function aggregateByGame(ratings, comments) {
    const map = new Map();

    ratings.forEach(function (row) {
      const slug = row.game_slug;
      if (!slug) return;
      const item = map.get(slug) || { game_slug: slug, rating_sum: 0, rating_count: 0, comment_count: 0 };
      item.rating_sum += Number(row.rating || 0);
      item.rating_count += 1;
      map.set(slug, item);
    });

    comments.forEach(function (row) {
      const slug = row.game_slug;
      if (!slug) return;
      const item = map.get(slug) || { game_slug: slug, rating_sum: 0, rating_count: 0, comment_count: 0 };
      item.comment_count += 1;
      map.set(slug, item);
    });

    return Array.from(map.values()).map(function (item) {
      return {
        game_slug: item.game_slug,
        avg_rating: item.rating_count ? item.rating_sum / item.rating_count : 0,
        rating_count: item.rating_count,
        comment_count: item.comment_count,
        score: item.rating_count + (item.comment_count * 2) + (item.rating_count ? (item.rating_sum / item.rating_count) : 0)
      };
    });
  }

  async function fallbackTopRated(supabase, minCount) {
    const response = await supabase.from('game_ratings').select('game_slug,rating').limit(8000);
    if (response.error) throw response.error;

    const grouped = aggregateByGame(response.data || [], []);
    return grouped
      .filter(function (item) { return item.rating_count >= minCount; })
      .sort(function (a, b) {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      })
      .slice(0, HUB_LIMITS.topRated);
  }

  async function fallbackMostDiscussed(supabase, days) {
    const response = await supabase
      .from('game_comments')
      .select('game_slug,created_at')
      .gte('created_at', nowMinusDays(days))
      .limit(8000);

    if (response.error) throw response.error;

    const grouped = aggregateByGame([], response.data || []);
    return grouped
      .sort(function (a, b) { return b.comment_count - a.comment_count; })
      .slice(0, HUB_LIMITS.discussed);
  }

  async function fallbackTrending(supabase, days) {
    const [ratingsRes, commentsRes] = await Promise.all([
      supabase.from('game_ratings').select('game_slug,rating,created_at').gte('created_at', nowMinusDays(days)).limit(8000),
      supabase.from('game_comments').select('game_slug,created_at').gte('created_at', nowMinusDays(days)).limit(8000)
    ]);

    if (ratingsRes.error) throw ratingsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    return aggregateByGame(ratingsRes.data || [], commentsRes.data || [])
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, HUB_LIMITS.trending);
  }

  async function fallbackLatestActivity(supabase) {
    const [ratingsRes, commentsRes, badgesRes] = await Promise.all([
      supabase.from('game_ratings').select('user_id,game_slug,rating,created_at').order('created_at', { ascending: false }).limit(HUB_LIMITS.activity),
      supabase.from('game_comments').select('user_id,game_slug,created_at').order('created_at', { ascending: false }).limit(HUB_LIMITS.activity),
      supabase.from('user_badges').select('user_id,badge_key,awarded_at').order('awarded_at', { ascending: false }).limit(HUB_LIMITS.activity)
    ]);

    if (ratingsRes.error) throw ratingsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    const badgeRows = badgesRes.error ? [] : (badgesRes.data || []);
    const raw = [];

    (ratingsRes.data || []).forEach(function (row) {
      raw.push({ type: 'rating', user_id: row.user_id, game_slug: row.game_slug, rating: row.rating, created_at: row.created_at });
    });

    (commentsRes.data || []).forEach(function (row) {
      raw.push({ type: 'comment', user_id: row.user_id, game_slug: row.game_slug, created_at: row.created_at });
    });

    badgeRows.forEach(function (row) {
      raw.push({ type: 'badge', user_id: row.user_id, badge_key: row.badge_key, created_at: row.awarded_at });
    });

    return raw
      .filter(function (row) { return row.created_at; })
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
      .slice(0, HUB_LIMITS.activity);
  }

  async function fallbackTopMembers(supabase, days) {
    const since = nowMinusDays(days);
    const [ratingsRes, commentsRes, badgesRes] = await Promise.all([
      supabase.from('game_ratings').select('user_id,created_at').gte('created_at', since).limit(12000),
      supabase.from('game_comments').select('user_id,created_at').gte('created_at', since).limit(12000),
      supabase.from('user_badges').select('user_id,badge_key,awarded_at').gte('awarded_at', since).limit(12000)
    ]);

    if (ratingsRes.error) throw ratingsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    const map = new Map();
    function upsert(userId) {
      if (!userId) return null;
      if (!map.has(userId)) map.set(userId, { user_id: userId, rating_count: 0, comment_count: 0, badge_count: 0, points: 0, badges: [] });
      return map.get(userId);
    }

    (ratingsRes.data || []).forEach(function (row) {
      const item = upsert(row.user_id);
      if (!item) return;
      item.rating_count += 1;
      item.points += 1;
    });

    (commentsRes.data || []).forEach(function (row) {
      const item = upsert(row.user_id);
      if (!item) return;
      item.comment_count += 1;
      item.points += 2;
    });

    if (!badgesRes.error) {
      (badgesRes.data || []).forEach(function (row) {
        const item = upsert(row.user_id);
        if (!item) return;
        item.badge_count += 1;
        item.points += 5;
        if (row.badge_key) item.badges.push(row.badge_key);
      });
    }

    return Array.from(map.values())
      .sort(function (a, b) { return b.points - a.points; })
      .slice(0, HUB_LIMITS.members);
  }

  async function mapUsernames(supabase, rows) {
    const ids = Array.from(new Set(rows.map(function (row) { return row.user_id; }).filter(Boolean)));
    if (!ids.length) return rows;

    const profilesRes = await supabase.from('profiles').select('id,username').in('id', ids);
    if (profilesRes.error) return rows;

    const usernameById = new Map((profilesRes.data || []).map(function (row) {
      return [row.id, row.username || 'user'];
    }));

    return rows.map(function (row) {
      const username = usernameById.get(row.user_id) || row.username || 'user';
      return Object.assign({}, row, { username: username });
    });
  }

  async function fetchHubData(supabase) {
    const [rpcTrending, rpcTopRated, rpcDiscussed, rpcMembers, rpcActivity] = await Promise.all([
      window.ccgSupabase.callRpcSafe(supabase, 'trending_games', { days: 7 }),
      window.ccgSupabase.callRpcSafe(supabase, 'top_rated_games', { min_count: HUB_LIMITS.minRatingCount }),
      window.ccgSupabase.callRpcSafe(supabase, 'most_discussed_games', { days: 30 }),
      window.ccgSupabase.callRpcSafe(supabase, 'top_members', { days: 30 }),
      window.ccgSupabase.callRpcSafe(supabase, 'latest_activity', { row_limit: HUB_LIMITS.activity })
    ]);

    const output = {
      trending: [],
      topRated: [],
      discussed: [],
      activity: [],
      members: []
    };

    output.trending = rpcTrending.data && rpcTrending.data.length
      ? rpcTrending.data.slice(0, HUB_LIMITS.trending)
      : await fallbackTrending(supabase, 7);

    output.topRated = rpcTopRated.data && rpcTopRated.data.length
      ? rpcTopRated.data.slice(0, HUB_LIMITS.topRated)
      : await fallbackTopRated(supabase, HUB_LIMITS.minRatingCount);

    output.discussed = rpcDiscussed.data && rpcDiscussed.data.length
      ? rpcDiscussed.data.slice(0, HUB_LIMITS.discussed)
      : await fallbackMostDiscussed(supabase, 30);

    output.activity = rpcActivity.data && rpcActivity.data.length
      ? rpcActivity.data.slice(0, HUB_LIMITS.activity)
      : await fallbackLatestActivity(supabase);

    output.members = rpcMembers.data && rpcMembers.data.length
      ? rpcMembers.data.slice(0, HUB_LIMITS.members)
      : await fallbackTopMembers(supabase, 30);

    output.activity = await mapUsernames(supabase, output.activity);
    output.members = await mapUsernames(supabase, output.members);

    if (!rpcMembers.data || !rpcMembers.data.length) {
      const memberIds = output.members.map(function (row) { return row.user_id; }).filter(Boolean);
      if (memberIds.length) {
        const badgesRes = await supabase.from('user_badges').select('user_id,badge_key').in('user_id', memberIds).limit(500);
        if (!badgesRes.error) {
          const byUser = new Map();
          (badgesRes.data || []).forEach(function (row) {
            if (!row.user_id || !row.badge_key) return;
            if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
            byUser.get(row.user_id).push(row.badge_key);
          });
          output.members = output.members.map(function (row) {
            return Object.assign({}, row, { badges: byUser.get(row.user_id) || row.badges || [] });
          });
        }
      }
    }

    return output;
  }

  async function syncHubAuthCtas() {
    const loginBtn = document.getElementById('ccg-hub-login-btn');
    const profileBtn = document.querySelector('a[href="/community/profile.html"]');
    if (!loginBtn) return;

    const context = await window.ccgSupabase.getCurrentUserContext();
    if (context.isAuthenticated) {
      loginBtn.hidden = true;
      if (profileBtn) profileBtn.hidden = false;
    } else {
      loginBtn.hidden = false;
      if (profileBtn) profileBtn.hidden = true;
    }
  }

  async function renderHub() {
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      renderUnavailableSections('Community live feed is not configured yet. You can still browse profile pages and hub links.');
      return;
    }

    try {
      await syncHubAuthCtas();
      const supabase = await window.ccgSupabase.getClient();
      const data = await fetchHubData(supabase);

      setSectionState('ccg-hub-trending', renderGameTiles(data.trending, 'No trending games in the last 7 days.'));
      setSectionState('ccg-hub-top-rated', renderGameTiles(data.topRated, 'Not enough ratings yet to rank top games.'));
      setSectionState('ccg-hub-discussed', renderGameTiles(data.discussed, 'No active discussions in the last 30 days.'));
      setSectionState('ccg-hub-latest-activity', renderActivityRows(data.activity));
      setSectionState('ccg-hub-top-members', renderMembers(data.members));
      await syncHubAuthCtas();
    } catch (_error) {
      if (!state.unavailableMessageShown) {
        state.unavailableMessageShown = true;
        renderUnavailableSections('Community feed is temporarily unavailable. Please try again soon.');
      }
    }
  }

  function wireActions() {
    const btn = document.getElementById('ccg-hub-login-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        window.ccgCommunityAuth.openAuthModal('signin');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireActions();
    renderHub();
    syncHubAuthCtas();
    window.addEventListener('ccg:auth-ready', renderHub);
    window.addEventListener('ccg:auth-changed', renderHub);
    window.addEventListener('ccg:rating-updated', renderHub);
  });
})();
