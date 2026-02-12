import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const EMAIL_FROM = Deno.env.get('EMAIL_FROM')!;
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const BATCH_SIZE = 100;

function pickGames(games: any[], count = 10) {
  return [...games].sort(() => Math.random() - 0.5).slice(0, count);
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html })
  });

  if (!res.ok) {
    throw new Error(`Resend failed: ${await res.text()}`);
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const monthKey = new Date().toISOString().slice(0, 7);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,display_name,unsub_token,last_newsletter_sent_at')
    .eq('newsletter_opt_in', true)
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const gamesResponse = await fetch(`${SITE_URL}/games/games.json`, { cache: 'no-store' });
  const games = await gamesResponse.json();
  const selected = pickGames(Array.isArray(games) ? games : []);

  let sent = 0;
  for (const profile of profiles ?? []) {
    const lastSent = String(profile.last_newsletter_sent_at || '');
    if (lastSent.startsWith(monthKey)) continue;

    const userInfo = await supabase.auth.admin.getUserById(profile.id);
    const email = userInfo.data.user?.email;
    if (!email) continue;

    const blocks = selected.map((g: any) => {
      const title = g.title || g.name || 'Untitled game';
      const slug = g.slug || g.id;
      const summary = (g.summary || g.description || '').toString().slice(0, 140);
      return `<li><strong>${title}</strong><br>${summary}<br><a href="${SITE_URL}/games/${slug}/">View game</a></li>`;
    }).join('');

    const html = `
      <h1>10 Games You Might Have Missed</h1>
      <p>Fresh picks from Cheeky Commodore Gamer.</p>
      <ol>${blocks}</ol>
      <p><a href="${SITE_URL}/community/unsubscribe.html?t=${profile.unsub_token}">Unsubscribe from all emails</a></p>
    `;

    await sendEmail(email, 'CCG Monthly: 10 games you might have missed', html);
    sent += 1;

    await supabase.from('profiles').update({ last_newsletter_sent_at: new Date().toISOString() }).eq('id', profile.id);
    await supabase.from('email_log').upsert({ user_id: profile.id, email_type: `newsletter-${monthKey}` });
  }

  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
