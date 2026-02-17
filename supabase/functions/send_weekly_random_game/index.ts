import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.15';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cheekycommodoregamer.co.uk').replace(/\/$/, '');

const SMTP_HOST = Deno.env.get('SMTP_HOST') || '';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '0');
const SMTP_USER = Deno.env.get('SMTP_USER') || '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || '';

const hasCoreConfig = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
const hasEmailConfig = Boolean(SMTP_HOST && SMTP_PORT > 0 && SMTP_USER && SMTP_PASS && FROM_EMAIL);

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendQueuedEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
}

Deno.serve(async () => {
  if (!hasCoreConfig) {
    console.error('[send_weekly_random_game] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(JSON.stringify({ ok: false, error: 'Missing core config' }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: gameRow, error: gameError } = await supabase
    .from('games_catalog')
    .select('game_slug, title')
    .order('game_slug', { ascending: true })
    .limit(500);

  if (gameError) {
    console.error('[send_weekly_random_game] Failed to read games_catalog', gameError);
    return new Response(JSON.stringify({ ok: false, error: gameError.message }), { status: 500 });
  }

  const catalog = Array.isArray(gameRow) ? gameRow : [];
  if (catalog.length === 0) {
    console.info('[send_weekly_random_game] games_catalog empty; exiting safely');
    return new Response(JSON.stringify({ ok: true, queued: 0, sent: 0, message: 'Catalog empty' }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  const randomGame = catalog[Math.floor(Math.random() * catalog.length)];
  const slug = String(randomGame?.game_slug || '').trim();
  if (!slug) {
    return new Response(JSON.stringify({ ok: true, queued: 0, sent: 0, message: 'Random game slug missing' }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  const title = String(randomGame?.title || slug);
  const gameUrl = `${SITE_URL}/games/${encodeURIComponent(slug)}/`;

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('notify_new_games', true)
    .not('email', 'is', null);

  if (usersError) {
    console.error('[send_weekly_random_game] Failed to load opted-in users', usersError);
    return new Response(JSON.stringify({ ok: false, error: usersError.message }), { status: 500 });
  }

  let queued = 0;
  let sent = 0;

  for (const user of users || []) {
    const toEmail = String(user.email || '').trim();
    if (!toEmail) continue;

    const safeName = escapeHtml(String(user.display_name || 'Player'));
    const safeTitle = escapeHtml(title);
    const subject = `Weekly CCG pick: ${title}`;
    const html = `<p>Hi ${safeName},</p><p>This week's random CCG game pick is <strong>${safeTitle}</strong>.</p><p><a href="${gameUrl}">Open game page</a></p>`;

    const { data: outboxRow, error: queueError } = await supabase
      .from('email_outbox')
      .insert({
        to_email: toEmail,
        subject,
        html,
        purpose: 'weekly_random',
        status: 'queued'
      })
      .select('id')
      .single();

    if (queueError || !outboxRow?.id) {
      console.error('[send_weekly_random_game] Failed to queue email', queueError, { toEmail, slug });
      continue;
    }

    queued += 1;

    if (!hasEmailConfig) {
      console.info('[send_weekly_random_game] Email not configured; leaving message queued', { toEmail, slug });
      continue;
    }

    try {
      await sendQueuedEmail(toEmail, subject, html);
      sent += 1;
      await supabase
        .from('email_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', outboxRow.id);
    } catch (error) {
      console.error('[send_weekly_random_game] SMTP send failed', error, { toEmail, slug });
      await supabase
        .from('email_outbox')
        .update({ status: 'failed', error: error instanceof Error ? error.message : String(error) })
        .eq('id', outboxRow.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, queued, sent, slug }), {
    headers: { 'content-type': 'application/json' }
  });
});
