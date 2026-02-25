import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Payload = {
  userId?: string;
  reason?: string;
  confirm?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function isElevatedRole(role: string) {
  return ['admin', 'superadmin', 'editor'].includes(role);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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

  if (!payload.confirm) return json({ ok: false, error: 'confirmation_required' }, 400);

  const userId = String(payload.userId || '').trim();
  const reason = String(payload.reason || '').trim();
  if (!userId) return json({ ok: false, error: 'user_id_required' }, 400);

  const { error: banError } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: '876000h'
  });
  if (banError) return json({ ok: false, error: banError.message }, 500);

  await serviceClient.from('profiles').update({
    banned: true,
    ban_reason: reason || 'Hard ban applied by admin',
    banned_at: new Date().toISOString()
  }).eq('id', userId);

  await serviceClient.from('admin_activity_log').insert({
    event_type: 'hard_ban',
    actor_user_id: actorId,
    target_user_id: userId,
    email: authData.user.email || null,
    metadata: {
      reason: reason || null
    }
  });

  return json({ ok: true });
});
