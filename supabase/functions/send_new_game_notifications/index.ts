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

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html
  });
}

Deno.serve(async () => {
  if (!hasCoreConfig) {
    console.error('[send_new_game_notifications] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(JSON.stringify({ ok: false, error: 'Missing core config' }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: releases, error: releasesError } = await supabase
    .from('game_releases')
    .select('id, game_slug, created_at')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(25);

  if (releasesError) {
    console.error('[send_new_game_notifications] Failed to load releases', releasesError);
    return new Response(JSON.stringify({ ok: false, error: releasesError.message }), { status: 500 });
  }

  if (!releases || releases.length === 0) {
    return new Response(JSON.stringify({ ok: true, queued: 0, sent: 0, message: 'No new releases pending' }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('notify_new_games', true)
    .not('email', 'is', null);

  if (usersError) {
    console.error('[send_new_game_notifications] Failed to load opted-in users', usersError);
    return new Response(JSON.stringify({ ok: false, error: usersError.message }), { status: 500 });
  }

  if (!users || users.length === 0) {
    const releaseIds = releases.map((r) => r.id);
    await supabase.from('game_releases').update({ notified_at: new Date().toISOString() }).in('id', releaseIds);
    return new Response(JSON.stringify({ ok: true, queued: 0, sent: 0, message: 'No opted-in users' }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  const slugs = releases.map((item) => item.game_slug);
  const { data: catalogRows } = await supabase
    .from('games_catalog')
    .select('game_slug, title')
    .in('game_slug', slugs);

  const titleMap = new Map((catalogRows || []).map((row) => [String(row.game_slug), String(row.title || row.game_slug)]));

  let queued = 0;
  let sent = 0;

  for (const release of releases) {
    const slug = String(release.game_slug || '').trim();
    if (!slug) continue;

    const title = titleMap.get(slug) || slug;
    const gameUrl = `${SITE_URL}/games/${encodeURIComponent(slug)}/`;

    for (const user of users) {
      const toEmail = String(user.email || '').trim();
      if (!toEmail) continue;

      const safeTitle = escapeHtml(title);
      const safeName = escapeHtml(String(user.display_name || 'Player'));
      const subject = `New on CCG: ${title}`;
      const html = `<p>Hi ${safeName},</p><p>A new game has been added to CCG: <strong>${safeTitle}</strong>.</p><p><a href="${gameUrl}">View game</a></p>`;

      const { error: queueError } = await supabase.from('email_outbox').insert({
        to_email: toEmail,
        subject,
        html,
        purpose: 'new_game',
        status: 'queued'
      });

      if (queueError) {
        console.error('[send_new_game_notifications] Failed to queue email', queueError, { toEmail, slug });
        continue;
      }

      queued += 1;

      if (!hasEmailConfig) {
        console.info('[send_new_game_notifications] Email not configured; leaving message queued', { toEmail, slug });
        continue;
      }

      const { data: pendingRow, error: pendingRowError } = await supabase
        .from('email_outbox')
        .select('id')
        .eq('to_email', toEmail)
        .eq('subject', subject)
        .eq('purpose', 'new_game')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingRowError || !pendingRow?.id) {
        console.error('[send_new_game_notifications] Unable to resolve queued outbox row', pendingRowError, { toEmail, slug });
        continue;
      }

      try {
        await sendQueuedEmail(toEmail, subject, html);
        sent += 1;
        await supabase.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', pendingRow.id);
      } catch (error) {
        console.error('[send_new_game_notifications] SMTP send failed', error, { toEmail, slug });
        await supabase
          .from('email_outbox')
          .update({ status: 'failed', error: error instanceof Error ? error.message : String(error) })
          .eq('id', pendingRow.id);
      }
    }

    await supabase.from('game_releases').update({ notified_at: new Date().toISOString() }).eq('id', release.id);
  }

  return new Response(JSON.stringify({ ok: true, queued, sent }), { headers: { 'content-type': 'application/json' } });
});
