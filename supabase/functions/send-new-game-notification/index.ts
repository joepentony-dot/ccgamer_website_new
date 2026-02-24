// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (PRODUCTION SAFE)
// Supabase Edge Function
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// -------------------- CORS ----------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://www.cheekycommodoregamer.co.uk',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // MUST include authorization when gateway JWT is ON
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info'
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json'
};

// -------------------- Types ---------------------------------

type NotifyPayload = {
  user_id: string;
  mode: 'coming_soon';
  game_name: string;
  game_slug?: string;
  test_email?: boolean;
};

type ProfileRoleRow = {
  role: string | null;
};

// -------------------- Constants ------------------------------

const ALLOWED_ROLES = new Set(['admin', 'superadmin', 'editor']);

// -------------------- Helpers --------------------------------

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

// -------------------- Server ---------------------------------

Deno.serve(async (req: Request) => {
  // ---- CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const requestId = crypto.randomUUID();

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed', request_id: requestId }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(
      { success: false, error: 'Supabase environment not configured', request_id: requestId },
      500
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

  if (!payload.user_id || payload.mode !== 'coming_soon' || !payload.game_name) {
    return jsonResponse(
      { success: false, error: 'Invalid payload', request_id: requestId },
      400
    );
  }

  // ---- Service role client (role enforcement happens here)
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: roleRow, error: roleError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', payload.user_id)
    .maybeSingle<ProfileRoleRow>();

  if (roleError || !ALLOWED_ROLES.has(String(roleRow?.role || '').toLowerCase())) {
    return jsonResponse(
      { success: false, error: 'Forbidden', request_id: requestId },
      403
    );
  }

  // ---- SUCCESS (non-blocking notification stub)
  // (Email provider integration can be added here later.
  // Any failure must never throw.)
  return jsonResponse({
    success: true,
    game_name: payload.game_name,
    game_slug: payload.game_slug || '',
    test_email: payload.test_email === true,
    request_id: requestId
  });
});