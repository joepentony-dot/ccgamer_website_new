(function () {
  /* ===============================================
     OMEGA COMMUNITY AUTH LOCK
     Prevents endless retry loop by validating auth
     and refreshing sessions before rating writes.
     =============================================== */
  function getGameSlug() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('id');
    if (fromQuery) return fromQuery;
    const bodySlug = document.body.getAttribute('data-game-slug');
    if (bodySlug) return bodySlug;
    const canonical = document.getElementById('game-canonical');
    if (canonical) {
      const href = canonical.getAttribute('href') || '';
      const match = href.match(/\/games\/([^/]+)\/?$/);
      if (match) return match[1];
    }
    return null;
  }

  function isNotConfiguredError(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '42P01' || code === 'PGRST205' || message.includes('relation') || message.includes('does not exist');
  }

  function isServerError(error) {
    const code = String(error && (error.status || error.code) || '');
    return code === '500' || code === '502' || code === '503' || code === '504';
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



  function isNetworkError(error) {
    const message = String(error && error.message || '').toLowerCase();
    const code = String(error && (error.status || error.code) || '');
    return code === '0' || message.includes('network') || message.includes('failed to fetch') || message.includes('load failed');
  }

  function logRating(scope, payload) {
    console.info('[CCG-RATING] ' + scope, payload || '');
  }
  function routeToLogin() {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.goToLogin === 'function') {
      window.ccgCommunityAuth.goToLogin(window.location.pathname + window.location.search + window.location.hash);
      return;
    }
    window.location.href = '/auth/login.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  }
  async function refreshAuthSession(supabase) {
    try {
      await supabase.auth.refreshSession();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function runQueryWithAuthRetry(runQuery, supabase) {
    const result = await runQuery();
    if (!result || !result.error || !isAuthError(result.error)) {
      return result;
    }

    const refreshed = await refreshAuthSession(supabase);
    if (!refreshed) return result;
    return runQuery();
  }

  function toUserMessage(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    if (code === '401' || code === '403' || code === 'PGRST301' || message.includes('jwt') || message.includes('auth')) return 'Not logged in';
    if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) return 'You do not have permission to save this rating. Please try logging in again.';
    if (isNotConfiguredError(error)) return 'Server error';
    if (isNetworkError(error)) return 'Network issue';
    if (isServerError(error)) return 'Server error';
    return error && error.message ? error.message : 'Server error';
  }

  function renderUnavailable(mount) {
    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p>Community rating is currently unavailable.</p></div>';
  }

  function meterMarkup(averageValue, count) {
    const clamped = Math.max(0, Math.min(10, Number(averageValue) || 0));
    const pct = (clamped / 10) * 100;
    return '' +
      '<div class="ccg-community-meter" aria-label="Community rating meter" role="img">' +
      '  <div class="ccg-community-meter__track">' +
      '    <div class="ccg-community-meter__fill" style="--ccg-meter-target:' + pct.toFixed(2) + '%"></div>' +
      '  </div>' +
      '  <div class="ccg-community-meter__segments" aria-hidden="true">' +
      Array.from({ length: 10 }).map(function (_, i) {
        return '<span class="ccg-community-meter__segment' + (i < Math.round(clamped) ? ' is-active' : '') + '"></span>';
      }).join('') +
      '  </div>' +
      '  <p class="ccg-community-meter__label"><strong>' + (count ? clamped.toFixed(1) : '—') + '</strong>/10 · ' + count + ' ratings</p>' +
      '</div>';
  }

  async function fetchRatingSummary(supabase, slug) {
    const avgRes = await supabase.from('ratings').select('rating').eq('game_key', slug);
    if (avgRes.error) return { error: avgRes.error };

    const rows = avgRes.data || [];
    const count = rows.length;
    const averageValue = count
      ? rows.reduce(function (sum, row) { return sum + Number(row.rating || 0); }, 0) / count
      : 0;

    return {
      rows: rows,
      count: count,
      averageValue: averageValue
    };
  }

  async function render() {
    const mount = document.getElementById('ccg-community-rating');
    if (!mount) return;

    const slug = getGameSlug();
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      renderUnavailable(mount);
      return;
    }

    try {
      await window.ccgSupabase.waitForAuth();
    } catch (_error) {
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p class="ccg-community-muted">Network issue</p></div>';
      return;
    }

    if (!slug) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Community rating is unavailable for this page.</p></div>';
      return;
    }

    let context = null;
    let supabase = null;
    try {
      context = await window.ccgSupabase.getCurrentUserContext();
      supabase = await window.ccgSupabase.getClient();
    } catch (_error) {
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p class="ccg-community-muted">Network issue</p></div>';
      return;
    }

    const user = context.user;
    const summary = await runQueryWithAuthRetry(function () {
      return fetchRatingSummary(supabase, slug);
    }, supabase);

    if (summary.error && isNotConfiguredError(summary.error)) {
      renderUnavailable(mount);
      return;
    }

    if (summary.error) {
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p class="ccg-community-muted">' + toUserMessage(summary.error) + '</p></div>';
      return;
    }

    let yourRating = '';
    if (user) {
      const yourRes = await runQueryWithAuthRetry(function () {
        return supabase.from('ratings').select('rating').eq('game_key', slug).eq('user_id', user.id).maybeSingle();
      }, supabase);
      if (yourRes.data && yourRes.data.rating) yourRating = String(yourRes.data.rating);
    }

    mount.innerHTML = '' +
      '<div class="ccg-community-card ccg-community-rating-card">' +
      '  <h3>Community Rating</h3>' +
      meterMarkup(summary.averageValue, summary.count) +
      (user
        ? ('<form id="ccg-rating-form" class="ccg-community-inline-form">' +
           '  <label>Your Rating (1–10)' +
           '    <input type="number" min="1" max="10" step="1" value="' + yourRating + '" required name="rating">' +
           '  </label>' +
           '  <button class="ccg-community-btn" type="submit">Save rating</button>' +
           '  <span id="ccg-rating-status" class="ccg-community-muted" aria-live="polite"></span>' +
           '</form>')
        : '<p><button class="ccg-community-btn" id="ccg-login-to-rate" type="button">Log in to rate</button></p>') +
      '</div>';

    if (!user) {
      const btn = document.getElementById('ccg-login-to-rate');
      if (btn) btn.addEventListener('click', function () { routeToLogin(); });
      return;
    }

    const form = document.getElementById('ccg-rating-form');
    if (!form) return;

    let isSubmitting = false;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = document.getElementById('ccg-rating-status');
      if (isSubmitting) return;
      const rating = Number(new FormData(form).get('rating'));
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        status.textContent = 'Rating must be from 1 to 10.';
        return;
      }

      status.textContent = 'Saving…';
      isSubmitting = true;
      try {
        try {
          await window.ccgSupabase.waitForAuth();
        } catch (_error) {
          status.textContent = 'Not logged in';
          routeToLogin();
          return;
        }

        let activeUser = null;
        const authRes = await supabase.auth.getUser();
      activeUser = authRes && authRes.data ? authRes.data.user : null;
      if (!activeUser || activeUser.id !== user.id) {
        const refreshed = await refreshAuthSession(supabase);
        if (refreshed) {
          const refreshedRes = await supabase.auth.getUser();
          activeUser = refreshedRes && refreshedRes.data ? refreshedRes.data.user : null;
        }
      }

      if (!activeUser || activeUser.id !== user.id) {
        status.textContent = 'Not logged in';
        routeToLogin();
        return;
      }

      const { error } = await runQueryWithAuthRetry(function () {
        return supabase
          .from('ratings')
          .upsert({ user_id: activeUser.id, game_key: slug, rating: rating }, { onConflict: 'user_id,game_key' });
      }, supabase);

      if (error) {
        status.textContent = toUserMessage(error);
        return;
      }

      if (window.ccgCommunityBadges && typeof window.ccgCommunityBadges.awardRatingBadges === 'function') {
        await window.ccgCommunityBadges.awardRatingBadges(activeUser.id);
      }
      status.textContent = 'Saved to your account.';
      logRating('saved', { gameSlug: slug, userId: activeUser.id, rating: rating });
      window.dispatchEvent(new CustomEvent('ccg:rating-updated', { detail: { gameSlug: slug } }));
      render();
      } finally {
        isSubmitting = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    window.addEventListener('ccg:auth-ready', render);
    window.addEventListener('ccg:auth-changed', render);
    window.addEventListener('ccg:rating-updated', render);
  });
})();
