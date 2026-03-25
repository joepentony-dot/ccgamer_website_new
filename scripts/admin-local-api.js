#!/usr/bin/env node

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const HOST = process.env.CCG_ADMIN_API_HOST || '127.0.0.1';
const PORT = Number(process.env.CCG_ADMIN_API_PORT || 3131);
const repoRoot = path.resolve(__dirname, '..');

const SECTION_TO_FILE = {
  'retro-events': path.join(repoRoot, 'data', 'retro-events.json'),
  'retro-specials': path.join(repoRoot, 'data', 'retro-specials.json'),
  'amiga-demo-music': path.join(repoRoot, 'data', 'amiga-demo-music.json')
};

function log(message) {
  console.log(`[admin-api] ${message}`);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractYoutubeId(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
}

function normalizeItem(item) {
  const title = String(item?.title || '').trim();
  const youtubeUrl = String(item?.youtube_url || item?.url || '').trim();
  const youtubeId = String(item?.youtube_video_id || item?.youtubeId || item?.youtube || '').trim() || extractYoutubeId(youtubeUrl);
  const slug = slugify(item?.slug || item?.id || title || youtubeId);

  return {
    ...item,
    title,
    slug,
    youtube_video_id: youtubeId,
    youtubeId,
    youtube: youtubeId,
    youtube_url: youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ''),
    url: youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : '')
  };
}

function validateItems(items) {
  const errors = [];

  items.forEach((raw, index) => {
    const item = normalizeItem(raw);
    const label = item.id || item.title || `item-${index + 1}`;

    if (!item.title) errors.push(`${label}: title is required`);
    if (!item.slug) errors.push(`${label}: slug is required`);
    if (!item.youtube_video_id) errors.push(`${label}: youtubeId is required`);
    if (item.youtube_video_id && !/^[A-Za-z0-9_-]{6,20}$/.test(item.youtube_video_id)) {
      errors.push(`${label}: youtubeId format is invalid`);
    }
  });

  return errors;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(payload));
}

function triggerRebuildAsync() {
  const scriptPath = path.join(repoRoot, 'scripts', 'rebuild-games.js');
  const child = spawn(process.execPath, [scriptPath], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/admin/api/retro-json/save') {
    sendJson(response, 404, { ok: false, error: 'not_found' });
    return;
  }

  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => {
    let parsed;

    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      sendJson(response, 400, { ok: false, error: 'invalid_json', message: error.message });
      return;
    }

    const section = String(parsed?.section || '').trim();
    const outputPath = SECTION_TO_FILE[section];

    if (!outputPath) {
      sendJson(response, 400, { ok: false, error: 'invalid_section' });
      return;
    }

    if (!Array.isArray(parsed?.items)) {
      sendJson(response, 400, { ok: false, error: 'items_must_be_array' });
      return;
    }

    const normalizedItems = parsed.items.map((item) => normalizeItem(item));
    const validationErrors = validateItems(normalizedItems);
    if (validationErrors.length) {
      sendJson(response, 400, { ok: false, error: 'validation_failed', validationErrors });
      return;
    }

    try {
      fs.writeFileSync(outputPath, `${JSON.stringify(normalizedItems, null, 2)}\n`, 'utf8');
      log(`Saved ${section}: ${outputPath} (${normalizedItems.length} items)`);
    } catch (error) {
      sendJson(response, 500, { ok: false, error: 'write_failed', message: error.message });
      return;
    }

    let rebuildTriggered = false;
    let rebuildError = '';
    if (section === 'retro-specials') {
      try {
        log('Rebuild trigger start: node scripts/rebuild-games.js');
        triggerRebuildAsync();
        rebuildTriggered = true;
        log('Rebuild trigger queued.');
      } catch (error) {
        rebuildError = error.message;
        log(`Rebuild trigger failed to start: ${error.message}`);
      }
    }

    sendJson(response, 200, {
      ok: true,
      section,
      path: outputPath,
      count: normalizedItems.length,
      rebuild: {
        triggered: rebuildTriggered,
        error: rebuildError
      }
    });
  });
});

server.listen(PORT, HOST, () => {
  log(`Listening on http://${HOST}:${PORT}`);
  log('Ready endpoint: POST /admin/api/retro-json/save');
});
