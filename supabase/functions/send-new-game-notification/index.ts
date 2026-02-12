import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const EMAIL_FROM = Deno.env.get('EMAIL_FROM')!;
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html })
  });

  if (!res.ok) throw new Error(await res.text());
}

Deno.serve(async (req) => {
  const payload = await req.json();
  const { slug, title, platform, url, summary } = payload || {};
  if (!slug || !title || !platform || !url) {
    return new Response(JSON.stringify({ error: 'Missing slug/title/platform/url' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,display_name,unsub_token,notify_platform_c64,notify_platform_amiga')
    .eq('notify_new_games_opt_in', true);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  for (const profile of profiles ?? []) {
    if (String(platform).toLowerCase().includes('c64') && !profile.notify_platform_c64) continue;
    if (String(platform).toLowerCase().includes('amiga') && !profile.notify_platform_amiga) continue;

    const existing = await supabase
      .from('email_log')
      .select('id')
      .eq('user_id', profile.id)
      .eq('email_type', 'new-game')
      .eq('game_slug', slug)
      .maybeSingle();

    if (existing.data) continue;

    const userInfo = await supabase.auth.admin.getUserById(profile.id);
    const email = userInfo.data.user?.email;
    if (!email) continue;

    const html = `
      <h1>New game added: ${title}</h1>
      <p><strong>Platform:</strong> ${platform}</p>
      <p>${(summary || '').toString().slice(0, 220)}</p>
      <p><a href="${url.startsWith('http') ? url : `${SITE_URL}${url}`}">Play/read now</a></p>
      <p><a href="${SITE_URL}/community/unsubscribe.html?t=${profile.unsub_token}">Unsubscribe from all emails</a></p>
    `;

    await sendEmail(email, `New on CCG: ${title}`, html);
    await supabase.from('email_log').insert({ user_id: profile.id, email_type: 'new-game', game_slug: slug });
    await supabase.from('profiles').update({ last_notify_sent_at: new Date().toISOString() }).eq('id', profile.id);
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
