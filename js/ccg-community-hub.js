(function () {
  const HUB_LIMITS = {
    trending: 8,
    topRated: 10,
    discussed: 10,
    activity: 15,
    members: 10,
    minRatingCount: 5
  };

  const COMMENT_PAGE_SIZE = 12;
  const COMMENT_TEXT_COLUMNS = ['body', 'content'];
  const GAME_CACHE_KEY = 'ccg-community-last-game';
  const HUB_ENDPOINTS = {
    gameLibrary: '/games/games.json',
    comments: 'supabase:public.comments'
  };

  const state = {
    unavailableMessageShown: false,
    gamesLoaded: false,
    games: [],
    gameByKey: new Map(),
    selectedGame: null,
    commentsOffset: 0,
    commentsTotal: 0,
    commentsLoading: false,
    viewerContext: null,
    explorerInitialized: false,
    commentTextColumn: null,
    suggestionState: {
      items: [],
      highlighted: -1
    }
  };

  function logHubError(scope, error, meta) {
    const payload = meta || {};
    console.error('[CCG-COMMUNITY-HUB] ' + scope, { error: error, meta: payload });
  }

  function normalizeGameKey(gameRef) {
    if (!gameRef || typeof gameRef !== 'object') return '';
    const slug = String(gameRef.slug || '').trim().toLowerCase();
    const id = String(gameRef.id || '').trim().toLowerCase();
    return slug || id;
  }

  function classifyErrorMessage(error, fallback) {
    const code = String(error && (error.code || '')).toUpperCase();
    const status = Number(error && (error.status || error.statusCode || (Number.isFinite(Number(code)) ? Number(code) : NaN)));
    if (status === 401) return 'Login required.';
    if (status === 403) return 'Permission denied.';
    if (status === 404) return 'Endpoint missing / not deployed.';
    if (code === 'PGRST205') return 'Community data is syncing. Please retry shortly.';
    if (status >= 500) return 'Server error.';
    return fallback || 'Unable to complete request.';
  }

  function logFetchFailure(endpoint, responseText, status, statusText) {
    console.error('[CCG-COMMUNITY-HUB] Fetch failed', {
      endpoint: endpoint,
      status: status,
      statusText: statusText,
      bodySnippet: String(responseText || '').slice(0, 300)
    });
  }

  function isMissingColumnError(error) {
    const code = String(error && error.code || '').toUpperCase();
    const message = String(error && error.message || '').toLowerCase();
    return code === '42703' || code === 'PGRST204' || message.includes('column') && message.includes('does not exist');
  }

  function getCommentText(comment) {
    if (!comment || typeof comment !== 'object') return '';
    if (typeof comment.body === 'string' && comment.body.length) return comment.body;
    if (typeof comment.content === 'string' && comment.content.length) return comment.content;
    return '';
  }

  function getCommentColumnCandidates() {
    if (state.commentTextColumn) return [state.commentTextColumn].concat(COMMENT_TEXT_COLUMNS.filter(function (column) {
      return column !== state.commentTextColumn;
    }));
    return COMMENT_TEXT_COLUMNS.slice();
  }

  function isAuthError(error) {
    const code = String(error && (error.status || error.code) || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '401' || code === '403' || code === 'PGRST301' || message.includes('jwt') || message.includes('token') || message.includes('auth');
  }

  function isServerError(error) {
    const code = String(error && (error.status || error.code) || '');
    return code === '500' || code === '502' || code === '503' || code === '504';
  }

  async function runWithRetry(task, options) {
    const label = options && options.label ? options.label : 'request';
    let firstError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        if (!firstError) firstError = error;
        const shouldRetry = attempt === 0 && (isAuthError(error) || isServerError(error));
        logHubError(label + (shouldRetry ? ' failed, retrying once' : ' failed'), error, { attempt: attempt + 1 });
        if (!shouldRetry) throw error;
        try {
          const client = await window.ccgSupabase.getClient();
          await client.auth.refreshSession();
        } catch (refreshError) {
          logHubError(label + ' auth refresh failed', refreshError, { attempt: attempt + 1 });
        }
      }
    }

    throw firstError || new Error('Unknown community request failure.');
  }

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

  function routeToLogin() {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.goToLogin === 'function') {
      window.ccgCommunityAuth.goToLogin(window.location.pathname + window.location.search + window.location.hash);
      return;
    }
    window.location.href = '/auth/login.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  }

  function resolveProfileIdentity(profile, userMetadata) {
    const base = profile || {};
    const metadata = userMetadata || {};
    const handle = base.handle || base.username || base.display_name || metadata.handle || metadata.name || 'community-member';
    return {
      handle: String(handle),
      avatar_url: base.avatar_url || null
    };
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
    setSectionState('ccg-hub-hall-of-fame', copy);
    setSectionState('ccg-hub-supporter-spotlight', copy);
    setSectionState('ccg-hub-weekly-challenges', copy);
    setSectionState('ccg-hub-supporter-lounge', copy);
  }

  function renderGameTiles(list, emptyText) {
    if (!list.length) return '<p class="ccg-community-muted">' + esc(emptyText) + '</p>';

    return '<div class="mini-game-tile-grid">' + list.map(function (item) {
      return '' +
        '<a class="mini-game-tile" href="' + gameLink(item.game_key) + '">' +
        '  <h3 class="mini-game-tile__title">' + esc(item.game_key || 'Unknown game') + '</h3>' +
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
        details = 'earned <span class="ccg-badge ccg-badge--icon">🏆 ' + esc(row.badge_code || 'Badge') + '</span>';
      } else if (row.type === 'rating') {
        details = 'rated <a href="' + gameLink(row.game_key) + '">' + esc(row.game_key || 'a game') + '</a> · ' + Number(row.rating || 0) + '/10';
      } else {
        details = 'commented on <a href="' + gameLink(row.game_key) + '">' + esc(row.game_key || 'a game') + '</a>';
      }

      return '' +
        '<li class="activity-row">' +
        '  <span class="activity-row__type">' + typeLabel + '</span>' +
        '  <div class="activity-row__body">' + actor + ' ' + details + '</div>' +
        '  <time datetime="' + esc(row.created_at || '') + '">' + esc(formatDate(row.created_at)) + '</time>' +
        '</li>';
    }).join('') + '</ul>';
  }

  function renderSimpleList(rows, emptyText, formatter) {
    if (!rows.length) return '<p class="ccg-community-muted">' + esc(emptyText) + '</p>';
    return '<ul class="member-list">' + rows.map(function (row) {
      return '<li class="member-row">' + formatter(row) + '</li>';
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
      const slug = row.game_key;
      if (!slug) return;
      const item = map.get(slug) || { game_key: slug, rating_sum: 0, rating_count: 0, comment_count: 0 };
      item.rating_sum += Number(row.rating || 0);
      item.rating_count += 1;
      map.set(slug, item);
    });

    comments.forEach(function (row) {
      const slug = row.game_key;
      if (!slug) return;
      const item = map.get(slug) || { game_key: slug, rating_sum: 0, rating_count: 0, comment_count: 0 };
      item.comment_count += 1;
      map.set(slug, item);
    });

    return Array.from(map.values()).map(function (item) {
      return {
        game_key: item.game_key,
        avg_rating: item.rating_count ? item.rating_sum / item.rating_count : 0,
        rating_count: item.rating_count,
        comment_count: item.comment_count,
        score: item.comment_count * 2 + (item.rating_count ? (item.rating_sum / item.rating_count) : 0)
      };
    });
  }

  async function fallbackTopRated(supabase, minCount) {
    const response = await supabase
      .from('ratings')
      .select('game_key,rating')
      .limit(8000);

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
      .from('comments')
      .select('game_key,created_at')
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
      supabase.from('ratings').select('game_key,rating,created_at').gte('created_at', nowMinusDays(days)).limit(8000),
      supabase.from('comments').select('game_key,created_at').gte('created_at', nowMinusDays(days)).limit(8000)
    ]);

    if (ratingsRes.error) throw ratingsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    return aggregateByGame(ratingsRes.data || [], commentsRes.data || [])
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, HUB_LIMITS.trending);
  }

  async function fallbackLatestActivity(supabase) {
    const [ratingsRes, commentsRes, badgesRes] = await Promise.all([
      supabase.from('ratings').select('user_id,game_key,rating,created_at').order('created_at', { ascending: false }).limit(HUB_LIMITS.activity),
      supabase.from('comments').select('user_id,game_key,created_at').order('created_at', { ascending: false }).limit(HUB_LIMITS.activity),
      supabase.from('user_badges').select('user_id,badge_code,awarded_at').order('awarded_at', { ascending: false }).limit(HUB_LIMITS.activity)
    ]);

    if (ratingsRes.error) throw ratingsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    const badgeRows = badgesRes.error ? [] : (badgesRes.data || []);
    const raw = [];

    (ratingsRes.data || []).forEach(function (row) {
      raw.push({ type: 'rating', user_id: row.user_id, game_key: row.game_key, rating: row.rating, created_at: row.created_at });
    });

    (commentsRes.data || []).forEach(function (row) {
      raw.push({ type: 'comment', user_id: row.user_id, game_key: row.game_key, created_at: row.created_at });
    });

    badgeRows.forEach(function (row) {
      raw.push({ type: 'badge', user_id: row.user_id, badge_code: row.badge_code, created_at: row.awarded_at });
    });

    return raw
      .filter(function (row) { return row.created_at; })
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
      .slice(0, HUB_LIMITS.activity);
  }

  async function fallbackTopMembers(supabase, days) {
    const since = nowMinusDays(days);
    const [ratingsRes, commentsRes, badgesRes] = await Promise.all([
      supabase.from('ratings').select('user_id,created_at').gte('created_at', since).limit(12000),
      supabase.from('comments').select('user_id,created_at').gte('created_at', since).limit(12000),
      supabase.from('user_badges').select('user_id,badge_code,awarded_at').gte('awarded_at', since).limit(12000)
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
        if (row.badge_code) item.badges.push(row.badge_code);
      });
    }

    return Array.from(map.values())
      .sort(function (a, b) { return b.points - a.points; })
      .slice(0, HUB_LIMITS.members);
  }

  async function mapUsernames(supabase, rows) {
    const ids = Array.from(new Set(rows.map(function (row) { return row.user_id; }).filter(Boolean)));
    if (!ids.length) return rows;

    const profilesRes = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', ids);
    if (profilesRes.error) return rows;

    const profileById = new Map((profilesRes.data || []).map(function (row) {
      return [row.id, row];
    }));

    return rows.map(function (row) {
      const profile = profileById.get(row.user_id) || null;
      const identity = resolveProfileIdentity(profile, row.user_metadata);
      return Object.assign({}, row, { username: identity.handle, profiles: Object.assign({}, profile, { username: identity.handle }) });
    });
  }

  async function fetchHubData(supabase) {
    const rpcTrending = { data: [] };
    const rpcTopRated = { data: [] };
    const rpcDiscussed = { data: [] };
    const rpcMembers = { data: [] };
    const rpcActivity = { data: [] };

    const output = {
      trending: [],
      topRated: [],
      discussed: [],
      activity: [],
      members: [],
      hallOfFame: [],
      supporterSpotlight: [],
      weeklyChallenges: [],
      supporterLounge: []
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
        const badgesRes = await supabase.from('user_badges').select('user_id,badge_code').in('user_id', memberIds).limit(500);
        if (!badgesRes.error) {
          const byUser = new Map();
          (badgesRes.data || []).forEach(function (row) {
            if (!row.user_id || !row.badge_code) return;
            if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
            byUser.get(row.user_id).push(row.badge_code);
          });
          output.members = output.members.map(function (row) {
            return Object.assign({}, row, { badges: byUser.get(row.user_id) || row.badges || [] });
          });
        }
      }
    }

    const [repRes, spotlightRes, challengeRes, loungeRes] = await Promise.all([
      Promise.resolve({ data: [] }),
      Promise.resolve({ data: [] }),
      supabase.from('challenges').select('id,title,description,supporter_only,end_at').eq('active', true).order('start_at', { ascending: false }).limit(6),
      Promise.resolve({ data: [] })
    ]);

    output.hallOfFame = repRes.error ? [] : (repRes.data || []);
    output.supporterSpotlight = spotlightRes.error ? [] : (spotlightRes.data || []);
    output.weeklyChallenges = challengeRes.error ? [] : (challengeRes.data || []);
    output.supporterLounge = loungeRes.error ? [] : (loungeRes.data || []);

    return output;
  }

  function getCommentElements() {
    return {
      input: document.getElementById('ccg-comments-game'),
      list: document.getElementById('ccg-comments-games-list'),
      panel: document.getElementById('ccg-comments-panel'),
      postWrap: document.getElementById('ccg-comments-post'),
      count: document.getElementById('ccg-comments-count'),
      feedback: document.getElementById('ccg-comments-feedback'),
      listWrap: document.getElementById('ccg-public-comment-list'),
      loadMore: document.getElementById('ccg-comments-load-more')
    };
  }

  function setCommentsFeedback(text, type) {
    const elements = getCommentElements();
    if (!elements.feedback) return;
    elements.feedback.textContent = text || '';
    elements.feedback.dataset.type = type || 'info';
  }

  function readGameSelection(inputValue) {
    const raw = String(inputValue || '').trim();
    const key = raw.toLowerCase();
    if (!key) return null;
    if (state.gameByKey.has(key)) return state.gameByKey.get(key) || null;

    const exact = state.games.find(function (game) {
      const label = (game.title + ' (' + game.system + ') — ' + game.slug).toLowerCase();
      return label === key || game.title.toLowerCase() === key || game.slug.toLowerCase() === key;
    });
    return exact || null;
  }

  function filterGameSuggestions(query) {
    const key = String(query || '').trim().toLowerCase();
    if (!key) return state.games.slice(0, 12);
    return state.games.filter(function (game) {
      const title = game.title.toLowerCase();
      const slug = game.slug.toLowerCase();
      const system = game.system.toLowerCase();
      return title.includes(key) || slug.includes(key) || system.includes(key);
    }).slice(0, 12);
  }

  function rememberGame(game) {
    try {
      localStorage.setItem(GAME_CACHE_KEY, game.slug);
    } catch (_error) {
      // ignore storage errors
    }
  }

  async function loadGamesForExplorer() {
    if (state.gamesLoaded) return;

    const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : '/';
    const data = await runWithRetry(async function () {
      const endpoint = root + 'games/games.json';
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) {
        const bodySnippet = await response.text();
        logFetchFailure(endpoint, bodySnippet, response.status, response.statusText);
        const httpError = new Error('Unable to load game list. HTTP ' + response.status);
        httpError.status = response.status;
        httpError.endpoint = endpoint;
        throw httpError;
      }
      return response.json();
    }, { label: 'load-games-library' });
    const rows = Array.isArray(data) ? data : [];

    const normalized = rows.map(function (game, idx) {
      const title = String(game.title || game.sorttitle || '').trim();
      const slug = String(game.slug || game.id || '').trim();
      if (!title || !slug) return null;
      return {
        slug: slug,
        title: title,
        id: String(game.id || slug),
        system: String(game.system || 'Unknown')
      };
    }).filter(Boolean);

    normalized.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });

    state.games = normalized;
    state.gameByKey = new Map();

    normalized.forEach(function (game) {
      state.gameByKey.set(game.title.toLowerCase(), game);
      state.gameByKey.set(game.slug.toLowerCase(), game);
      state.gameByKey.set((game.title + ' (' + game.system + ')').toLowerCase(), game);
      state.gameByKey.set((game.title + ' — ' + game.slug).toLowerCase(), game);
    });

    // Datalist intentionally disabled: custom typeahead UI is the single selector surface.
    state.gamesLoaded = true;
    console.info('[CCG-COMMUNITY-HUB] Games dropdown populated', {
      endpoint: HUB_ENDPOINTS.gameLibrary,
      count: normalized.length
    });
  }

  async function ensureViewerContext() {
    state.viewerContext = await window.ccgSupabase.getCurrentUserContext();
    return state.viewerContext;
  }

  function commentCard(comment, viewer) {
    const profile = comment.profiles || {};
    const identity = resolveProfileIdentity(profile, comment.user_metadata);
    const username = identity.handle;
    const avatar = identity.avatar_url
      ? '<img src="' + esc(identity.avatar_url) + '" alt="' + esc(username) + ' avatar" class="ccg-comment-card__avatar">'
      : '<span class="ccg-comment-card__avatar ccg-comment-card__avatar--fallback" aria-hidden="true">' + esc((username.charAt(0) || 'C').toUpperCase()) + '</span>';

    const own = viewer && viewer.user && viewer.user.id === comment.user_id;
    const text = comment.deleted
      ? '<em>This comment was removed.</em>'
      : esc(getCommentText(comment));

    return '' +
      '<article class="ccg-comment-card" data-comment-id="' + esc(comment.id) + '">' +
      '  <header class="ccg-comment-card__head">' +
      '    <div class="ccg-comment-card__identity">' +
      avatar +
      '      <div>' +
      '        <a href="' + profileLink(username) + '" class="ccg-comment-card__profile-link">@' + esc(username) + '</a>' +
      '        <time datetime="' + esc(comment.created_at || '') + '">' + esc(formatDate(comment.created_at)) + '</time>' +
      '      </div>' +
      '    </div>' +
      '  </header>' +
      '  <p class="ccg-comment-card__body">' + text + '</p>' +
      (!comment.deleted
        ? '<div class="ccg-comment-card__actions">'
          + (own ? '<button type="button" data-action="edit">Edit</button><button type="button" data-action="delete">Delete</button>' : '<button type="button" data-action="report">Report</button>')
          + '</div>'
        : '') +
      '</article>';
  }

  function renderCommentSkeletons(count) {
    const skeletonCount = count || 4;
    let output = '';
    for (let i = 0; i < skeletonCount; i += 1) {
      output += '<article class="ccg-comment-card ccg-comment-card--skeleton"><div class="ccg-comment-skeleton-line"></div><div class="ccg-comment-skeleton-line ccg-comment-skeleton-line--short"></div><div class="ccg-comment-skeleton-block"></div></article>';
    }
    return output;
  }

  function updateCommentCount() {
    const elements = getCommentElements();
    if (!elements.count) return;
    const label = state.commentsTotal === 1 ? '1 comment' : state.commentsTotal + ' comments';
    const selectedLabel = state.selectedGame ? (' · ' + state.selectedGame.title) : '';
    elements.count.textContent = label + selectedLabel;
  }

  function renderPostComposer(viewer) {
    const elements = getCommentElements();
    if (!elements.postWrap) return;

    if (!viewer || !viewer.isAuthenticated) {
      elements.postWrap.innerHTML = '' +
        '<div class="ccg-comments-login-cta">' +
        '  <p class="ccg-community-muted">Log in to comment on this game.</p>' +
        '  <button type="button" class="ccg-community-btn" id="ccg-comments-login">Join / Log in</button>' +
        '</div>';
      const loginBtn = document.getElementById('ccg-comments-login');
      if (loginBtn) {
        loginBtn.addEventListener('click', function () {
          routeToLogin();
        });
      }
      return;
    }

    elements.postWrap.innerHTML = '' +
      '<form class="ccg-community-form" id="ccg-comments-post-form">' +
      '  <label for="ccg-comments-content">Add your comment</label>' +
      '  <textarea id="ccg-comments-content" name="content" maxlength="600" required placeholder="Share your nostalgia, tips, or hidden secrets..."></textarea>' +
      '  <button type="submit" class="ccg-community-btn" id="ccg-comments-submit">Post comment</button>' +
      '</form>';

    const form = document.getElementById('ccg-comments-post-form');
    if (!form) return;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!state.selectedGame) return;

      const submitBtn = document.getElementById('ccg-comments-submit');
      const content = String(new FormData(form).get('content') || '').trim();
      if (!content) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting…';
      }
      setCommentsFeedback('Posting your comment…');

      try {
        const supabase = await window.ccgSupabase.getClient();
        const fresh = await ensureViewerContext();
        if (!fresh || !fresh.user) {
          setCommentsFeedback('Please sign in before posting.', 'error');
          return;
        }

        const normalizedGameKey = normalizeGameKey(state.selectedGame);
        let result = null;
        let insertError = null;

        for (const columnName of getCommentColumnCandidates()) {
          const payload = {
            user_id: fresh.user.id,
            game_key: normalizedGameKey
          };
          payload[columnName] = content;

          try {
            result = await runWithRetry(function () {
              return supabase.from('comments').insert(payload).then(function (response) {
                if (response.error) throw response.error;
                return response;
              });
            }, { label: 'post-comment' });
            state.commentTextColumn = columnName;
            insertError = null;
            break;
          } catch (error) {
            insertError = error;
            if (!isMissingColumnError(error)) break;
          }
        }

        if (insertError) throw insertError;
        if (result.error) throw result.error;

        form.reset();
        setCommentsFeedback('Comment posted.', 'success');
        await loadComments(true);
        window.dispatchEvent(new CustomEvent('ccg:comments-updated', { detail: { gameSlug: state.selectedGame.slug } }));
      } catch (_error) {
        setCommentsFeedback(classifyErrorMessage(_error, 'Unable to post comment right now.'), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post comment';
        }
      }
    });
  }

  async function attachCommentActions(viewer) {
    const listWrap = document.getElementById('ccg-public-comment-list');
    if (!listWrap || !viewer || !viewer.user) return;

    listWrap.querySelectorAll('.ccg-comment-card__actions button').forEach(function (button) {
      button.addEventListener('click', async function () {
        const article = button.closest('.ccg-comment-card');
        if (!article) return;
        const commentId = article.getAttribute('data-comment-id');
        const action = button.getAttribute('data-action');
        if (!commentId || !action) return;

        try {
          const supabase = await window.ccgSupabase.getClient();
          if (action === 'edit') {
            const existing = article.querySelector('.ccg-comment-card__body');
            if (!existing) return;
            const text = existing.textContent || '';
            existing.innerHTML = '<textarea class="ccg-comment-inline-edit" maxlength="600">' + esc(text) + '</textarea>' +
              '<div class="ccg-comment-inline-actions"><button type="button" data-action="save-edit">Save</button><button type="button" data-action="cancel-edit">Cancel</button></div>';
            return;
          }

          if (action === 'cancel-edit') {
            await loadComments(true);
            return;
          }

          if (action === 'save-edit') {
            const editor = article.querySelector('.ccg-comment-inline-edit');
            const next = String(editor && editor.value || '').trim();
            if (!next) return;
            const updatePayload = { updated_at: new Date().toISOString() };
            updatePayload[state.commentTextColumn || 'body'] = next;
            const updateRes = await supabase.from('comments').update(updatePayload).eq('id', commentId).eq('user_id', viewer.user.id);
            if (updateRes.error) throw updateRes.error;
          }

          if (action === 'delete') {
            const confirmed = window.confirm('Delete your comment?');
            if (!confirmed) return;
            const deletePayload = { updated_at: new Date().toISOString() };
            deletePayload[state.commentTextColumn || 'body'] = '[deleted]';
            const deleteRes = await supabase.from('comments').update(Object.assign({ deleted: true }, deletePayload)).eq('id', commentId).eq('user_id', viewer.user.id);
            if (deleteRes.error && !isMissingColumnError(deleteRes.error)) throw deleteRes.error;
            if (deleteRes.error && isMissingColumnError(deleteRes.error)) {
              const hardDeleteRes = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', viewer.user.id);
              if (hardDeleteRes.error) throw hardDeleteRes.error;
            }
          }

          if (action === 'report') {
            const reason = window.prompt('Report reason (optional):', '');
            const reportRes = await supabase.from('comment_reports').insert({
              reporter_user_id: viewer.user.id,
              comment_id: commentId,
              reason: reason || null,
              page_type: 'community',
              page_id: normalizeGameKey(state.selectedGame),
              status: 'open'
            });
            if (reportRes.error && String(reportRes.error.code || '') !== '23505') throw reportRes.error;
          }

          await loadComments(true);
        } catch (_error) {
          setCommentsFeedback('Unable to update this comment.', 'error');
        }
      });
    });
  }

  async function loadComments(resetList) {
    const elements = getCommentElements();
    if (!elements.listWrap || !state.selectedGame || state.commentsLoading) return;

    state.commentsLoading = true;
    if (resetList) {
      state.commentsOffset = 0;
      elements.listWrap.innerHTML = renderCommentSkeletons(5);
    }

    const rangeStart = state.commentsOffset;
    const rangeEnd = state.commentsOffset + COMMENT_PAGE_SIZE - 1;

    try {
      const supabase = await window.ccgSupabase.getClient();
      const viewer = await ensureViewerContext();
      renderPostComposer(viewer);

      let response = null;
      let loadError = null;

      for (const columnName of getCommentColumnCandidates()) {
        try {
          response = await runWithRetry(function () {
            return supabase
              .from('comments')
              .select('id,user_id,' + columnName + ',created_at,updated_at,deleted,page_type,page_id,game_key', { count: 'exact' })
              .eq('game_key', normalizeGameKey(state.selectedGame))
              .order('created_at', { ascending: false })
              .range(rangeStart, rangeEnd)
              .then(function (queryResponse) {
                if (queryResponse.error) throw queryResponse.error;
                return queryResponse;
              });
          }, { label: 'load-comments' });
          state.commentTextColumn = columnName;
          loadError = null;
          break;
        } catch (error) {
          loadError = error;
          if (!isMissingColumnError(error)) break;
        }
      }

      if (loadError) throw loadError;

      state.commentsTotal = Number(response.count || 0);
      updateCommentCount();

      const rows = (response.data || []).map(function (row) {
        return Object.assign({}, row, {
          page_type: row.page_type || 'game',
          page_id: row.page_id || row.game_key || normalizeGameKey(state.selectedGame)
        });
      });
      const userIds = Array.from(new Set(rows.map(function (row) { return row.user_id; }).filter(Boolean)));
      if (userIds.length) {
        const profileRes = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', userIds);
        const byId = new Map((profileRes.data || []).map(function (row) { return [row.id, row]; }));
        rows.forEach(function (row) {
          const profile = byId.get(row.user_id) || {};
          const identity = resolveProfileIdentity(profile, row.user_metadata);
          row.profiles = Object.assign({}, profile, { username: identity.handle });
        });
      }
      if (resetList) {
        elements.listWrap.innerHTML = rows.length
          ? rows.map(function (row) { return commentCard(row, viewer); }).join('')
          : '<p class="ccg-community-muted">No comments yet. Be the first to launch this discussion.</p>';
      } else {
        elements.listWrap.insertAdjacentHTML('beforeend', rows.map(function (row) { return commentCard(row, viewer); }).join(''));
      }

      state.commentsOffset += rows.length;
      elements.loadMore.hidden = state.commentsOffset >= state.commentsTotal;
      elements.loadMore.disabled = false;
      elements.loadMore.textContent = 'Load more';

      await attachCommentActions(viewer);
    } catch (error) {
      logHubError('loadComments', error, { slug: state.selectedGame && state.selectedGame.slug, resetList: resetList });
      if (resetList) {
        elements.listWrap.innerHTML = '<p class="ccg-community-muted">' + esc(classifyErrorMessage(error, 'Comments are temporarily unavailable. Try again shortly.')) + '</p>';
      }
      setCommentsFeedback(classifyErrorMessage(error, 'Unable to load comments for this game.'), 'error');
    } finally {
      state.commentsLoading = false;
    }
  }

  async function selectGame(game, shouldFocusPanel) {
    if (!game) return;
    state.selectedGame = game;
    const canonicalGameKey = normalizeGameKey(game);
    rememberGame(game);
    setCommentsFeedback('');
    updateCommentCount();

    const elements = getCommentElements();
    if (elements.input) {
      elements.input.value = game.title + ' (' + game.system + ') — ' + game.slug;
    }
    console.info('[CCG-COMMUNITY-HUB] Game selected in explorer', { slug: game.slug, id: game.id, canonicalGameKey: canonicalGameKey });

    if (shouldFocusPanel && elements.panel && !elements.panel.open) {
      elements.panel.open = true;
    }

    await loadComments(true);
  }

  function pickInitialGame() {
    const fromStorage = (function () {
      try {
        return localStorage.getItem(GAME_CACHE_KEY);
      } catch (_error) {
        return '';
      }
    })();

    const preferred = fromStorage ? state.gameByKey.get(fromStorage.toLowerCase()) : null;
    return preferred || state.games[0] || null;
  }

  async function initCommentsExplorer() {
    const controls = document.getElementById('ccg-comments-explorer-controls');
    if (!controls) return;

    try {
      await loadGamesForExplorer();
    } catch (error) {
      logHubError('loadGamesForExplorer', error);
      setCommentsFeedback('Unable to load game list.', 'error');
      return;
    }

    const elements = getCommentElements();
    if (!elements.listWrap || !elements.input || !elements.loadMore) return;

    if (!state.explorerInitialized) {
      state.explorerInitialized = true;
      elements.listWrap.innerHTML = renderCommentSkeletons(4);

      const suggestionList = document.createElement('ul');
      suggestionList.className = 'ccg-comments-suggestion-list';
      suggestionList.id = 'ccg-comments-suggestion-list';
      suggestionList.hidden = true;
      suggestionList.setAttribute('role', 'listbox');
      controls.appendChild(suggestionList);

      function closeSuggestions() {
        suggestionList.hidden = true;
        suggestionList.innerHTML = '';
        state.suggestionState.items = [];
        state.suggestionState.highlighted = -1;
      }

      function renderSuggestions(query) {
        const matches = filterGameSuggestions(query);
        state.suggestionState.items = matches;
        state.suggestionState.highlighted = -1;
        if (!matches.length) {
          suggestionList.hidden = false;
          suggestionList.innerHTML = '<li class="ccg-comments-suggestion-list__empty">No matching games found.</li>';
          return;
        }
        suggestionList.hidden = false;
        suggestionList.innerHTML = matches.map(function (game, index) {
          const label = game.title + ' (' + game.system + ') — ' + game.slug;
          return '<li role="option" data-index="' + index + '" class="ccg-comments-suggestion-list__item">' + esc(label) + '</li>';
        }).join('');
        suggestionList.querySelectorAll('.ccg-comments-suggestion-list__item').forEach(function (item) {
          item.addEventListener('mousedown', function (event) {
            event.preventDefault();
            const idx = Number(item.getAttribute('data-index'));
            const pick = state.suggestionState.items[idx];
            if (!pick) return;
            selectGame(pick, true);
            closeSuggestions();
          });
        });
      }

      controls.addEventListener('submit', function (event) {
        event.preventDefault();
        const game = readGameSelection(elements.input.value);
        if (!game) {
          setCommentsFeedback('Select a valid game from the list first.', 'error');
          return;
        }
        selectGame(game, true);
      });

      function trySelectFromInput(shouldFocus) {
        const game = readGameSelection(elements.input.value);
        if (!game) return false;
        selectGame(game, shouldFocus);
        return true;
      }

      elements.input.addEventListener('change', function () {
        const selected = trySelectFromInput(true);
        if (!selected) return;
        const game = readGameSelection(elements.input.value);
        if (game) {
          console.info('[CCG-COMMUNITY-HUB] Explorer selection changed', { slug: game.slug, id: game.id, canonicalGameKey: normalizeGameKey(game) });
        }
      });

      elements.input.addEventListener('input', function () {
        const game = readGameSelection(elements.input.value);
        renderSuggestions(elements.input.value);
        if (game) {
          setCommentsFeedback('Ready: ' + game.title + ' selected.', 'success');
        }
      });

      elements.input.addEventListener('focus', function () {
        renderSuggestions(elements.input.value);
      });

      document.addEventListener('click', function (event) {
        if (!controls.contains(event.target)) closeSuggestions();
      });

      elements.input.addEventListener('keydown', function (event) {
        const items = suggestionList.querySelectorAll('.ccg-comments-suggestion-list__item');
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (suggestionList.hidden) renderSuggestions(elements.input.value);
          if (!items.length) return;
          event.preventDefault();
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          const next = (state.suggestionState.highlighted + delta + items.length) % items.length;
          state.suggestionState.highlighted = next;
          items.forEach(function (item, idx) {
            item.classList.toggle('is-active', idx === next);
          });
          const selected = state.suggestionState.items[next];
          if (selected) elements.input.value = selected.title + ' (' + selected.system + ') — ' + selected.slug;
          return;
        }

        if (event.key === 'Escape') {
          closeSuggestions();
          return;
        }

        if (event.key !== 'Enter') return;
        if (trySelectFromInput(true)) {
          closeSuggestions();
          return;
        }
        setCommentsFeedback('Select a valid game from the list first.', 'error');
      });

      elements.loadMore.addEventListener('click', function () {
        elements.loadMore.disabled = true;
        elements.loadMore.textContent = 'Loading…';
        loadComments(false);
      });

      const initial = pickInitialGame();
      if (initial) {
        await selectGame(initial, false);
      } else {
        elements.listWrap.innerHTML = '<p class="ccg-community-muted">No games available yet.</p>';
      }
      return;
    }

    const viewer = await ensureViewerContext();
    renderPostComposer(viewer);
    if (state.selectedGame) {
      loadComments(true);
    }
  }

  async function syncHubAuthCtas() {
    const loginBtn = document.getElementById('ccg-hub-login-btn');
    const profileBtn = document.querySelector('a[href="/community/profile.html"]');

    const context = await window.ccgSupabase.getCurrentUserContext();
    if (context.isAuthenticated) {
      if (loginBtn) loginBtn.hidden = true;
      if (profileBtn) profileBtn.hidden = false;
    } else {
      if (loginBtn) loginBtn.hidden = false;
      if (profileBtn) profileBtn.hidden = true;
    }
  }

  async function renderHub() {
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      renderUnavailableSections('Community live feed is warming up. Please check back in a moment.');
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
      setSectionState('ccg-hub-hall-of-fame', renderSimpleList(data.hallOfFame, 'Hall of Fame is warming up.', function (row) {
        return '<div class="member-row__main"><a class="member-row__name" href="' + profileLink(row.username) + '">@' + esc(row.username || 'user') + '</a><span class="member-row__points">' + Number(row.rep_points || 0) + ' REP</span></div>'
          + '<div class="member-row__meta"><span>Level ' + Number(row.rep_level || 1) + '</span><span>' + esc(row.supporter_level || 'none') + '</span></div>';
      }));
      setSectionState('ccg-hub-supporter-spotlight', renderSimpleList(data.supporterSpotlight, 'No supporter spotlight selected yet.', function (row) {
        const username = row.profiles && row.profiles.username ? row.profiles.username : 'supporter';
        return '<div class="member-row__main"><a class="member-row__name" href="' + profileLink(username) + '">@' + esc(username) + '</a></div><div class="member-row__meta"><span>' + esc(row.reason || 'Featured for community impact') + '</span></div>';
      }));
      setSectionState('ccg-hub-weekly-challenges', renderSimpleList(data.weeklyChallenges, 'No active weekly challenges right now.', function (row) {
        return '<div class="member-row__main"><strong>' + esc(row.title || 'Challenge') + '</strong><span class="member-row__points">' + (row.supporter_only ? 'Supporter only' : 'Open') + '</span></div><div class="member-row__meta"><span>' + esc(row.description || '') + '</span></div>';
      }));
      setSectionState('ccg-hub-supporter-lounge', renderSimpleList(data.supporterLounge, 'No lounge posts yet.', function (row) {
        return '<div class="member-row__main"><strong>' + esc(row.title || 'Lounge update') + '</strong></div><div class="member-row__meta"><span>' + esc((row.body || '').slice(0, 140)) + '</span></div>';
      }));
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
        routeToLogin();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireActions();
    renderHub();
    initCommentsExplorer();
    syncHubAuthCtas();
    window.addEventListener('ccg:auth-ready', function () {
      state.viewerContext = null;
      renderHub();
      initCommentsExplorer();
    });
    window.addEventListener('ccg:auth-changed', function () {
      state.viewerContext = null;
      renderHub();
      initCommentsExplorer();
    });
    window.addEventListener('ccg:rating-updated', renderHub);
  });
})();
