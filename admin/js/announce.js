import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

function $(id) {
  return document.getElementById(id);
}

function text(v) {
  return String(v || '').trim();
}

function subjectFor(type, title) {
  if (!title) return '—';
  switch (type) {
    case 'featured_classic':
      return `⭐ Featured Classic: ${title}`;
    case 'spotlight_pick':
      return `🎯 Spotlight Pick: ${title}`;
    default:
      return `🆕 New Game Added: ${title}`;
  }
}

function updateSendState() {
  const slug = text($('announceSendBtn')?.dataset?.slug);
  const test = $('announceTestEmail')?.checked;
  const members = $('announceNotifyMembers')?.checked;
  $('announceSendBtn').disabled = !slug || (!test && !members);
}

async function bootstrap() {
  const ok = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!ok) return;

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });

  const res = await fetch('/games/games.json', { cache: 'no-store' });
  const games = await res.json();

  const bySlug = new Map();
  games.forEach(g => g.slug && bySlug.set(g.slug, g));

  $('announceLoadedHint').textContent = `Loaded ${bySlug.size} games.`;

  $('announceSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('announceResults').innerHTML = '';
    [...bySlug.values()]
      .filter(g => g.title.toLowerCase().includes(q))
      .slice(0, 50)
      .forEach(g => {
        const b = document.createElement('button');
        b.className = 'ccg-btn ccg-btn--ghost';
        b.textContent = `${g.title} (${g.year || '?'})`;
        b.onclick = () => {
          $('announceSendBtn').dataset.slug = g.slug;
          $('announceTitle').textContent = g.title;
          $('announceSlug').textContent = g.slug;
          $('announceLink').href = `/games/${g.slug}.html`;
          $('announceLink').hidden = false;
          if (g.thumbnail) {
            $('announceThumb').src = g.thumbnail.startsWith('/')
              ? g.thumbnail
              : `/${g.thumbnail}`;
            $('announceThumb').hidden = false;
          } else {
            $('announceThumb').hidden = true;
          }
          $('announceSubject').textContent =
            subjectFor($('announceType').value, g.title);
          updateSendState();
        };
        $('announceResults').appendChild(b);
      });
  });

  $('announceType').addEventListener('change', () => {
    $('announceSubject').textContent =
      subjectFor($('announceType').value, $('announceTitle').textContent);
  });

  $('announceTestEmail').addEventListener('change', () => {
    if ($('announceTestEmail').checked) $('announceNotifyMembers').checked = false;
    updateSendState();
  });

  $('announceNotifyMembers').addEventListener('change', () => {
    if ($('announceNotifyMembers').checked) $('announceTestEmail').checked = false;
    updateSendState();
  });

  $('announceSendBtn').addEventListener('click', async () => {
    const sendBtn = $('announceSendBtn');
    const previousLabel = sendBtn.textContent;
    sendBtn.disabled = true;

    try {
      const slug = sendBtn.dataset.slug;
      const game = bySlug.get(slug);
      const type = $('announceType').value;
      const test = $('announceTestEmail').checked;

      if (!slug || !game) {
        throw new Error('Please select a game before sending.');
      }

      $('announceStatus').textContent = 'Sending…';
      sendBtn.textContent = 'Sending...';

      const supabase = window.ccgSupabase?.getClient?.();
      if (!supabase?.auth?.getSession) {
        throw new Error('Supabase client unavailable. Please refresh and try again.');
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message || 'Unable to retrieve auth session.');
      }

      const token = data?.session?.access_token;
      if (!token) {
        throw new Error('Auth required. Please sign in again.');
      }

      const payload = {
        mode: type,
        game_name: game.title,
        game_slug: game.slug,
        game_thumbnail: game.thumbnail || '',
        test_email: test === true
      };

      const r = await fetch(
        `${window.CCG_SUPABASE_URL}/functions/v1/send-new-game-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: window.CCG_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const j = await r.json();
      if (!r.ok || !j.success) {
        throw new Error(j.error || `Request failed (${r.status}).`);
      }

      $('announceStatus').textContent = `Sent: ${j.sent || 0}, failed: ${j.failed || 0}`;
    } catch (err) {
      $('announceStatus').textContent = `Failed: ${err?.message || 'Unknown error.'}`;
      console.error('Announcement send failed:', err);
    } finally {
      sendBtn.textContent = previousLabel;
      updateSendState();
    }
  });
}

startAccessMonitor();
bootstrap();
