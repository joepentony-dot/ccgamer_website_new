// Community comments feature removed.
// Compatibility shim retained to avoid merge conflicts on branches
// that still reference this script.
(function () {
  const IS_ADMIN_PATH = window.location.pathname.startsWith('/admin/');
  if (IS_ADMIN_PATH) {
    console.info('[CCG-AUTH] Public auth guard disabled on admin path');
  }

  /* ===============================================
     OMEGA COMMUNITY AUTH LOCK
     Prevents endless retry loop by capping retries,
     enforcing auth refresh, and surfacing failures
     instead of trapping the UI in "Retrying…".
     =============================================== */
  const COMMENT_ENDPOINTS = {
    commentsByGame: 'supabase:public.comments?select=*&game_key=eq.<slug>',
    postComment: 'supabase:public.comments (insert)',
    myActivity: 'supabase:public.comments?user_id=eq.<uid>'
  };

  const state = {
    initStarted: false,
    authReady: false,
    activeSlug: null,
    activeGameId: null,
    lastGameEventAt: 0,
    renderInFlight: null,
    retryTimer: null,
    retryCount: 0,
    maxRetries: 3,
    reviewSort: 'newest',
    reviewOffset: 0,
    reviewPageSize: 8
  };

  const summaryState = {
    contextKey: '',
    inFlight: null,
    inFlightKey: ''
  };



  function commentsEnabled() {
    return Boolean(window.CCG_COMMUNITY_FLAGS?.COMMUNITY_COMMENTS_ENABLED);
  }

  function renderCommentsDisabled() {
    const mount = getMount();
    if (!mount) return;
    mount.innerHTML = '<div class="ccg-community-card"><h3>Member Reviews</h3><p class="ccg-community-muted">Comments are currently disabled.</p></div>';
  }


  function logCommentError(scope, error, meta) {
    console.error('[CCG-COMMENTS] ' + scope, { error: error, meta: meta || {} });
  }

  function logCommentsLoaded(count, slug) {
    console.info('[CCG COMMENTS] Loaded: ' + count + ' (' + slug + ')');
  }


  function normalizeGameKey(gameRef) {
    if (!gameRef || typeof gameRef !== 'object') return '';
    const slug = String(gameRef.slug || '').trim().toLowerCase();
    const id = String(gameRef.id || '').trim().toLowerCase();
    return slug || id;
  }

  function classifyStatusMessage(error, fallback) {
    const status = Number(error && (error.status || error.code || error.statusCode));
    if (status === 401) return 'Login required';
    if (status === 403) return 'Permission denied';
    if (status === 404) return 'Endpoint missing / not deployed';
    if (status >= 500) return 'Server error';
    return fallback || 'Server error';
  }

  function logEndpointFailure(endpoint, error) {
    console.error('[CCG-COMMENTS] endpoint failure', {
      endpoint: endpoint,
      status: error && (error.status || error.code || error.statusCode) || 'unknown',
      bodySnippet: String(error && (error.details || error.message || error.hint) || '').slice(0, 300)
    });
  }

  function isServerError(error) {
    const code = String(error && (error.status || error.code) || '');
    return code === '500' || code === '502' || code === '503' || code === '504';
  }

  function isNetworkError(error) {
    const message = String(error && error.message || '').toLowerCase();
    const code = String(error && (error.status || error.code) || '');
    return code === '0' || message.includes('network') || message.includes('failed to fetch') || message.includes('load failed');
  }

  function explainError(error, fallback) {
    if (isAuthError(error)) return 'Not logged in';
    if (isNetworkError(error)) return 'Network issue';
    if (isServerError(error)) return 'Server error';
    if (isNotConfiguredError(error)) return 'Server error';
    return fallback || 'Server error';
  }

  function getMount() {
    return document.getElementById('ccg-community-comments');
  }

  function getGameContext() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get('id') || '').trim();
    const bodySlug = (document.body && document.body.getAttribute('data-game-slug') || '').trim();
    const bodyGameId = (document.body && document.body.getAttribute('data-game-id') || '').trim();

    return {
      slug: bodySlug || fromQuery || state.activeSlug || null,
      gameId: bodyGameId || state.activeGameId || null
    };
  }

  function setDeferredMessage(message) {
    const mount = getMount();
    if (!mount) return;
    mount.innerHTML = '<div class="ccg-community-card"><h3>Member Reviews</h3><p class="ccg-community-muted">' + (message || 'Preparing comments…') + '</p></div>';
  }

  function setFailureMessage(message) {
    const mount = getMount();
    if (!mount) return;
    mount.innerHTML = '<div class="ccg-community-card"><h3>Member Reviews</h3><p class="ccg-community-muted">' + (message || 'Not logged in') + '</p></div>';
  }

  function notify(message, type) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.showToast === 'function') {
      window.ccgCommunityAuth.showToast(message, type || 'info');
    }
  }

  function routeToLogin() {
    if (IS_ADMIN_PATH) {
      // Admin pages are governed by admin/js/guard.js only
      return;
    }
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.goToLogin === 'function') {
      window.ccgCommunityAuth.goToLogin(window.location.pathname + window.location.search + window.location.hash);
      return;
    }
    window.location.href = '/auth/login.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  }

  function resolveCommentIdentity(comment, context) {
    const profile = comment.profiles || {};
    const metadata = comment.user_metadata || {};
    const handle = profile.handle || profile.username || profile.display_name || metadata.handle || metadata.name || 'community-member';
    const avatarUrl = profile.avatar_url || null;
    const own = Boolean(context && context.user && context.user.id === comment.user_id);
    const canModerate = Boolean(context && context.permissions && context.permissions.canModerate);
    return { handle: String(handle), avatarUrl: avatarUrl, own: own, canModerate: canModerate };
  }

  function setLoginMessage(message) {
    const mount = getMount();
    if (!mount) return;
    mount.innerHTML = '' +
      '<div class="ccg-community-card">' +
      '  <h3>Member Reviews</h3>' +
      '  <p class="ccg-community-muted">' + (message || 'Log in to view comments.') + '</p>' +
      '  <p><button class="ccg-community-btn" id="ccg-login-to-comment" type="button">Log in</button></p>' +
      '</div>';
    const loginBtn = document.getElementById('ccg-login-to-comment');
    if (loginBtn) loginBtn.addEventListener('click', function () {
      routeToLogin();
    });
  }

  function isNotConfiguredError(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '42P01'
      || code === 'PGRST202'
      || code === 'PGRST205'
      || code === 'PGRST301'
      || code === '404'
      || message.includes('relation')
      || message.includes('function')
      || message.includes('does not exist')
      || message.includes('not found');
  }

  function isAuthError(error) {
    const code = String(error && (error.status || error.code) || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '401'
      || code === '403'
      || code === 'PGRST301'
      || message.includes('jwt')
      || message.includes('token')
      || message.includes('auth');
  }

  function commentCard(comment, context, reportState) {
    const identity = resolveCommentIdentity(comment, context);
    const username = window.ccgCommunityAuth.esc(identity.handle);
    const content = comment.deleted
      ? '<em>This review has been removed by moderation.</em>'
      : window.ccgCommunityAuth.esc(comment.body || '');
    const canDelete = identity.own && !comment.deleted;
    const reportDisabled = Boolean(reportState && reportState[comment.id]);
    const rating = Number(comment.rating);
    const ratingBadge = Number.isInteger(rating) && rating >= 1 && rating <= 10
      ? '<span class="ccg-review-rating" aria-label="Reviewer rated this game ' + rating + ' out of 10">' + rating + '/10</span>'
      : '';
    const helpfulCount = Math.max(0, Number(comment.helpful_count || 0));
    const helpfulActive = Boolean(comment.viewer_helpful);
    const date = comment.created_at ? new Date(comment.created_at) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Date unavailable';

    return '' +
      '<article class="ccg-comment-card ccg-review-card" data-comment-id="' + comment.id + '">' +
      '  <header class="ccg-comment-card__head ccg-review-card__head">' +
      '    <div class="ccg-comment-card__identity ccg-review-card__identity">' +
      '      <span class="ccg-comment-card__profile-link">@' + username + '</span>' +
             ratingBadge +
      '    </div>' +
      '    <time datetime="' + window.ccgCommunityAuth.esc(comment.created_at || '') + '">' + window.ccgCommunityAuth.esc(dateLabel) + '</time>' +
      '  </header>' +
      '  <p class="ccg-comment-card__body">' + content + '</p>' +
      '  <div class="ccg-comment-card__actions">' +
      (identity.own && !comment.deleted ? '<button type="button" data-action="edit">Edit</button>' : '') +
      (canDelete ? '<button type="button" data-action="delete">Delete</button>' : '') +
      (!identity.own && context.user && !comment.deleted ? '<button type="button" data-action="report"' + (reportDisabled ? ' disabled' : '') + '>' + (reportDisabled ? 'Reported' : 'Report') + '</button>' : '') +
      (context.user && !comment.deleted
        ? '<button type="button" data-action="helpful"' + (helpfulActive ? ' disabled aria-pressed="true"' : ' aria-pressed="false"') + '>' +
          (helpfulActive ? 'Helpful ✓' : 'Helpful') + (helpfulCount ? ' · ' + helpfulCount : '') + '</button>'
        : (helpfulCount ? '<span class="ccg-review-helpful-count">' + helpfulCount + (helpfulCount === 1 ? ' helpful vote' : ' helpful votes') + '</span>' : '')) +
      '  </div>' +
      '</article>';
  }

  async function ensureAuthReady() {
    if (state.authReady) return true;
    if (!window.ccgSupabase || typeof window.ccgSupabase.waitForAuth !== 'function') return false;

    try {
      await window.ccgSupabase.waitForAuth();
      state.authReady = true;
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function refreshAuthSession() {
    try {
      const client = await window.ccgSupabase.getClient();
      await client.auth.refreshSession();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function runQueryWithAuthRetry(runQuery) {
    const first = await runQuery();
    if (!first || !first.error || !isAuthError(first.error)) {
      return first;
    }

    const refreshed = await refreshAuthSession();
    if (!refreshed) return first;
    return runQuery();
  }

  function resetRetries() {
    state.retryCount = 0;
  }

  function scheduleRetry(delayMs, reason) {
    if (state.retryTimer) {
      window.clearTimeout(state.retryTimer);
    }

    if (state.retryCount >= state.maxRetries) {
      logCommentError('retry-limit-reached', new Error('Retry limit reached'), { reason: reason, retries: state.retryCount });
      setFailureMessage('Server error');
      return;
    }

    const attempt = state.retryCount + 1;
    const backoff = delayMs || Math.min(8000, 900 * Math.pow(2, state.retryCount));
    state.retryCount = attempt;
    state.retryTimer = window.setTimeout(function () {
      state.retryTimer = null;
      runSafeInit(reason || 'retry-timer');
    }, backoff);
  }

  async function fetchReviewPage(supabase, contextKey, context) {
    const rpcResult = await runQueryWithAuthRetry(function () {
      return supabase.rpc('ccg_game_reviews', {
        p_game_key: contextKey,
        p_sort: state.reviewSort,
        p_offset: state.reviewOffset,
        p_limit: state.reviewPageSize
      });
    });

    if (!rpcResult.error) {
      const comments = (rpcResult.data || []).map(function (row) {
        return Object.assign({}, row, {
          deleted: Boolean(row.deleted),
          page_type: row.page_type || 'game',
          page_id: row.page_id || row.game_key || contextKey,
          profiles: {
            username: row.username || '',
            display_name: row.display_name || ''
          }
        });
      });
      return {
        comments: comments,
        totalCount: comments.length ? Number(comments[0].total_count || 0) : 0,
        source: 'rpc'
      };
    }

    if (!isNotConfiguredError(rpcResult.error)) {
      return { error: rpcResult.error };
    }

    // Migration-safe fallback: keep reviews readable without downloading the
    // full review/rating history. Advanced sorting becomes available once the
    // compact read-model RPC is deployed.
    const fallbackResult = await runQueryWithAuthRetry(function () {
      return supabase
        .from('comments')
        .select('id,user_id,body,created_at,updated_at,deleted,page_type,page_id,game_key', { count: 'exact' })
        .eq('game_key', contextKey)
        .order('created_at', { ascending: false })
        .range(state.reviewOffset, state.reviewOffset + state.reviewPageSize - 1);
    });

    if (fallbackResult.error) return { error: fallbackResult.error };

    const comments = (fallbackResult.data || []).map(function (row) {
      const resolvedPageId = row.page_id || row.game_key || contextKey;
      return Object.assign({
        deleted: false,
        page_type: row.page_type || 'game',
        page_id: resolvedPageId,
        helpful_count: 0,
        viewer_helpful: false,
        rating: null
      }, row);
    });

    const userIds = Array.from(new Set(comments.map(function (comment) {
      return comment.user_id;
    }).filter(Boolean)));
    const profileMap = {};
    const ratingMap = {};

    if (userIds.length) {
      const profileRes = await runQueryWithAuthRetry(function () {
        return supabase.from('profiles').select('id,username,display_name').in('id', userIds);
      });
      (profileRes.data || []).forEach(function (row) { profileMap[row.id] = row; });

      const ratingRes = await runQueryWithAuthRetry(function () {
        return supabase
          .from('ratings')
          .select('user_id,rating')
          .eq('game_key', contextKey)
          .in('user_id', userIds);
      });
      (ratingRes.data || []).forEach(function (row) { ratingMap[row.user_id] = row.rating; });
    }

    comments.forEach(function (row) {
      row.profiles = profileMap[row.user_id] || {};
      row.rating = ratingMap[row.user_id] || null;
    });

    return {
      comments: comments,
      totalCount: Number(fallbackResult.count || 0),
      source: 'fallback'
    };
  }

  function reviewSortOptions() {
    return [
      ['newest', 'Newest'],
      ['helpful', 'Most Helpful'],
      ['highest', 'Highest Rating'],
      ['lowest', 'Lowest Rating']
    ].map(function (option) {
      return '<option value="' + option[0] + '"' + (state.reviewSort === option[0] ? ' selected' : '') + '>' + option[1] + '</option>';
    }).join('');
  }

  async function renderComments(slug) {
    const mount = getMount();
    if (!mount) return;

    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      setDeferredMessage('Community features are still being configured. Comments will appear automatically once ready.');
      return;
    }

    try {
      await window.ccgSupabase.waitForAuth();
    } catch (_error) {
      setFailureMessage('Network issue');
      return;
    }

    let context = null;
    let supabase = null;
    try {
      context = await window.ccgSupabase.getCurrentUserContext();
      supabase = await window.ccgSupabase.getClient();
    } catch (_error) {
      setFailureMessage('Server error');
      return;
    }
    const user = context.user;
    const canComment = Boolean(context.permissions && context.permissions.canComment);
    if (!user) {
      setDeferredMessage('Browsing comments as guest. Log in to join the discussion.');
    }

    const contextKey = normalizeGameKey({ slug: slug, id: state.activeGameId });
    const pageResult = await fetchReviewPage(supabase, contextKey, context);
    const error = pageResult.error;

    if (error && isNotConfiguredError(error)) {
      setFailureMessage('Endpoint missing / not deployed');
      scheduleRetry(3000, 'not-configured');
      return;
    }

    if (error) {
      logCommentError('load-comments', error, { slug: slug });
      if (isAuthError(error)) {
        setLoginMessage('Login required');
        return;
      }
      logEndpointFailure(COMMENT_ENDPOINTS.commentsByGame, error);
      mount.innerHTML = '<div class="ccg-community-card"><h3>Member Reviews</h3><p class="ccg-community-muted">' + classifyStatusMessage(error, explainError(error, 'Server error')) + '</p></div>';
      scheduleRetry(isServerError(error) ? 3500 : 5000, 'load-error');
      return;
    }

    const comments = pageResult.comments || [];
    const totalCount = Number(pageResult.totalCount || 0);
    logCommentsLoaded(comments.length, slug);

    const reportState = {};

    if (user && comments.length) {
      const reportRes = await runQueryWithAuthRetry(function () {
        return supabase
          .from('comment_reports')
          .select('comment_id')
          .eq('reporter_user_id', user.id)
          .in('comment_id', comments.map(function (comment) { return comment.id; }));
      });
      (reportRes.data || []).forEach(function (row) {
        reportState[row.comment_id] = true;
      });
    }

    const currentPage = Math.floor(state.reviewOffset / state.reviewPageSize) + 1;
    const pageCount = Math.max(1, Math.ceil(totalCount / state.reviewPageSize));
    const hasPrevious = state.reviewOffset > 0;
    const hasNext = state.reviewOffset + comments.length < totalCount;

    mount.innerHTML = '' +
      '<div class="ccg-community-card ccg-community-reviews-card">' +
      '  <div class="ccg-community-card__heading ccg-review-heading">' +
      '    <div><p class="ccg-community-eyebrow">Member Reviews</p><h3>' + totalCount + (totalCount === 1 ? ' review' : ' reviews') + '</h3></div>' +
      '    <p class="ccg-community-muted">' + (user ? ('Signed in as @' + window.ccgCommunityAuth.esc((context.profile && context.profile.username) || (window.CCG_AUTH && window.CCG_AUTH.username) || 'member')) : 'Anyone can read reviews. Sign in only to post or vote.') + '</p>' +
      '  </div>' +
      (user
        ? '<form id="ccg-comment-form" class="ccg-community-form ccg-review-form"><label>Write your review<textarea name="content" required maxlength="600" placeholder="What did you think of the game?"></textarea></label><div class="ccg-review-form__actions"><button type="submit" class="ccg-community-btn"' + (canComment ? '' : ' disabled') + '>Post review</button><span id="ccg-comment-status" class="ccg-community-muted" aria-live="polite"></span></div></form>'
        : '<div class="ccg-community-guest-action"><p class="ccg-community-muted">Have your say?</p><button class="ccg-community-btn" id="ccg-login-to-comment" type="button">Log in to post a review</button></div>') +
      '  <div class="ccg-review-toolbar">' +
      '    <label for="ccg-review-sort">Sort reviews</label>' +
      '    <select id="ccg-review-sort" class="ccg-review-sort">' + reviewSortOptions() + '</select>' +
      '  </div>' +
      '  <div class="ccg-comment-list">' +
      (comments.length
        ? comments.map(function (comment) {
          return commentCard(comment, context, reportState);
        }).join('')
        : '<div class="ccg-review-empty"><strong>No member reviews yet.</strong><span>Be the first to add a review for this game.</span></div>') +
      '  </div>' +
      (totalCount > state.reviewPageSize
        ? '<nav class="ccg-review-pagination" aria-label="Member review pages">' +
          '<button type="button" class="ccg-community-btn ccg-community-btn--ghost" id="ccg-review-prev"' + (hasPrevious ? '' : ' disabled') + '>Previous</button>' +
          '<span>Page ' + currentPage + ' of ' + pageCount + '</span>' +
          '<button type="button" class="ccg-community-btn ccg-community-btn--ghost" id="ccg-review-next"' + (hasNext ? '' : ' disabled') + '>Next</button>' +
          '</nav>'
        : '') +
      '</div>';

    if (!user) {
      const loginBtn = document.getElementById('ccg-login-to-comment');
      if (loginBtn) loginBtn.addEventListener('click', function () {
        routeToLogin();
      });
      resetRetries();
      return;
    }

    const sortSelect = document.getElementById('ccg-review-sort');
    if (sortSelect) sortSelect.addEventListener('change', function () {
      state.reviewSort = sortSelect.value || 'newest';
      state.reviewOffset = 0;
      runSafeInit('review-sort');
    });

    const previousButton = document.getElementById('ccg-review-prev');
    if (previousButton) previousButton.addEventListener('click', function () {
      state.reviewOffset = Math.max(0, state.reviewOffset - state.reviewPageSize);
      runSafeInit('review-previous');
    });

    const nextButton = document.getElementById('ccg-review-next');
    if (nextButton) nextButton.addEventListener('click', function () {
      state.reviewOffset += state.reviewPageSize;
      runSafeInit('review-next');
    });

    const form = document.getElementById('ccg-comment-form');
    if (form) form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = document.getElementById('ccg-comment-status');
      const content = String(new FormData(form).get('content') || '').trim();
      if (!content) return;
      if (!canComment) {
        status.textContent = 'You do not have permission to post comments.';
        notify(status.textContent, 'error');
        return;
      }
      status.textContent = 'Posting…';

      let liveContext = null;
      try {
        await window.ccgSupabase.waitForAuth();
        liveContext = await window.ccgSupabase.getCurrentUserContext();
      } catch (_error) {
        status.textContent = 'Not logged in';
        return;
      }

      if (!liveContext || !liveContext.user) {
        status.textContent = 'Not logged in';
        routeToLogin();
        return;
      }

      if (!liveContext.permissions || !liveContext.permissions.canComment) {
        status.textContent = 'You do not have permission to post comments.';
        notify(status.textContent, 'error');
        return;
      }

      const { error: insertError } = await runQueryWithAuthRetry(function () {
        return supabase.from('comments').insert({
          user_id: liveContext.user.id,
          game_key: normalizeGameKey({ slug: slug, id: state.activeGameId }),
          page_type: 'game',
          page_id: normalizeGameKey({ slug: slug, id: state.activeGameId }),
          body: content
        });
      });

      if (insertError) {
        logCommentError('post-comment', insertError, { slug: slug });
        if (isAuthError(insertError)) {
          status.textContent = 'Login required';
          return;
        }
        logEndpointFailure(COMMENT_ENDPOINTS.postComment, insertError);
        status.textContent = classifyStatusMessage(insertError, explainError(insertError, 'Server error'));
        notify(status.textContent, 'error');
        scheduleRetry(isServerError(insertError) ? 2000 : 3000, 'post-error');
        return;
      }

      form.reset();
      state.reviewSort = 'newest';
      state.reviewOffset = 0;
      status.textContent = 'Posted.';
      notify('Comment posted successfully.', 'success');
      window.dispatchEvent(new CustomEvent('ccg:comments-updated', { detail: { gameSlug: slug } }));
      runSafeInit('comment-posted');
    });

    const loginBtn = document.getElementById('ccg-login-to-comment');
    if (loginBtn) loginBtn.addEventListener('click', function () {
      routeToLogin();
    });

    mount.querySelectorAll('.ccg-comment-card button').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const card = btn.closest('.ccg-comment-card');
        const commentId = String(card.getAttribute('data-comment-id') || '');
        const action = btn.getAttribute('data-action');

        if (action === 'report') {
          const reason = window.prompt('Report reason (optional):', '');
          const { error: reportError } = await runQueryWithAuthRetry(function () {
            return supabase.from('comment_reports').insert({
              reporter_user_id: user.id,
              comment_id: commentId,
              reason: reason || null,
              page_type: 'game',
              page_id: normalizeGameKey({ slug: slug, id: state.activeGameId }),
              status: 'open'
            });
          });
          if (reportError) {
            if (String(reportError.code || '') === '23505') {
              btn.disabled = true;
              btn.textContent = 'Reported';
              notify('You already reported this comment.', 'info');
              return;
            }
            notify(explainError(reportError, 'Unable to submit report.'), 'error');
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Reported';
          notify('Report submitted.', 'success');
          return;
        }

        if (action === 'helpful') {
          btn.disabled = true;
          const helpfulResult = await runQueryWithAuthRetry(function () {
            return supabase.rpc('submit_helpful_vote', { p_comment_id: commentId });
          });
          const helpfulError = helpfulResult.error;
          if (helpfulError) {
            notify(explainError(helpfulError, 'Unable to register helpful vote.'), 'error');
            btn.disabled = false;
            return;
          }
          const nextHelpfulCount = Number(helpfulResult.data || 0);
          btn.textContent = 'Helpful ✓' + (nextHelpfulCount ? ' · ' + nextHelpfulCount : '');
          btn.setAttribute('aria-pressed', 'true');
          notify('Helpful vote added.', 'success');
          if (state.reviewSort === 'helpful') runSafeInit('review-helpful-sort');
          return;
        }

        if (action === 'edit') {
          const bodyEl = card.querySelector('.ccg-comment-card__body');
          if (!bodyEl) return;
          const currentText = bodyEl.textContent || '';
          bodyEl.innerHTML = '<textarea class="ccg-comment-inline-edit" maxlength="600">' + window.ccgCommunityAuth.esc(currentText) + '</textarea>' +
            '<div class="ccg-comment-inline-actions"><button type="button" data-action="save-edit">Save</button><button type="button" data-action="cancel-edit">Cancel</button></div>';
          return;
        }

        if (action === 'cancel-edit') {
          runSafeInit('comment-edit-cancel');
          return;
        }

        if (action === 'save-edit') {
          const editor = card.querySelector('.ccg-comment-inline-edit');
          const updated = String(editor && editor.value || '').trim();
          if (!updated) return;
          const editResult = await runQueryWithAuthRetry(function () {
            return supabase.from('comments').update({ body: updated, updated_at: new Date().toISOString() }).eq('id', commentId).eq('user_id', user.id);
          });
          if (editResult.error) {
            notify(explainError(editResult.error, 'Unable to update comment.'), 'error');
            return;
          }
          notify('Comment updated.', 'success');
          runSafeInit('comment-edit');
          return;
        }

        if (action === 'delete') {
          if (!window.confirm('Delete your comment?')) return;
          const deleteResult = await runQueryWithAuthRetry(function () {
            return supabase.from('comments').update({ deleted: true, body: '[deleted]', updated_at: new Date().toISOString() }).eq('id', commentId).eq('user_id', user.id);
          });
          if (deleteResult.error) {
            notify(explainError(deleteResult.error, 'Unable to delete comment.'), 'error');
            return;
          }
          notify('Comment removed.', 'success');
          runSafeInit('comment-delete');
        }
      });
    });
    resetRetries();
  }

  async function runSafeInit(reason) {
    const mount = getMount();
    if (!mount) return;

    if (state.renderInFlight) {
      await state.renderInFlight;
      return;
    }

    const readyForAuth = await ensureAuthReady();
    if (!readyForAuth) {
      setDeferredMessage('Preparing comments… waiting for sign-in state.');
      scheduleRetry(1200, 'auth-wait');
      return;
    }

    const game = getGameContext();
    if (!game.slug) {
      setDeferredMessage('Preparing comments… waiting for game details.');
      scheduleRetry(reason === 'game-loaded' ? 500 : 1200, 'game-wait');
      return;
    }

    state.activeSlug = game.slug;
    state.activeGameId = game.gameId;

    state.renderInFlight = renderComments(game.slug)
      .catch(function (error) {
        logCommentError('render-failed', error, { slug: game.slug });
        setDeferredMessage('Unable to load comments just yet. Retrying…');
        scheduleRetry(3000, 'render-failed');
      })
      .finally(function () {
        state.renderInFlight = null;
      });

    await state.renderInFlight;
  }

  function onGameLoaded(event) {
    const detail = event && event.detail ? event.detail : {};
    if (detail.gameSlug && state.activeSlug && String(detail.gameSlug) !== state.activeSlug) {
      state.reviewSort = 'newest';
      state.reviewOffset = 0;
    }
    if (detail.gameSlug) state.activeSlug = String(detail.gameSlug);
    if (detail.gameId !== undefined && detail.gameId !== null) state.activeGameId = String(detail.gameId);
    state.lastGameEventAt = Date.now();
    const panel = getCommentsPanel();
    if (!panel || panel.open) runSafeInit('game-loaded');
  }

  function getCommentsPanel() {
    return document.getElementById('ccg-community-comments-panel');
  }

  async function refreshSummaryCount(options) {
    const meta = document.getElementById('ccg-comments-summary-meta');
    if (!meta || !window.ccgSupabase) return;

    const game = getGameContext();
    if (!game.slug) return;

    const contextKey = normalizeGameKey({ slug: game.slug, id: game.gameId });
    const force = Boolean(options && options.force);

    if (!force && summaryState.contextKey === contextKey) return;

    if (summaryState.inFlight && summaryState.inFlightKey === contextKey) {
      await summaryState.inFlight;
      if (!force) return;
    }

    const request = (async function () {
      try {
        const supabase = await window.ccgSupabase.getClient();
        const countRes = await supabase.from('comments').select('id', { count: 'exact', head: true }).eq('game_key', contextKey);
        if (!countRes.error) {
          const count = Number(countRes.count || 0);
          meta.textContent = count === 1 ? '1 review' : count + ' reviews';
          summaryState.contextKey = contextKey;
        }
      } catch (_error) {}
    })();

    summaryState.inFlight = request;
    summaryState.inFlightKey = contextKey;

    try {
      await request;
    } finally {
      if (summaryState.inFlight === request) {
        summaryState.inFlight = null;
        summaryState.inFlightKey = '';
      }
    }
  }

  function init() {
    if (!commentsEnabled()) {
      renderCommentsDisabled();
      return;
    }

    if (state.initStarted) return;
    state.initStarted = true;

    const panel = getCommentsPanel();
    refreshSummaryCount();

    if (panel) {
      panel.addEventListener('toggle', function () {
        if (panel.open) {
          runSafeInit('panel-open');
        }
      });
      if (panel.open) runSafeInit('dom-ready-open');
    } else {
      runSafeInit('dom-ready');
    }

    window.addEventListener('ccg:auth-ready', function () {
      state.authReady = true;
      if (!panel || panel.open) runSafeInit('auth-ready');
    });
    window.addEventListener('ccg:auth-changed', function () {
      state.authReady = true;
      if (!panel || panel.open) runSafeInit('auth-changed');
    });
    window.addEventListener('ccg:game-loaded', function (event) {
      onGameLoaded(event);
      refreshSummaryCount();
    });
    window.addEventListener('ccg:comments-updated', function () {
      refreshSummaryCount({ force: true });
      if (!panel || panel.open) runSafeInit('comments-updated');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
