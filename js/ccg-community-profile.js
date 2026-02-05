(function () {
  function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  async function loadViewerContext() {
    const authUser = window.ccgCommunityAuth.getUser();
    const profile = window.ccgCommunityAuth.getProfile();
    return { authUser: authUser, authProfile: profile };
  }

  async function fetchPublicProfile(supabase, userRef) {
    if (!userRef) return null;
    const byId = await supabase
      .from('profiles')
      .select('id,username,avatar_url,role,created_at')
      .eq('id', userRef)
      .maybeSingle();
    if (byId.data) return byId.data;

    const byUsername = await supabase
      .from('profiles')
      .select('id,username,avatar_url,role,created_at')
      .eq('username', userRef)
      .maybeSingle();

    return byUsername.data || null;
  }

  async function loadProfilePage() {
    const mount = document.getElementById('ccg-community-profile-root');
    if (!mount) return;

    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Community features not configured yet.</p></div>';
      return;
    }

    const supabase = await window.ccgSupabase.getClient();
    const queryUser = getQueryParam('u');
    const context = await loadViewerContext();

    let targetProfile = null;
    if (queryUser) {
      targetProfile = await fetchPublicProfile(supabase, queryUser);
    } else if (context.authUser) {
      targetProfile = context.authProfile || await fetchPublicProfile(supabase, context.authUser.id);
    }

    if (!targetProfile) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Profile not found. Log in to view your profile or open a valid profile link.</p></div>';
      return;
    }

    const isOwnProfile = Boolean(context.authUser && context.authUser.id === targetProfile.id);
    const [ratingsRes, commentsRes, badges] = await Promise.all([
      supabase.from('game_ratings').select('id', { count: 'exact', head: true }).eq('user_id', targetProfile.id),
      supabase.from('game_comments').select('id', { count: 'exact', head: true }).eq('user_id', targetProfile.id),
      window.ccgCommunityBadges.fetchUserBadges(targetProfile.id)
    ]);

    const ratingsCount = ratingsRes.count || 0;
    const commentsCount = commentsRes.count || 0;
    const joined = targetProfile.created_at ? new Date(targetProfile.created_at).toLocaleDateString() : 'Unknown';
    const avatar = targetProfile.avatar_url
      ? '<img src="' + window.ccgCommunityAuth.esc(targetProfile.avatar_url) + '" alt="' + window.ccgCommunityAuth.esc(targetProfile.username || 'Profile avatar') + ' avatar" class="ccg-profile-avatar">'
      : '<div class="ccg-profile-avatar ccg-profile-avatar--placeholder" aria-hidden="true">Ω</div>';

    mount.innerHTML = '' +
      '<section class="ccg-community-card ccg-profile-card">' +
      '  <div class="ccg-profile-header">' + avatar +
      '    <div>' +
      '      <h1>@' + window.ccgCommunityAuth.esc(targetProfile.username || 'User') + '</h1>' +
      '      <p class="ccg-community-muted">Joined ' + joined + '</p>' +
      '      <p class="ccg-community-muted">' + (isOwnProfile && context.authUser ? window.ccgCommunityAuth.esc(context.authUser.email || '') : 'Public community profile') + '</p>' +
      '    </div>' +
      '  </div>' +
      '  <div class="ccg-community-stats">' +
      '    <div><strong>' + ratingsCount + '</strong><span>Total ratings</span></div>' +
      '    <div><strong>' + commentsCount + '</strong><span>Total comments</span></div>' +
      '    <div><strong>' + badges.length + '</strong><span>Badges earned</span></div>' +
      '  </div>' +
      (isOwnProfile
        ? ('<form id="ccg-profile-edit-form" class="ccg-community-form">' +
           '  <label>Username<input type="text" name="username" required minlength="3" maxlength="24" value="' + window.ccgCommunityAuth.esc(targetProfile.username || '') + '"></label>' +
           '  <label>Avatar URL<input type="url" name="avatar_url" value="' + window.ccgCommunityAuth.esc(targetProfile.avatar_url || '') + '"></label>' +
           '  <div class="ccg-community-auth__actions">' +
           '    <button type="submit" class="ccg-community-btn">Edit profile</button>' +
           '    <button type="button" id="ccg-community-logout" class="ccg-community-btn ccg-community-btn--ghost">Log out</button>' +
           '  </div>' +
           '  <span id="ccg-profile-status" class="ccg-community-muted" aria-live="polite"></span>' +
           '</form>')
        : '') +
      '</section>' +
      '<section class="ccg-community-card"><h2>Badges</h2>' +
      window.ccgCommunityBadges.renderBadges(badges, { emptyText: 'No badges yet. Rate and comment to earn your first badges.' }) +
      '</section>' +
      '<section class="ccg-community-card" id="ccg-moderation-panel"' + (window.ccgCommunityAuth.isAdminOrMod() ? '' : ' hidden') + '><h2>Moderation</h2><div id="ccg-report-list"></div></section>';

    if (isOwnProfile) {
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
          id: context.authUser.id,
          username: String(formData.get('username') || '').trim(),
          avatar_url: String(formData.get('avatar_url') || '').trim() || null
        };
        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        status.textContent = error ? error.message : 'Profile updated.';
        if (!error) window.location.reload();
      });
    }

    if (window.ccgCommunityAuth.isAdminOrMod()) {
      const { data: reports } = await supabase
        .from('comment_reports')
        .select('id,reason,created_at,comment_id,game_comments(content,game_slug,is_deleted)')
        .order('created_at', { ascending: false })
        .limit(100);

      const reportList = document.getElementById('ccg-report-list');
      reportList.innerHTML = (reports || []).map(function (report) {
        const comment = report.game_comments || {};
        return '' +
          '<article class="ccg-report-card" data-comment-id="' + report.comment_id + '">' +
          '  <p><strong>Game:</strong> ' + window.ccgCommunityAuth.esc(comment.game_slug || 'Unknown') + '</p>' +
          '  <p><strong>Comment:</strong> ' + window.ccgCommunityAuth.esc(comment.content || '[deleted]') + '</p>' +
          '  <p><strong>Reason:</strong> ' + window.ccgCommunityAuth.esc(report.reason || 'No reason provided') + '</p>' +
          '  <button class="ccg-community-btn" type="button" data-mod-action="delete">Soft delete comment</button>' +
          '</article>';
      }).join('') || '<p class="ccg-community-muted">No reports at the moment.</p>';

      reportList.querySelectorAll('[data-mod-action="delete"]').forEach(function (button) {
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
