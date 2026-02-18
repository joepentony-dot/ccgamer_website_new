import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotifyPayload = {
  title?: string;
  slug?: string;
  system?: string;
  testMode?: boolean;
  adminEmail?: string;
};

type ProfileRecipient = {
  email: string | null;
  display_name: string | null;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || '';
const ADMIN_EMAIL_ALLOWLIST = (Deno.env.get('NEW_GAME_NOTIFY_ADMIN_ALLOWLIST') || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const FUNCTION_NAME = 'notify-new-game';
const SUBJECT = 'New game added to Cheeky Commodore Gamer';

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
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

function isAdmin(user: Record<string, unknown> | null | undefined, email: string): boolean {
  const appMetadata = (user?.app_metadata as Record<string, unknown> | undefined) || {};
  const userMetadata = (user?.user_metadata as Record<string, unknown> | undefined) || {};

  const appRole = String(appMetadata.role || '').toLowerCase();
  const userRole = String(userMetadata.role || '').toLowerCase();
  const appRoles = Array.isArray(appMetadata.roles)
    ? appMetadata.roles.map((value) => String(value).toLowerCase())
    : [];
  const userRoles = Array.isArray(userMetadata.roles)
    ? userMetadata.roles.map((value) => String(value).toLowerCase())
    : [];

  if (appRole === 'admin' || userRole === 'admin') {
    return true;
  }

  if (appRoles.includes('admin') || userRoles.includes('admin')) {
    return true;
  }

  return Boolean(email && ADMIN_EMAIL_ALLOWLIST.includes(email.toLowerCase()));
}

function buildEmailContent(displayName: string | null, title: string, slug: string) {
  const greetingName = String(displayName || '').trim() || 'there';
  const gameUrl = `${SITE_URL}/games/${encodeURIComponent(slug)}/`;
  const preferencesUrl = `${SITE_URL}/community/profile.html`;

  const text = [
    `Hi ${greetingName},`,
    '',
    `A new game has been added to Cheeky Commodore Gamer: ${title}`,
    `Play now: ${gameUrl}`,
    '',
    `If you no longer want these alerts, manage your notification preferences here: ${preferencesUrl}`
  ].join('\n');

  const html = [
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    `<p>A new game has been added to Cheeky Commodore Gamer: <strong>${escapeHtml(title)}</strong>.</p>`,
    `<p><a href="${gameUrl}">Play now</a></p>`,
    `<p>If you no longer want these alerts, manage your notification preferences <a href="${preferencesUrl}">here</a>.</p>`
  ].join('');

  return { text, html };
}

async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text, html })
  });

  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status}): ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return json({ success: false, error: 'Missing Supabase configuration' }, 500);
  }

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return json({ success: false, error: 'Missing email provider configuration' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!jwt) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser(jwt);

  if (authError || !user) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const requesterEmail = String(user.email || '').trim().toLowerCase();
  if (!isAdmin(user as Record<string, unknown>, requesterEmail)) {
    return json({ success: false, error: 'Forbidden: admin only' }, 403);
  }

  const payload = await req.json().catch(() => ({} as NotifyPayload));
  const title = String(payload.title || '').trim();
  const slug = String(payload.slug || '').trim();
  const system = String(payload.system || '').trim() || 'Unknown';
  const testMode = Boolean(payload.testMode);
  const adminEmail = String(payload.adminEmail || '').trim();

  if (!title || !slug) {
    return json({ success: false, error: 'title and slug are required' }, 400);
  }

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let recipients: ProfileRecipient[] = [];
  if (testMode) {
    if (!adminEmail) {
      return json({ success: false, error: 'adminEmail is required in testMode' }, 400);
    }

    recipients = [{ email: adminEmail, display_name: user.user_metadata?.display_name as string | null }];
  } else {
    const { data, error } = await serviceClient
      .from('profiles')
      .select('email,display_name')
      .eq('notify_new_games', true)
      .not('email', 'is', null);

    if (error) {
      return json({ success: false, error: `Failed to query recipients: ${error.message}` }, 500);
    }

    recipients = (data || []) as ProfileRecipient[];
  }

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const email = String(recipient.email || '').trim();
    if (!email) {
      failed += 1;
      console.error(`[${FUNCTION_NAME}] recipient_missing_email`, { slug });
      continue;
    }

    const { text, html } = buildEmailContent(recipient.display_name, title, slug);

    try {
      await sendEmail(email, SUBJECT, text, html);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[${FUNCTION_NAME}] email_send_failed`, {
        slug,
        email,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  try {
    await serviceClient.from('notification_audit').insert({
      event_type: 'new_game_notification',
      game_title: title,
      game_slug: slug,
      system,
      test_mode: testMode,
      recipient_count: recipients.length,
      triggered_by: user.id,
      triggered_by_email: requesterEmail
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] audit_insert_failed`, {
      slug,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const statusCode = failed > 0 ? 207 : 200;
  return json({ success: true, sent, failed }, statusCode);
});
