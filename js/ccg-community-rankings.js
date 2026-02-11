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
    if (status >= 500) return 'Rankings are temporarily unavailable.';
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
      const points = Number(row.rep_points || 0);
      const level = Number(row.rep_level || 1);
      const title = row.level_title || 'Community Member';
      return ''
        + '<article class="ccg-community-card ccg-perks-card">'
        + '<h3>#' + (index + 1) + ' <a href="/community/profile.html?u=' + encodeURIComponent(username) + '">@' + esc(username) + '</a></h3>'
        + '<p class="ccg-community-muted">REP ' + points + ' · Lvl ' + level + '</p>'
        + '<p>' + esc(title) + '</p>'
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
      const result = await supabase
        .from('community_rankings')
        .select('user_id,username,rep_points,rep_level,level_title')
        .order('rep_points', { ascending: false })
        .limit(50);

      if (result.error) {
        console.error('[CCG-RANKINGS] load failed', result.error);
        renderState(mount, classifyError(result.error));
        return;
      }

      renderRows(mount, result.data || []);
    } catch (error) {
      console.error('[CCG-RANKINGS] unexpected failure', error);
      renderState(mount, 'Rankings are temporarily unavailable.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
