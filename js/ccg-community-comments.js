(function () {
  function getGameSlug() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('id');
    if (fromQuery) return fromQuery;
    const bodySlug = document.body.getAttribute('data-game-slug');
    if (bodySlug) return bodySlug;
    return null;
  }

  async function awardBadge(userId) {
    const supabase = await window.ccgSupabase.getClient();
    await supabase.rpc('award_badge_if_eligible', { target_user_id: userId });
  }

  function commentCard(comment, currentUser, canModerate) {
    const profile = comment.profiles || {};
    const username = window.ccgCommunityAuth.esc(profile.username || 'Community member');
    const content = comment.is_deleted
      ? '<em>This comment has been removed by moderation.</em>'
      : window.ccgCommunityAuth.esc(comment.content || '');
    const own = currentUser && currentUser.id === comment.user_id;

    return '' +
      '<article class="ccg-comment-card" data-comment-id="' + comment.id + '">' +
      '  <header class="ccg-comment-card__head">' +
      '    <strong>@' + username + '</strong>' +
      '    <time>' + new Date(comment.created_at).toLocaleString() + '</time>' +
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
    if (!slug) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Comments unavailable for this page.</p></div>';
      return;
    }

    const supabase = await window.ccgSupabase.getClient();
    const user = window.ccgCommunityAuth.getUser();
    const canModerate = window.ccgCommunityAuth.isAdminOrMod();

    const { data, error } = await supabase
      .from('game_comments')
      .select('id,user_id,content,is_deleted,created_at,updated_at,profiles(username,avatar_url,role)')
      .eq('game_slug', slug)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      mount.innerHTML = '<div class="ccg-community-card"><p>' + window.ccgCommunityAuth.esc(error.message) + '</p></div>';
      return;
    }

    mount.innerHTML = '' +
      '<div class="ccg-community-card">' +
      '  <h3>Community Comments</h3>' +
      (user
        ? '<form id="ccg-comment-form" class="ccg-community-form"><label>Add your comment<textarea name="content" required maxlength="600"></textarea></label><button type="submit" class="ccg-community-btn">Post comment</button><span id="ccg-comment-status" class="ccg-community-muted" aria-live="polite"></span></form>'
        : '<p><button class="ccg-community-btn" id="ccg-login-to-comment" type="button">Log in to comment</button></p>') +
      '  <div class="ccg-comment-list">' +
      (data || []).map((comment) => commentCard(comment, user, canModerate)).join('') +
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
        content
      });
      if (insertError) {
        status.textContent = insertError.message;
        return;
      }
      await awardBadge(user.id);
      form.reset();
      status.textContent = 'Posted.';
      render();
    });

    mount.querySelectorAll('.ccg-comment-card button').forEach((btn) => {
      btn.addEventListener('click', async function () {
        const card = btn.closest('.ccg-comment-card');
        const commentId = Number(card.getAttribute('data-comment-id'));
        const action = btn.getAttribute('data-action');

        if (action === 'report') {
          const reason = window.prompt('Report reason (optional):', '');
          await supabase.from('comment_reports').insert({
            reporter_user_id: user.id,
            comment_id: commentId,
            reason: reason || null
          });
          return;
        }

        if (action === 'edit') {
          const currentText = card.querySelector('.ccg-comment-card__body').textContent || '';
          const next = window.prompt('Edit your comment:', currentText.trim());
          if (!next) return;
          await supabase
            .from('game_comments')
            .update({ content: next })
            .eq('id', commentId)
            .eq('user_id', user.id);
          render();
          return;
        }

        if (action === 'delete' && canModerate) {
          await supabase
            .from('game_comments')
            .update({ is_deleted: true, content: '[deleted]' })
            .eq('id', commentId);
          render();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    window.addEventListener('ccg:auth-changed', render);
  });
})();
