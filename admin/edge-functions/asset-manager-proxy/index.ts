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
const VIRUS_SCAN_WEBHOOK = Deno.env.get('VIRUS_SCAN_WEBHOOK') || '';

const ASSET_ROOTS = [
  'resources/images/games/boxes-3d/',
  'resources/images/thumbnails/',
  'resources/images/collections/',
  'resources/images/genres/',
  'resources/images/banners/'
];

const EXT_WHITELIST = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function assertCsrf(req: Request) {
  if (!req.headers.get('x-csrf-token')) {
    throw new Error('Missing CSRF token.');
  }
}

function assertRateLimit(userId: string) {
  const now = Date.now();
  const current = rateLimiter.get(userId);
  if (!current || current.resetAt < now) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 60_000 });
    return;
  }

  current.count += 1;
  if (current.count > 60) {
    throw new Error('Rate limit exceeded. Try again in one minute.');
  }
}

function decodeBase64(content: string): string {
  return atob(content.replace(/\n/g, ''));
}

function sanitizeName(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

function isAllowedDestination(destination: string) {
  return ASSET_ROOTS.some((root) => `${destination}/`.startsWith(root));
}

function extensionOf(name: string) {
  return (name.split('.').pop() || '').toLowerCase();
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

async function tree() {
  const data = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`);
  return data.tree || [];
}

async function commitFile(path: string, message: string, contentBase64: string) {
  let sha: string | undefined;

  try {
    const current = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`);
    sha = current.sha;
  } catch {
    sha = undefined;
  }

  await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      branch: REPO_BRANCH,
      sha,
      content: contentBase64
    })
  });
}

async function validateVirusHook(file: { name: string; mime: string; size: number }) {
  if (!VIRUS_SCAN_WEBHOOK) {
    return { skipped: true };
  }

  const response = await fetch(VIRUS_SCAN_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(file)
  });

  if (!response.ok) {
    throw new Error(`Virus hook rejected ${file.name}.`);
  }

  return response.json().catch(() => ({ ok: true }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    assertCsrf(req);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Missing auth token.' }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ error: 'Invalid auth session.' }, 401);
    }

    assertRateLimit(userData.user.id);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    const role = roleData?.role || 'editor';
    if (!['editor', 'admin', 'superadmin'].includes(role)) {
      return json({ error: 'Role denied.' }, 403);
    }

    const url = new URL(req.url);
    const route = url.pathname.replace('/asset-manager-proxy', '');

    await supabase.from('admin_audit_log').insert({
      user_id: userData.user.id,
      role,
      action: `asset:${route}`,
      metadata: { ip: req.headers.get('x-forwarded-for') }
    });

    if (route === '/scan') {
      const nodes = await tree();
      const assets = nodes
        .filter((node: any) => node.type === 'blob')
        .filter((node: any) => ASSET_ROOTS.some((root) => String(node.path || '').startsWith(root)))
        .map((node: any) => ({ path: node.path, size: node.size, sha: node.sha }));
      return json({ assets, roots: ASSET_ROOTS });
    }

    if (route === '/health') {
      const nodes = await tree();
      const blobs = nodes.filter((node: any) => node.type === 'blob');
      const assets = blobs.filter((node: any) => ASSET_ROOTS.some((root) => String(node.path || '').startsWith(root)));

      const bySha = new Map<string, string[]>();
      const oversized = [];

      for (const asset of assets) {
        if (asset.size > 500 * 1024) {
          oversized.push({ path: asset.path, size: asset.size });
        }
        const list = bySha.get(asset.sha) || [];
        list.push(asset.path);
        bySha.set(asset.sha, list);
      }

      const duplicates = Array.from(bySha.entries())
        .filter(([, paths]) => paths.length > 1)
        .map(([sha, paths]) => ({ sha, paths }));

      const allAssetPaths = new Set(assets.map((item: any) => item.path));
      const gamesNode = blobs.find((node: any) => node.path === 'games/games.json');
      let missingReferencedAssets: string[] = [];

      if (gamesNode) {
        const gameFile = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/games/games.json?ref=${REPO_BRANCH}`);
        const games = JSON.parse(decodeBase64(gameFile.content));
        const referenced = new Set<string>();

        for (const game of games.games || []) {
          for (const value of Object.values(game)) {
            if (typeof value === 'string' && value.startsWith('resources/images/')) {
              referenced.add(value);
            }
          }
        }

        missingReferencedAssets = Array.from(referenced).filter((path) => !allAssetPaths.has(path));
      }

      return json({
        totals: { assets: assets.length, oversized: oversized.length, duplicates: duplicates.length },
        oversized,
        duplicates,
        missingReferencedAssets
      });
    }

    if (route === '/snapshot') {
      if (!['admin', 'superadmin'].includes(role)) {
        return json({ error: 'Only admin/superadmin can create snapshots.' }, 403);
      }

      const nodes = await tree();
      const assets = nodes
        .filter((node: any) => node.type === 'blob')
        .filter((node: any) => ASSET_ROOTS.some((root) => String(node.path || '').startsWith(root)))
        .map((node: any) => ({ path: node.path, sha: node.sha, size: node.size }));

      const { data, error } = await supabase
        .from('asset_snapshots')
        .insert({
          created_by: userData.user.id,
          payload: assets
        })
        .select('id, created_at')
        .single();

      if (error) {
        return json({ warning: 'Snapshot table unavailable. Use Git history for backup restore.', details: error.message });
      }

      return json({ ok: true, snapshot: data });
    }

    if (route === '/upload') {
      const body = await req.json();
      const destination = String(body.destination || '');
      const files = Array.isArray(body.files) ? body.files : [];

      if (!isAllowedDestination(destination)) {
        return json({ error: 'Destination is outside allowed image roots.' }, 400);
      }

      if (role === 'editor' && files.some((file: any) => file.kind === 'delete' || file.kind === 'purge')) {
        return json({ error: 'Editor cannot delete or purge assets.' }, 403);
      }

      const committed: string[] = [];
      for (const file of files) {
        const name = sanitizeName(file.name);
        const extension = extensionOf(name);

        if (!EXT_WHITELIST.has(extension)) {
          return json({ error: `File extension .${extension} not allowed.` }, 400);
        }

        if (file.size > MAX_UPLOAD_BYTES) {
          return json({ error: `${name} exceeds max upload size ${MAX_UPLOAD_BYTES} bytes.` }, 400);
        }

        if (!String(file.mime || '').startsWith('image/')) {
          return json({ error: `${name} MIME type is not image/*.` }, 400);
        }

        await validateVirusHook({ name, mime: file.mime, size: file.size });

        const fullPath = `${destination}/${name}`;
        await commitFile(fullPath, `admin(asset-manager): upload ${fullPath}`, file.contentBase64);
        committed.push(fullPath);
      }

      return json({ ok: true, committed });
    }

    return json({ error: 'Unknown route.' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unhandled error' }, 500);
  }
});
