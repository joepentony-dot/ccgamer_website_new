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
  'Access-Control-Allow-Origin': 'https://www.cheekycommodoregamer.co.uk',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info'
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
  game_thumbnail?: string;
  test_email?: boolean;
};

type ProfileRoleRow = {
  role: string | null;
};

type ProfileRecipient = {
  email: string | null;
  display_name: string | null;
  username: string | null;
};

// -------------------- Constants ------------------------------

const ALLOWED_ROLES = new Set(['admin', 'superadmin', 'editor']);
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const ADMIN_COPY_EMAIL = 'joepentony@hotmail.com';
const BANNER_IMAGE_URL =
  'https://www.cheekycommodoregamer.co.uk/resources/images/email/ccg-email-banner.png';
const BATCH_SIZE = 25;

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

function normalizeGameSlug(rawSlug: string): string {
  const slug = String(rawSlug || '').trim().replace(/^\/+|\/+$/g, '');
  return slug;
}

function buildGameUrl(gameSlug: string): string {
  if (!gameSlug) {
    return `${SITE_URL}/games/`;
  }
  return `${SITE_URL}/games/${encodeURIComponent(gameSlug)}.html`;
}

function buildEmailContent(
  displayName: string | null,
  username: string | null,
  gameName: string,
  gameSlug: string,
  gameThumbnail: string
) {
  const greetingName =
    String(displayName || '').trim() || String(username || '').trim() || 'there';
  const gameUrl = buildGameUrl(gameSlug);
  const preferencesUrl = `${SITE_URL}/community/profile.html`;

  const subject = `Coming Soon on Cheeky Commodore Gamer: ${gameName}`;

  const safeName = escapeHtml(greetingName);
  const safeGameName = escapeHtml(gameName);
  const safeGameUrl = escapeHtml(gameUrl);
  const safePreferencesUrl = escapeHtml(preferencesUrl);
  const safeThumbnailUrl = escapeHtml(gameThumbnail);

  const text = [
    `Hi ${greetingName},`,
    '',
    `${gameName} is coming soon to Cheeky Commodore Gamer.`,
    `Take a look: ${gameUrl}`,
    '',
    'You’re receiving this email because you enabled New Game Notifications in your Cheeky Commodore Gamer profile.',
    `You can manage your preferences at ${preferencesUrl}`
  ].join('\n');

  const html = `
    <div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:0;">
                  <img src="${escapeHtml(BANNER_IMAGE_URL)}" alt="Cheeky Commodore Gamer" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;" />
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi ${safeName},</p>
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                    <strong>${safeGameName}</strong> is coming soon to Cheeky Commodore Gamer.
                  </p>
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Tap the image below to check it out:</p>
                  <p style="margin:0 0 20px;">
                    <a href="${safeGameUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                      <img src="${safeThumbnailUrl}" alt="${safeGameName} thumbnail" width="592" style="display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:8px;" />
                    </a>
                  </p>
                  <p style="margin:0 0 24px;">
                    <a href="${safeGameUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;font-size:15px;">View game page</a>
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                    You’re receiving this email because you enabled New Game Notifications in your Cheeky Commodore Gamer profile.<br />
                    You can manage your preferences at <a href="${safePreferencesUrl}" target="_blank" rel="noopener noreferrer">${safePreferencesUrl}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

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
    const emailFrom = Deno.env.get('FROM_EMAIL') || '';
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
    const gameSlug = normalizeGameSlug(String(payload.game_slug || ''));
    const gameThumbnail = String(payload.game_thumbnail || '').trim();
    const testEmail = payload.test_email === true;

    if (
      (!testEmail && mode !== 'coming_soon_members') ||
      (testEmail && mode !== 'coming_soon') ||
      !gameName
    ) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid payload',
          request_id: requestId
        },
        400
      );
    }

    if (!testEmail && !gameSlug) {
      return jsonResponse(
        {
          success: false,
          error: 'game_slug is required',
          request_id: requestId
        },
        400
      );
    }

    if (!testEmail && !gameThumbnail) {
      return jsonResponse(
        {
          success: false,
          error: 'game_thumbnail is required',
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
        { email: testEmailAddress, display_name: user.email || 'admin', username: null }
      ];
    } else {
      const { data } = await serviceClient
        .from('profiles')
        .select('email,display_name,username')
        .eq('notify_new_games', true)
        .not('email', 'is', null);

      recipients = (data || []) as ProfileRecipient[];
      recipients.push({
        email: ADMIN_COPY_EMAIL,
        display_name: 'Joe',
        username: null
      });
    }

    const uniqueRecipients: ProfileRecipient[] = [];
    const seenEmails = new Set<string>();

    for (const recipient of recipients) {
      const normalizedEmail = String(recipient.email || '').trim().toLowerCase();
      if (!normalizedEmail || seenEmails.has(normalizedEmail)) {
        continue;
      }
      seenEmails.add(normalizedEmail);
      uniqueRecipients.push({
        ...recipient,
        email: normalizedEmail
      });
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const to = String(recipient.email || '').trim();
          if (!to) {
            throw new Error('Missing recipient email');
          }

          const { subject, text, html } = buildEmailContent(
            recipient.display_name,
            recipient.username,
            gameName,
            gameSlug,
            gameThumbnail
          );

          await sendEmail(to, subject, text, html, resendApiKey, emailFrom);
          return to;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          console.error('[send-new-game-notification] email_send_failed', {
            requestId,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason)
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      configured: true,
      test_email: testEmail,
      sent,
      failed,
      recipient_count: uniqueRecipients.length,
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
