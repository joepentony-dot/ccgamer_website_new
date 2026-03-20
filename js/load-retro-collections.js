/* ==========================================================
   CCG RETRO COLLECTION LOADER
   Retro Specials page must only use dedicated retro specials data.
   ========================================================== */

function ccgGetVideoId(item) {
  return String(
    item?.youtubeId ||
    ''
  ).trim();
}

function ccgGetCardUrl(item) {
  const directUrl = String(
    item?.pageUrl ||
    item?.video_url ||
    item?.url ||
    ''
  ).trim();

  if (directUrl) {
    return directUrl;
  }

  const youtubeId = ccgGetVideoId(item);
  return youtubeId ? `https://youtu.be/${encodeURIComponent(youtubeId)}` : '#';
}

function ccgGetThumbnail(item) {
  const thumb = String(item?.thumbnail || item?.image || '').trim();
  if (thumb) {
    return thumb;
  }

  const youtubeId = ccgGetVideoId(item);
  return youtubeId ? `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg` : '';
}

async function loadRetroCollection(slug) {
  const container = document.querySelector('#collection-items');
  const countEl = document.getElementById('genreGamesCount');

  if (!container) {
    console.error('[Retro Specials] collection container missing');
    return;
  }

  try {
    const source = '/data/retro-specials.json';
    const response = await fetch(source, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Could not load ${source} (${response.status})`);
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : [];
    const filterSlug = String(slug || '').trim().toLowerCase();

    const results = items.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return String(item.collection || '').trim().toLowerCase() === filterSlug;
    });

    console.log('[Retro Specials] source items:', items.length);
    console.log('[Retro Specials] matched items:', results.length);
    console.log('[Retro Specials] matched slugs:', results.map((item) => item.slug || item.id));

    if (countEl) {
      countEl.textContent = String(results.length);
    }

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

      const href = ccgGetCardUrl(item);
      const thumb = ccgGetThumbnail(item);
      const title = String(item.title || '').trim() || String(item.id || '').trim();
      const description = String(item.description || item.summary || '').trim();

      card.innerHTML = `
<a href="${href}">
<div class="retro-thumb ccg-game-card__media ccg-game-card__thumb">
<img src="${thumb}" alt="${title}">
</div>
<div class="retro-info ccg-game-card__body">
<h3 class="ccg-game-card__title">${title}</h3>
<p>${description}</p>
</div>
</a>
`;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('[Retro Specials] collection load failed', error);

    if (countEl) {
      countEl.textContent = '0';
    }

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
