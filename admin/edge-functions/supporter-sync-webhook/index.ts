import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PATREON_WEBHOOK_SECRET = Deno.env.get('PATREON_WEBHOOK_SECRET') || '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function verifyPatreonSignature(rawBody: string, signatureHeader: string | null) {
  if (!PATREON_WEBHOOK_SECRET) return false;
  if (!signatureHeader) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PATREON_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const digestHex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return digestHex === signatureHeader;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const rawBody = await req.text();
  const eventType = req.headers.get('x-patreon-event') || 'unknown';
  const eventId = req.headers.get('x-patreon-delivery') || crypto.randomUUID();

  const signature = req.headers.get('x-patreon-signature');
  const validSig = await verifyPatreonSignature(rawBody, signature);
  if (!validSig) return json({ error: 'Invalid webhook signature' }, 401);

  const payload = JSON.parse(rawBody || '{}');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { error: idempotencyErr } = await supabase
    .from('supporter_webhook_events')
    .insert({ provider: 'patreon', event_id: eventId, event_type: eventType, payload })
    .select('id')
    .single();

  if (idempotencyErr && String(idempotencyErr.message || '').toLowerCase().includes('duplicate')) {
    return json({ ok: true, deduped: true });
  }
  if (idempotencyErr) return json({ error: idempotencyErr.message }, 500);

  const patreonUserId = payload?.data?.relationships?.user?.data?.id || payload?.included?.find((row: any) => row?.type === 'user')?.id;
  const status = payload?.data?.attributes?.patron_status || 'inactive';
  const currentlyEntitled = status === 'active_patron';

  const entitledTier = payload?.included?.find((row: any) => row?.type === 'tier')?.id || null;
  const amount = Number(payload?.data?.attributes?.currently_entitled_amount_cents || 0) / 100;

  if (!patreonUserId) {
    return json({ ok: true, skipped: 'no patreon user id in payload' });
  }

  const { data: profileLinks } = await supabase
    .from('supporter_links')
    .select('user_id')
    .eq('patreon_user_id', String(patreonUserId))
    .limit(1);

  if (!profileLinks || !profileLinks.length) {
    return json({ ok: true, skipped: 'patreon id not linked to any profile yet' });
  }

  const userId = profileLinks[0].user_id;

  const { error: upsertError } = await supabase
    .from('supporter_links')
    .upsert({
      user_id: userId,
      patreon_user_id: String(patreonUserId),
      patreon_status: currentlyEntitled ? 'active' : 'inactive',
      patreon_tier: entitledTier,
      patreon_amount: amount,
      patreon_last_sync: new Date().toISOString(),
      last_sync: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (upsertError) return json({ error: upsertError.message }, 500);
  return json({ ok: true });
});
