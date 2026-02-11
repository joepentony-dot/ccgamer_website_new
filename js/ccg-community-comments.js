(function () {
  /* ===============================================
     OMEGA COMMUNITY AUTH LOCK
     Prevents endless retry loop by capping retries,
     enforcing auth refresh, and surfacing failures
     instead of trapping the UI in "Retrying…".
     =============================================== */
  const COMMENT_ENDPOINTS = {
    commentsByGame: 'supabase:public.comments?select=*&game_key=eq.<slug>',
    postComment: 'supabase:public.comments (insert)',
    latestActivity: 'supabase rpc latest_activity',
    myActivity: 'supabase:public.comments?user_id=eq.<uid>',
    badgeUnlocks: 'supabase:public.user_badges'
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
    maxRetries: 3
  };



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
    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Comments</h3><p class="ccg-community-muted">' + (message || 'Preparing comments…') + '</p></div>';
  }

  function setFailureMessage(message) {
    const mount = getMount();
    if (!mount) return;
    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Comments</h3><p class="ccg-community-muted">' + (message || 'Not logged in') + '</p></div>';
  }

  function notify(message, type) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.showToast === 'function') {
      window.ccgCommunityAuth.showToast(message, type || 'info');
    }
  }

  function routeToLogin() {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.goToLogin === 'function') {
      window.ccgCommunityAuth.goToLogin(window.location.pathname + window.location.search + window.location.hash);
      return;
    }
    window.location.href = '/auth/login.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  }

  function defaultAvatarMarkup(name) {
    const label = String(name || 'community-member').trim();
    const initial = (label.charAt(0) || 'C').toUpperCase();
    return '<span class="ccg-comment-card__avatar ccg-comment-card__avatar--fallback" aria-hidden="true">' + window.ccgCommunityAuth.esc(initial) + '</span>';
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
      '  <h3>Community Comments</h3>' +
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
      || code === 'PGRST205'
      || code === 'PGRST301'
      || code === '404'
      || message.includes('relation')
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

  function commentCard(comment, context, badgeHtml, supporterLevel, reportState) {
    const identity = resolveCommentIdentity(comment, context);
    const username = window.ccgCommunityAuth.esc(identity.handle);
    const content = comment.deleted
      ? '<em>This comment has been removed by moderation.</em>'
      : window.ccgCommunityAuth.esc(comment.body || '');
    const avatar = identity.avatarUrl
      ? '<img src="' + window.ccgCommunityAuth.esc(identity.avatarUrl) + '" alt="' + username + ' avatar" class="ccg-comment-card__avatar">'
      : defaultAvatarMarkup(identity.handle);
    const canDelete = identity.own && !comment.deleted;
    const reportDisabled = Boolean(reportState && reportState[comment.id]);

    return '' +
      '<article class="ccg-comment-card" data-comment-id="' + comment.id + '">' +
      '  <header class="ccg-comment-card__head">' +
      '    <div class="ccg-comment-card__identity">' +
      avatar +
      '      <a href="/community/profile.html?u=' + encodeURIComponent(identity.handle || '') + '" class="ccg-comment-card__profile-link">@' + username + '</a>' +
      '      ' + (badgeHtml || '') +
      '      ' + (supporterLevel && supporterLevel !== 'none' ? '<span class="ccg-supporter-flair ccg-supporter-flair--' + window.ccgCommunityAuth.esc(supporterLevel) + '">' + window.ccgCommunityAuth.esc(supporterLevel) + '</span>' : '') +
      '    </div>' +
      '    <time datetime="' + window.ccgCommunityAuth.esc(comment.created_at || '') + '">' + new Date(comment.created_at).toLocaleString() + '</time>' +
      '  </header>' +
      '  <p class="ccg-comment-card__body">' + content + '</p>' +
      '  <div class="ccg-comment-card__actions">' +
      (identity.own && !comment.deleted ? '<button type="button" data-action="edit">Edit</button>' : '') +
      (canDelete ? '<button type="button" data-action="delete">Delete</button>' : '') +
      (!identity.own && context.user && !comment.deleted ? '<button type="button" data-action="report"' + (reportDisabled ? ' disabled' : '') + '>' + (reportDisabled ? 'Reported' : 'Report') + '</button>' : '') +
      (context.user && !comment.deleted ? '<button type="button" data-action="helpful">Helpful</button>' : '') +
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

    const { data, error } = await runQueryWithAuthRetry(function () {
      return supabase
        .from('comments')
        .select('id,user_id,body,created_at,deleted')
        .eq('game_key', normalizeGameKey({ slug: slug, id: state.activeGameId }))
        .order('created_at', { ascending: false })
        .limit(100);
    });

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
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Comments</h3><p class="ccg-community-muted">' + classifyStatusMessage(error, explainError(error, 'Server error')) + '</p></div>';
      scheduleRetry(isServerError(error) ? 3500 : 5000, 'load-error');
      return;
    }

    const comments = (data || []).map(function (row) { return Object.assign({ deleted: false }, row); });
    logCommentsLoaded(comments.length, slug);

    const userIds = Array.from(new Set(comments.map(function (comment) { return comment.user_id; }).filter(Boolean)));
    const profileMap = {};
    if (userIds.length) {
      const profileRes = await runQueryWithAuthRetry(function () {
        return supabase.from('profiles').select('id,username,handle,display_name,avatar_url,role').in('id', userIds);
      });
      (profileRes.data || []).forEach(function (row) { profileMap[row.id] = row; });
      comments.forEach(function (row) { row.profiles = profileMap[row.user_id] || {}; });
    }
    const badgeMap = {};
    const supporterMap = {};
    const reportState = {};

    if (userIds.length) {
      const supporterRes = await runQueryWithAuthRetry(function () {
        return supabase.from('supporter_links').select('user_id,supporter_level').in('user_id', userIds);
      });
      (supporterRes.data || []).forEach(function (row) {
        supporterMap[row.user_id] = row.supporter_level || 'none';
      });
    }

    if (userIds.length && window.ccgCommunityBadges) {
      const badgeResult = await runQueryWithAuthRetry(function () {
        return supabase
          .from('user_badges')
          .select('user_id,badge_code,awarded_at')
          .in('user_id', userIds);
      });
      const badgeRows = badgeResult.data || [];

      badgeRows.forEach(function (row) {
        if (!badgeMap[row.user_id]) badgeMap[row.user_id] = [];
        badgeMap[row.user_id].push(row);
      });
    }

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

    mount.innerHTML = '' +
      '<div class="ccg-community-card">' +
      '  <h3>Community Comments</h3>' +
      '  <p class="ccg-community-muted">Status: ' + (user ? ('Logged in as @' + window.ccgCommunityAuth.esc((context.profile && context.profile.username) || (window.CCG_AUTH && window.CCG_AUTH.username) || 'member')) : 'Guest (read-only)') + '</p>' +
      (user
        ? '<form id="ccg-comment-form" class="ccg-community-form"><label>Add your comment<textarea name="content" required maxlength="600"></textarea></label><button type="submit" class="ccg-community-btn"' + (canComment ? '' : ' disabled') + '>Post comment</button><span id="ccg-comment-status" class="ccg-community-muted" aria-live="polite"></span></form>'
        : '<p class="ccg-community-muted">Log in to post a comment.</p><p><button class="ccg-community-btn" id="ccg-login-to-comment" type="button">Log in</button></p>') +
      '  <div class="ccg-comment-list">' +
      (comments.length
        ? comments.map(function (comment) {
          const badges = badgeMap[comment.user_id] || [];
          const compact = badges.slice(0, 2);
          const badgeHtml = compact.length && window.ccgCommunityBadges
            ? window.ccgCommunityBadges.renderBadges(compact, { className: 'ccg-badges ccg-badges--mini', emptyText: '' })
            : '';
          return commentCard(comment, context, badgeHtml, supporterMap[comment.user_id] || 'none', reportState);
        }).join('')
        : '<p class="ccg-community-muted">No comments yet. Start the discussion.</p>') +
      '  </div>' +
      '</div>';

    if (!user) {
      const loginBtn = document.getElementById('ccg-login-to-comment');
      if (loginBtn) loginBtn.addEventListener('click', function () {
        routeToLogin();
      });
      resetRetries();
      return;
    }

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
          game_slug: slug,
          game_key: normalizeGameKey({ slug: slug, id: state.activeGameId }),
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

      if (window.ccgCommunityBadges && typeof window.ccgCommunityBadges.awardEligibleBadge === 'function') {
        await window.ccgCommunityBadges.awardEligibleBadge(user.id);
      }

      form.reset();
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
          const { error: helpfulError } = await runQueryWithAuthRetry(function () {
            return supabase.rpc('submit_helpful_vote', { p_comment_id: commentId });
          });
          if (helpfulError) {
            notify(explainError(helpfulError, 'Unable to register helpful vote.'), 'error');
            btn.disabled = false;
            return;
          }
          btn.textContent = 'Helpful ✓';
          notify('Helpful vote added (+REP for the author).', 'success');
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
    if (detail.gameSlug) state.activeSlug = String(detail.gameSlug);
    if (detail.gameId !== undefined && detail.gameId !== null) state.activeGameId = String(detail.gameId);
    state.lastGameEventAt = Date.now();
    runSafeInit('game-loaded');
  }

  function init() {
    if (state.initStarted) return;
    state.initStarted = true;

    runSafeInit('dom-ready');

    window.addEventListener('ccg:auth-ready', function () {
      state.authReady = true;
      runSafeInit('auth-ready');
    });
    window.addEventListener('ccg:auth-changed', function () {
      state.authReady = true;
      runSafeInit('auth-changed');
    });
    window.addEventListener('ccg:game-loaded', onGameLoaded);
    window.addEventListener('ccg:comments-updated', function () {
      runSafeInit('comments-updated');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
