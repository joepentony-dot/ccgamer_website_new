import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const EMAIL_PROVIDER_API_KEY = Deno.env.get('EMAIL_PROVIDER_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@example.com';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.cheekycommodoregamer.co.uk';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendViaProvider(to: string, subject: string, html: string) {
  // TODO: Replace with your provider SDK/API call (Resend/SendGrid/etc).
  // This is intentionally a scaffold and does not send real emails.
  if (!EMAIL_PROVIDER_API_KEY) {
    throw new Error('EMAIL_PROVIDER_API_KEY is not configured');
  }

  console.log('TODO send new game alert email', {
    to,
    subject,
    htmlLength: html.length
  });
}

Deno.serve(async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }

  const payload = await req.json().catch(() => ({}));
  const gameSlug = String(payload?.game_slug || '').trim();
  const gameTitle = String(payload?.game_title || '').trim();
  const platform = String(payload?.platform || '').trim().toLowerCase();

  if (!gameSlug || !gameTitle) {
    return json({ ok: false, error: 'Missing game_slug or game_title' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: recipients, error } = await supabase.rpc('get_subscribed_recipients');
  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  let attempted = 0;
  for (const recipient of recipients ?? []) {
    if (!recipient.notify_new_games) continue;

    if (platform.includes('c64') && !recipient.notify_c64) continue;
    if (platform.includes('amiga') && !recipient.notify_amiga) continue;

    const gameUrl = `${SITE_URL}/games/game.html?id=${encodeURIComponent(gameSlug)}`;
    const unsubUrl = `${SITE_URL}/community/unsubscribe.html?token=${encodeURIComponent(
      recipient.unsubscribe_token || ''
    )}`;

    const html = `
      <h1>New game on CCG: ${gameTitle}</h1>
      <p>Platform: ${platform || 'unknown'}</p>
      <p><a href="${gameUrl}">Open game page</a></p>
      <p><a href="${unsubUrl}">Unsubscribe</a></p>
    `;

    await sendViaProvider(recipient.email, `New on CCG: ${gameTitle}`, html);
    attempted += 1;
  }

  return json({ ok: true, attempted, from: EMAIL_FROM });
});
