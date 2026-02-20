// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (OPTION A: COMING SOON)
// Supabase Edge Function (Wizard-first)
// - Unbreakable CORS preflight
// - Bearer auth + role enforcement
// - Admin-only test email
// - ZIP-first / non-blocking behaviour
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// -------------------- CORS ----------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type'
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json'
};

// -------------------- Types ---------------------------------

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

// -------------------- Constants ------------------------------

const ALLOWED_ROLES = new Set(['admin', 'superadmin', 'editor']);
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';

// -------------------- Helpers --------------------------------

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

function buildEmailContent(
  displayName: string | null,
  gameName: string,
  gameSlug: string
) {
  const greetingName = String(displayName || '').trim() || 'there';
  const gamePath = gameSlug
    ? `/games/${encodeURIComponent(gameSlug)}/`
    : '/games/';
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
    `<p><strong>Coming Soon</strong> on Cheeky Commodore Gamer: <strong>${escapeHtml(
      gameName
    )}</strong>.</p>`,
    `<p><a href="${gameUrl}">View game page</a></p>`,
    `<p>Manage your email preferences <a href="${preferencesUrl}">here</a>.</p>`
  ].join('');

  return { subject, text, html };
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  resendApiKey: string,
  emailFrom: string
): Promise<void> {
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
    throw new Error(
      `Email provider failed (${response.status}): ${responseText}`
    );
  }
}

// -------------------- Server --------------------------------

Deno.serve(async (req: Request) => {
  const method = req.method;
  const origin = req.headers.get('origin') || '';
  const hasAuthorization = req.headers.has('authorization');

  // ---- CORS preflight (ABSOLUTE FIRST EXIT)
  if (method === 'OPTIONS') {
    console.log('[send-new-game-notification]', {
      event: 'options_preflight_ok',
      origin
    });
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // ---- POST requests only beyond this point
  const requestId = crypto.randomUUID();

  console.log('[send-new-game-notification]', {
    event: 'request_start',
    requestId,
    method,
    origin,
    hasAuthorization
  });

  try {
    if (method !== 'POST') {
      return jsonResponse(
        { success: false, error: 'Method not allowed', request_id: requestId },
        405
      );
    }

    // ---- Environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const emailFrom = Deno.env.get('EMAIL_FROM') || '';
    const testEmailAddress =
      (Deno.env.get('TEST_EMAIL') || 'joepentony@hotmail.com').trim();

    console.log('[DEBUG ENV]', {
      supabaseUrl,
      anonKey_present: !!anonKey,
      serviceKey_present: !!serviceKey,
      resend_present: !!resendApiKey,
      emailFrom_present: !!emailFrom
    });

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse(
        {
          success: false,
          error: 'Supabase environment not configured',
          request_id: requestId
        },
        500
      );
    }

    // ---- Auth header
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!bearerToken) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing bearer token',
          request_id: requestId
        },
        401
      );
    }

    // ---- Parse payload
    let payload: NotifyPayload;
    try {
      payload = (await req.json()) as NotifyPayload;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid JSON body',
          request_id: requestId
        },
        400
      );
    }

    const mode = String(payload.mode || '').trim();
    const gameName = String(payload.game_name || '').trim();
    const gameSlug = String(payload.game_slug || '').trim();
    const testEmail = payload.test_email === true;

    if (mode !== 'coming_soon' || !gameName) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid payload',
          request_id: requestId
        },
        400
      );
    }

    // ---- Auth validation
    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser(bearerToken);

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error: 'Unauthorized session',
          request_id: requestId
        },
        401
      );
    }

    // ---- Role enforcement
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<ProfileRoleRow>();

    const role = String(roleRow?.role || '').toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      return jsonResponse(
        {
          success: false,
          error: 'Forbidden: admin/editor role required',
          request_id: requestId
        },
        403
      );
    }

    // ---- Provider not configured (non-blocking)
    if (!resendApiKey || !emailFrom) {
      return jsonResponse({
        success: false,
        configured: false,
        sent: 0,
        failed: 0,
        error: 'Email provider not configured',
        request_id: requestId
      });
    }

    // ---- Resolve recipients
    let recipients: ProfileRecipient[] = [];

    if (testEmail) {
      recipients = [
        { email: testEmailAddress, display_name: user.email || 'admin' }
      ];
    } else {
      const { data } = await serviceClient
        .from('profiles')
        .select('email,display_name')
        .eq('notify_new_games', true)
        .not('email', 'is', null);

      recipients = (data || []) as ProfileRecipient[];
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients.slice(0, testEmail ? 1 : undefined)) {
      const to = String(recipient.email || '').trim();
      if (!to) {
        failed++;
        continue;
      }

      const { subject, text, html } = buildEmailContent(
        recipient.display_name,
        gameName,
        gameSlug
      );

      try {
        await sendEmail(to, subject, text, html, resendApiKey, emailFrom);
        sent++;
      } catch {
        failed++;
      }
    }

    return jsonResponse({
      success: true,
      configured: true,
      test_email: testEmail,
      sent,
      failed,
      recipient_count: recipients.length,
      game_name: gameName,
      game_slug: gameSlug,
      request_id: requestId
    });
  } catch (error) {
    console.error('[send-new-game-notification] unexpected_error', error);
    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unexpected server error',
        request_id: requestId
      },
      500
    );
  }
});