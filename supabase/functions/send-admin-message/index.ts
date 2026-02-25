import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type MessageType = 'game_notification' | 'newsletter' | 'admin_contact';

type Payload = {
  messageType?: MessageType;
  subject?: string;
  body?: string;
  userIds?: string[];
  onlyOptedIn?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function isElevatedRole(role: string) {
  return ['admin', 'superadmin', 'editor'].includes(role);
}

async function sendEmail(apiKey: string, from: string, to: string, subject: string, text: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, text })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`resend_failed:${response.status}:${details}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const emailFrom = Deno.env.get('EMAIL_FROM') || '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, error: 'missing_supabase_env' }, 500);
  }

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ ok: false, error: 'missing_auth_header' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ ok: false, error: 'invalid_token' }, 401);

  const actorId = authData.user.id;
  const { data: actorProfile, error: actorProfileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .single();

  if (actorProfileError || !isElevatedRole(String(actorProfile?.role || '').toLowerCase())) {
    return json({ ok: false, error: 'not_authorized' }, 403);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const messageType = String(payload.messageType || '').trim() as MessageType;
  const subject = String(payload.subject || '').trim();
  const body = String(payload.body || '').trim();
  const userIds = Array.isArray(payload.userIds) ? payload.userIds.filter(Boolean) : [];
  const onlyOptedIn = payload.onlyOptedIn !== false;

  if (!['game_notification', 'newsletter', 'admin_contact'].includes(messageType)) {
    return json({ ok: false, error: 'invalid_message_type' }, 400);
  }
  if (!subject || !body) return json({ ok: false, error: 'subject_and_body_required' }, 400);

  let query = serviceClient
    .from('profiles')
    .select('id, notify_new_games, notify_newsletter, notify_admin, banned')
    .eq('banned', false);

  if (userIds.length) query = query.in('id', userIds);

  if (onlyOptedIn) {
    if (messageType === 'game_notification') query = query.eq('notify_new_games', true);
    if (messageType === 'newsletter') query = query.eq('notify_newsletter', true);
    if (messageType === 'admin_contact') query = query.eq('notify_admin', true);
  }

  const { data: recipients, error: recipientsError } = await query.limit(500);
  if (recipientsError) return json({ ok: false, error: recipientsError.message }, 500);

  const recipientIds = (recipients || []).map((r) => r.id);
  if (!recipientIds.length) return json({ ok: true, sent: 0, skipped: 0, reason: 'no_recipients' });

  const { data: users, error: usersError } = await serviceClient
    .schema('auth')
    .from('users')
    .select('id, email')
    .in('id', recipientIds);

  if (usersError) return json({ ok: false, error: usersError.message }, 500);

  const targets = (users || []).filter((u) => u.email).map((u) => ({ id: u.id, email: u.email as string }));

  if (!resendApiKey || !emailFrom) {
    return json({ ok: false, error: 'missing_email_provider_env' }, 500);
  }

  let sent = 0;
  for (const target of targets) {
    await sendEmail(resendApiKey, emailFrom, target.email, subject, body);
    sent += 1;
  }

  await serviceClient.from('admin_activity_log').insert({
    event_type: 'admin_message_sent',
    actor_user_id: actorId,
    email: authData.user.email || null,
    metadata: {
      message_type: messageType,
      subject,
      recipient_count: sent,
      only_opted_in: onlyOptedIn
    }
  });

  return json({ ok: true, sent, skipped: Math.max(0, recipientIds.length - sent) });
});
