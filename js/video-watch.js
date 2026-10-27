(() => {
  'use strict';

  const player = document.querySelector('[data-ccg-primary-video="true"]');
  if (!player) return;

  // A facade is opt-in: existing retro videos retain their current player.
  const facadeButton = document.querySelector('[data-ccg-video-facade-play]');

  const parseSeconds = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 0;
    if (/^\d+$/.test(raw)) return Math.max(0, Number(raw));

    const colon = raw.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (colon) {
      const hours = Number(colon[1] || 0);
      const minutes = Number(colon[2] || 0);
      const seconds = Number(colon[3] || 0);
      return Math.max(0, hours * 3600 + minutes * 60 + seconds);
    }

    const units = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (units) {
      return Math.max(
        0,
        Number(units[1] || 0) * 3600 + Number(units[2] || 0) * 60 + Number(units[3] || 0)
      );
    }

    return 0;
  };

  const baseEmbedUrl = (() => {
    try {
      const url = new URL(player.getAttribute('data-ccg-youtube-src') || player.getAttribute('src') || '', window.location.href);
      url.searchParams.delete('start');
      url.searchParams.delete('autoplay');
      return url.toString();
    } catch (error) {
      return player.getAttribute('data-ccg-youtube-src') || player.getAttribute('src') || '';
    }
  })();

  const cueVideo = (seconds, autoplay) => {
    const start = Math.max(0, Math.floor(Number(seconds) || 0));
    if ((!start && !facadeButton) || !baseEmbedUrl) return;

    try {
      const url = new URL(baseEmbedUrl, window.location.href);
      url.searchParams.set('start', String(start));
      if (autoplay) url.searchParams.set('autoplay', '1');
      player.setAttribute('src', url.toString());
      if (facadeButton) facadeButton.hidden = true;
    } catch (error) {
      return;
    }

    const watchTarget = document.getElementById('watch-video');
    if (watchTarget) {
      watchTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const initial = parseSeconds(new URLSearchParams(window.location.search).get('t'));
  // Deep-link offsets must not fetch YouTube before the visitor chooses playback.
  if (initial > 0 && !facadeButton) cueVideo(initial, false);

  facadeButton?.addEventListener('click', () => {
    const requestedStart = parseSeconds(new URLSearchParams(window.location.search).get('t'));
    cueVideo(requestedStart, true);
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-video-chapter]');
    if (!link) return;

    const seconds = parseSeconds(link.getAttribute('data-video-chapter'));
    if (seconds <= 0) return;

    event.preventDefault();
    cueVideo(seconds, true);

    try {
      const target = new URL(window.location.href);
      target.searchParams.set('t', String(seconds));
      target.hash = 'watch-video';
      window.history.pushState({}, '', target);
    } catch (error) {}
  });
})();
