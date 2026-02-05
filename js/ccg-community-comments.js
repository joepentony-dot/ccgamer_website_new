(function () {
  function getGameSlug() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('id');
    if (fromQuery) return fromQuery;
    const bodySlug = document.body.getAttribute('data-game-slug');
    if (bodySlug) return bodySlug;
    return null;
  }

  function isNotConfiguredError(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '42P01' || code === 'PGRST205' || message.includes('relation') || message.includes('does not exist');
  }

  function renderUnavailable(mount) {
    mount.innerHTML = '<div class="ccg-community-card"><h3>Community Comments</h3><p>Community features not configured yet.</p></div>';
  }

  function commentCard(comment, currentUser, canModerate, badgeHtml) {
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
      '    </div>' +
      '    <time datetime="' + window.ccgCommunityAuth.esc(comment.created_at || '') + '">' + new Date(comment.created_at).toLocaleString() + '</time>' +
      '  </header>' +
      '  <p class="ccg-comment-card__body">' + content + '</p>' +
      '  <div class="ccg-comment-card__actions">' +
      (own && !comment.is_deleted ? '<button type="button" data-action="edit">Edit</button>' : '') +
      (currentUser && !comment.is_deleted ? '<button type="button" data-action="report">Report</button>' : '') +
      (canModerate && !comment.is_deleted ? '<button type="button" data-action="delete">Soft delete</button>' : '') +
      '  </div>' +
      '</article>';
  }

  async function render() {
    const mount = document.getElementById('ccg-community-comments');
    if (!mount) return;

    const slug = getGameSlug();
    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      renderUnavailable(mount);
      return;
    }

    if (!slug) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Comments unavailable for this page.</p></div>';
      return;
    }

    await window.ccgSupabase.waitForAuth();
    const supabase = await window.ccgSupabase.getClient();
    const user = window.ccgCommunityAuth.getUser();
    const canModerate = window.ccgCommunityAuth.isAdminOrMod();

    const { data, error } = await supabase
      .from('game_comments')
      .select('id,user_id,content,is_deleted,created_at,updated_at,profiles(username,avatar_url,role)')
      .eq('game_slug', slug)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error && isNotConfiguredError(error)) {
      renderUnavailable(mount);
      return;
    }

    if (error) {
      mount.innerHTML = '<div class="ccg-community-card"><h3>Community Comments</h3><p class="ccg-community-muted">Unable to load comments right now.</p></div>';
      return;
    }

    const comments = data || [];
    const userIds = Array.from(new Set(comments.map(function (comment) { return comment.user_id; }).filter(Boolean)));
    const badgeMap = {};

    if (userIds.length && window.ccgCommunityBadges) {
      const { data: badgeRows } = await supabase
        .from('user_badges')
        .select('user_id,badge_code,awarded_at')
        .in('user_id', userIds);

      (badgeRows || []).forEach(function (row) {
        if (!badgeMap[row.user_id]) badgeMap[row.user_id] = [];
        badgeMap[row.user_id].push(row);
      });
    }

    mount.innerHTML = '' +
      '<div class="ccg-community-card">' +
      '  <h3>Community Comments</h3>' +
      (user
        ? '<form id="ccg-comment-form" class="ccg-community-form"><label>Add your comment<textarea name="content" required maxlength="600"></textarea></label><button type="submit" class="ccg-community-btn">Post comment</button><span id="ccg-comment-status" class="ccg-community-muted" aria-live="polite"></span></form>'
        : '<p><button class="ccg-community-btn" id="ccg-login-to-comment" type="button">Log in to comment</button></p>') +
      '  <div class="ccg-comment-list">' +
      (comments.length
        ? comments.map(function (comment) {
          const badges = badgeMap[comment.user_id] || [];
          const compact = badges.slice(0, 2);
          const badgeHtml = compact.length && window.ccgCommunityBadges
            ? window.ccgCommunityBadges.renderBadges(compact, { className: 'ccg-badges ccg-badges--mini', emptyText: '' })
            : '';
          return commentCard(comment, user, canModerate, badgeHtml);
        }).join('')
        : '<p class="ccg-community-muted">No comments yet. Start the discussion.</p>') +
      '  </div>' +
      '</div>';

    if (!user) {
      const loginBtn = document.getElementById('ccg-login-to-comment');
      if (loginBtn) loginBtn.addEventListener('click', function () {
        window.ccgCommunityAuth.openAuthModal('signin');
      });
      return;
    }

    const form = document.getElementById('ccg-comment-form');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = document.getElementById('ccg-comment-status');
      const content = String(new FormData(form).get('content') || '').trim();
      if (!content) return;
      status.textContent = 'Posting…';

      const { error: insertError } = await supabase.from('game_comments').insert({
        user_id: user.id,
        game_slug: slug,
        content: content
      });

      if (insertError) {
        status.textContent = isNotConfiguredError(insertError) ? 'Community features not configured yet.' : 'Unable to post comment right now.';
        return;
      }

      if (window.ccgCommunityBadges && typeof window.ccgCommunityBadges.awardEligibleBadge === 'function') {
        await window.ccgCommunityBadges.awardEligibleBadge(user.id);
      }

      form.reset();
      status.textContent = 'Posted.';
      window.dispatchEvent(new CustomEvent('ccg:comments-updated', { detail: { gameSlug: slug } }));
      render();
    });

    mount.querySelectorAll('.ccg-comment-card button').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const card = btn.closest('.ccg-comment-card');
        const commentId = Number(card.getAttribute('data-comment-id'));
        const action = btn.getAttribute('data-action');

        if (action === 'report') {
          const reason = window.prompt('Report reason (optional):', '');
          const { error: reportError } = await supabase.from('comment_reports').insert({
            reporter_user_id: user.id,
            comment_id: commentId,
            reason: reason || null
          });
          if (!reportError) btn.textContent = 'Reported';
          return;
        }

        if (action === 'edit') {
          const currentText = card.querySelector('.ccg-comment-card__body').textContent || '';
          const updated = window.prompt('Edit your comment:', currentText);
          if (!updated || !updated.trim()) return;
          await supabase.from('game_comments').update({ content: updated.trim() }).eq('id', commentId).eq('user_id', user.id);
          render();
          return;
        }

        if (action === 'delete' && canModerate) {
          await supabase.from('game_comments').update({ is_deleted: true, content: '[deleted]' }).eq('id', commentId);
          render();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    window.addEventListener('ccg:auth-ready', render);
    window.addEventListener('ccg:auth-changed', render);
    window.addEventListener('ccg:comments-updated', render);
  });
})();
