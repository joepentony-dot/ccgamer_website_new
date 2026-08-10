import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('admin/content-publisher.html', 'utf8');
const adminIndex = fs.readFileSync('admin/index.html', 'utf8');
const js = fs.readFileSync('admin/js/content-publisher.js', 'utf8');
const css = fs.readFileSync('resources/css/ccg-content-publisher.css', 'utf8');

test('publisher is a private role-gated admin page', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow"/);
  assert.match(html, /admin\/js\/content-publisher\.js/);
  assert.match(js, /ensureRole\(\['editor', 'admin', 'superadmin'\]\)/);
  assert.doesNotMatch(html, /<style[\s>]/i);
  assert.match(html, /resources\/css\/ccg-content-publisher\.css/);
});

test('default admin route forwards safely to the unified publisher', () => {
  assert.match(adminIndex, /<meta name="robots" content="noindex,nofollow"/);
  assert.match(adminIndex, /url=\/admin\/content-publisher\.html/);
  assert.match(adminIndex, /window\.location\.replace\(target\)/);
  assert.match(adminIndex, /window\.location\.search \+ window\.location\.hash/);
  assert.doesNotMatch(adminIndex, /games\/games\.json|YOUTUBE_API_KEY|github_token/i);
});

test('publisher keeps the YouTube API key server-side', () => {
  assert.doesNotMatch(js, /YOUTUBE_API_KEY/);
  assert.doesNotMatch(js, /googleapis\.com\/youtube/i);
  assert.match(js, /\/data\/video-metadata\.json/);
  assert.match(html, /never reads or exposes the YouTube API key/i);
});

test('game publishing writes authoritative source data and optional thumbnail only', () => {
  assert.match(js, /games\/games\.json/);
  assert.match(js, /resources\/images\/thumbnails\/all\//);
  assert.match(js, /createBlob|\/git\/blobs/);
  assert.match(js, /\/git\/trees/);
  assert.match(js, /\/git\/commits/);
  assert.match(js, /Reliable Games Publishing|games-publishing\.yml/);
  assert.match(js, /seo\.yml/);

  const protectedPaths = [
    'resources/css/intro.css',
    'js/index-intro.js'
  ];
  for (const protectedPath of protectedPaths) {
    assert.equal(js.includes(protectedPath), false, `publisher must not write ${protectedPath}`);
  }
});

test('video publishing supports all three authoritative video datasets', () => {
  assert.match(js, /data\/retro-specials\.json/);
  assert.match(js, /data\/retro-events\.json/);
  assert.match(js, /data\/amiga-demo-music\.json/);
  assert.match(html, /Retro Specials \/ Zzap!64/);
  assert.match(html, /Retro Events/);
  assert.match(html, /Amiga Demo \/ Music/);
});

test('YouTube URLs are normalised without exposing credentials', () => {
  assert.match(js, /host === 'youtu\.be'/);
  assert.match(js, /\['shorts', 'live', 'embed'\]/);
  assert.match(js, /\^\[A-Za-z0-9_-\]\{11\}\$/);
  assert.match(js, /VideoObject markup will be withheld rather than guessed/);
});

test('publisher retains legacy editors as fallbacks', () => {
  assert.match(html, /\/admin\/games-editor\.html/);
  assert.match(html, /\/admin\/retro-events-editor\.html/);
});

test('publisher stylesheet includes responsive layouts', () => {
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /publisher-pipeline/);
});
