/* CCG public supporter Hall of Fame loader */
(function () {
  'use strict';

  const TIER_ORDER = ['founder', 'gold-medal', 'sizzler', 'supporter'];
  const TIER_LABELS = {
    founder: 'Founding Supporters',
    'gold-medal': 'Gold Medal Supporters',
    sizzler: 'Sizzler Supporters',
    supporter: 'Supporters'
  };

  function text(value) {
    return String(value ?? '').trim();
  }

  function formatDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  function normalizeEntry(entry) {
    return {
      displayName: text(entry.display_name || entry.displayName || 'Supporter'),
      tier: TIER_ORDER.includes(text(entry.supporter_tier || entry.tier))
        ? text(entry.supporter_tier || entry.tier)
        : 'supporter',
      supporterSince: entry.supporter_since || entry.supporterSince || null,
      note: text(entry.supporter_note || entry.note),
      sortOrder: Number(entry.supporter_sort_order ?? entry.sortOrder ?? 0)
    };
  }

  function sortEntries(entries) {
    return entries.slice().sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.displayName.localeCompare(b.displayName, 'en-GB', { sensitivity: 'base' });
    });
  }

  function createCard(entry) {
    const article = document.createElement('article');
    article.className = 'ccg-hall-card';

    const badge = document.createElement('span');
    badge.className = 'ccg-hall-card__badge';
    badge.textContent = entry.tier.replace(/-/g, ' ');

    const heading = document.createElement('h3');
    heading.textContent = entry.displayName;

    article.append(badge, heading);

    const details = [entry.supporterSince ? `Supporting since ${formatDate(entry.supporterSince)}` : '', entry.note]
      .filter(Boolean)
      .join(' · ');

    if (details) {
      const paragraph = document.createElement('p');
      paragraph.textContent = details;
      article.appendChild(paragraph);
    }

    return article;
  }

  function render(entries, source) {
    const root = document.getElementById('supporterHall');
    const status = document.getElementById('supporterHallStatus');
    if (!root || !status) return;

    root.innerHTML = '';
    const normalized = sortEntries(entries.map(normalizeEntry).filter((entry) => entry.displayName));

    if (!normalized.length) {
      const empty = document.createElement('div');
      empty.className = 'ccg-hall-empty';
      empty.textContent = 'The Hall of Fame is ready. Verified supporters will appear here after choosing public recognition in Member Hub.';
      root.appendChild(empty);
      status.textContent = 'No verified opt-in listings are currently public.';
      return;
    }

    TIER_ORDER.forEach((tier) => {
      const members = normalized.filter((entry) => entry.tier === tier);
      if (!members.length) return;

      const section = document.createElement('section');
      section.className = 'ccg-hall-tier';
      section.setAttribute('aria-labelledby', `supporter-tier-${tier}`);

      const heading = document.createElement('h2');
      heading.className = 'ccg-hall-tier__heading';
      heading.id = `supporter-tier-${tier}`;
      heading.textContent = TIER_LABELS[tier];

      const grid = document.createElement('div');
      grid.className = 'ccg-hall-grid';
      members.forEach((entry) => grid.appendChild(createCard(entry)));

      section.append(heading, grid);
      root.appendChild(section);
    });

    status.textContent = `${normalized.length} verified supporter${normalized.length === 1 ? '' : 's'} recognised${source === 'fallback' ? ' from the maintained fallback list' : ''}.`;
  }

  async function getSupabaseClient() {
    if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') return null;
    return await window.ccgSupabase.getClient();
  }

  async function loadFromSupabase() {
    const client = await getSupabaseClient();
    if (!client || typeof client.rpc !== 'function') throw new Error('Supabase RPC unavailable');
    const { data, error } = await client.rpc('public_supporter_hall_of_fame');
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function loadFallback() {
    const response = await fetch('/data/supporters.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload) ? payload : Array.isArray(payload.supporters) ? payload.supporters : [];
  }

  async function init() {
    try {
      const entries = await loadFromSupabase();
      render(entries, 'database');
    } catch (error) {
      console.warn('[supporters] Database listing unavailable; using fallback list.', error);
      const fallback = await loadFallback().catch(() => []);
      render(fallback, 'fallback');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
