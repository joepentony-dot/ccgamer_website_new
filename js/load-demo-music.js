function ccgDemoMusicEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ccgDemoMusicThumb(youtubeId, variant = 'hqdefault.jpg') {
  const id = String(youtubeId || '').trim();
  if (!id) return '';
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${variant}`;
}

function ccgBuildDemoMusicCard(item) {
  const title = ccgDemoMusicEscapeHtml(item.title);
  const url = ccgDemoMusicEscapeHtml(item.url);
  const thumb = ccgDemoMusicThumb(item.youtubeId, 'hqdefault.jpg');
  const thumbFallback = ccgDemoMusicThumb(item.youtubeId, 'mqdefault.jpg');

  const metaBits = [
    item.composer ? `Composer: ${ccgDemoMusicEscapeHtml(item.composer)}` : '',
    item.demo_group ? `Group: ${ccgDemoMusicEscapeHtml(item.demo_group)}` : '',
    item.year ? `Year: ${ccgDemoMusicEscapeHtml(item.year)}` : '',
    item.format ? `Format: ${ccgDemoMusicEscapeHtml(item.format)}` : ''
  ].filter(Boolean);

  return `
    <article class="ccg-game-card genre-card ccg-game-card--retro-event">
      <div class="ccg-game-card__media ccg-game-card__thumb">
        <img
          src="${ccgDemoMusicEscapeHtml(thumb)}"
          alt="${title}"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null; this.src='${ccgDemoMusicEscapeHtml(thumbFallback)}';"
        />
      </div>
      <div class="ccg-game-card__body">
        <div class="game-title-wrapper">
          <h3 class="ccg-game-card__title">${title}</h3>
          ${metaBits.length ? `<p>${metaBits.join(' • ')}</p>` : ''}
          ${item.description ? `<p>${ccgDemoMusicEscapeHtml(item.description)}</p>` : ''}
        </div>
        <div class="ccg-game-card__actions">
          <a href="${url}" class="ccg-btn ccg-btn--primary ccg-game-card__btn" target="_blank" rel="noopener noreferrer">WATCH VIDEO</a>
        </div>
      </div>
    </article>
  `;
}

async function ccgLoadDemoMusic() {
  const container = document.getElementById('demo-music-container');
  if (!container) return;

  try {
    const response = await fetch('/data/retro-events.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load data (${response.status})`);

    const data = await response.json();
    const tracks = Array.isArray(data)
      ? data
          .map((item) => {
            const type = String(item?.type || '').trim().toLowerCase();
            const isDemoMusic = type === 'demo_music' || type === 'amiga_demo_music';
            const youtubeId = String(item?.youtubeId || item?.youtube || '').trim();
            return {
              type,
              title: String(item?.title || '').trim(),
              youtubeId,
              url: String(item?.url || '').trim() || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ''),
              composer: String(item?.composer || '').trim(),
              demo_group: String(item?.demo_group || item?.group || '').trim(),
              year: item?.year ?? '',
              format: String(item?.format || '').trim(),
              thumbnail: String(item?.thumbnail || '').trim(),
              description: String(item?.description || '').trim(),
              isDemoMusic
            };
          })
          .filter((item) => item.isDemoMusic && item.title && item.url)
      : [];

    if (!tracks.length) {
      container.innerHTML = '<p>No demo music entries available yet.</p>';
      return;
    }

    container.innerHTML = tracks.map(ccgBuildDemoMusicCard).join('');
  } catch (error) {
    console.error('[CCG DEMO MUSIC]', error);
    container.innerHTML = '<p>Unable to load demo music entries right now. Please try again later.</p>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgLoadDemoMusic, { once: true });
} else {
  ccgLoadDemoMusic();
}
