(function () {
  const COMMENT_PAGE_SIZE = 10;

  function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  function esc(value) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.esc === 'function') {
      return window.ccgCommunityAuth.esc(value);
    }
    return String(value || '');
  }

  function formatDate(value) {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  async function loadViewerContext() {
    const context = await window.ccgSupabase.getCurrentUserContext();
    const profile = window.ccgCommunityAuth.getProfile();
    return { authUser: context.user, authProfile: profile, permissions: context.permissions, isAuthenticated: context.isAuthenticated };
  }

  async function fetchPublicProfile(supabase, userRef) {
    if (!userRef) return null;
    const byId = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,bio,role,created_at')
      .eq('id', userRef)
      .maybeSingle();
    if (byId.data) return byId.data;

    const byUsername = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,bio,role,created_at')
      .eq('username', userRef)
      .maybeSingle();

    return byUsername.data || null;
  }

  async function fetchRecentComments(supabase, userId, from, to) {
    const result = await supabase
      .from('game_comments')
      .select('id,game_slug,content,is_deleted,created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (result.error) {
      return { rows: [], total: 0 };
    }

    return {
      rows: result.data || [],
      total: Number(result.count || 0)
    };
  }

  function renderCommentActivity(rows) {
    if (!rows.length) {
      return '<p class="ccg-community-muted">No comment activity yet.</p>';
    }

    return '<ul class="ccg-profile-activity-list">' + rows.map(function (row) {
      return '' +
        '<li class="ccg-profile-activity-item">' +
        '  <div class="ccg-profile-activity-item__main">' +
        '    <a href="/games/' + encodeURIComponent(row.game_slug || '') + '/" class="ccg-profile-activity-item__game">' + esc(row.game_slug || 'unknown-game') + '</a>' +
        '    <time datetime="' + esc(row.created_at || '') + '">' + esc(formatDate(row.created_at)) + '</time>' +
        '  </div>' +
        '  <p class="ccg-profile-activity-item__text">' + (row.is_deleted ? '<em>Comment deleted</em>' : esc(row.content || '')) + '</p>' +
        '</li>';
    }).join('') + '</ul>';
  }

  async function loadProfilePage() {
    const mount = document.getElementById('ccg-community-profile-root');
    if (!mount) return;

    mount.innerHTML = '<section class="ccg-community-card"><div class="ccg-profile-skeleton"></div><div class="ccg-profile-skeleton"></div></section>';

    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Community features not configured yet.</p></div>';
      return;
    }

    const context = await loadViewerContext();
    const supabase = await window.ccgSupabase.getClient();
    const queryUser = getQueryParam('u');
    const pageParam = Number(getQueryParam('page') || '1');
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const from = (page - 1) * COMMENT_PAGE_SIZE;
    const to = from + COMMENT_PAGE_SIZE - 1;

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

    const [ratingsRes, commentsRes, badges, activity] = await Promise.all([
      supabase.from('game_ratings').select('id', { count: 'exact', head: true }).eq('user_id', targetProfile.id),
      supabase.from('game_comments').select('id', { count: 'exact', head: true }).eq('user_id', targetProfile.id),
      window.ccgCommunityBadges.fetchUserBadges(targetProfile.id),
      fetchRecentComments(supabase, targetProfile.id, from, to)
    ]);

    const ratingsCount = ratingsRes.count || 0;
    const commentsCount = commentsRes.count || 0;
    const joined = formatDate(targetProfile.created_at);
    const displayName = targetProfile.display_name || targetProfile.username || 'Community member';
    const roleLabel = targetProfile.role || 'member';
    const bio = targetProfile.bio ? esc(targetProfile.bio) : 'No bio yet. This user is all gameplay, no fluff.';

    const avatar = targetProfile.avatar_url
      ? '<img src="' + esc(targetProfile.avatar_url) + '" alt="' + esc(displayName) + ' avatar" class="ccg-profile-avatar">'
      : '<div class="ccg-profile-avatar ccg-profile-avatar--placeholder" aria-hidden="true">Ω</div>';

    const totalActivityPages = Math.max(1, Math.ceil(activity.total / COMMENT_PAGE_SIZE));
    const prevPage = Math.max(1, page - 1);
    const nextPage = Math.min(totalActivityPages, page + 1);

    mount.innerHTML = '' +
      '<section class="ccg-community-card ccg-profile-card ccg-profile-card--omega">' +
      '  <div class="ccg-profile-header">' +
      avatar +
      '    <div class="ccg-profile-header__content">' +
      '      <p class="ccg-profile-eyebrow">OMEGA COMMUNITY PROFILE</p>' +
      '      <h1>' + esc(displayName) + '</h1>' +
      '      <p class="ccg-profile-username">@' + esc(targetProfile.username || 'user') + '</p>' +
      '      <div class="ccg-profile-meta">' +
      '        <span class="ccg-badge">Role: ' + esc(roleLabel) + '</span>' +
      '        <span class="ccg-badge">Joined: ' + esc(joined) + '</span>' +
      '      </div>' +
      '      <p class="ccg-community-muted">' + (isOwnProfile && context.authUser ? esc(context.authUser.email || '') : 'Public profile view') + '</p>' +
      '    </div>' +
      '  </div>' +
      '  <p class="ccg-profile-bio">' + bio + '</p>' +
      '  <div class="ccg-community-stats">' +
      '    <div><strong>' + ratingsCount + '</strong><span>Total ratings</span></div>' +
      '    <div><strong>' + commentsCount + '</strong><span>Total comments</span></div>' +
      '    <div><strong>' + badges.length + '</strong><span>Badges earned</span></div>' +
      '  </div>' +
      (isOwnProfile
        ? ('<form id="ccg-profile-edit-form" class="ccg-community-form ccg-profile-edit-form">' +
           '  <label>Username<input type="text" name="username" required minlength="3" maxlength="24" value="' + esc(targetProfile.username || '') + '"></label>' +
           '  <label>Display name<input type="text" name="display_name" maxlength="42" value="' + esc(targetProfile.display_name || '') + '"></label>' +
           '  <label>Avatar URL<input type="url" name="avatar_url" value="' + esc(targetProfile.avatar_url || '') + '"></label>' +
           '  <label>Bio<textarea name="bio" maxlength="220">' + esc(targetProfile.bio || '') + '</textarea></label>' +
           '  <div class="ccg-community-auth__actions">' +
           '    <button type="submit" class="ccg-community-btn">Save profile</button>' +
           '    <button type="button" id="ccg-community-logout" class="ccg-community-btn ccg-community-btn--ghost">Log out</button>' +
           '  </div>' +
           '  <span id="ccg-profile-status" class="ccg-community-muted" aria-live="polite"></span>' +
           '</form>')
        : '') +
      '</section>' +
      '<section class="ccg-community-card ccg-profile-card ccg-profile-card--activity">' +
      '  <div class="ccg-profile-activity-header">' +
      '    <h2>My Activity</h2>' +
      '    <span class="ccg-community-muted">Showing latest comments</span>' +
      '  </div>' +
      renderCommentActivity(activity.rows) +
      '  <div class="ccg-profile-activity-pagination">' +
      '    <a class="ccg-community-btn ccg-community-btn--ghost" ' + (page <= 1 ? 'aria-disabled="true"' : '') + ' href="' + buildProfileHref(targetProfile.username, prevPage) + '">Previous</a>' +
      '    <span class="ccg-community-muted">Page ' + page + ' / ' + totalActivityPages + '</span>' +
      '    <a class="ccg-community-btn ccg-community-btn--ghost" ' + (page >= totalActivityPages ? 'aria-disabled="true"' : '') + ' href="' + buildProfileHref(targetProfile.username, nextPage) + '">Next</a>' +
      '  </div>' +
      '</section>' +
      '<section class="ccg-community-card"><h2>Badges</h2>' +
      window.ccgCommunityBadges.renderBadges(badges, { emptyText: 'No badges yet. Rate and comment to earn your first badges.' }) +
      '</section>' +
      '<section class="ccg-community-card" id="ccg-moderation-panel"' + (context.permissions.canModerate ? '' : ' hidden') + '><h2>Moderation</h2><div id="ccg-report-list"></div></section>';

    if (isOwnProfile) {
      document.getElementById('ccg-community-logout').addEventListener('click', async function () {
        await window.ccgCommunityAuth.logout();
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
          display_name: String(formData.get('display_name') || '').trim() || null,
          avatar_url: String(formData.get('avatar_url') || '').trim() || null,
          bio: String(formData.get('bio') || '').trim() || null
        };
        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        status.textContent = error ? error.message : 'Profile updated.';
        if (!error) {
          window.setTimeout(function () { window.location.reload(); }, 500);
        }
      });
    }

    if (context.permissions.canModerate) {
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
          '  <p><strong>Game:</strong> ' + esc(comment.game_slug || 'Unknown') + '</p>' +
          '  <p><strong>Comment:</strong> ' + esc(comment.content || '[deleted]') + '</p>' +
          '  <p><strong>Reason:</strong> ' + esc(report.reason || 'No reason provided') + '</p>' +
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

  function buildProfileHref(username, page) {
    const params = new URLSearchParams(window.location.search);
    if (username && params.get('u')) {
      params.set('u', username);
    }
    params.set('page', String(page));
    return '/community/profile.html?' + params.toString();
  }

  document.addEventListener('DOMContentLoaded', loadProfilePage);
  window.addEventListener('ccg:auth-ready', loadProfilePage);
  window.addEventListener('ccg:auth-changed', loadProfilePage);
})();
