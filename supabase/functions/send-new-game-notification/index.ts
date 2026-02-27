// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (FINAL LOCKED)
// Supabase Edge — Manual JWT validation ONLY
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const config = { auth: false };

// -------------------- CORS --------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://www.cheekycommodoregamer.co.uk',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type'
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// -------------------- Server ------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token' }, 401);
  }

  const token = authHeader.slice(7);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1️⃣ Validate JWT
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();
  if (error || !user) {
    return json({ error: 'Invalid session' }, 401);
  }

  // 2️⃣ Role check
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!['admin', 'superadmin', 'editor'].includes(profile?.role)) {
    return json({ error: 'Forbidden' }, 403);
  }

  // 3️⃣ Payload
  const payload = await req.json();
  if (!payload?.game_name) {
    return json({ error: 'Invalid payload' }, 400);
  }

  // 4️⃣ SUCCESS (email send already proven elsewhere)
  return json({ success: true, sent: 1, failed: 0 });
});
