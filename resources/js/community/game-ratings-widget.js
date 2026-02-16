import {
  getAuthedUserOrNull,
  getMyRating,
  upsertRating,
  getRatingStats
} from './community-api.js';

export async function mountRatingsWidget(rootEl, gameSlug) {
  if (!rootEl || !gameSlug) return;

  // Render minimal rating UI using existing button class
  rootEl.innerHTML = `
    <div class="profile-list">
      <div class="profile-row"><span>Average rating</span><strong id="ccgAvgRating">—</strong></div>
      <div class="profile-row"><span>Total ratings</span><strong id="ccgRatingCount">—</strong></div>
      <div class="profile-row"><span>Your rating</span><strong id="ccgMyRating">—</strong></div>
    </div>
    <div id="ccgRatingMsg" class="auth-message" aria-live="polite"></div>
    <div class="profile-actions" id="ccgRatingButtons"></div>
  `;

  const stats = await getRatingStats(gameSlug);
  document.getElementById('ccgAvgRating').textContent = stats.avg ? String(stats.avg) : '—';
  document.getElementById('ccgRatingCount').textContent = String(stats.count || 0);

  const user = await getAuthedUserOrNull();
  const myRatingEl = document.getElementById('ccgMyRating');
  const msg = document.getElementById('ccgRatingMsg');
  const buttons = document.getElementById('ccgRatingButtons');

  if (!user) {
    myRatingEl.textContent = 'Login to rate';
    return;
  }

  const { data: mine } = await getMyRating(user.id, gameSlug);
  myRatingEl.textContent = mine?.rating ? String(mine.rating) : 'Not rated';

  for (let i = 1; i <= 5; i += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'auth-btn';
    b.textContent = `${i}/5`;
    b.addEventListener('click', async () => {
      msg.textContent = '';
      const { error } = await upsertRating(user.id, gameSlug, i);
      if (error) {
        msg.textContent = 'Could not save rating.';
        msg.classList.add('auth-error');
        return;
      }
      msg.textContent = 'Rating saved.';
      msg.classList.remove('auth-error');
      msg.classList.add('auth-success');
      myRatingEl.textContent = String(i);

      const s2 = await getRatingStats(gameSlug);
      document.getElementById('ccgAvgRating').textContent = s2.avg ? String(s2.avg) : '—';
      document.getElementById('ccgRatingCount').textContent = String(s2.count || 0);
    });
    buttons.appendChild(b);
  }
}
