// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (COMING SOON)
// Supabase Edge Function
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// -------------------- CORS ----------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type'
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json'
};

// -------------------- Types ---------------------------------

type NotifyPayload = {
  mode?: string;
  game_name?: string;
  game_slug?: string;
  test_email?: boolean;
};

type ProfileRoleRow = {
  role: string | null;
};

// -------------------- Constants ------------------------------

const ALLOWED_ROLES = new Set(['admin', 'superadmin', 'editor']);
const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';

// -------------------- Helpers --------------------------------

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

function getBearerToken(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// -------------------- Server ---------------------------------

Deno.serve(async (req: Request) => {
  // ---- CORS preflight (ABSOLUTE FIRST)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const requestId = crypto.randomUUID();

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed', request_id: requestId }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(
      { success: false, error: 'Supabase environment not configured', request_id: requestId },
      500
    );
  }

  const bearerToken = getBearerToken(req);
  if (!bearerToken) {
    return jsonResponse(
      { success: false, error: 'Missing authorization header', request_id: requestId },
      401
    );
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: 'Invalid JSON body', request_id: requestId },
      400
    );
  }

  if (payload.mode !== 'coming_soon' || !payload.game_name) {
    return jsonResponse(
      { success: false, error: 'Invalid payload', request_id: requestId },
      400
    );
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await authClient.auth.getUser(bearerToken);

  if (error || !data?.user) {
    return jsonResponse(
      { success: false, error: 'Unauthorized session', request_id: requestId },
      401
    );
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle<ProfileRoleRow>();

  if (!ALLOWED_ROLES.has(String(roleRow?.role || '').toLowerCase())) {
    return jsonResponse(
      { success: false, error: 'Forbidden', request_id: requestId },
      403
    );
  }

  // SUCCESS PATH (email sending intentionally stubbed / non-blocking)
  return jsonResponse({
    success: true,
    test_email: payload.test_email === true,
    game_name: payload.game_name,
    game_slug: payload.game_slug || '',
    request_id: requestId
  });
});