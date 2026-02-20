import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type'
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json'
};

const ALLOWED_ROLES = new Set(['admin', 'superadmin', 'editor']);
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || '';
const TEST_EMAIL = (Deno.env.get('TEST_EMAIL') || 'joepentony@hotmail.com').trim();

type NotifyPayload = {
  mode?: string;
  game_name?: string;
  game_slug?: string;
  test_email?: boolean;
};

type ProfileRoleRow = {
  role: string | null;
};

type ProfileRecipient = {
  email: string | null;
  display_name: string | null;
};

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildEmailContent(displayName: string | null, gameName: string, gameSlug: string) {
  const greetingName = String(displayName || '').trim() || 'there';
  const gamePath = gameSlug ? `/games/${encodeURIComponent(gameSlug)}/` : '/games/';
  const gameUrl = `${SITE_URL}${gamePath}`;
  const preferencesUrl = `${SITE_URL}/community/profile.html`;

  const subject = `Coming Soon on CCG: ${gameName}`;
  const text = [
    `Hi ${greetingName},`,
    '',
    `Coming Soon on Cheeky Commodore Gamer: ${gameName}`,
    `View game page: ${gameUrl}`,
    '',
    `Manage your email preferences: ${preferencesUrl}`
  ].join('\n');

  const html = [
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    `<p><strong>Coming Soon</strong> on Cheeky Commodore Gamer: <strong>${escapeHtml(gameName)}</strong>.</p>`,
    `<p><a href="${gameUrl}">View game page</a></p>`,
    `<p>Manage your email preferences <a href="${preferencesUrl}">here</a>.</p>`
  ].join('');

  return { subject, text, html };
}

async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`Email provider failed (${response.status}): ${responseText}`);
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ success: false, error: 'Supabase environment is not configured.' }, 500);
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      return jsonResponse({ success: false, error: 'Missing bearer token.' }, 401);
    }

    let payload: NotifyPayload = {};
    try {
      payload = (await req.json()) as NotifyPayload;
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON body.' }, 400);
    }

    const mode = String(payload.mode || '').trim();
    const gameName = String(payload.game_name || '').trim();
    const gameSlug = String(payload.game_slug || '').trim();
    const testEmail = payload.test_email === true;

    if (mode !== 'coming_soon') {
      return jsonResponse({ success: false, error: 'Invalid mode. Expected "coming_soon".' }, 400);
    }

    if (!gameName) {
      return jsonResponse({ success: false, error: 'game_name is required.' }, 400);
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser(bearerToken);

    if (userError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized session token.' }, 401);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow, error: roleError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<ProfileRoleRow>();

    if (roleError) {
      return jsonResponse({ success: false, error: `Unable to validate role: ${roleError.message}` }, 500);
    }

    const role = String(roleRow?.role || '').trim().toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      return jsonResponse({ success: false, error: 'Forbidden: admin/editor role required.' }, 403);
    }

    if (!RESEND_API_KEY || !EMAIL_FROM) {
      return jsonResponse({
        success: true,
        sent: 0,
        failed: 0,
        warning: 'Email provider is not configured. No emails were sent.'
      });
    }

    let recipients: ProfileRecipient[] = [];
    if (testEmail) {
      recipients = [{ email: TEST_EMAIL, display_name: user.email || 'admin' }];
    } else {
      const { data, error } = await serviceClient
        .from('profiles')
        .select('email,display_name')
        .eq('notify_new_games', true)
        .not('email', 'is', null);

      if (error) {
        return jsonResponse({ success: false, error: `Failed to load recipients: ${error.message}` }, 500);
      }

      recipients = ((data || []) as ProfileRecipient[]).filter((recipient) => {
        return String(recipient.email || '').trim().length > 0;
      });
    }

    const sendTargets = testEmail ? recipients.slice(0, 1) : recipients;
    let sent = 0;
    let failed = 0;

    for (const recipient of sendTargets) {
      const to = String(recipient.email || '').trim();
      if (!to) {
        failed += 1;
        continue;
      }

      const { subject, text, html } = buildEmailContent(recipient.display_name, gameName, gameSlug);
      try {
        await sendEmail(to, subject, text, html);
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error('[send-new-game-notification] email_send_failed', {
          to,
          gameSlug,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return jsonResponse({
      success: true,
      mode,
      test_email: testEmail,
      sent,
      failed,
      recipient_count: sendTargets.length,
      game_name: gameName,
      game_slug: gameSlug
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
});
