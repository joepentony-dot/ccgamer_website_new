import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotifyPayload = {
  title?: string;
  slug?: string;
  system?: string;
  year?: number;
  adminEmail?: string;
  testMode?: boolean;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || '';
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const FUNCTION_NAME = 'notify_new_game';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
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

function buildEmailContent(payload: Required<Pick<NotifyPayload, 'title' | 'slug' | 'system' | 'year'>>) {
  const gameUrl = `${SITE_URL}/games/${encodeURIComponent(payload.slug)}/`;
  const subject = 'New game added to Cheeky Commodore Gamer 🎮';
  const plain = [
    `New game added: ${payload.title}`,
    `System: ${payload.system}`,
    `Year: ${String(payload.year)}`,
    `View game: ${gameUrl}`,
    '',
    'You can disable these notifications in your profile at any time.'
  ].join('\n');

  const html = `
    <h1>New game added to Cheeky Commodore Gamer 🎮</h1>
    <p><strong>${escapeHtml(payload.title)}</strong></p>
    <p>${escapeHtml(payload.system)} • ${String(payload.year)}</p>
    <p><a href="${gameUrl}">View game</a></p>
    <p>You can disable these notifications in your profile at any time.</p>
  `;

  return { subject, plain, html };
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text, html })
  });

  if (!response.ok) {
    throw new Error(`Resend failed: ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'Missing Supabase service config' }, 500);
  }

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return json({ ok: false, error: 'Missing email provider config' }, 500);
  }

  const payload = await req.json().catch(() => ({} as NotifyPayload));

  const title = String(payload?.title || '').trim();
  const slug = String(payload?.slug || '').trim();
  const system = String(payload?.system || '').trim();
  const year = Number(payload?.year || 0);
  const testMode = Boolean(payload?.testMode);
  const adminEmail = String(payload?.adminEmail || '').trim();

  if (!title || !slug) {
    return json({ ok: false, error: 'Missing title or slug' }, 400);
  }

  if (testMode && !adminEmail) {
    return json({ ok: false, error: 'adminEmail is required in testMode' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let recipients: string[] = [];
  if (testMode) {
    recipients = [adminEmail];
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('new_game_notifications', true)
      .not('email', 'is', null);

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    recipients = Array.from(new Set((data || [])
      .map((row) => String(row.email || '').trim())
      .filter(Boolean)));
  }

  const emailContent = buildEmailContent({
    title,
    slug,
    system: system || 'Unknown',
    year: Number.isFinite(year) && year > 0 ? year : 0
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const to of recipients) {
    try {
      await sendEmail(to, emailContent.subject, emailContent.plain, emailContent.html);
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error(`[${FUNCTION_NAME}] send_failed`, {
        slug,
        testMode,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    slug,
    testMode,
    recipientCount: recipients.length,
    event: testMode ? 'TEST_NOTIFICATION_SENT' : 'LIVE_NOTIFICATION_SENT'
  };

  console.log(`[${FUNCTION_NAME}] dispatch_result`, logEntry);

  return json({
    ok: true,
    ...logEntry,
    sentCount,
    failedCount
  });
});
