// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (OPTION A: COMING SOON)
// Edge Function (JWT verification disabled at deploy)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Payload = {
  game_name: string;
  mode: 'coming_soon';
};

// ---- Environment ------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SITE_URL =
  (Deno.env.get('SITE_URL') ?? 'https://www.cheekycommodoregamer.co.uk').replace(/\/$/, '');

const QUIZ_URL = `${SITE_URL}/quiz/`;
const DISCORD_URL = Deno.env.get('DISCORD_URL') ?? 'https://discord.gg/';
const YOUTUBE_URL =
  Deno.env.get('YOUTUBE_URL') ?? 'https://www.youtube.com/@CheekyCommodoreGamer';

// ---- Guards ----------------------------------------------------------------

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[send-new-game-notification] Missing Supabase env vars');
}

// ---- Helpers ---------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildEmail(gameName: string, displayName: string | null) {
  const safeGame = escapeHtml(gameName);
  const safeName = escapeHtml(displayName || 'Retro Gamer');

  const subject = `Coming Soon to CCG: ${gameName}`;

  const text = `
Hi ${safeName},

A new game is on its way to Cheeky Commodore Gamer:

${gameName}

It’s been created on the website and will be added very shortly.

Visit the site:
${SITE_URL}

Fancy something to play right now?
Try one of our quizzes:
${QUIZ_URL}

Not subscribed yet?
YouTube:
${YOUTUBE_URL}

Want to chat about this game?
Join us on Discord:
${DISCORD_URL}

Thank you for your continued support.
Stay Retro 🕹️
`.trim();

  return { subject, text };
}

// ---- Server ----------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // ---- Method guard
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'POST required' }),
        { status: 405, headers: { 'content-type': 'application/json' } }
      );
    }

    // ---- Parse payload
    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    if (!payload?.game_name || payload.mode !== 'coming_soon') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const gameName = payload.game_name.trim();
    if (!gameName) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Empty game_name' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // ---- Supabase client (service role)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // ---- Load opted-in members
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .eq('notify_new_games', true)
      .not('email', 'is', null);

    if (usersError) {
      console.error('[send-new-game-notification] Failed to load users', usersError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to load users' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          notified: 0,
          message: 'No opted-in members'
        }),
        { headers: { 'content-type': 'application/json' } }
      );
    }

    // ---- Queue notifications (non-blocking, export-safe)
    let queued = 0;
    let failed = 0;

    for (const user of users) {
      const email = String(user.email || '').trim();
      if (!email) continue;

      const { subject, text } = buildEmail(gameName, user.display_name);

      const { error: insertError } = await supabase.from('email_outbox').insert({
        to_email: email,
        subject,
        text,
        purpose: 'new_game_coming_soon',
        status: 'queued'
      });

      if (insertError) {
        failed++;
        console.error(
          '[send-new-game-notification] Failed to queue email',
          insertError,
          { email }
        );
        continue;
      }

      queued++;
    }

    // ---- Final response (never block admin export)
    return new Response(
      JSON.stringify({
        ok: true,
        game_name: gameName,
        queued,
        failed
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-new-game-notification] Unhandled error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Unhandled server error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
});