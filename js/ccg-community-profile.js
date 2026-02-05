(function () {
  async function loadProfilePage() {
    const mount = document.getElementById('ccg-community-profile-root');
    if (!mount) return;

    const user = await window.ccgCommunityAuth.requireAuth();
    if (!user) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Please log in to view your profile.</p></div>';
      return;
    }

    const profile = window.ccgCommunityAuth.getProfile();
    const supabase = await window.ccgSupabase.getClient();

    const [ratingsRes, commentsRes, badgesRes] = await Promise.all([
      supabase.from('game_ratings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('game_comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_badges').select('badge_code, awarded_at').eq('user_id', user.id).order('awarded_at', { ascending: false })
    ]);

    const ratingsCount = ratingsRes.count || 0;
    const commentsCount = commentsRes.count || 0;
    const badges = badgesRes.data || [];

    mount.innerHTML = '' +
      '<section class="ccg-community-card">' +
      '  <h1>@' + window.ccgCommunityAuth.esc(profile && profile.username ? profile.username : 'User') + '</h1>' +
      '  <p class="ccg-community-muted">' + window.ccgCommunityAuth.esc(user.email || '') + '</p>' +
      '  <div class="ccg-community-stats">' +
      '    <div><strong>' + ratingsCount + '</strong><span>Ratings</span></div>' +
      '    <div><strong>' + commentsCount + '</strong><span>Comments</span></div>' +
      '    <div><strong>' + badges.length + '</strong><span>Badges</span></div>' +
      '  </div>' +
      '  <form id="ccg-profile-edit-form" class="ccg-community-form">' +
      '    <label>Username<input type="text" name="username" required minlength="3" maxlength="24" value="' + window.ccgCommunityAuth.esc(profile && profile.username ? profile.username : '') + '"></label>' +
      '    <label>Avatar URL<input type="url" name="avatar_url" value="' + window.ccgCommunityAuth.esc(profile && profile.avatar_url ? profile.avatar_url : '') + '"></label>' +
      '    <button type="submit" class="ccg-community-btn">Edit profile</button>' +
      '    <button type="button" id="ccg-community-logout" class="ccg-community-btn ccg-community-btn--ghost">Log out</button>' +
      '    <span id="ccg-profile-status" class="ccg-community-muted" aria-live="polite"></span>' +
      '  </form>' +
      '</section>' +
      '<section class="ccg-community-card"><h2>Badges</h2><div class="ccg-badges">' +
      (badges.length
        ? badges.map((badge) => '<span class="ccg-badge">' + window.ccgCommunityAuth.esc(badge.badge_code) + '</span>').join('')
        : '<p class="ccg-community-muted">No badges yet. Rate and comment to earn your first badges.</p>') +
      '</div></section>' +
      '<section class="ccg-community-card" id="ccg-moderation-panel" hidden><h2>Moderation</h2><div id="ccg-report-list"></div></section>';

    document.getElementById('ccg-community-logout').addEventListener('click', function () {
      window.ccgCommunityAuth.logout();
      window.location.href = '/community/index.html';
    });

    document.getElementById('ccg-profile-edit-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = document.getElementById('ccg-profile-status');
      status.textContent = 'Saving…';
      const formData = new FormData(event.currentTarget);
      const payload = {
        id: user.id,
        username: String(formData.get('username') || '').trim(),
        avatar_url: String(formData.get('avatar_url') || '').trim() || null
      };
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      status.textContent = error ? error.message : 'Profile updated.';
      if (!error) window.location.reload();
    });

    if (window.ccgCommunityAuth.isAdminOrMod()) {
      const panel = document.getElementById('ccg-moderation-panel');
      panel.hidden = false;
      const { data: reports } = await supabase
        .from('comment_reports')
        .select('id,reason,created_at,comment_id,game_comments(content,game_slug,is_deleted)')
        .order('created_at', { ascending: false })
        .limit(100);

      const reportList = document.getElementById('ccg-report-list');
      reportList.innerHTML = (reports || []).map((r) => {
        const comment = r.game_comments || {};
        return '' +
          '<article class="ccg-report-card" data-comment-id="' + r.comment_id + '">' +
          '  <p><strong>Game:</strong> ' + window.ccgCommunityAuth.esc(comment.game_slug || 'Unknown') + '</p>' +
          '  <p><strong>Comment:</strong> ' + window.ccgCommunityAuth.esc(comment.content || '[deleted]') + '</p>' +
          '  <p><strong>Reason:</strong> ' + window.ccgCommunityAuth.esc(r.reason || 'No reason provided') + '</p>' +
          '  <button class="ccg-community-btn" type="button" data-mod-action="delete">Soft delete comment</button>' +
          '</article>';
      }).join('') || '<p class="ccg-community-muted">No reports at the moment.</p>';

      reportList.querySelectorAll('[data-mod-action="delete"]').forEach((button) => {
        button.addEventListener('click', async function () {
          const article = button.closest('.ccg-report-card');
          const commentId = Number(article.getAttribute('data-comment-id'));
          await supabase.from('game_comments').update({ is_deleted: true, content: '[deleted]' }).eq('id', commentId);
          button.textContent = 'Deleted';
          button.disabled = true;
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', loadProfilePage);
})();
