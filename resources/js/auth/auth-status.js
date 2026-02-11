import { getCurrentUser, logoutUser, onAuthStateChange } from './auth-core.js';

function renderBadge(badgeEl, user) {
  if (!badgeEl) return;

  if (user?.email) {
    badgeEl.innerHTML = `
      <span class="auth-badge__label">Logged in as</span>
      <strong class="auth-badge__email">${user.email}</strong>
      <button type="button" id="authLogoutBtn" class="auth-badge__logout">Log out</button>
    `;

    const logoutBtn = badgeEl.querySelector('#authLogoutBtn');
    logoutBtn?.addEventListener('click', async () => {
      const { error } = await logoutUser();
      if (error) {
        alert(`Logout failed: ${error.message}`);
      }
    });
    return;
  }

  badgeEl.innerHTML = '<span class="auth-badge__label">Not logged in</span>';
}

export async function initAuthBadge(targetId = 'authStatusBadge') {
  const badgeEl = document.getElementById(targetId);
  if (!badgeEl) return;

  const { data } = await getCurrentUser();
  renderBadge(badgeEl, data?.user ?? null);

  onAuthStateChange((_event, session) => {
    renderBadge(badgeEl, session?.user ?? null);
  });
}
