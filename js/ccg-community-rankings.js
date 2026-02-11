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

  function classifyError(error) {
    const status = Number(error && (error.status || error.code || error.statusCode));
    if (status === 401) return 'Login required to view this ranking right now.';
    if (status === 403) return 'You do not have permission to view rankings.';
    if (status >= 500) return 'Rankings are currently unavailable.';
    return 'Unable to load rankings right now.';
  }

  function renderState(mount, text) {
    mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">' + esc(text) + '</p></section>';
  }

  function renderRows(mount, rows) {
    if (!rows.length) {
      renderState(mount, 'No rankings data yet. Community progress will appear here.');
      return;
    }

    mount.innerHTML = rows.map(function (row, index) {
      const username = row.username || 'member';
      const points = Number(row.score || 0);
      const comments = Number(row.comment_count || 0);
      const ratings = Number(row.rating_count || 0);
      return ''
        + '<article class="ccg-community-card ccg-perks-card">'
        + '<h3>#' + (index + 1) + ' <a href="/community/profile.html?u=' + encodeURIComponent(username) + '">@' + esc(username) + '</a></h3>'
        + '<p class="ccg-community-muted">Engagement ' + points + ' · ' + comments + ' comments · ' + ratings + ' ratings</p>'
        + '</article>';
    }).join('');
  }

  async function init() {
    const mount = document.getElementById('ccg-community-rankings-root');
    if (!mount) return;

    renderState(mount, 'Loading rankings…');

    try {
      await window.ccgSupabase.waitForAuth();
      const supabase = await window.ccgSupabase.getClient();
      const [profilesRes, commentsRes, ratingsRes] = await Promise.all([
        supabase.from('profiles').select('id,username').limit(1000),
        supabase.from('comments').select('user_id').limit(12000),
        supabase.from('ratings').select('user_id').limit(12000)
      ]);

      if (profilesRes.error || commentsRes.error || ratingsRes.error) {
        const err = profilesRes.error || commentsRes.error || ratingsRes.error;
        console.error('[CCG-RANKINGS] load failed', err);
        renderState(mount, classifyError(err));
        return;
      }

      const stats = new Map();
      function touch(id) {
        if (!id) return null;
        if (!stats.has(id)) stats.set(id, { comment_count: 0, rating_count: 0, score: 0 });
        return stats.get(id);
      }
      (commentsRes.data || []).forEach(function (row) { const x = touch(row.user_id); if (x) { x.comment_count += 1; x.score += 2; } });
      (ratingsRes.data || []).forEach(function (row) { const x = touch(row.user_id); if (x) { x.rating_count += 1; x.score += 1; } });

      const rows = (profilesRes.data || []).map(function (p) {
        const x = stats.get(p.id) || { comment_count: 0, rating_count: 0, score: 0 };
        return { username: p.username || 'member', comment_count: x.comment_count, rating_count: x.rating_count, score: x.score };
      }).sort(function(a,b){ return b.score - a.score; }).slice(0,50);

      renderRows(mount, rows);
    } catch (error) {
      console.error('[CCG-RANKINGS] unexpected failure', error);
      renderState(mount, 'Rankings are currently unavailable.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
