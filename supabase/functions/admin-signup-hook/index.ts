import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SignupPayload = {
  user_id?: string;
  email?: string;
  provider?: string;
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const hookSecret = Deno.env.get('SIGNUP_HOOK_SECRET') || '';
  const incomingSecret = req.headers.get('x-signup-hook-secret') || '';
  if (hookSecret && incomingSecret !== hookSecret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'missing_env' }, 500);
  }

  let payload: SignupPayload;
  try {
    payload = (await req.json()) as SignupPayload;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const userId = String(payload.user_id || '').trim();
  const email = String(payload.email || '').trim();
  if (!userId) return json({ ok: false, error: 'user_id_required' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await adminClient.from('admin_activity_log').insert({
    event_type: 'user_signup',
    actor_user_id: userId,
    target_user_id: userId,
    email,
    metadata: {
      provider: payload.provider || 'unknown',
      source: 'edge_hook'
    }
  });

  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true });
});
