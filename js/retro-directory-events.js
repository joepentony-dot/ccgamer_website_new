/* ============================================================
   CCG RETRO.DIRECTORY UPCOMING UK EVENTS
   ------------------------------------------------------------
   Reads the generated CCG cache only. It never scrapes
   retro.directory from the browser.
============================================================ */

(function () {
  'use strict';

  const DATA_URL = '/data/retro-directory-events.json';

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function formatDate(value) {
    const raw = text(value);
    if (!raw) return '';

    const date = new Date(raw.length === 10 ? raw + 'T12:00:00Z' : raw);
    if (Number.isNaN(date.getTime())) return raw;

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/London'
    }).format(date);
  }

  function formatDateRange(event) {
    const start = formatDate(event.startDate);
    const end = formatDate(event.endDate);

    if (!start) return 'Date TBC';
    if (!end || end === start) return start;
    return start + ' – ' + end;
  }

  function createElement(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content != null) el.textContent = content;
    return el;
  }

  function buildCard(event) {
    const article = createElement('article', 'ccg-retro-directory-card');

    const date = createElement('p', 'ccg-retro-directory-card__date', formatDateRange(event));
    article.appendChild(date);

    const title = createElement('h3', 'ccg-retro-directory-card__title', text(event.title) || 'Retro event');
    article.appendChild(title);

    const location = text(event.location);
    if (location) {
      article.appendChild(createElement('p', 'ccg-retro-directory-card__location', location));
    }

    const category = text(event.category);
    if (category) {
      article.appendChild(createElement('p', 'ccg-retro-directory-card__category', category));
    }

    const sourceUrl = text(event.sourceUrl);
    if (sourceUrl) {
      const link = createElement('a', 'ccg-retro-directory-card__link', 'View event on Retro.Directory');
      link.href = sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      article.appendChild(link);
    }

    return article;
  }

  async function loadUpcomingEvents() {
    const section = document.querySelector('[data-ccg-retro-directory]');
    const grid = document.getElementById('ccgUpcomingRetroEvents');
    const count = document.getElementById('ccgUpcomingRetroEventsCount');
    const updated = document.getElementById('ccgUpcomingRetroEventsUpdated');

    if (!section || !grid) return;

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load upcoming events (' + response.status + ')');

      const data = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];

      if (data.status !== 'active') {
        section.hidden = true;
        return;
      }

      section.hidden = false;
      grid.textContent = '';
      grid.setAttribute('aria-busy', 'false');

      if (count) count.textContent = String(events.length);

      if (data.updatedAt && updated) {
        updated.textContent = 'Updated ' + formatDate(data.updatedAt);
      }

      if (!events.length) {
        const empty = createElement('div', 'ccg-retro-directory-empty');
        empty.appendChild(createElement('h3', '', 'No upcoming UK events are currently listed'));
        const p = createElement('p', '', 'Check Retro.Directory for the latest event listings.');
        empty.appendChild(p);
        grid.appendChild(empty);
        return;
      }

      const fragment = document.createDocumentFragment();
      events.forEach(function (event) {
        fragment.appendChild(buildCard(event));
      });
      grid.appendChild(fragment);
    } catch (error) {
      console.error('[CCG RETRO DIRECTORY EVENTS]', error);
      section.hidden = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUpcomingEvents, { once: true });
  } else {
    loadUpcomingEvents();
  }
})();
