import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Payload = {
  target_user_id?: string;
  previous_role?: string;
  new_role?: string;
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

function normalizeRoleLabel(role: string | null | undefined) {
  const normalized = String(role || 'user').toLowerCase();
  if (normalized === 'editor') return 'Moderator';
  return normalized;
}

function isAdminRole(role: string | null | undefined) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'superadmin';
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

  const targetUserId = String(payload.target_user_id || '').trim();
  const previousRole = String(payload.previous_role || 'user').trim().toLowerCase();
  const newRole = String(payload.new_role || '').trim().toLowerCase();

  if (!targetUserId || !newRole) {
    return json({ ok: false, error: 'target_user_id_and_new_role_required' }, 400);
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
  const actorEmail = authData.user.email || null;

  const { data: actorProfile, error: actorProfileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .single();

  if (actorProfileError || !isAdminRole(actorProfile?.role)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const { data: targetUsers, error: targetLookupError } = await serviceClient
    .schema('auth')
    .from('users')
    .select('id, email')
    .eq('id', targetUserId)
    .limit(1);

  if (targetLookupError) {
    return json({ ok: false, error: 'target_lookup_failed' }, 500);
  }

  const target = Array.isArray(targetUsers) ? targetUsers[0] : null;
  const targetEmail = target?.email ? String(target.email) : null;

  let sent = false;
  let sendError: string | null = null;

  if (targetEmail) {
    const previousLabel = normalizeRoleLabel(previousRole);
    const newLabel = normalizeRoleLabel(newRole);

    const subject = 'Your CCG account role has been updated';
    const html = `
      <div>
        <p>Hi there,</p>
        <p>Just a quick note to let you know your Cheeky Commodore Gamer account role has been updated.</p>
        <p><strong>Previous role:</strong> ${previousLabel}<br /><strong>New role:</strong> ${newLabel}</p>
        <p>If this looks unexpected, please reply to this message and we’ll gladly take a look.</p>
        <p>Cheers,<br />The CCG Team</p>
      </div>
    `;

    try {
      await sendEmail(resendApiKey, emailFrom, targetEmail, subject, html);
      sent = true;
    } catch (error) {
      sent = false;
      sendError = error instanceof Error ? error.message : 'send_failed';
    }
  } else {
    sendError = 'missing_target_email';
  }

  await serviceClient.from('admin_activity_log').insert({
    event_type: 'admin_message_sent',
    user_id: actorId,
    actor_user_id: actorId,
    target_user_id: targetUserId,
    email: actorEmail,
    metadata: {
      message_type: 'role_change_notification',
      previous_role: previousRole,
      new_role: newRole,
      target_user_id: targetUserId,
      target_email_found: Boolean(targetEmail),
      sent,
      error: sendError
    }
  });

  return json({
    ok: true,
    target_user_id: targetUserId,
    sent
  });
});
