import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type MessageType = 'game' | 'newsletter' | 'admin';

type Payload = {
  message_type?: MessageType;
  subject?: string;
  body?: string;
  user_id?: string;
  filter?: {
    role?: string;
    search?: string;
    include_banned?: boolean;
    limit?: number;
  };
};

type ProfileRecipient = {
  id: string;
  role: string | null;
  notify_new_games: boolean | null;
  notify_newsletter: boolean | null;
  notify_admin: boolean | null;
  banned: boolean | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const MAX_BATCH_SIZE = 200;

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function isAdminRole(role: string | null | undefined) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'superadmin';
}

function canReceiveByPreference(messageType: MessageType, profile: ProfileRecipient) {
  if (messageType === 'game') return profile.notify_new_games === true;
  if (messageType === 'newsletter') return profile.notify_newsletter === true;
  return profile.notify_admin === true;
}

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html
    })
  });

  if (!response.ok) {
    throw new Error('provider_send_failed');
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

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey || !emailFrom) {
    return json({ ok: false, error: 'server_not_configured' }, 500);
  }

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const messageType = String(payload.message_type || '').trim() as MessageType;
  const subject = String(payload.subject || '').trim();
  const body = String(payload.body || '').trim();
  const userId = payload.user_id ? String(payload.user_id).trim() : '';
  const filter = payload.filter || null;

  if (!['game', 'newsletter', 'admin'].includes(messageType)) {
    return json({ ok: false, error: 'invalid_message_type' }, 400);
  }
  if (!subject || !body) {
    return json({ ok: false, error: 'subject_and_body_required' }, 400);
  }
  if (userId && filter) {
    return json({ ok: false, error: 'user_id_and_filter_are_mutually_exclusive' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const actorId = authData.user.id;
  const { data: actorProfile, error: actorProfileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .single();

  if (actorProfileError || !isAdminRole(actorProfile?.role)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let recipientQuery = serviceClient
    .from('profiles')
    .select('id, role, notify_new_games, notify_newsletter, notify_admin, banned');

  if (userId) {
    recipientQuery = recipientQuery.eq('id', userId).limit(1);
  } else if (filter) {
    if (filter.role) recipientQuery = recipientQuery.eq('role', String(filter.role).toLowerCase());
    if (filter.search) recipientQuery = recipientQuery.ilike('username', `%${String(filter.search)}%`);
    if (!filter.include_banned) recipientQuery = recipientQuery.eq('banned', false);
    const requestedLimit = Number.isFinite(filter.limit) ? Number(filter.limit) : MAX_BATCH_SIZE;
    recipientQuery = recipientQuery.limit(Math.max(1, Math.min(requestedLimit, MAX_BATCH_SIZE)));
  } else {
    return json({ ok: false, error: 'recipient_selector_required' }, 400);
  }

  const { data: recipientsRaw, error: recipientsError } = await recipientQuery;
  if (recipientsError) {
    return json({ ok: false, error: 'recipient_query_failed' }, 500);
  }

  const eligibleProfiles = (Array.isArray(recipientsRaw) ? recipientsRaw : [])
    .filter((row) => canReceiveByPreference(messageType, row as ProfileRecipient)) as ProfileRecipient[];

  if (!eligibleProfiles.length) {
    await serviceClient.from('admin_activity_log').insert({
      event_type: 'admin_message_sent',
      user_id: actorId,
      actor_user_id: actorId,
      email: authData.user.email || null,
      metadata: {
        message_type: messageType,
        subject,
        attempted: 0,
        sent: 0,
        failed: 0,
        reason: 'no_recipients'
      }
    });

    return json({ ok: true, attempted: 0, sent: 0, failed: 0 });
  }

  const recipientIds = eligibleProfiles.map((p) => p.id);
  const { data: users, error: usersError } = await serviceClient
    .schema('auth')
    .from('users')
    .select('id, email')
    .in('id', recipientIds);

  if (usersError) {
    return json({ ok: false, error: 'recipient_email_lookup_failed' }, 500);
  }

  const userEmailById = new Map<string, string>();
  for (const user of users || []) {
    if (user.id && user.email) {
      userEmailById.set(String(user.id), String(user.email));
    }
  }

  let sent = 0;
  let failed = 0;

  for (const profile of eligibleProfiles) {
    const email = userEmailById.get(profile.id);
    if (!email) {
      failed += 1;
      continue;
    }

    try {
      await sendEmail(resendApiKey, emailFrom, email, subject, body);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  await serviceClient.from('admin_activity_log').insert({
    event_type: 'admin_message_sent',
    user_id: actorId,
    actor_user_id: actorId,
    email: authData.user.email || null,
    metadata: {
      message_type: messageType,
      subject,
      attempted: eligibleProfiles.length,
      sent,
      failed,
      mode: userId ? 'single_user' : 'filtered_group'
    }
  });

  return json({
    ok: true,
    attempted: eligibleProfiles.length,
    sent,
    failed
  });
});
