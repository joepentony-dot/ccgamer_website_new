import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token'
};

const REPO_OWNER = Deno.env.get('GH_REPO_OWNER')!;
const REPO_NAME = Deno.env.get('GH_REPO_NAME')!;
const REPO_BRANCH = Deno.env.get('GH_REPO_BRANCH') || 'main';
const GH_TOKEN = Deno.env.get('GH_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GAMES_PATH = 'games/games.json';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function github(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API failed ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function decodeBase64(content: string): string {
  return atob(content.replace(/\n/g, ''));
}

async function getRepoFile() {
  return github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GAMES_PATH}?ref=${REPO_BRANCH}`);
}

function assertCsrf(req: Request) {
  if (!req.headers.get('x-csrf-token')) throw new Error('Missing CSRF token.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    assertCsrf(req);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Missing auth token.' }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'Invalid auth session.' }, 401);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    const role = roleData?.role || 'editor';

    const url = new URL(req.url);
    const route = url.pathname.replace('/games-json-proxy', '');

    await supabase.from('admin_audit_log').insert({
      user_id: userData.user.id,
      role,
      action: route,
      metadata: { ip: req.headers.get('x-forwarded-for') }
    });

    if (route === '/read') {
      const file = await getRepoFile();
      const games = JSON.parse(decodeBase64(file.content));
      return json({ games, sha: file.sha });
    }

    if (route === '/file-index') {
      const tree = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`);
      const files = (tree.tree || []).filter((n: any) => n.type === 'blob').map((n: any) => n.path);
      return json({ files });
    }

    if (route === '/backups') {
      const { data } = await supabase
        .from('games_json_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return json({ backups: data || [] });
    }

    if (route === '/restore') {
      if (role !== 'superadmin') return json({ error: 'Only superadmin can restore.' }, 403);
      const { backupId } = await req.json();
      const { data: backup } = await supabase
        .from('games_json_backups')
        .select('*')
        .eq('id', backupId)
        .single();
      if (!backup) return json({ error: 'Backup not found.' }, 404);

      const file = await getRepoFile();
      await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GAMES_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `admin(games-editor): restore backup ${backupId}`,
          branch: REPO_BRANCH,
          sha: file.sha,
          content: btoa(JSON.stringify(backup.payload, null, 2))
        })
      });
      return json({ ok: true });
    }

    if (route === '/save') {
      if (!['admin', 'superadmin'].includes(role)) {
        return json({ error: 'Role cannot save to repository.' }, 403);
      }

      const { games, message } = await req.json();
      const file = await getRepoFile();
      const existing = JSON.parse(decodeBase64(file.content));

      await supabase.from('games_json_backups').insert({
        commit_sha: file.sha,
        commit_message: message,
        payload: existing,
        created_by: userData.user.id
      });

      await supabase.rpc('trim_games_backups_to_twenty');

      await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GAMES_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          branch: REPO_BRANCH,
          sha: file.sha,
          content: btoa(JSON.stringify(games, null, 2))
        })
      });

      return json({ ok: true, deploy: 'GitHub commit created; host deploy follows repo pipeline.' });
    }

    return json({ error: 'Unknown route.' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unhandled error' }, 500);
  }
});
