// supabase/functions/send-new-game-notification/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cheekycommodoregamer.co.uk').replace(/\/$/, '');

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || '';
const YOUTUBE_URL = Deno.env.get('YOUTUBE_URL') || '';
const DISCORD_URL = Deno.env.get('DISCORD_URL') || '';
const TEST_EMAIL = Deno.env.get('TEST_EMAIL') || 'joepentony@hotmail.com';

Deno.serve(async (req) => {
  /* -------------------------------------------------------
     CORS PREFLIGHT — MUST RETURN BEFORE ANY OTHER LOGIC
  ------------------------------------------------------- */
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    /* -------------------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------------- */
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    /* -------------------------------------------------------
       SUPABASE CLIENTS
    ------------------------------------------------------- */
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid user session' }),
        { status: 401, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !['admin', 'superadmin', 'editor'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Insufficient permissions' }),
        { status: 403, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
      );
    }

    /* -------------------------------------------------------
       PAYLOAD
    ------------------------------------------------------- */
    const body = await req.json();
    const {
      mode,
      game_name,
      game_slug,
      test_email = false,
    } = body || {};

    if (mode !== 'coming_soon' || !game_name) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload' }),
        { status: 400, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
      );
    }

    /* -------------------------------------------------------
       EMAIL CONTENT
    ------------------------------------------------------- */
    const gameUrl = game_slug
      ? `${SITE_URL}/games/${encodeURIComponent(game_slug)}/`
      : SITE_URL;

    const subject = `Coming Soon to CCG: ${game_name}`;

    const html = `
      <p><strong>${game_name}</strong> is coming soon to Cheeky Commodore Gamer.</p>
      <p>The game is being prepared and will appear on the site shortly.</p>
      <p><a href="${gameUrl}">Visit Cheeky Commodore Gamer</a></p>
      <hr>
      <p>🕹️ Try a quiz: <a href="${SITE_URL}/quiz/">CCG Quiz Zone</a></p>
      <p>📺 YouTube: <a href="${YOUTUBE_URL}">${YOUTUBE_URL}</a></p>
      <p>💬 Discord: <a href="${DISCORD_URL}">${DISCORD_URL}</a></p>
      <p>Stay retro,<br>Cheeky Commodore Gamer</p>
    `;

    /* -------------------------------------------------------
       TEST EMAIL MODE (ADMIN ONLY)
    ------------------------------------------------------- */
    if (test_email) {
      if (!RESEND_API_KEY || !FROM_EMAIL) {
        return new Response(
          JSON.stringify({ ok: true, test: true, sent: false, reason: 'Email not configured' }),
          { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
        );
      }

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [TEST_EMAIL],
          subject,
          html,
        }),
      });

      return new Response(
        JSON.stringify({ ok: true, test: true, sent_to: TEST_EMAIL }),
        { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
      );
    }

    /* -------------------------------------------------------
       MEMBER NOTIFICATION MODE
    ------------------------------------------------------- */
    const { data: members } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('notify_new_games', true)
      .not('email', 'is', null);

    let sent = 0;

    if (RESEND_API_KEY && FROM_EMAIL && members?.length) {
      for (const m of members) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [m.email],
            subject,
            html,
          }),
        });
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent }),
      { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
    );

  } catch (err) {
    console.error('[send-new-game-notification]', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
    );
  }
});