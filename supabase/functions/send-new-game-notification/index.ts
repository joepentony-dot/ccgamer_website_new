import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://www.cheekycommodoregamer.co.uk',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info'
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json'
};

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

const ALLOWED_ROLES = new Set(['admin', 'superadmin', 'editor']);
const ALLOWED_ANNOUNCEMENT_MODES = new Set([
  'new_game_added',
  'featured_classic',
  'spotlight_pick',
  // Legacy compatibility from older callers
  'coming_soon',
  'coming_soon_members'
]);

const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const ADMIN_COPY_EMAIL = 'joepentony@hotmail.com';
const BANNER_IMAGE_URL = `${SITE_URL}/resources/images/email/ccg-email-banner.png`;
const BATCH_SIZE = 25;

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

function toMode(rawMode: string): string {
  const mode = String(rawMode || '').trim();
  if (mode === 'coming_soon' || mode === 'coming_soon_members') return 'new_game_added';
  return mode;
}

function normalizeGameSlug(rawSlug: string): string {
  return String(rawSlug || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.html?$/i, '');
}

function normalizeThumbnail(rawThumbnail: string): string {
  const thumbnail = String(rawThumbnail || '').trim();
  if (!thumbnail) return '';
  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;
  return `${SITE_URL}${thumbnail.startsWith('/') ? thumbnail : `/${thumbnail}`}`;
}

function gameUrlFromSlug(slug: string): string {
  const normalized = normalizeGameSlug(slug);
  if (!normalized) return `${SITE_URL}/games/`;
  return `${SITE_URL}/games/${encodeURIComponent(normalized)}/`;
}

function subjectForMode(mode: string, gameName: string): string {
  switch (toMode(mode)) {
    case 'featured_classic':
      return `Featured Classic on Cheeky Commodore Gamer: ${gameName}`;
    case 'spotlight_pick':
      return `Spotlight Pick on Cheeky Commodore Gamer: ${gameName}`;
    default:
      return `New Game Added on Cheeky Commodore Gamer: ${gameName}`;
  }
}

function bodyLineForMode(mode: string, gameName: string): string {
  switch (toMode(mode)) {
    case 'featured_classic':
      return `${gameName} is now featured as a classic pick on Cheeky Commodore Gamer.`;
    case 'spotlight_pick':
      return `${gameName} is now highlighted as a spotlight pick on Cheeky Commodore Gamer.`;
    default:
      return `${gameName} is now live on Cheeky Commodore Gamer.`;
  }
}

function buildEmailContent(
  recipient: ProfileRecipient,
  mode: string,
  gameName: string,
  gameSlug: string,
  gameThumbnail: string
): { subject: string; text: string; html: string } {
  const greetingName =
    String(recipient.display_name || '').trim() ||
    String(recipient.username || '').trim() ||
    'there';

  const gameUrl = gameUrlFromSlug(gameSlug);
  const preferencesUrl = `${SITE_URL}/community/profile.html`;
  const subject = subjectForMode(mode, gameName);
  const introLine = bodyLineForMode(mode, gameName);

  const safeGreetingName = escapeHtml(greetingName);
  const safeGameName = escapeHtml(gameName);
  const safeIntroLine = escapeHtml(introLine);
  const safeGameUrl = escapeHtml(gameUrl);
  const safePreferencesUrl = escapeHtml(preferencesUrl);
  const safeGameThumbnail = escapeHtml(gameThumbnail);

  const text = [
    `Hi ${greetingName},`,
    '',
    introLine,
    `Take a look: ${gameUrl}`,
    '',
    'You are receiving this email because you enabled New Game Notifications in your CCG profile.',
    `You can manage your preferences at ${preferencesUrl}`
  ].join('\n');

  const html = `
    <div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
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
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi ${safeGreetingName},</p>
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${safeIntroLine}</p>
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
                    <a href="${safeGameUrl}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:none;font-weight:700;">${safeGameName}</a>
                  </p>
                  <p style="margin:0 0 20px;">
                    <a href="${safeGameUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                      <img src="${safeGameThumbnail}" alt="${safeGameName} thumbnail" width="592" style="display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:8px;" />
                    </a>
                  </p>
                  <p style="margin:0 0 24px;">
                    <a href="${safeGameUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;font-size:15px;">View game page</a>
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                    You are receiving this email because you enabled New Game Notifications in your CCG profile.<br />
                    You can manage your preferences at <a href="${safePreferencesUrl}" target="_blank" rel="noopener noreferrer">${safePreferencesUrl}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
}

async function sendEmail(
  recipient: string,
  subject: string,
  textBody: string,
  htmlBody: string,
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
      to: recipient,
      subject,
      text: textBody,
      html: htmlBody
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error (${response.status}): ${errorText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  const requestId = crypto.randomUUID();

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed', request_id: requestId }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const emailFrom = Deno.env.get('RESEND_FROM_EMAIL') || '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ success: false, error: 'Supabase environment not configured', request_id: requestId }, 500);
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!bearerToken) {
      return jsonResponse({ success: false, error: 'Missing bearer token', request_id: requestId }, 401);
    }

    let payload: NotifyPayload;
    try {
      payload = (await req.json()) as NotifyPayload;
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON body', request_id: requestId }, 400);
    }

    const mode = toMode(payload.mode || '');
    const gameName = String(payload.game_name || '').trim();
    const gameSlug = normalizeGameSlug(payload.game_slug || '');
    const gameThumbnail = normalizeThumbnail(payload.game_thumbnail || '');
    const testEmail = payload.test_email === true;

    if (!ALLOWED_ANNOUNCEMENT_MODES.has(mode) || !gameName) {
      return jsonResponse({ success: false, error: 'Invalid payload', request_id: requestId }, 400);
    }

    if (!testEmail && !gameSlug) {
      return jsonResponse({ success: false, error: 'game_slug is required', request_id: requestId }, 400);
    }

    if (!gameThumbnail) {
      return jsonResponse({ success: false, error: 'game_thumbnail is required', request_id: requestId }, 400);
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser(bearerToken);

    if (userError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized session', request_id: requestId }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<ProfileRoleRow>();

    const role = String(roleRow?.role || '').trim().toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      return jsonResponse({ success: false, error: 'Forbidden: admin/editor role required', request_id: requestId }, 403);
    }

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

    let recipients: ProfileRecipient[] = [];
    if (testEmail) {
      recipients = [{
        email: String(user.email || ADMIN_COPY_EMAIL).trim().toLowerCase(),
        display_name: user.email || 'admin',
        username: null
      }];
    } else {
      const { data, error } = await serviceClient
        .from('profiles')
        .select('email,display_name,username')
        .eq('notify_new_games', true)
        .not('email', 'is', null);

      if (error) {
        return jsonResponse({ success: false, error: error.message, request_id: requestId }, 500);
      }

      recipients = (data || []) as ProfileRecipient[];
      recipients.push({ email: ADMIN_COPY_EMAIL, display_name: 'Joe', username: null });
    }

    const uniqueRecipients: ProfileRecipient[] = [];
    const seenEmails = new Set<string>();

    for (const recipient of recipients) {
      const email = String(recipient.email || '').trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);
      uniqueRecipients.push({ ...recipient, email });
    }

    let sent = 0;
    let failed = 0;

    for (let index = 0; index < uniqueRecipients.length; index += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(index, index + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const to = String(recipient.email || '').trim();
          if (!to) throw new Error('Missing recipient email');

          const { subject, text, html } = buildEmailContent(recipient, mode, gameName, gameSlug, gameThumbnail);
          await sendEmail(to, subject, text, html, resendApiKey, emailFrom);
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sent += 1;
        } else {
          failed += 1;
          console.error('[send-new-game-notification] email_send_failed', {
            requestId,
            reason: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      configured: true,
      mode,
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
        error: error instanceof Error ? error.message : 'Unexpected server error',
        request_id: requestId
      },
      500
    );
  }
});
