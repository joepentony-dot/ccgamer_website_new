import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const { token } = await req.json();
  const safeToken = String(token || '').trim();

  if (!safeToken) {
    return new Response(JSON.stringify({ success: false, error: 'Missing token' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await supabase
    .from('profiles')
    .update({ newsletter_opt_in: false, notify_new_games_opt_in: false })
    .eq('unsub_token', safeToken)
    .select('id')
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: Boolean(data) }), { headers: { 'Content-Type': 'application/json' } });
});
