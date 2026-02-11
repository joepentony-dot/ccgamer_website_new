(function () {
  /* ===============================================
     OMEGA COMMUNITY AUTH LOCK
     Prevents endless retry loop by capping retries,
     enforcing auth refresh, and surfacing failures
     instead of trapping the UI in "Retrying…".
     =============================================== */
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
      window.ccgCommunityAuth.openAuthModal('signin');
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

  function commentCard(comment, currentUser, canModerate, badgeHtml, supporterLevel) {
    const profile = comment.profiles || {};
    const username = window.ccgCommunityAuth.esc(profile.username || 'Community member');
    const content = comment.is_deleted
      ? '<em>This comment has been removed by moderation.</em>'
      : window.ccgCommunityAuth.esc(comment.content || '');
    const own = currentUser && currentUser.id === comment.user_id;

    return '' +
      '<article class="ccg-comment-card" data-comment-id="' + comment.id + '">' +
      '  <header class="ccg-comment-card__head">' +
      '    <div class="ccg-comment-card__identity">' +
      '      <a href="/community/profile.html?u=' + encodeURIComponent(profile.username || '') + '" class="ccg-comment-card__profile-link">@' + username + '</a>' +
      '      ' + (badgeHtml || '') +
      '      ' + (supporterLevel && supporterLevel !== 'none' ? '<span class="ccg-supporter-flair ccg-supporter-flair--' + window.ccgCommunityAuth.esc(supporterLevel) + '">' + window.ccgCommunityAuth.esc(supporterLevel) + '</span>' : '') +
      '    </div>' +
      '    <time datetime="' + window.ccgCommunityAuth.esc(comment.created_at || '') + '">' + new Date(comment.created_at).toLocaleString() + '</time>' +
      '  </header>' +
      '  <p class="ccg-comment-card__body">' + content + '</p>' +
      '  <div class="ccg-comment-card__actions">' +
      (own && !comment.is_deleted ? '<button type="button" data-action="edit">Edit</button>' : '') +
      (currentUser && !comment.is_deleted ? '<button type="button" data-action="report">Report</button>' : '') +
      (currentUser && !comment.is_deleted ? '<button type="button" data-action="helpful">Helpful</button>' : '') +
      (canModerate && !comment.is_deleted ? '<button type="button" data-action="delete">Soft delete</button>' : '') +
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
    const canModerate = Boolean(context.permissions && context.permissions.canModerate);
    const canComment = Boolean(context.permissions && context.permissions.canComment);
    if (!user) {
      setDeferredMessage('Browsing comments as guest. Log in to join the discussion.');
    }

    const { data, error } = await runQueryWithAuthRetry(function () {
      return supabase
        .from('game_comments')
        .select('id,user_id,content,is_deleted,created_at,updated_at,profiles(username,avatar_url,role)')
        .eq('game_slug', slug)
        .order('created_at', { ascending: false })
        .limit(100);
    });

    if (error && isNotConfiguredError(error)) {
      setFailureMessage('Server error');
      scheduleRetry(3000, 'not-configured');
      return;
    }

    if (error) {
      logCommentError('load-comments', error, { slug: slug });
      if (isAuthError(error)) {
        setLoginMessage('Not logged in');
        return;
      }
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Comments</h3><p class="ccg-community-muted">' + explainError(error, 'Server error') + '</p></div>';
      scheduleRetry(isServerError(error) ? 3500 : 5000, 'load-error');
      return;
    }

    const comments = data || [];
    logCommentsLoaded(comments.length, slug);
    const userIds = Array.from(new Set(comments.map(function (comment) { return comment.user_id; }).filter(Boolean)));
    const badgeMap = {};
    const supporterMap = {};

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
          return commentCard(comment, user, canModerate, badgeHtml, supporterMap[comment.user_id] || "none");
        }).join('')
        : '<p class="ccg-community-muted">No comments yet. Start the discussion.</p>') +
      '  </div>' +
      '</div>';

    if (!user) {
      const loginBtn = document.getElementById('ccg-login-to-comment');
      if (loginBtn) loginBtn.addEventListener('click', function () {
        window.ccgCommunityAuth.openAuthModal('signin');
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
        window.ccgCommunityAuth.openAuthModal('signin');
        return;
      }

      if (!liveContext.permissions || !liveContext.permissions.canComment) {
        status.textContent = 'You do not have permission to post comments.';
        notify(status.textContent, 'error');
        return;
      }

      const { error: insertError } = await runQueryWithAuthRetry(function () {
        return supabase.from('game_comments').insert({
          user_id: liveContext.user.id,
          game_slug: slug,
          content: content
        });
      });

      if (insertError) {
        logCommentError('post-comment', insertError, { slug: slug });
        if (isAuthError(insertError)) {
          status.textContent = 'Not logged in';
          return;
        }
        status.textContent = explainError(insertError, 'Server error');
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
      window.ccgCommunityAuth.openAuthModal('signin');
    });

    mount.querySelectorAll('.ccg-comment-card button').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const card = btn.closest('.ccg-comment-card');
        const commentId = Number(card.getAttribute('data-comment-id'));
        const action = btn.getAttribute('data-action');

        if (action === 'report') {
          const reason = window.prompt('Report reason (optional):', '');
          const { error: reportError } = await runQueryWithAuthRetry(function () {
            return supabase.from('comment_reports').insert({
              reporter_user_id: user.id,
              comment_id: commentId,
              reason: reason || null
            });
          });
          if (reportError) {
            notify(explainError(reportError, 'Unable to submit report.'), 'error');
            return;
          }
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
          const currentText = card.querySelector('.ccg-comment-card__body').textContent || '';
          const updated = window.prompt('Edit your comment:', currentText);
          if (!updated || !updated.trim()) return;
          const editResult = await runQueryWithAuthRetry(function () {
            return supabase.from('game_comments').update({ content: updated.trim() }).eq('id', commentId).eq('user_id', user.id);
          });
          if (editResult.error) {
            notify(explainError(editResult.error, 'Unable to update comment.'), 'error');
            return;
          }
          notify('Comment updated.', 'success');
          runSafeInit('comment-edit');
          return;
        }

        if (action === 'delete' && canModerate) {
          const deleteResult = await runQueryWithAuthRetry(function () {
            return supabase.from('game_comments').update({ is_deleted: true, content: '[deleted]' }).eq('id', commentId);
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
