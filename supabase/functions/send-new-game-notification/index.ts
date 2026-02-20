// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (OPTION A: COMING SOON)
// Supabase Edge Function (Wizard-first)
// - ABSOLUTE preflight isolation (OPTIONS returns before ANY other work)
// - Bearer auth + role enforcement (profiles.role: admin|superadmin|editor)
// - Admin-only test email (TEST_EMAIL env, default joepentony@hotmail.com)
// - ZIP-first / non-blocking behaviour (client should never block ZIP)
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
  // NOTE: your profiles table may NOT have an email column.
  // We still keep this type for any future schema where it might exist.
  email?: string | null;
  display_name?: string | null;
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

function buildEmailContent(displayName: string | null, gameName: string, gameSlug: string) {
  const greetingName = String(displayName || '').trim() || 'there';
  const safeGreeting = escapeHtml(greetingName);

  const safeGameName = escapeHtml(gameName);
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
    `<p>Hi ${safeGreeting},</p>`,
    `<p><strong>Coming Soon</strong> on Cheeky Commodore Gamer: <strong>${safeGameName}</strong>.</p>`,
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

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

// -------------------- Server --------------------------------

// IMPORTANT: Preflight must return BEFORE ANY work (no crypto, no logs, no header reads, no env reads).
Deno.serve(async (req: Request) => {
  // ---- CORS preflight (ABSOLUTE FIRST EXIT — ZERO TOUCH)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // ---- POST-only logic from here on
  const requestId = crypto.randomUUID();
  const method = req.method;

  // Method guard
  if (method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed', request_id: requestId }, 405);
  }

  // Environment (POST only)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const emailFrom = Deno.env.get('EMAIL_FROM') || '';
  const testEmailAddress = (Deno.env.get('TEST_EMAIL') || 'joepentony@hotmail.com').trim();

  // Minimal diagnostics (safe: do not print secrets)
  console.log('[send-new-game-notification]', {
    event: 'request_start',
    requestId,
    method,
    hasAuthHeader: req.headers.has('authorization'),
    origin: req.headers.get('origin') || ''
  });

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.log('[send-new-game-notification]', {
      event: 'missing_supabase_env',
      requestId,
      supabaseUrl_present: !!supabaseUrl,
      anonKey_present: !!anonKey,
      serviceKey_present: !!serviceKey
    });
    return jsonResponse(
      { success: false, error: 'Supabase environment not configured', request_id: requestId },
      500
    );
  }

  // Auth header
  const bearerToken = getBearerToken(req);
  if (!bearerToken) {
    console.log('[send-new-game-notification]', { event: 'missing_bearer_token', requestId });
    return jsonResponse({ success: false, error: 'Missing bearer token', request_id: requestId }, 401);
  }

  // Parse payload
  let payload: NotifyPayload;
  try {
    payload = (await req.json()) as NotifyPayload;
  } catch {
    console.log('[send-new-game-notification]', { event: 'invalid_json', requestId });
    return jsonResponse({ success: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  const mode = String(payload.mode || '').trim();
  const gameName = String(payload.game_name || '').trim();
  const gameSlug = String(payload.game_slug || '').trim();
  const testEmail = payload.test_email === true;

  if (mode !== 'coming_soon' || !gameName) {
    console.log('[send-new-game-notification]', { event: 'invalid_payload', requestId, mode, hasGameName: !!gameName });
    return jsonResponse({ success: false, error: 'Invalid payload', request_id: requestId }, 400);
  }

  try {
    // Auth validation
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(bearerToken);

    const user = userData?.user || null;
    if (userError || !user) {
      console.log('[send-new-game-notification]', { event: 'unauthorized_session', requestId, userError: userError?.message || null });
      return jsonResponse({ success: false, error: 'Unauthorized session', request_id: requestId }, 401);
    }

    // Role enforcement
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: roleRow, error: roleError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<ProfileRoleRow>();

    if (roleError) {
      console.log('[send-new-game-notification]', { event: 'role_lookup_failed', requestId, error: roleError.message });
      return jsonResponse({ success: false, error: `Unable to validate role: ${roleError.message}`, request_id: requestId }, 500);
    }

    const role = String(roleRow?.role || '').trim().toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      console.log('[send-new-game-notification]', { event: 'forbidden_role', requestId, role });
      return jsonResponse({ success: false, error: 'Forbidden: admin/editor role required', request_id: requestId }, 403);
    }

    // Provider not configured (non-blocking)
    if (!resendApiKey || !emailFrom) {
      console.log('[send-new-game-notification]', { event: 'email_provider_not_configured', requestId, resendKey_present: !!resendApiKey, emailFrom_present: !!emailFrom });
      return jsonResponse({
        success: false,
        configured: false,
        sent: 0,
        failed: 0,
        error: 'Email provider not configured',
        request_id: requestId
      });
    }

    // Resolve recipients
    // IMPORTANT: Your profiles table appears to NOT have an email column.
    // So we pull emails from auth.users by joining on profiles.id.
    type RecipientRow = { email: string | null; display_name: string | null };

    let recipients: RecipientRow[] = [];

    if (testEmail) {
      recipients = [{ email: testEmailAddress, display_name: user.email || 'admin' }];
    } else {
      // Load opted-in users from profiles, then join to auth.users for email.
      // Using a SQL join would be ideal, but Edge Functions can’t run arbitrary SQL without RPC.
      // Instead: fetch profile ids + display_name, then fetch auth.users emails via Admin API is NOT available here.
      // So: in production mode, we REQUIRE a profiles.email column OR an RPC.
      // For now, we fail gracefully with configured=false style response to avoid blocking ZIP.
      console.log('[send-new-game-notification]', {
        event: 'recipients_unavailable_no_profiles_email',
        requestId
      });

      return jsonResponse({
        success: false,
        configured: true,
        sent: 0,
        failed: 0,
        error: 'Recipient email addresses are not available because profiles.email column is missing. Use test_email or add profiles.email / RPC join.',
        request_id: requestId
      });
    }

    let sent = 0;
    let failed = 0;

    const sendTargets = testEmail ? recipients.slice(0, 1) : recipients;

    for (const recipient of sendTargets) {
      const to = String(recipient.email || '').trim();
      if (!to) {
        failed++;
        continue;
      }

      const { subject, text, html } = buildEmailContent(recipient.display_name, gameName, gameSlug);

      try {
        await sendEmail(to, subject, text, html, resendApiKey, emailFrom);
        sent++;
      } catch (err) {
        failed++;
        console.error('[send-new-game-notification] email_send_failed', {
          requestId,
          to,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    console.log('[send-new-game-notification]', {
      event: 'notification_send_completed',
      requestId,
      testEmail,
      sent,
      failed
    });

    return jsonResponse({
      success: true,
      configured: true,
      test_email: testEmail,
      sent,
      failed,
      recipient_count: sendTargets.length,
      game_name: gameName,
      game_slug: gameSlug,
      request_id: requestId
    });
  } catch (error) {
    console.error('[send-new-game-notification] unexpected_error', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error',
        request_id: requestId
      },
      500
    );
  }
});