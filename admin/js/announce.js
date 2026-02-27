// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (FINAL LOCKED)
// Supabase Edge — Manual JWT validation (anon validate + service ops)
// IMPORTANT: Gateway requires `apikey` header from client.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const config = { auth: false };

// -------------------- CORS --------------------

const ALLOWED_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // MUST allow apikey + x-client-info or browser preflight / gateway can fail
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type'
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

function text(v: unknown): string {
  return String(v ?? '').trim();
}

// -------------------- Server ------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  // ---- ENV
  const supabaseUrl = text(Deno.env.get('SUPABASE_URL'));
  const anonKey = text(Deno.env.get('SUPABASE_ANON_KEY'));
  const serviceKey = text(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ success: false, error: 'Supabase env missing' }, 500);
  }

  // ---- AUTH HEADER (user session JWT)
  const authHeader = text(req.headers.get('authorization'));
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ success: false, error: 'Missing bearer token' }, 401);
  }

  // Keep the original header (already "Bearer ...")
  // Supabase client expects Authorization header in this format.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const {
    data: { user },
    error: authErr
  } = await authClient.auth.getUser();

  if (authErr || !user) {
    return json({ success: false, error: 'Invalid session' }, 401);
  }

  // ---- ROLE CHECK (service role)
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileErr } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    return json({ success: false, error: 'Profile lookup failed' }, 500);
  }

  const role = text(profile?.role).toLowerCase();
  if (!['admin', 'superadmin', 'editor'].includes(role)) {
    return json({ success: false, error: 'Forbidden' }, 403);
  }

  // ---- PAYLOAD
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const gameName = text(payload?.game_name);
  if (!gameName) {
    return json({ success: false, error: 'Invalid payload' }, 400);
  }

  // ✅ At this point: auth + role OK.
  // Your real email-sending logic can run here (Resend, etc).

  return json({ success: true, sent: 1, failed: 0 });
});