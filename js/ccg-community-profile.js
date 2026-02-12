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

  function notify(message, type) {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.showToast === 'function') {
      window.ccgCommunityAuth.showToast(message, type || 'info');
    }
  }

  function formatDate(value) {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }


  function classifyStatusMessage(error, fallback) {
    const status = Number(error && (error.status || error.code || error.statusCode));
    if (status === 401) return 'Login required';
    if (status === 403) return 'Permission denied';
    if (status === 404) return 'Endpoint missing / not deployed';
    if (status >= 500) return 'Server error';
    return fallback || 'Server error';
  }

  function logEndpointFailure(endpoint, error) {
    console.error('[CCG-PROFILE] endpoint failure', {
      endpoint: endpoint,
      status: error && (error.status || error.code || error.statusCode) || 'unknown',
      bodySnippet: String(error && (error.details || error.message || error.hint) || '').slice(0, 300)
    });
  }

  function validateProfilePayload(payload) {
    if (!payload.username || payload.username.length < 3) return 'Username must be at least 3 characters.';
    if (!/^[A-Za-z0-9_-]+$/.test(payload.username)) return 'Username can only include letters, numbers, _ and -.';
    if (payload.display_name && payload.display_name.length > 42) return 'Display name is too long.';
    if (payload.bio && payload.bio.length > 220) return 'Bio is too long.';
    if (payload.avatar_url) {
      try {
        const url = new URL(payload.avatar_url);
        if (!['https:', 'http:'].includes(url.protocol)) return 'Avatar URL must use http or https.';
      } catch (_error) {
        return 'Avatar URL is invalid.';
      }
    }
    return '';
  }

  async function loadViewerContext() {
    const context = await window.ccgSupabase.waitForSessionReady();
    const profile = window.ccgCommunityAuth.getProfile();
    return { authUser: context.user, authProfile: profile, permissions: context.permissions, isAuthenticated: context.isAuthenticated };
  }

  async function fetchPublicProfile(supabase, userRef) {
    if (!userRef) return null;
    const fields = 'id,username,display_name,avatar_url';

    const byId = await supabase.from('profiles').select(fields).eq('id', userRef).maybeSingle();
    if (byId.data) return byId.data;

    const byUsername = await supabase.from('profiles').select(fields).eq('username', userRef).maybeSingle();
    return byUsername.data || null;
  }


  async function fetchUserBadges(userId, supabaseClient) {
    if (window.ccgCommunityBadges && typeof window.ccgCommunityBadges.fetchUserBadges === 'function') {
      return window.ccgCommunityBadges.fetchUserBadges(userId, supabaseClient);
    }
    return [];
  }

  async function safeSupporterLinkLookup(supabase, userId) {
    try {
      const result = await supabase
        .from('supporter_links')
        .select('eight_bit_title,profile_banner_key,supporter_frame_key,supporter_level,supporter_title')
        .eq('user_id', userId)
        .maybeSingle();
      if (result && result.error && Number(result.error.status || result.error.code) === 404) {
        console.warn('supporter_links not available', result.error);
        return { data: null, error: null };
      }
      return result;
    } catch (error) {
      if (Number(error && (error.status || error.code)) === 404) {
        console.warn('supporter_links not available', error);
        return { data: null, error: null };
      }
      throw error;
    }
  }

  async function ensureOwnProfileRow(supabase, authUser, authProfile) {
    if (!authUser || !authUser.id) return null;
    const existing = authProfile || await fetchPublicProfile(supabase, authUser.id);
    if (existing) return existing;

    const fallbackUsername = String((authUser.email || 'member').split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || ('member-' + String(authUser.id).slice(0, 8));
    const payload = {
      id: authUser.id,
      username: fallbackUsername,
      display_name: authUser.user_metadata && authUser.user_metadata.full_name ? String(authUser.user_metadata.full_name).slice(0, 42) : null,
      avatar_url: authUser.user_metadata && authUser.user_metadata.avatar_url ? String(authUser.user_metadata.avatar_url) : null
    };

    const upsertRes = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('id,username,display_name,avatar_url').maybeSingle();
    if (upsertRes.error) {
      console.error('[CCG-PROFILE] ensureOwnProfileRow failed', upsertRes.error);
      return null;
    }
    return upsertRes.data || payload;
  }

  async function fetchRecentComments(supabase, userId, from, to) {
    const result = await supabase
      .from('comments')
      .select('id,game_key,body,created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (result.error) {
      logEndpointFailure('supabase:public.comments?user_id=eq.<uid>', result.error);
      return { rows: [], total: 0, error: result.error };
    }

    return { rows: (result.data || []).map(function (row) { return Object.assign({ deleted: false }, row); }), total: Number(result.count || 0), error: null };
  }

  function renderCommentActivity(rows) {
    if (!rows.length) return '<p class="ccg-community-muted">No comment activity yet.</p>';

    return '<ul class="ccg-profile-activity-list">' + rows.map(function (row) {
      return '' +
        '<li class="ccg-profile-activity-item">' +
        '  <div class="ccg-profile-activity-item__main">' +
        '    <a href="/games/' + encodeURIComponent(row.game_key || '') + '/" class="ccg-profile-activity-item__game">' + esc(row.game_key || 'unknown-game') + '</a>' +
        '    <time datetime="' + esc(row.created_at || '') + '">' + esc(formatDate(row.created_at)) + '</time>' +
        '  </div>' +
        '  <p class="ccg-profile-activity-item__text">' + (row.deleted ? '<em>Comment deleted</em>' : esc(row.body || '')) + '</p>' +
        '</li>';
    }).join('') + '</ul>';
  }

  function buildProfileHref(username, page) {
    const params = new URLSearchParams(window.location.search);
    if (username && params.get('u')) params.set('u', username);
    params.set('page', String(page));
    return '/community/profile.html?' + params.toString();
  }

  async function loadProfilePage() {
    const mount = document.getElementById('ccg-community-profile-root');
    if (!mount) return;

    mount.innerHTML = '<section class="ccg-community-card"><div class="ccg-profile-skeleton"></div><div class="ccg-profile-skeleton"></div></section>';

    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      mount.innerHTML = '<div class="ccg-community-card"><p>Community profile service is temporarily unavailable.</p></div>';
      return;
    }

    let context;
    let supabase;
    try {
      context = await loadViewerContext();
      supabase = await window.ccgSupabase.getClient();
    } catch (error) {
      console.error('[CCG-PROFILE] unable to load auth context', error);
      mount.innerHTML = '<div class="ccg-community-card"><p>Unable to load profile right now. Please refresh.</p></div>';
      return;
    }

    const queryUser = getQueryParam('u');
    const pageParam = Number(getQueryParam('page') || '1');
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const from = (page - 1) * COMMENT_PAGE_SIZE;
    const to = from + COMMENT_PAGE_SIZE - 1;

    let targetProfile = null;
    if (queryUser) {
      targetProfile = await fetchPublicProfile(supabase, queryUser);
    } else if (context.authUser) {
      targetProfile = await ensureOwnProfileRow(supabase, context.authUser, context.authProfile);
    }

    if (!targetProfile) {
      if (!context.authUser) {
        mount.innerHTML = '<div class="ccg-community-card"><p>Log in to view your profile.</p></div>';
      } else {
        mount.innerHTML = '<div class="ccg-community-card"><p>Unable to load your profile right now. Please refresh.</p></div>';
      }
      return;
    }

    const isOwnProfile = Boolean(context.authUser && context.authUser.id === targetProfile.id);

    const [ratingsRes, commentsRes, badges, activity, overviewRes, supporterRes] = await Promise.all([
      supabase.from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', targetProfile.id),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', targetProfile.id),
      fetchUserBadges(targetProfile.id, supabase),
      fetchRecentComments(supabase, targetProfile.id, from, to),
      supabase.from('community_rankings').select('rep_points,rep_level,level_title,supporter_level,supporter_title,supporter_flair_key,profile_banner_key,early_access_enabled').eq('user_id', targetProfile.id).maybeSingle(),
      safeSupporterLinkLookup(supabase, targetProfile.id)
    ]);

    const activityErrorMessage = activity.error ? classifyStatusMessage(activity.error, 'Unable to load activity right now.') : '';

    const ratingsCount = ratingsRes.count || 0;
    const commentsCount = commentsRes.count || 0;
    const joined = formatDate((context.authUser && context.authUser.created_at) || targetProfile.created_at);
    const displayName = targetProfile.display_name || targetProfile.username || 'Community member';
    const roleLabel = 'user';
    const bio = targetProfile.bio ? esc(targetProfile.bio) : 'No bio yet. This user is all gameplay, no fluff.';
    const authState = context.isAuthenticated ? 'Logged in' : 'Guest';
    const overview = overviewRes && overviewRes.data ? overviewRes.data : {};
    const supporter = supporterRes && supporterRes.data ? supporterRes.data : {};
    const supporterLevel = supporter.supporter_level || overview.supporter_level || 'none';
    const supporterTitle = supporter.supporter_title || overview.supporter_title || (supporterLevel !== 'none' ? ('Omega Supporter – ' + supporterLevel) : 'Community member');
    const repPoints = Number(overview.rep_points || 0);
    const repLevel = Number(overview.rep_level || 1);
    const repTitle = overview.level_title || 'New Recruit';
    const titleChip = supporter.eight_bit_title ? ('Title: ' + supporter.eight_bit_title) : repTitle;


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
      '        <span class="ccg-badge">Status: ' + esc(authState) + '</span>' +
      '      </div>' +
      '      <p class="ccg-community-muted">' + (isOwnProfile && context.authUser ? esc(context.authUser.email || '') : 'Public profile view') + '</p>' +
      '      <div class="ccg-profile-chip-row">' +
      '        <span class="ccg-profile-chip">REP ' + repPoints + '</span>' +
      '        <span class="ccg-profile-chip">Level ' + repLevel + '</span>' +
      '        <span class="ccg-profile-chip">' + esc(titleChip) + '</span>' +
      '        ' + (supporterLevel !== 'none' ? ('<span class="ccg-supporter-flair ccg-supporter-flair--' + esc(supporterLevel) + '">' + esc(supporterTitle) + '</span>') : '') +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <p class="ccg-profile-bio">' + bio + '</p>' +
      '  <div class="ccg-community-stats">' +
      '    <div><strong>' + ratingsCount + '</strong><span>Total ratings</span></div>' +
      '    <div><strong>' + commentsCount + '</strong><span>Total comments</span></div>' +
      '    <div><strong>' + badges.length + '</strong><span>Badges earned</span></div>' +
      '    <div><strong>' + repPoints + '</strong><span>CCG REP</span></div>' +
      '    <div><strong>' + (supporterLevel === 'none' ? 'No' : 'Yes') + '</strong><span>Active supporter</span></div>' +
      '  </div>' +
      '<section class="ccg-community-card"><h2>Supporter Perks</h2><p class="ccg-community-muted">Frame: ' + esc(supporter.supporter_frame_key || 'Default') + ' · Banner: ' + esc(supporter.profile_banner_key || overview.profile_banner_key || 'Standard') + ' · Early Access: ' + (overview.early_access_enabled ? 'Enabled' : 'Off') + '</p></section>' +
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
      (activity.error ? '<p class="ccg-community-muted">' + esc(activityErrorMessage) + '</p>' : renderCommentActivity(activity.rows)) +
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

        const validationMessage = validateProfilePayload(payload);
        if (validationMessage) {
          status.textContent = validationMessage;
          notify(validationMessage, 'error');
          return;
        }

        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        if (error) {
          console.error('[CCG-PROFILE] update failed', error);
          status.textContent = error.message || 'Unable to update profile right now.';
          notify(status.textContent, 'error');
          return;
        }

        status.textContent = 'Profile updated.';
        notify('Profile saved successfully.', 'success');
        window.setTimeout(function () {
          window.location.reload();
        }, 400);
      });
    }

    if (context.permissions.canModerate) {
      const { data: reports, error } = await supabase
        .from('comment_reports')
        .select('id,reason,created_at,comment_id,comments(body,game_key)')
        .order('created_at', { ascending: false })
        .limit(100);

      const reportList = document.getElementById('ccg-report-list');
      if (error) {
        console.error('[CCG-PROFILE] moderation list failed', error);
        reportList.innerHTML = '<p class="ccg-community-muted">Unable to load moderation queue.</p>';
        return;
      }

      reportList.innerHTML = (reports || []).map(function (report) {
        const comment = report.comments || {};
        return '' +
          '<article class="ccg-report-card" data-comment-id="' + report.comment_id + '">' +
          '  <p><strong>Game:</strong> ' + esc(comment.game_key || 'Unknown') + '</p>' +
          '  <p><strong>Comment:</strong> ' + esc(comment.body || '[deleted]') + '</p>' +
          '  <p><strong>Reason:</strong> ' + esc(report.reason || 'No reason provided') + '</p>' +
          '  <button class="ccg-community-btn" type="button" data-mod-action="delete">Soft delete comment</button>' +
          '</article>';
      }).join('') || '<p class="ccg-community-muted">No reports at the moment.</p>';

      reportList.querySelectorAll('[data-mod-action="delete"]').forEach(function (button) {
        button.addEventListener('click', async function () {
          const article = button.closest('.ccg-report-card');
          const commentId = Number(article.getAttribute('data-comment-id'));
          const { error: deleteError } = await supabase.from('comments').update({ deleted: true, body: '[deleted]' }).eq('id', commentId);
          if (deleteError) {
            notify(deleteError.message || 'Unable to delete comment.', 'error');
            return;
          }
          button.textContent = 'Deleted';
          button.disabled = true;
          notify('Comment removed.', 'success');
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', loadProfilePage);
  window.addEventListener('ccg:auth-ready', loadProfilePage);
  window.addEventListener('ccg:auth-changed', loadProfilePage);
})();
