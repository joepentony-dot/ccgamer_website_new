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

  function renderState(mount, text) {
    mount.innerHTML = '<section class="ccg-community-card"><p class="ccg-community-muted">' + esc(text) + '</p></section>';
  }

  function progressLabel(progress) {
    if (!progress) return 'Not started';
    if (progress.completed_at) return 'Completed';
    return JSON.stringify(progress.progress_json || {});
  }

  async function init() {
    const mount = document.getElementById('ccg-community-challenges-root');
    if (!mount) return;

    renderState(mount, 'Loading challenge board…');

    try {
      await window.ccgSupabase.waitForAuth();
      const supabase = await window.ccgSupabase.getClient();
      const context = await window.ccgSupabase.getCurrentUserContext();
      const userId = context && context.user ? context.user.id : null;

      const challengesRes = await supabase
        .from('challenges')
        .select('id,title,description,supporter_only,start_at,end_at,reward_json,active')
        .eq('active', true)
        .order('start_at', { ascending: false })
        .limit(32);

      if (challengesRes.error) {
        console.error('[CCG-CHALLENGES] load challenges failed', challengesRes.error);
        renderState(mount, 'Unable to load challenges right now.');
        return;
      }

      const rows = challengesRes.data || [];
      if (!rows.length) {
        renderState(mount, 'No active challenges right now.');
        return;
      }

      const progressMap = {};
      if (userId) {
        const progressRes = await supabase
          .from('user_challenge_progress')
          .select('challenge_id,progress_json,completed_at')
          .eq('user_id', userId);

        if (!progressRes.error) {
          (progressRes.data || []).forEach(function (row) {
            progressMap[row.challenge_id] = row;
          });
        }
      }

      mount.innerHTML = rows.map(function (challenge) {
        const progress = progressMap[challenge.id];
        return ''
          + '<article class="ccg-community-card ccg-perks-card">'
          + '<h3>' + esc(challenge.title || 'Challenge') + '</h3>'
          + '<p class="ccg-community-muted">' + (challenge.supporter_only ? 'Supporter-only bonus lane' : 'Open challenge') + '</p>'
          + '<p>' + esc(challenge.description || '') + '</p>'
          + '<p class="ccg-community-muted">Rewards: ' + esc(JSON.stringify(challenge.reward_json || {})) + '</p>'
          + '<p class="ccg-community-muted">Progress: ' + esc(progressLabel(progress)) + '</p>'
          + '</article>';
      }).join('');
    } catch (error) {
      console.error('[CCG-CHALLENGES] unexpected failure', error);
      renderState(mount, 'Challenge board is currently unavailable.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
