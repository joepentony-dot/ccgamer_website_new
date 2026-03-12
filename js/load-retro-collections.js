/* ==========================================================
   CCG RETRO COLLECTION LOADER
   Supports Retro Specials / Retro Events / Demo Music
   ========================================================== */

async function loadRetroCollection(slug) {
  const container = document.querySelector('#collection-items');

  if (!container) {
    console.error('Collection container missing');
    return;
  }

  try {
    const sources = [
      '/data/retro-events.json',
      '/data/amiga-demo-music.json'
    ];

    let items = [];

    for (const src of sources) {
      const response = await fetch(src);

      if (!response.ok) {
        console.warn('Could not load', src);
        continue;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        items = items.concat(data);
      }
    }

    console.log('Retro items loaded:', items.length);

    const filterSlug = String(slug || '').toLowerCase();
    const results = items.filter((item) => {
      if (!item.collection) return false;
      return String(item.collection).toLowerCase() === filterSlug;
    });

    console.log('Retro specials found:', results.length);

    if (results.length === 0) {
      container.innerHTML = `
<div class="collection-empty">
No collection videos available yet.
</div>
`;
      return;
    }

    container.innerHTML = '';

    results.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'retro-card ccg-game-card genre-card ccg-game-card--retro-event';

      const slugOrId = item.slug || item.id || '';
      const type = String(item.type || '').toLowerCase();
      let href = `/retro-specials/${slugOrId}/`;
      if (type === 'retro_event') href = `/retro-events/${slugOrId}/`;
      if (type === 'demo_music' || type === 'amiga_demo_music') href = `/amiga-demo-music/${slugOrId}/`;

      const youtubeId = item.youtube_video_id || item.youtubeId || item.youtube || '';
      const thumb = item.thumbnail || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '');

      card.innerHTML = `
<a href="${href}">
<div class="retro-thumb ccg-game-card__media ccg-game-card__thumb">
<img src="${thumb}" alt="${item.title}">
</div>
<div class="retro-info ccg-game-card__body">
<h3 class="ccg-game-card__title">${item.title}</h3>
<p>${item.description || ''}</p>
</div>
</a>
`;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Retro collection load failed', error);

    container.innerHTML = `
<div class="collection-error">
Collection could not be loaded.
</div>
`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadRetroCollection('retro-specials');
});
