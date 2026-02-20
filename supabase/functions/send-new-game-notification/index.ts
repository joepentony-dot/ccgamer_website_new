import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotificationMode = 'coming_soon';

type NotifyPayload = {
  game_name?: string;
  mode?: NotificationMode;
  export_id?: string;
};

type RecipientProfile = {
  id: string;
  display_name: string | null;
  notify_new_games: boolean | null;
  notify_new_games_opt_in: boolean | null;
};

const FUNCTION_NAME = 'send-new-game-notification';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || '';

// Option A configurable links.
const HOMEPAGE_URL = Deno.env.get('NEW_GAME_NOTIFY_HOMEPAGE_URL') || 'https://www.cheekycommodoregamer.co.uk';
const QUIZ_URL = Deno.env.get('NEW_GAME_NOTIFY_QUIZ_URL') || 'https://www.cheekycommodoregamer.co.uk/quiz/';
const YOUTUBE_URL = Deno.env.get('NEW_GAME_NOTIFY_YOUTUBE_URL') || 'https://www.youtube.com/@cheekycommodoregamer';
const DISCORD_URL = Deno.env.get('NEW_GAME_NOTIFY_DISCORD_URL') || 'https://discord.gg/cheekycommodoregamer';

const SUBJECT = 'New game coming soon on Cheeky Commodore Gamer 🕹️';

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function buildComingSoonText(gameName: string): string {
  return [
    'Heads up, retro fans!',
    '',
    `${gameName} has just been added to the Cheeky Commodore Gamer release schedule and will be appearing on the site very shortly.`,
    '',
    'While it’s getting its final bits bolted into place, there’s plenty to keep you busy:',
    '',
    '🏠 Visit the site',
    'Explore classic games, reviews, and retro goodness',
    HOMEPAGE_URL,
    '',
    '🧠 Try one of our retro quizzes',
    'Think you know your Commodore stuff? Prove it',
    QUIZ_URL,
    '',
    '📺 Subscribe on YouTube',
    'New gameplay videos, deep dives, and nostalgia hits',
    YOUTUBE_URL,
    '',
    '💬 Chat with the community on Discord',
    `Want to talk about ${gameName} or anything retro? Come say hello`,
    DISCORD_URL,
    '',
    'Thanks for your continued support — it genuinely keeps the site alive and growing.',
    '',
    'Stay Retro',
    'Cheeky Commodore Gamer'
  ].join('\n');
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
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
      text
    })
  });

  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status}): ${await response.text()}`);
  }
}

function hasOptedIn(profile: RecipientProfile): boolean {
  return Boolean(profile.notify_new_games) || Boolean(profile.notify_new_games_opt_in);
}

function hasAdminPrivileges(user: Record<string, unknown> | null | undefined): boolean {
  const appMetadata = (user?.app_metadata as Record<string, unknown> | undefined) || {};
  const userMetadata = (user?.user_metadata as Record<string, unknown> | undefined) || {};

  const candidateRoles = [
    appMetadata.role,
    userMetadata.role,
    ...(Array.isArray(appMetadata.roles) ? appMetadata.roles : []),
    ...(Array.isArray(userMetadata.roles) ? userMetadata.roles : [])
  ]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean);

  return candidateRoles.includes('admin') || candidateRoles.includes('editor') || candidateRoles.includes('superadmin');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE || !SUPABASE_ANON_KEY) {
    console.error(`[${FUNCTION_NAME}] missing_supabase_config`);
    return json({ success: false, error: 'Missing Supabase configuration' }, 500);
  }

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error(`[${FUNCTION_NAME}] missing_email_config`);
    return json({ success: false, error: 'Missing email provider configuration' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!jwt) {
    console.warn(`[${FUNCTION_NAME}] missing_authorization_bearer`);
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser(jwt);

  if (authError || !user || !hasAdminPrivileges(user as Record<string, unknown>)) {
    console.warn(`[${FUNCTION_NAME}] unauthorized_request`);
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const payload = await req.json().catch(() => ({} as NotifyPayload));
  const gameName = String(payload.game_name || '').trim();
  const mode = String(payload.mode || '').trim();
  const exportId = String(payload.export_id || '').trim();

  if (!gameName) return json({ success: false, error: 'game_name is required' }, 400);
  if (mode !== 'coming_soon') return json({ success: false, error: 'mode must be coming_soon' }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,display_name,notify_new_games,notify_new_games_opt_in');

  if (profilesError) {
    console.error(`[${FUNCTION_NAME}] profile_query_failed`, { error: profilesError.message });
    return json({ success: false, error: 'Failed to load recipients' }, 500);
  }

  const optedInProfiles = (profiles || []).filter((profile) => hasOptedIn(profile as RecipientProfile)) as RecipientProfile[];

  let sent = 0;
  let failed = 0;

  for (const profile of optedInProfiles) {
    try {
      const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(profile.id);
      if (userError) {
        failed += 1;
        console.error(`[${FUNCTION_NAME}] get_user_failed`, { user_id: profile.id, error: userError.message });
        continue;
      }

      const user = userResult.user;
      const email = String(user?.email || '').trim();

      if (!email) {
        failed += 1;
        console.warn(`[${FUNCTION_NAME}] skip_missing_email`, { user_id: profile.id });
        continue;
      }

      const text = buildComingSoonText(gameName);
      await sendEmail(email, SUBJECT, text);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[${FUNCTION_NAME}] email_send_failed`, {
        user_id: profile.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.info(`[${FUNCTION_NAME}] completed`, {
    mode,
    game_name: gameName,
    export_id: exportId || null,
    recipients: optedInProfiles.length,
    sent,
    failed
  });

  return json({ success: true, mode, sent, failed, recipients: optedInProfiles.length }, failed > 0 ? 207 : 200);
});
