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

async function sendEmail(to: string, subject: string, text: string, html: string, resendApiKey: string, emailFrom: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: emailFrom,
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
  const requestId = crypto.randomUUID();
  const method = req.method;
  const origin = req.headers.get('origin') || '';
  const hasAuthorization = req.headers.has('authorization');

  const logReturn = (status: number, event: string, extra: Record<string, unknown> = {}) => {
    console.log('[send-new-game-notification]', {
      event,
      requestId,
      method,
      status,
      ...extra
    });
  };

  console.log('[send-new-game-notification]', {
    event: 'request_start',
    requestId,
    method,
    origin,
    hasAuthorization
  });

  try {
    if (method === 'OPTIONS') {
      logReturn(204, 'options_preflight_ok');
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    if (method !== 'POST') {
      logReturn(405, 'method_not_allowed');
      return jsonResponse({ success: false, error: 'Method not allowed', request_id: requestId }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const emailFrom = Deno.env.get('EMAIL_FROM') || '';
    const testEmailAddress = (Deno.env.get('TEST_EMAIL') || 'joepentony@hotmail.com').trim();

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      logReturn(500, 'missing_supabase_env');
      return jsonResponse({ success: false, error: 'Supabase environment is not configured.', request_id: requestId }, 500);
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      logReturn(401, 'missing_bearer_token');
      return jsonResponse({ success: false, error: 'Missing bearer token.', request_id: requestId }, 401);
    }

    let payload: NotifyPayload = {};
    try {
      payload = (await req.json()) as NotifyPayload;
    } catch {
      logReturn(400, 'invalid_json');
      return jsonResponse({ success: false, error: 'Invalid JSON body.', request_id: requestId }, 400);
    }

    const mode = String(payload.mode || '').trim();
    const gameName = String(payload.game_name || '').trim();
    const gameSlug = String(payload.game_slug || '').trim();
    const testEmail = payload.test_email === true;

    if (mode !== 'coming_soon') {
      logReturn(400, 'invalid_mode', { mode });
      return jsonResponse({ success: false, error: 'Invalid mode. Expected "coming_soon".', request_id: requestId }, 400);
    }

    if (!gameName) {
      logReturn(400, 'missing_game_name');
      return jsonResponse({ success: false, error: 'game_name is required.', request_id: requestId }, 400);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser(bearerToken);

    if (userError || !user) {
      logReturn(401, 'unauthorized_session');
      return jsonResponse({ success: false, error: 'Unauthorized session token.', request_id: requestId }, 401);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: roleRow, error: roleError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<ProfileRoleRow>();

    if (roleError) {
      logReturn(500, 'role_lookup_failed');
      return jsonResponse({ success: false, error: `Unable to validate role: ${roleError.message}`, request_id: requestId }, 500);
    }

    const role = String(roleRow?.role || '').trim().toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      logReturn(403, 'forbidden_role', { role });
      return jsonResponse({ success: false, error: 'Forbidden: admin/editor role required.', request_id: requestId }, 403);
    }

    if (!resendApiKey || !emailFrom) {
      logReturn(200, 'email_provider_not_configured');
      return jsonResponse({
        success: false,
        configured: false,
        sent: 0,
        failed: 0,
        error: 'Email provider is not configured. No emails were sent.',
        request_id: requestId
      });
    }

    let recipients: ProfileRecipient[] = [];
    if (testEmail) {
      recipients = [{ email: testEmailAddress, display_name: user.email || 'admin' }];
    } else {
      const { data, error } = await serviceClient
        .from('profiles')
        .select('email,display_name')
        .eq('notify_new_games', true)
        .not('email', 'is', null);

      if (error) {
        logReturn(500, 'recipient_lookup_failed');
        return jsonResponse({ success: false, error: `Failed to load recipients: ${error.message}`, request_id: requestId }, 500);
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
        await sendEmail(to, subject, text, html, resendApiKey, emailFrom);
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

    logReturn(200, 'notification_send_completed', {
      testEmail,
      recipientCount: sendTargets.length,
      sent,
      failed
    });
    return jsonResponse({
      success: true,
      configured: true,
      mode,
      test_email: testEmail,
      sent,
      failed,
      recipient_count: sendTargets.length,
      game_name: gameName,
      game_slug: gameSlug,
      request_id: requestId
    });
  } catch (error) {
    logReturn(500, 'unexpected_error', {
      error: error instanceof Error ? error.message : String(error)
    });
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        request_id: requestId
      },
      500
    );
  }
});
