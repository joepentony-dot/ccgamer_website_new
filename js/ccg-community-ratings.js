(function () {
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

  function toUserMessage(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    if (code === '401' || code === '403' || code === 'PGRST301' || message.includes('jwt') || message.includes('auth')) return 'Your session expired. Please log in again to save your rating.';
    if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) return 'You do not have permission to save this rating. Please try logging in again.';
    if (isNotConfiguredError(error)) return 'Community features not configured yet.';
    return error && error.message ? error.message : 'Unable to save your rating right now. Please try again.';
  }

  function renderUnavailable(mount) {
    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p>Community features not configured yet.</p></div>';
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
    const avgRes = await supabase.from('game_ratings').select('rating').eq('game_slug', slug);
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

    if (!slug) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Community rating is unavailable for this page.</p></div>';
      return;
    }

    await window.ccgSupabase.waitForAuth();
    const user = window.ccgCommunityAuth.getUser();
    const supabase = await window.ccgSupabase.getClient();
    const summary = await fetchRatingSummary(supabase, slug);

    if (summary.error && isNotConfiguredError(summary.error)) {
      renderUnavailable(mount);
      return;
    }

    if (summary.error) {
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p class="ccg-community-muted">Unable to load ratings right now.</p></div>';
      return;
    }

    let yourRating = '';
    if (user) {
      const yourRes = await supabase.from('game_ratings').select('rating').eq('game_slug', slug).eq('user_id', user.id).maybeSingle();
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
      if (btn) btn.addEventListener('click', function () { window.ccgCommunityAuth.openAuthModal('signin'); });
      return;
    }

    const form = document.getElementById('ccg-rating-form');
    if (!form) return;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = document.getElementById('ccg-rating-status');
      const rating = Number(new FormData(form).get('rating'));
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        status.textContent = 'Rating must be from 1 to 10.';
        return;
      }

      status.textContent = 'Saving…';
      const authRes = await supabase.auth.getUser();
      const activeUser = authRes && authRes.data ? authRes.data.user : null;
      if (!activeUser || activeUser.id !== user.id) {
        status.textContent = 'Your session expired. Please log in again to save your rating.';
        window.ccgCommunityAuth.openAuthModal('signin');
        return;
      }

      const { error } = await supabase
        .from('game_ratings')
        .upsert({ user_id: activeUser.id, game_slug: slug, rating: rating }, { onConflict: 'user_id,game_slug' });

      if (error) {
        status.textContent = toUserMessage(error);
        return;
      }

      if (window.ccgCommunityBadges && typeof window.ccgCommunityBadges.awardEligibleBadge === 'function') {
        await window.ccgCommunityBadges.awardEligibleBadge(activeUser.id);
      }
      status.textContent = 'Saved to your account.';
      window.dispatchEvent(new CustomEvent('ccg:rating-updated', { detail: { gameSlug: slug } }));
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    window.addEventListener('ccg:auth-changed', render);
    window.addEventListener('ccg:rating-updated', render);
  });
})();
