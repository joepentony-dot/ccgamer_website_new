import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PATREON_CREATOR_TOKEN = Deno.env.get('PATREON_CREATOR_TOKEN') || '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function fetchPatreonIdentity() {
  const response = await fetch('https://www.patreon.com/api/oauth2/v2/identity?include=memberships,memberships.currently_entitled_tiers&fields%5Bmember%5D=patron_status,last_charge_date,last_charge_status&fields%5Btier%5D=title,amount_cents', {
    headers: { Authorization: `Bearer ${PATREON_CREATOR_TOKEN}` }
  });

  if (!response.ok) {
    throw new Error(`Patreon request failed (${response.status})`);
  }

  return response.json();
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (!PATREON_CREATOR_TOKEN) return json({ error: 'PATREON_CREATOR_TOKEN missing' }, 500);

  try {
    const payload = await fetchPatreonIdentity();
    const memberships = payload?.included?.filter((entry: any) => entry?.type === 'member') || [];

    let processed = 0;
    for (const member of memberships) {
      const patreonUserId = member?.relationships?.user?.data?.id;
      if (!patreonUserId) continue;

      const { data: links } = await supabase
        .from('supporter_links')
        .select('user_id')
        .eq('patreon_user_id', String(patreonUserId))
        .limit(1);

      if (!links || !links.length) continue;

      const userId = links[0].user_id;
      const status = member?.attributes?.patron_status === 'active_patron' ? 'active' : 'inactive';

      await supabase.from('supporter_links').upsert({
        user_id: userId,
        patreon_user_id: String(patreonUserId),
        patreon_status: status,
        patreon_last_sync: new Date().toISOString(),
        last_sync: new Date().toISOString()
      }, { onConflict: 'user_id' });

      processed += 1;
    }

    return json({ ok: true, processed });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'reconcile failed' }, 500);
  }
});
