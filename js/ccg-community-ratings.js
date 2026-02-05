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

  function renderUnavailable(mount) {
    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p>Community features not configured.</p></div>';
  }

  async function awardBadge(userId) {
    const supabase = await window.ccgSupabase.getClient();
    await supabase.rpc('award_badge_if_eligible', { target_user_id: userId });
  }

  async function render() {
    const mount = document.getElementById('ccg-community-rating');
    if (!mount) return;

    const slug = getGameSlug();
    if (!slug) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Community rating is unavailable for this page.</p></div>';
      return;
    }

    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Rating</h3><p>Loading…</p></div>';
    const user = window.ccgCommunityAuth.getUser();

    let supabase;
    try {
      supabase = await window.ccgSupabase.getClient();
    } catch (_error) {
      renderUnavailable(mount);
      return;
    }

    const avgRes = await supabase
      .from('game_ratings')
      .select('rating', { count: 'exact' })
      .eq('game_slug', slug);

    if (avgRes.error && isNotConfiguredError(avgRes.error)) {
      renderUnavailable(mount);
      return;
    }

    let yourRating = null;
    if (user) {
      const yourRes = await supabase
        .from('game_ratings')
        .select('rating')
        .eq('game_slug', slug)
        .eq('user_id', user.id)
        .maybeSingle();

      if (yourRes.error && isNotConfiguredError(yourRes.error)) {
        renderUnavailable(mount);
        return;
      }

      yourRating = yourRes.data ? yourRes.data.rating : null;
    }

    const rows = avgRes.data || [];
    const count = rows.length;
    const average = count ? (rows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count).toFixed(1) : '—';

    mount.innerHTML = '' +
      '<div class="ccg-community-card">' +
      '  <h3>Community Rating</h3>' +
      '  <p class="ccg-community-muted">Average: <strong>' + average + '</strong> from ' + count + ' ratings</p>' +
      (user
        ? ('<form id="ccg-rating-form" class="ccg-community-inline-form">' +
           '  <label>Your Rating (1–10)' +
           '    <input type="number" min="1" max="10" step="1" value="' + (yourRating || '') + '" required name="rating">' +
           '  </label>' +
           '  <button class="ccg-community-btn" type="submit">Save rating</button>' +
           '  <span id="ccg-rating-status" class="ccg-community-muted" aria-live="polite"></span>' +
           '</form>')
        : '<p><button class="ccg-community-btn" id="ccg-login-to-rate" type="button">Log in to rate</button></p>') +
      '</div>';

    if (!user) {
      const btn = document.getElementById('ccg-login-to-rate');
      if (btn) btn.addEventListener('click', function () {
        window.ccgCommunityAuth.openAuthModal('signin');
      });
      return;
    }

    const form = document.getElementById('ccg-rating-form');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = document.getElementById('ccg-rating-status');
      const rating = Number(new FormData(form).get('rating'));
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        status.textContent = 'Rating must be from 1 to 10.';
        return;
      }

      status.textContent = 'Saving…';
      const { error } = await supabase
        .from('game_ratings')
        .upsert({ user_id: user.id, game_slug: slug, rating }, { onConflict: 'user_id,game_slug' });

      if (error) {
        status.textContent = isNotConfiguredError(error) ? 'Community features not configured.' : error.message;
        return;
      }

      await awardBadge(user.id);
      status.textContent = 'Saved.';
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    window.addEventListener('ccg:auth-changed', render);
  });
})();
